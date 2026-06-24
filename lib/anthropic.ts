// Cliente mínimo de la Messages API de Anthropic (Claude), por fetch directo
// para no sumar una dependencia. Solo servidor — la API key NUNCA llega al cliente.
const API_URL = "https://api.anthropic.com/v1/messages";
// Modelo configurable; por defecto uno reciente con buen uso de herramientas.
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

export type Block =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean };

export interface Msg {
  role: "user" | "assistant";
  content: string | Block[];
}

export interface Tool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export function anthropicConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export interface ClaudeResponse {
  content: Block[];
  stop_reason: string | null;
}

/** Una llamada a Claude con tools. Lanza si falta la key o la API responde mal. */
export async function claude(input: {
  system: string;
  messages: Msg[];
  tools: Tool[];
}): Promise<ClaudeResponse> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY sin configurar");

  const r = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: input.system,
      tools: input.tools,
      // Una herramienta por turno: simplifica el gateo de confirmación de escrituras.
      tool_choice: { type: "auto", disable_parallel_tool_use: true },
      messages: input.messages,
    }),
  });

  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`Anthropic ${r.status}: ${t.slice(0, 300)}`);
  }
  const data = await r.json();
  return { content: data.content ?? [], stop_reason: data.stop_reason ?? null };
}
