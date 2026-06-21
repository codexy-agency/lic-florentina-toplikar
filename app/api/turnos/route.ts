import { NextResponse } from "next/server";
import {
  addSolicitud,
  addSolicitudSiLibre,
  getScheduling,
  getBusy,
  listServices,
  listStaff,
} from "@/lib/store";
import { getAvailableSlots, endFromStart } from "@/lib/scheduling/slots";
import { notificarTurno } from "@/lib/telegram";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import type { Modalidad } from "@/lib/scheduling/types";

const MAX = 600;
function clean(v: unknown, max = MAX) {
  return String(v ?? "").trim().slice(0, max);
}

// Tope de tamaño del body (un turno son <2KB; 16KB es holgado). Evita pagar el
// costo de parsear payloads gigantes en la lambda.
function tooLarge(req: Request): boolean {
  const len = Number(req.headers.get("content-length") || 0);
  return Number.isFinite(len) && len > 16_000;
}

// Acepta como contacto un email o un teléfono con al menos 7 dígitos.
function contactoPlausible(c: string): boolean {
  const digits = (c.match(/\d/g) || []).length;
  const esEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c);
  return esEmail || digits >= 7;
}

export async function POST(req: Request) {
  try {
    // Rechazo temprano de bodies enormes (DoS por parseo) antes de leer el JSON.
    if (tooLarge(req)) {
      return NextResponse.json({ ok: false, error: "Solicitud demasiado grande." }, { status: 413 });
    }
    // Anti-flood: máx. 8 reservas cada 10 min por IP. Frena spam de turnos
    // falsos y abuso del notificador antes de tocar la base.
    const rl = rateLimit(`turnos:${clientIp(req)}`, 8, 10 * 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { ok: false, error: "Demasiadas solicitudes. Probá de nuevo en unos minutos." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "Datos inválidos." }, { status: 400 });
    }
    const nombre = clean(body.nombre, 120);
    const contacto = clean(body.contacto, 160);
    const modalidad: Modalidad = body.modalidad === "presencial" ? "presencial" : "online";
    const startsAtIn = clean(body.startsAt, 40);
    const motivo = clean(body.motivo, MAX);
    const preferencia = clean(body.preferencia, MAX);
    const serviceId = clean(body.serviceId, 60) || undefined;
    const staffId = clean(body.staffId, 60) || undefined;

    if (!nombre || !contacto) {
      return NextResponse.json(
        { ok: false, error: "Faltan datos obligatorios." },
        { status: 400 }
      );
    }
    // Contacto con un mínimo de sustancia (un teléfono o email real): frena
    // basura tipo "a" y dificulta el spam con contactos sintéticos.
    if (!contactoPlausible(contacto)) {
      return NextResponse.json(
        { ok: false, error: "Dejanos un WhatsApp o email válido para confirmarte." },
        { status: 400 }
      );
    }
    // Segundo límite, por contacto: evita que un mismo número/email squattee
    // muchos slots aunque rote de IP.
    const rlC = rateLimit(`turnos-c:${contacto.toLowerCase()}`, 4, 30 * 60_000);
    if (!rlC.ok) {
      return NextResponse.json(
        { ok: false, error: "Ya tenés varias solicitudes en curso. Te contactamos pronto." },
        { status: 429, headers: { "Retry-After": String(rlC.retryAfter) } }
      );
    }

    // Servicio/profesional autoritativos desde el servidor (no del cliente).
    const services = await listServices(); // catálogo completo (precio aunque esté inactivo)
    const svc = serviceId ? services.find((s) => s.id === serviceId) : undefined;
    if (serviceId && !svc) {
      return NextResponse.json({ ok: false, error: "Servicio inválido." }, { status: 400 });
    }
    const stf = staffId
      ? (await listStaff()).find((s) => s.id === staffId)
      : undefined;
    if (staffId && !stf) {
      return NextResponse.json({ ok: false, error: "Profesional inválido." }, { status: 400 });
    }
    const serviceName = svc?.nombre;
    const precio = svc?.priceARS;
    const staffName = stf?.nombre;

    let startsAt: string | undefined;
    let endsAt: string | undefined;

    if (startsAtIn) {
      // 1) Fecha válida (cierra el bypass por NaN)
      if (Number.isNaN(new Date(startsAtIn).getTime())) {
        return NextResponse.json({ ok: false, error: "Fecha inválida." }, { status: 400 });
      }
      // 2) Debe ser un SLOT REAL generado por el motor para ese servicio/profesional
      const durationMin = svc?.durationMin;
      const [{ config, rules, exceptions }, busy] = await Promise.all([
        getScheduling(),
        getBusy(staffId),
      ]);
      const dias = getAvailableSlots({ modalidad, durationMin, rules, config, exceptions, busy });
      const existe = dias.some((d) => d.slots.some((sl) => sl.startsAt === startsAtIn));
      if (!existe) {
        return NextResponse.json(
          { ok: false, error: "Ese horario ya no está disponible. Elegí otro." },
          { status: 409 }
        );
      }
      startsAt = startsAtIn;
      // 3) El fin lo calcula el servidor (no se confía en el cliente)
      endsAt = endFromStart(startsAt, durationMin ?? config.slotDurationMin);
    }

    // Inserción ATÓMICA con re-chequeo de solape dentro de la cola (anti-overbooking).
    const base = {
      nombre,
      contacto,
      modalidad,
      serviceId,
      serviceName,
      staffId,
      staffName,
      precio,
      preferencia,
      motivo,
    };

    let solicitud;
    if (startsAt && endsAt) {
      solicitud = await addSolicitudSiLibre({ ...base, startsAt, endsAt });
      if (!solicitud) {
        return NextResponse.json(
          { ok: false, error: "Ese horario se acaba de ocupar. Elegí otro." },
          { status: 409 }
        );
      }
    } else {
      // Flujo sin slot (preferencia a coordinar)
      solicitud = await addSolicitud({ ...base, startsAt: undefined, endsAt: undefined });
    }

    notificarTurno(solicitud).catch(() => {});
    return NextResponse.json({ ok: true, id: solicitud.id });
  } catch (e) {
    console.error("[api/turnos]", e);
    return NextResponse.json(
      { ok: false, error: "Error al registrar la solicitud." },
      { status: 500 }
    );
  }
}
