import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, SESSION_COOKIE } from "@/lib/auth";
import { WRITE_TOOLS, runWriteTool } from "@/lib/assistant/tools";

export const dynamic = "force-dynamic";

// POST { tool, input } → ejecuta una acción de escritura YA confirmada por la usuaria.
export async function POST(req: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifyToken(token))) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  let tool = "";
  let input: Record<string, unknown> = {};
  try {
    const b = JSON.parse(await req.text());
    tool = String(b?.tool || "");
    input = b?.input && typeof b.input === "object" ? b.input : {};
  } catch {
    return NextResponse.json({ ok: false, error: "Datos inválidos" }, { status: 400 });
  }
  if (!WRITE_TOOLS.has(tool)) {
    return NextResponse.json({ ok: false, error: "Acción no permitida" }, { status: 400 });
  }
  const result = await runWriteTool(tool, input);
  return NextResponse.json({ ok: true, result });
}
