import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, SESSION_COOKIE } from "@/lib/auth";
import { claude, anthropicConfigured, type Msg, type Block } from "@/lib/anthropic";
import { TOOLS, WRITE_TOOLS, runReadTool, describeWriteTool, buildSystemPrompt } from "@/lib/assistant/tools";

export const dynamic = "force-dynamic";

async function isAdmin(): Promise<boolean> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifyToken(token);
}

function textOf(content: Block[]): string {
  return content
    .filter((b): b is Extract<Block, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

// POST { messages: Msg[] } → { type: "text" | "confirm" | "error", ... }
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ type: "error", error: "No autorizado" }, { status: 401 });
  }
  if (!anthropicConfigured()) {
    return NextResponse.json({
      type: "error",
      error: "El asistente no está configurado: falta ANTHROPIC_API_KEY en las variables de entorno.",
    });
  }

  let messages: Msg[] = [];
  try {
    const raw = await req.text();
    if (raw.length > 200_000) {
      return NextResponse.json({ type: "error", error: "La conversación es demasiado larga." }, { status: 413 });
    }
    const body = JSON.parse(raw);
    messages = Array.isArray(body?.messages) ? body.messages : [];
  } catch {
    return NextResponse.json({ type: "error", error: "Datos inválidos." }, { status: 400 });
  }
  if (!messages.length) {
    return NextResponse.json({ type: "error", error: "Sin mensajes." }, { status: 400 });
  }

  const system = buildSystemPrompt();
  try {
    // Loop agéntico: ejecutamos lecturas y seguimos; al primer pedido de escritura,
    // frenamos y devolvemos la propuesta para que la usuaria confirme.
    for (let i = 0; i < 6; i++) {
      const resp = await claude({ system, tools: TOOLS, messages });
      const toolUse = resp.content.find(
        (b): b is Extract<Block, { type: "tool_use" }> => b.type === "tool_use"
      );
      const assistantMsg: Msg = { role: "assistant", content: resp.content };

      if (!toolUse) {
        return NextResponse.json({ type: "text", text: textOf(resp.content) || "…", messages: [...messages, assistantMsg] });
      }
      if (WRITE_TOOLS.has(toolUse.name)) {
        return NextResponse.json({
          type: "confirm",
          text: textOf(resp.content),
          proposal: {
            toolUseId: toolUse.id,
            tool: toolUse.name,
            input: toolUse.input,
            resumen: describeWriteTool(toolUse.name, toolUse.input),
          },
          messages: [...messages, assistantMsg],
        });
      }
      const result = await runReadTool(toolUse.name, toolUse.input);
      messages = [
        ...messages,
        assistantMsg,
        { role: "user", content: [{ type: "tool_result", tool_use_id: toolUse.id, content: result }] },
      ];
    }
    return NextResponse.json({ type: "text", text: "No pude completar el pedido (demasiados pasos). Probá reformularlo.", messages });
  } catch (e) {
    console.error("[asistente]", e);
    return NextResponse.json({ type: "error", error: "Hubo un error con el asistente. Probá de nuevo." });
  }
}
