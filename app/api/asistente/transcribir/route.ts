import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, SESSION_COOKIE } from "@/lib/auth";
import { transcribe, aiConfigured } from "@/lib/openai";

export const dynamic = "force-dynamic";

// POST (multipart) { audio } → { ok, text } : voz → texto para el asistente.
export async function POST(req: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifyToken(token))) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  if (!aiConfigured()) {
    return NextResponse.json({ ok: false, error: "Falta OPENAI_API_KEY." });
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("audio");
    if (f instanceof File) file = f;
  } catch {
    return NextResponse.json({ ok: false, error: "Audio inválido." }, { status: 400 });
  }
  if (!file) return NextResponse.json({ ok: false, error: "Falta el audio." }, { status: 400 });
  // Tope de tamaño (Whisper admite hasta ~25MB; cortamos antes para no pagar de más).
  if (file.size > 12_000_000) {
    return NextResponse.json({ ok: false, error: "El audio es demasiado largo." }, { status: 413 });
  }

  try {
    const text = await transcribe(file);
    return NextResponse.json({ ok: true, text });
  } catch (e) {
    console.error("[transcribir]", e);
    return NextResponse.json({ ok: false, error: "No pude transcribir el audio." });
  }
}
