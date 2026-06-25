import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, SESSION_COOKIE } from "@/lib/auth";
import { aiChat, aiConfigured, type OAIMessage } from "@/lib/openai";
import { TOOLS, WRITE_TOOLS, runReadTool, describeWriteTool, buildSystemPrompt } from "@/lib/assistant/tools";

export const dynamic = "force-dynamic";

async function isAdmin(): Promise<boolean> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifyToken(token);
}

function parseArgs(raw: string): Record<string, unknown> {
  try {
    const v = JSON.parse(raw || "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

// POST { messages: OAIMessage[] (sin el system) } → { type: "text" | "confirm" | "error", ... }
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ type: "error", error: "No autorizado" }, { status: 401 });
  }
  if (!aiConfigured()) {
    return NextResponse.json({
      type: "error",
      error: "El asistente no está configurado: falta OPENAI_API_KEY en las variables de entorno.",
    });
  }

  let messages: OAIMessage[] = [];
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

  const system: OAIMessage = { role: "system", content: buildSystemPrompt() };
  try {
    // Loop agéntico: ejecutamos lecturas y seguimos; al primer pedido de escritura,
    // frenamos y devolvemos la propuesta para que la usuaria confirme.
    for (let i = 0; i < 6; i++) {
      const resp = await aiChat({ messages: [system, ...messages], tools: TOOLS });
      const tc = resp.toolCalls[0];

      if (!tc) {
        let text = resp.content || "";
        if (!text) {
          text =
            resp.finishReason === "length"
              ? "Se me cortó la respuesta. Pedímelo más acotado (ej. por paciente o por semana)."
              : "No tengo una respuesta para eso. ¿Lo reformulás?";
        }
        const assistantMsg: OAIMessage = { role: "assistant", content: text };
        return NextResponse.json({ type: "text", text, messages: [...messages, assistantMsg] });
      }

      const name = tc.function.name;
      const input = parseArgs(tc.function.arguments);
      const assistantMsg: OAIMessage = { role: "assistant", content: resp.content, tool_calls: [tc] };

      if (WRITE_TOOLS.has(name)) {
        return NextResponse.json({
          type: "confirm",
          text: resp.content || "",
          proposal: { toolCallId: tc.id, tool: name, input, resumen: describeWriteTool(name, input) },
          messages: [...messages, assistantMsg],
        });
      }

      const result = await runReadTool(name, input);
      messages = [...messages, assistantMsg, { role: "tool", tool_call_id: tc.id, content: result }];
    }
    return NextResponse.json({ type: "text", text: "No pude completar el pedido (demasiados pasos). Probá reformularlo.", messages });
  } catch (e) {
    console.error("[asistente]", e);
    // Los errores de aiChat ya vienen con mensaje claro (quota, key, timeout…).
    const error = e instanceof Error && e.message ? e.message : "Hubo un error con el asistente. Probá de nuevo.";
    return NextResponse.json({ type: "error", error });
  }
}
