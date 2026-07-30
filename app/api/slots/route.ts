import { NextResponse } from "next/server";
import { getScheduling, getBusy, listServices } from "@/lib/store";
import { getAvailableSlots } from "@/lib/scheduling/slots";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { tenantDelRequest } from "@/lib/session";
import type { Modalidad } from "@/lib/scheduling/types";

export const dynamic = "force-dynamic";

// GET /api/slots?modalidad=online&serviceId=...&staffId=... → días con horarios libres
export async function GET(req: Request) {
  try {
    // Endpoint público que lee el estado completo: lo limitamos para que un loop
    // anónimo no sature las lambdas ni infle las lecturas de Supabase.
    // El bucket lleva el consultorio: una IP puede visitar dos sitios distintos,
    // y sin el pid el tráfico de un cliente le consume el cupo al otro.
    const pidRl = (await tenantDelRequest()) ?? "-";
    const rl = rateLimit(`slots:${pidRl}:${clientIp(req)}`, 60, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { ok: false, dias: [] },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
      );
    }
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
  } catch (e) {
    console.error("[api/slots]", e);
    return NextResponse.json({ ok: false, dias: [] }, { status: 500 });
  }
}
