import { NextResponse } from "next/server";
import { getScheduling, getBusy, listServices } from "@/lib/store";
import { getAvailableSlots } from "@/lib/scheduling/slots";
import type { Modalidad } from "@/lib/scheduling/types";

export const dynamic = "force-dynamic";

// GET /api/slots?modalidad=online&serviceId=...&staffId=... → días con horarios libres
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const modParam = searchParams.get("modalidad");
    const modalidad: Modalidad | undefined =
      modParam === "online" || modParam === "presencial" ? modParam : undefined;
    const serviceId = searchParams.get("serviceId") || undefined;
    const staffId = searchParams.get("staffId") || undefined;

    const [{ config, rules, exceptions }, busy, services] = await Promise.all([
      getScheduling(),
      getBusy(staffId), // ocupados SOLO de esta profesional
      listServices(true),
    ]);

    // La duración la define el servicio elegido (si hay).
    const service = serviceId ? services.find((s) => s.id === serviceId) : undefined;
    const durationMin = service?.durationMin;

    const dias = getAvailableSlots({
      modalidad,
      durationMin,
      rules,
      config,
      exceptions,
      busy,
    });
    return NextResponse.json({ ok: true, dias });
  } catch {
    return NextResponse.json({ ok: false, dias: [] }, { status: 500 });
  }
}
