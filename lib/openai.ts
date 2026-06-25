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

/** fetch con timeout (AbortController) y mensaje claro si se cuelga la red. */
async function timedFetch(url: string, init: RequestInit, ms = 25000): Promise<Response> {
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("El asistente tardó demasiado. Probá de nuevo.");
    }
    throw new Error("No pude conectar con OpenAI. Probá de nuevo.");
  } finally {
    clearTimeout(to);
  }
}

/** Convierte una respuesta no-ok de OpenAI en un error con mensaje claro (sin filtrar internos). */
async function throwFriendly(r: Response): Promise<never> {
  const body = await r.text().catch(() => "");
  if (r.status === 401) throw new Error("La API key del asistente es inválida o fue revocada.");
  if (r.status === 429) {
    throw new Error(
      /quota|insufficient/i.test(body)
        ? "Se agotó el crédito de OpenAI. Cargá saldo en platform.openai.com."
        : "Hay mucha demanda en OpenAI. Probá en un momento."
    );
  }
  if (r.status >= 500) throw new Error("OpenAI tuvo un problema. Probá de nuevo.");
  throw new Error("No pude procesar el pedido con OpenAI.");
}

/** Una llamada a OpenAI con tools. Lanza con mensaje claro si falta la key o falla. */
export async function aiChat(input: { messages: OAIMessage[]; tools: OAITool[] }): Promise<OAIResponse> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY sin configurar");
  const init: RequestInit = {
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
  };

  let r = await timedFetch(API_URL, init);
  // Un reintento ante rate-limit / fallo transitorio del lado de OpenAI.
  if (!r.ok && (r.status === 429 || r.status >= 500)) {
    await new Promise((res) => setTimeout(res, 800));
    r = await timedFetch(API_URL, init);
  }
  if (!r.ok) await throwFriendly(r);

  const data = await r.json();
  const msg = data.choices?.[0]?.message ?? {};
  return {
    content: msg.content ?? null,
    toolCalls: Array.isArray(msg.tool_calls) ? msg.tool_calls : [],
    finishReason: data.choices?.[0]?.finish_reason ?? "",
  };
}

// ── Transcripción de audio (voz → texto) con Whisper ──
const TRANSCRIBE_URL = "https://api.openai.com/v1/audio/transcriptions";
const TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1";

/** Transcribe un audio a texto (español). Lanza si falta la key o la API falla. */
export async function transcribe(file: File): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY sin configurar");
  const form = new FormData();
  form.append("file", file);
  form.append("model", TRANSCRIBE_MODEL);
  form.append("language", "es");
  const r = await timedFetch(TRANSCRIBE_URL, {
    method: "POST",
    headers: { authorization: `Bearer ${key}` },
    body: form,
  });
  if (!r.ok) await throwFriendly(r);
  const data = await r.json();
  return String(data.text || "").trim();
}
