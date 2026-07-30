import { NextResponse } from "next/server";
import { getBookingConfig, getMarca } from "@/lib/store";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { tenantDelRequest } from "@/lib/session";

export const dynamic = "force-dynamic";

// GET /api/reservar-config → servicios activos + profesionales activas (para el wizard)
export async function GET(req: Request) {
  try {
    // Con el consultorio adelante: si no, el tráfico de un cliente frena al otro.
    const pidRl = (await tenantDelRequest()) ?? "-";
    const rl = rateLimit(`reservar-config:${pidRl}:${clientIp(req)}`, 60, 60_000);
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
    let m = null;
    try {
      m = await getMarca();
    } catch {
      m = null;
    }
    return NextResponse.json({
      ok: true,
      services,
      staff,
      ciudad: m?.ciudad ?? "",
      // Datos del RESPONSABLE del tratamiento, para el texto del consentimiento.
      // Es el profesional, no Codexy, y la ley pide identificarlo. Sólo se
      // exponen estos tres campos: ya son públicos en el sitio.
      nombre: m?.nombre ?? "",
      titulo: m?.titulo ?? "",
      email: m?.email ?? "",
    });
  } catch (e) {
    console.error("[api/reservar-config]", e);
    return NextResponse.json(
      { ok: false, services: [], staff: [], ciudad: "", nombre: "", titulo: "", email: "" },
      { status: 500 }
    );
  }
}
