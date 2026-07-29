import { NextResponse } from "next/server";
import { puede } from "@/lib/session";

import { WRITE_TOOLS, runWriteTool, toolPermitida } from "@/lib/assistant/tools";
import { sesionValida } from "@/lib/session";
import { suscripcionDe } from "@/lib/accounts";
import { puedeEscribir } from "@/lib/planes";

export const dynamic = "force-dynamic";

// POST { tool, input } → ejecuta una acción de escritura YA confirmada por la usuaria.
export async function POST(req: Request) {
  if (!(await puede("asistente_ia"))) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  let tool = "";
  let input: Record<string, unknown> = {};
  try {
    const raw = await req.text();
    if (raw.length > 20_000) {
      return NextResponse.json({ ok: false, result: "Solicitud demasiado grande." }, { status: 413 });
    }
    const b = JSON.parse(raw);
    tool = String(b?.tool || "");
    input = b?.input && typeof b.input === "object" ? b.input : {};
  } catch {
    return NextResponse.json({ ok: false, result: "Datos inválidos." }, { status: 400 });
  }
  if (!WRITE_TOOLS.has(tool)) {
    return NextResponse.json({ ok: false, result: "Acción no permitida." }, { status: 400 });
  }
  // Además del permiso de usar el asistente, hace falta el permiso del DOMINIO
  // que toca la acción (cobrar exige finanzas, bloquear exige disponibilidad…).
  const sesion = await sesionValida();
  if (!sesion || !toolPermitida(tool, sesion.puede)) {
    return NextResponse.json({ ok: false, result: "No tenés permiso para hacer eso." }, { status: 403 });
  }
  // El asistente escribe en el store salteándose las server actions, así que el
  // gate de suscripción hay que aplicarlo también acá: si no, el modo solo
  // lectura se puede evitar pidiéndole al asistente que lo haga.
  if (sesion.pid && !puedeEscribir(await suscripcionDe(sesion.pid))) {
    return NextResponse.json(
      { ok: false, result: "Tu cuenta está en modo solo lectura: podés consultar, no cargar datos." },
      { status: 402 }
    );
  }
  try {
    const res = await runWriteTool(tool, input);
    return NextResponse.json({ ok: res.ok, result: res.mensaje });
  } catch (e) {
    console.error("[asistente/execute]", e);
    return NextResponse.json({ ok: false, result: "No se pudo ejecutar la acción." });
  }
}
