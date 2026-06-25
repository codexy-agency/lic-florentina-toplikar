// Cliente mínimo de la Chat Completions API de OpenAI (function calling), por
// fetch directo para no sumar dependencia. Solo servidor — la key NUNCA va al cliente.
const API_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };

export type OAIMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export interface OAITool {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

export function aiConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export interface OAIResponse {
  content: string | null;
  toolCalls: ToolCall[];
  finishReason: string;
}

/** Una llamada a OpenAI con tools. Lanza si falta la key o la API responde mal. */
export async function aiChat(input: { messages: OAIMessage[]; tools: OAITool[] }): Promise<OAIResponse> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY sin configurar");

  const r = await fetch(API_URL, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL,
      messages: input.messages,
      tools: input.tools,
      // Una herramienta por turno: simplifica el gateo de confirmación de escrituras.
      parallel_tool_calls: false,
      max_tokens: 1024,
    }),
  });

  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`OpenAI ${r.status}: ${t.slice(0, 300)}`);
  }
  const data = await r.json();
  const msg = data.choices?.[0]?.message ?? {};
  return {
    content: msg.content ?? null,
    toolCalls: Array.isArray(msg.tool_calls) ? msg.tool_calls : [],
    finishReason: data.choices?.[0]?.finish_reason ?? "",
  };
}
