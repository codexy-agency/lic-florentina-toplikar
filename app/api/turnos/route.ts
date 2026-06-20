import { NextResponse } from "next/server";
import { addSolicitud, getBusy, listServices, listStaff } from "@/lib/store";
import { notificarTurno } from "@/lib/telegram";

const MAX = 600; // límite de longitud por campo

function clean(v: unknown, max = MAX) {
  return String(v ?? "").trim().slice(0, max);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const nombre = clean(body.nombre, 120);
    const contacto = clean(body.contacto, 160);
    const modalidad = body.modalidad === "presencial" ? "presencial" : "online";
    const startsAt = clean(body.startsAt, 40);
    const endsAt = clean(body.endsAt, 40);
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

    // Nombres y precio autoritativos desde el servidor (no confiar en el cliente).
    let serviceName: string | undefined;
    let staffName: string | undefined;
    let precio: number | undefined;
    if (serviceId) {
      // catálogo completo: capturar nombre+precio aunque el servicio se haya desactivado
      const svc = (await listServices()).find((s) => s.id === serviceId);
      serviceName = svc?.nombre;
      precio = svc?.priceARS;
    }
    if (staffId) {
      const st = (await listStaff()).find((s) => s.id === staffId);
      staffName = st?.nombre;
    }

    // Anti doble-reserva por profesional (en Supabase: constraint de exclusión
    // tstzrange por staff). Re-chequea que el slot siga libre PARA ESA profesional.
    if (startsAt && endsAt) {
      const busy = await getBusy(staffId);
      const s = new Date(startsAt).getTime();
      const e = new Date(endsAt).getTime();
      const tomado = busy.some((b) => {
        const bs = new Date(b.startsAt).getTime();
        const be = new Date(b.endsAt).getTime();
        return s < be && bs < e;
      });
      if (tomado) {
        return NextResponse.json(
          { ok: false, error: "Ese horario se acaba de ocupar. Elegí otro." },
          { status: 409 }
        );
      }
    }

    const solicitud = await addSolicitud({
      nombre,
      contacto,
      modalidad,
      serviceId,
      serviceName,
      staffId,
      staffName,
      precio,
      startsAt: startsAt || undefined,
      endsAt: endsAt || undefined,
      preferencia,
      motivo,
    });
    notificarTurno(solicitud).catch(() => {});
    return NextResponse.json({ ok: true, id: solicitud.id });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Error al registrar la solicitud." },
      { status: 500 }
    );
  }
}
