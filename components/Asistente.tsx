"use client";

import { useEffect, useRef, useState } from "react";

type ApiMsg = { role: string; content?: unknown; tool_call_id?: string; tool_calls?: unknown };
type Proposal = { toolCallId: string; tool: string; input: Record<string, unknown>; resumen: string };
type Estado = "pending" | "done" | "cancelled";
type ViewItem = {
  id: number;
  role: "user" | "assistant";
  text: string;
  proposal?: Proposal;
  estado?: Estado;
  result?: string;
  ok?: boolean;
};

const SUGERENCIAS = [
  "¿Qué turnos tengo hoy?",
  "¿Quién me debe plata?",
  "Resumen de finanzas del mes",
  "¿Qué solicitudes tengo pendientes?",
];

let UID = 0;
const uid = () => ++UID;

export function Asistente() {
  const [view, setView] = useState<ViewItem[]>([]);
  const [api, setApi] = useState<ApiMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const busyRef = useRef(false); // candado síncrono contra doble ejecución

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [view, loading]);

  async function chat(messages: ApiMsg[]) {
    setLoading(true);
    try {
      const r = await fetch("/api/asistente", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      const data = await r.json();
      if (Array.isArray(data.messages)) setApi(data.messages);
      if (data.type === "text") {
        setView((v) => [...v, { id: uid(), role: "assistant", text: data.text || "…" }]);
      } else if (data.type === "confirm") {
        setView((v) => [
          ...v,
          { id: uid(), role: "assistant", text: data.text || "", proposal: data.proposal, estado: "pending" },
        ]);
      } else {
        setView((v) => [...v, { id: uid(), role: "assistant", text: "⚠️ " + (data.error || "Error.") }]);
      }
    } catch {
      setView((v) => [...v, { id: uid(), role: "assistant", text: "⚠️ No pude conectar con el asistente." }]);
    } finally {
      setLoading(false);
    }
  }

  // Si hay una propuesta pendiente y la usuaria sigue escribiendo, la cancelamos
  // (cerramos el tool_use con un tool_result) para no romper el hilo.
  function cerrarPendiente(messages: ApiMsg[]): ApiMsg[] {
    const pend = view.find((x) => x.proposal && x.estado === "pending");
    if (!pend?.proposal) return messages;
    setView((v) => v.map((x) => (x.id === pend.id ? { ...x, estado: "cancelled" } : x)));
    return [
      ...messages,
      { role: "tool", tool_call_id: pend.proposal.toolCallId, content: "El usuario canceló esta acción." },
    ];
  }

  function enviar(texto: string) {
    const t = texto.trim();
    if (!t || loading) return;
    // Si hay una acción esperando confirmación y la usuaria responde por texto,
    // interpretamos sí/no sobre ESA acción (en vez de reabrir otra propuesta).
    const pend = view.find((x) => x.proposal && x.estado === "pending");
    if (pend) {
      if (/^(s[ií]|dale|ok(a|ay)?|confirm[aá]r?|de una|listo|hac[eé]lo|perfecto|correcto)\.?$/i.test(t)) {
        setInput("");
        setView((v) => [...v, { id: uid(), role: "user", text: t }]);
        confirmar(pend);
        return;
      }
      if (/^(no|cancel[aá]r?|negativo|par[aá]|mejor no)\.?$/i.test(t)) {
        setInput("");
        setView((v) => [...v, { id: uid(), role: "user", text: t }]);
        cancelar(pend);
        return;
      }
    }
    setInput("");
    const base = cerrarPendiente(api);
    const next: ApiMsg[] = [...base, { role: "user", content: t }];
    setApi(next);
    setView((v) => [...v, { id: uid(), role: "user", text: t }]);
    chat(next);
  }

  async function confirmar(item: ViewItem) {
    if (!item.proposal || item.estado !== "pending" || busyRef.current) return;
    busyRef.current = true; // candado síncrono: ni doble click ni "si" la disparan dos veces
    setLoading(true);
    setView((v) => v.map((x) => (x.id === item.id ? { ...x, estado: "done" } : x)));
    const toolCallId = item.proposal.toolCallId;
    let result = "No se pudo ejecutar la acción.";
    let okFlag = false;
    try {
      const r = await fetch("/api/asistente/execute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tool: item.proposal.tool, input: item.proposal.input }),
      });
      let data: { ok?: boolean; result?: string; error?: string } = {};
      try {
        data = await r.json();
      } catch {
        /* respuesta no-JSON (ej. 500 con HTML) */
      }
      if (r.status === 401) {
        result = "Tu sesión venció. Recargá la página e ingresá de nuevo.";
      } else {
        result = data.result || data.error || (r.ok ? "Hecho." : "No se pudo ejecutar la acción.");
        okFlag = !!data.ok && r.ok;
      }
    } catch {
      result = "No pude conectar para ejecutar la acción.";
    }
    setView((v) => v.map((x) => (x.id === item.id ? { ...x, result, ok: okFlag } : x)));
    // Pase lo que pase, cerramos el tool_call en el hilo: si no, OpenAI rechaza el
    // próximo mensaje (assistant con tool_calls sin su tool_result) y rompe el chat.
    const next: ApiMsg[] = [...api, { role: "tool", tool_call_id: toolCallId, content: result }];
    setApi(next);
    busyRef.current = false;
    await chat(next);
  }

  function cancelar(item: ViewItem) {
    if (!item.proposal || item.estado !== "pending" || busyRef.current) return;
    setView((v) => v.map((x) => (x.id === item.id ? { ...x, estado: "cancelled" } : x)));
    const next: ApiMsg[] = [
      ...api,
      { role: "tool", tool_call_id: item.proposal.toolCallId, content: "El usuario canceló esta acción." },
    ];
    setApi(next);
    chat(next);
  }

  // Grabar audio del micrófono → transcribir (Whisper) → poner el texto en el input.
  async function toggleMic() {
    if (recording) {
      recRef.current?.stop();
      return;
    }
    if (loading || transcribing) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size < 1500) return; // muy corto, ignorar
        setTranscribing(true);
        try {
          const fd = new FormData();
          fd.append("audio", blob, "audio.webm");
          const r = await fetch("/api/asistente/transcribir", { method: "POST", body: fd });
          const data = await r.json();
          if (data.ok && data.text) setInput((p) => (p ? p + " " : "") + data.text);
          else setView((v) => [...v, { id: uid(), role: "assistant", text: "⚠️ " + (data.error || "No pude transcribir el audio.") }]);
        } catch {
          setView((v) => [...v, { id: uid(), role: "assistant", text: "⚠️ No pude transcribir el audio." }]);
        } finally {
          setTranscribing(false);
        }
      };
      recRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setView((v) => [...v, { id: uid(), role: "assistant", text: "⚠️ No pude acceder al micrófono. Revisá los permisos del navegador." }]);
    }
  }

  return (
    <div className="admin-card flex h-[calc(100vh-12rem)] min-h-[28rem] flex-col overflow-hidden rounded-2xl">
      {/* Mensajes */}
      <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
        {view.length === 0 && (
          <div className="mx-auto max-w-md py-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--a-accent)]/12 text-[var(--a-accent)]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 8V4M8 12H4m16 0h-4M12 16v4" /><circle cx="12" cy="12" r="4" />
              </svg>
            </div>
            <p className="text-[15px] font-medium text-espresso">Tu asistente del consultorio</p>
            <p className="admin-muted mt-1 text-[13px]">Pedile que consulte tu agenda y finanzas, o que agende y cobre por vos (siempre confirmás antes).</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {SUGERENCIAS.map((s) => (
                <button key={s} onClick={() => enviar(s)} className="admin-chip rounded-full px-3.5 py-1.5 text-[12.5px] hover:border-[var(--a-border-strong)]">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {view.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[var(--a-accent)] px-3.5 py-2.5 text-[14px] text-white">{m.text}</div>
            </div>
          ) : (
            <div key={m.id} className="flex justify-start">
              <div className="max-w-[88%] space-y-2.5">
                {m.text && (
                  <div className="admin-soft whitespace-pre-wrap rounded-2xl rounded-bl-md px-3.5 py-2.5 text-[14px] leading-relaxed text-espresso">{m.text}</div>
                )}
                {m.proposal && (
                  <div className="rounded-2xl border border-[var(--a-border-strong)] bg-[var(--a-surface)] p-3.5">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 text-[var(--a-accent)]">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01" /><circle cx="12" cy="12" r="9" /></svg>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="admin-kicker text-[11px]">Confirmá la acción</p>
                        <p className="mt-1 text-[13.5px] font-medium text-espresso">{m.proposal.resumen}</p>
                      </div>
                    </div>
                    {m.estado === "pending" ? (
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => confirmar(m)} disabled={loading} className="admin-btn rounded-full px-4 py-1.5 text-[13px] font-medium disabled:opacity-50">
                          Confirmar
                        </button>
                        <button onClick={() => cancelar(m)} disabled={loading} className="admin-btn-ghost rounded-full px-4 py-1.5 text-[13px] font-medium disabled:opacity-50">
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <p className={`mt-2.5 whitespace-pre-wrap text-[13px] font-medium ${
                        m.estado === "cancelled" ? "admin-muted" : m.ok ? "text-[#1c7a45]" : "text-[var(--a-danger)]"
                      }`}>
                        {m.estado === "cancelled" ? "Cancelada." : m.result || (m.ok ? "Hecho." : "No se pudo.")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="admin-soft flex items-center gap-1.5 rounded-2xl rounded-bl-md px-3.5 py-3">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--a-text-3)] [animation-delay:-0.2s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--a-text-3)] [animation-delay:-0.1s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--a-text-3)]" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => { e.preventDefault(); enviar(input); }}
        className="flex items-end gap-2 border-t border-[var(--a-border)] p-3"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(input); } }}
          rows={1}
          disabled={recording || transcribing}
          placeholder={
            recording ? "Grabando… tocá el micrófono para terminar" : transcribing ? "Transcribiendo…" : "Escribí o usá el micrófono…"
          }
          className="admin-input max-h-32 flex-1 resize-none rounded-2xl px-3.5 py-2.5 text-[14px] text-espresso disabled:opacity-60"
        />
        {/* Micrófono: voz → texto */}
        <button
          type="button"
          onClick={toggleMic}
          disabled={loading || transcribing}
          aria-label={recording ? "Detener grabación" : "Grabar audio"}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40 ${
            recording ? "animate-pulse bg-[var(--a-danger)] text-white" : "admin-btn-ghost"
          }`}
        >
          {transcribing ? (
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
          ) : recording ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4" /></svg>
          )}
        </button>
        <button type="submit" disabled={loading || recording || transcribing || !input.trim()} className="admin-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-full disabled:opacity-40" aria-label="Enviar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" /></svg>
        </button>
      </form>
    </div>
  );
}
