"use client";

import { useEffect, useRef, useState } from "react";

type ApiMsg = { role: "user" | "assistant"; content: unknown };
type Proposal = { toolUseId: string; tool: string; input: Record<string, unknown>; resumen: string };
type Estado = "pending" | "done" | "cancelled";
type ViewItem = {
  id: number;
  role: "user" | "assistant";
  text: string;
  proposal?: Proposal;
  estado?: Estado;
  result?: string;
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
  const scroller = useRef<HTMLDivElement>(null);

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
      { role: "user", content: [{ type: "tool_result", tool_use_id: pend.proposal.toolUseId, content: "El usuario canceló esta acción." }] },
    ];
  }

  function enviar(texto: string) {
    const t = texto.trim();
    if (!t || loading) return;
    setInput("");
    const base = cerrarPendiente(api);
    const next: ApiMsg[] = [...base, { role: "user", content: t }];
    setApi(next);
    setView((v) => [...v, { id: uid(), role: "user", text: t }]);
    chat(next);
  }

  async function confirmar(item: ViewItem) {
    if (!item.proposal || loading) return;
    setLoading(true);
    setView((v) => v.map((x) => (x.id === item.id ? { ...x, estado: "done" } : x)));
    try {
      const r = await fetch("/api/asistente/execute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tool: item.proposal.tool, input: item.proposal.input }),
      });
      const data = await r.json();
      const result = data.result || (data.ok ? "Hecho." : "No se pudo ejecutar.");
      setView((v) => v.map((x) => (x.id === item.id ? { ...x, result } : x)));
      const next: ApiMsg[] = [
        ...api,
        { role: "user", content: [{ type: "tool_result", tool_use_id: item.proposal.toolUseId, content: result }] },
      ];
      setApi(next);
      await chat(next);
    } catch {
      setView((v) => v.map((x) => (x.id === item.id ? { ...x, result: "⚠️ Error al ejecutar." } : x)));
      setLoading(false);
    }
  }

  function cancelar(item: ViewItem) {
    if (!item.proposal || loading) return;
    setView((v) => v.map((x) => (x.id === item.id ? { ...x, estado: "cancelled" } : x)));
    const next: ApiMsg[] = [
      ...api,
      { role: "user", content: [{ type: "tool_result", tool_use_id: item.proposal.toolUseId, content: "El usuario canceló esta acción." }] },
    ];
    setApi(next);
    chat(next);
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
                      <p className={`mt-2.5 text-[13px] font-medium ${m.estado === "cancelled" ? "admin-muted" : "text-[#1c7a45]"}`}>
                        {m.estado === "cancelled" ? "Cancelada." : m.result || "Hecho."}
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
          placeholder="Escribile a tu asistente…"
          className="admin-input max-h-32 flex-1 resize-none rounded-2xl px-3.5 py-2.5 text-[14px] text-espresso"
        />
        <button type="submit" disabled={loading || !input.trim()} className="admin-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-full disabled:opacity-40" aria-label="Enviar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" /></svg>
        </button>
      </form>
    </div>
  );
}
