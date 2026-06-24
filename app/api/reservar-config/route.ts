import { NextResponse } from "next/server";
import { getBookingConfig } from "@/lib/store";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

// GET /api/reservar-config → servicios activos + profesionales activas (para el wizard)
export async function GET(req: Request) {
  try {
    const rl = rateLimit(`reservar-config:${clientIp(req)}`, 60, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { ok: false, services: [], staff: [] },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
      );
    }
    const { services, staff } = await getBookingConfig();
    return NextResponse.json({ ok: true, services, staff });
  } catch (e) {
    console.error("[api/reservar-config]", e);
    return NextResponse.json({ ok: false, services: [], staff: [] }, { status: 500 });
  }
}
