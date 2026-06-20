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
import type { Modalidad } from "@/lib/scheduling/types";

const MAX = 600;
function clean(v: unknown, max = MAX) {
  return String(v ?? "").trim().slice(0, max);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
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

    // Servicio/profesional autoritativos desde el servidor (no del cliente).
    const services = await listServices(); // catálogo completo (precio aunque esté inactivo)
    const svc = serviceId ? services.find((s) => s.id === serviceId) : undefined;
    const serviceName = svc?.nombre;
    const precio = svc?.priceARS;
    const staffName = staffId
      ? (await listStaff()).find((s) => s.id === staffId)?.nombre
      : undefined;

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
  } catch {
    return NextResponse.json(
      { ok: false, error: "Error al registrar la solicitud." },
      { status: 500 }
    );
  }
}
