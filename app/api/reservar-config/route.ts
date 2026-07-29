import { NextResponse } from "next/server";
import { getBookingConfig, getMarca } from "@/lib/store";
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
    // La ciudad va en la respuesta porque el selector de modalidad la nombra
    // ("Presencial en …"). Estaba escrita a mano en el componente, así que el
    // reservador de cada consultorio ofrecía la ciudad de otra profesional.
    // Sólo se expone la ciudad: nada más de la marca hace falta acá.
    let ciudad = "";
    try {
      ciudad = (await getMarca()).ciudad;
    } catch {
      ciudad = "";
    }
    return NextResponse.json({ ok: true, services, staff, ciudad });
  } catch (e) {
    console.error("[api/reservar-config]", e);
    return NextResponse.json({ ok: false, services: [], staff: [], ciudad: "" }, { status: 500 });
  }
}
