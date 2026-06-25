"use client";

import { Fragment, useEffect, useRef, useState } from "react";

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

// Iconos lineales finos (varios paths separados por "|").
function Icon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {d.split("|").map((p, i) => (
        <path key={i} d={p} />
      ))}
    </svg>
  );
}
const IC_CALENDAR = "M8 2v4M16 2v4M3 10h18|M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z";
const IC_COIN = "M12 2v20|M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6";
const IC_CHART = "M3 3v18h18|M7 14l3-4 4 3 5-7";
const IC_INBOX = "M22 12h-6l-2 3h-4l-2-3H2|M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1Z";
const IC_CHECK = "M20 6 9 17l-5-5";

const SUGERENCIAS = [
  { label: "Turnos de hoy", full: "¿Qué turnos tengo hoy?", icon: IC_CALENDAR },
  { label: "¿Quién me debe?", full: "¿Quién tiene un pago pendiente?", icon: IC_COIN },
  { label: "Finanzas del mes", full: "Pasame el resumen de finanzas del mes", icon: IC_CHART },
  { label: "Pendientes", full: "¿Qué solicitudes tengo pendientes?", icon: IC_INBOX },
];

function saludo(): string {
  const h = new Date().getHours();
  return h < 12 ? "Buenos días" : h < 20 ? "Buenas tardes" : "Buenas noches";
}

function iconoTool(tool: string): string {
  if (tool === "agendar_turno") return IC_CALENDAR;
  if (tool === "registrar_pago") return IC_COIN;
  if (tool === "cargar_movimiento") return IC_CHART;
  return IC_CHECK;
}

// Campos clave de una propuesta → mini-lista etiqueta/valor de la tarjeta.
function datosClave(input: Record<string, unknown>): { label: string; value: string }[] {
  const s = (v: unknown) => String(v ?? "").trim();
  const out: { label: string; value: string }[] = [];
  const pac = s(input.nombre) || s(input.paciente);
  if (pac) out.push({ label: "Paciente", value: pac });
  if (s(input.fecha)) out.push({ label: "Cuándo", value: s(input.fecha).replace("T", " · ") });
  if (s(input.modalidad)) out.push({ label: "Modalidad", value: s(input.modalidad) });
  if (input.monto != null && s(input.monto)) out.push({ label: "Monto", value: "$" + Number(input.monto).toLocaleString("es-AR") });
  if (s(input.metodo)) out.push({ label: "Método", value: s(input.metodo) });
  if (s(input.concepto)) out.push({ label: "Concepto", value: s(input.concepto) });
  return out.slice(0, 4);
}

let UID = 0;
const uid = () => ++UID;

export function Asistente() {
  const [view, setView] = useState<ViewItem[]>([]);
  const [api, setApi] = useState<ApiMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const busyRef = useRef(false); // candado síncrono contra doble ejecución
  const enviarRef = useRef<(t: string) => void>(() => {}); // última versión de enviar (para el audio)
  const taRef = useRef<HTMLTextAreaElement>(null); // textarea (auto-resize)

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [view, loading]);

  // El textarea crece solo con el contenido (hasta un tope) y se reinicia al limpiar.
  useEffect(() => {
    const t = taRef.current;
    if (!t) return;
    t.style.height = "auto";
    t.style.height = Math.min(t.scrollHeight, 132) + "px";
  }, [input]);

  // Persistencia por sesión: la conversación sobrevive a navegar y volver / recargar
  // (se limpia sola al cerrar el navegador o con el botón de limpiar).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("asistente:chat");
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved?.view) && Array.isArray(saved?.api)) {
          UID = saved.view.reduce((mx: number, x: ViewItem) => Math.max(mx, x.id || 0), 0);
          setView(saved.view);
          setApi(saved.api);
        }
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      if (view.length === 0) sessionStorage.removeItem("asistente:chat");
      else sessionStorage.setItem("asistente:chat", JSON.stringify({ view, api }));
    } catch {
      /* ignore */
    }
  }, [view, api]);

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

  enviarRef.current = enviar; // mantener la referencia fresca en cada render

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
          // Voz → texto → se MANDA directo (aparece como tu mensaje y el asistente
          // responde). No pasa por el campo de texto: para eso escribirías.
          if (data.ok && data.text) enviarRef.current(data.text);
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

  function limpiar() {
    if (loading) return;
    setView([]);
    setApi([]);
  }

  return (
    <div className="admin-card flex h-[calc(100dvh-9rem)] flex-col overflow-hidden rounded-2xl sm:h-[calc(100vh-12rem)] sm:min-h-[28rem]">
      {/* (A) Cabecera del asistente */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--a-border)] bg-[var(--a-surface)] px-5 py-3 sm:px-6">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--a-accent-soft)] ring-1 ring-[var(--a-accent)]/20 sm:h-10 sm:w-10">
          <span className="text-[15px] font-semibold text-[var(--a-accent-ink)]">A</span>
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-[14.5px] font-semibold tracking-tight text-[var(--a-text)]">
            Asistente del consultorio
          </p>
          <p className="admin-kicker mt-0.5 flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full bg-[var(--a-accent)] ${loading ? "animate-pulse" : ""}`} />
            {loading ? "Pensando…" : "En línea"}
          </p>
        </div>
        {view.length > 0 && (
          <button
            onClick={() => {
              if (confirmClear) { limpiar(); setConfirmClear(false); }
              else { setConfirmClear(true); window.setTimeout(() => setConfirmClear(false), 3000); }
            }}
            aria-label="Limpiar conversación"
            title="Limpiar conversación"
            className={`flex h-9 shrink-0 items-center justify-center rounded-full text-[12px] font-medium transition-all ${
              confirmClear ? "bg-[var(--a-accent-soft)] px-3 text-[var(--a-accent-ink)]" : "admin-btn-ghost w-9 opacity-70 hover:opacity-100"
            }`}
          >
            {confirmClear ? (
              "¿Limpiar?"
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
            )}
          </button>
        )}
      </header>

      {/* (B) Río de mensajes — columna de lectura */}
      <div ref={scroller} className="flex-1 overflow-y-auto px-5 sm:px-6">
        <div className="mx-auto w-full max-w-[620px] space-y-6 py-6 sm:space-y-7">
          {view.length === 0 && (
            <div className="relative pt-8 sm:pt-12">
              <h2 className="text-[24px] font-semibold tracking-tight text-[var(--a-text)] sm:text-[28px]">
                {saludo()}<span className="text-[var(--a-accent)]">.</span>
              </h2>
              <p className="admin-muted mt-1.5 text-[14px]">¿En qué te doy una mano? Agenda, finanzas y cobros.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {SUGERENCIAS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => enviar(s.full)}
                    className="group inline-flex items-center gap-2 rounded-full border border-[var(--a-border)] bg-[var(--a-surface)] px-3.5 py-2 text-[13px] font-medium text-[var(--a-text-2)] transition-colors hover:border-[var(--a-accent)]/40 hover:bg-[var(--a-accent-soft)] hover:text-[var(--a-accent-ink)]"
                  >
                    <span className="text-[var(--a-text-3)] transition-colors group-hover:text-[var(--a-accent)]">
                      <Icon d={s.icon} size={15} />
                    </span>
                    {s.label}
                  </button>
                ))}
              </div>
              <svg aria-hidden className="botanic pointer-events-none absolute -bottom-1 right-0 h-24 w-24 text-[var(--a-accent)] opacity-[0.08]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22C12 14 8 8 2 6c2 8 6 14 10 16ZM12 22c0-6 3-11 9-13-1.5 6.5-4.5 11-9 13Z" />
              </svg>
            </div>
          )}

          {view.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="chat-rise flex justify-end">
                <div className="max-w-[82%] whitespace-pre-wrap rounded-[18px] rounded-br-[6px] border border-[var(--a-border)] bg-[var(--a-accent-soft)] px-3.5 py-2.5 text-[14px] text-[var(--a-accent-ink)] sm:max-w-[85%]">
                  {m.text}
                </div>
              </div>
            ) : (
              <div key={m.id} className="chat-rise space-y-2.5">
                {m.text && (m.text.startsWith("⚠️") ? (
                  <div className="flex items-start gap-2 rounded-xl border-l-2 border-[var(--a-danger)] bg-[var(--a-danger-soft)] px-3 py-2 text-[var(--a-danger)]">
                    <svg className="mt-0.5 shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></svg>
                    <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed">{m.text.replace(/^⚠️\s*/, "")}</p>
                  </div>
                ) : (
                  <div className="border-l-2 border-[var(--a-accent)]/55 pl-4">
                    <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--a-text)]">
                      {m.text}
                    </p>
                  </div>
                ))}

                {m.proposal && (() => {
                  const datos = datosClave(m.proposal.input);
                  const resuelto = m.estado === "done" || m.estado === "cancelled";
                  return (
                    <div className={`rounded-2xl border border-[var(--a-border)] border-l-[3px] bg-[var(--a-surface-2)] p-4 transition-colors duration-500 ${resuelto ? "border-l-[var(--a-border)]" : "border-l-[var(--a-accent)]"}`}>
                      <div className="flex items-start gap-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--a-accent-soft)] text-[var(--a-accent-ink)]">
                          <Icon d={m.estado === "done" && m.ok ? IC_CHECK : iconoTool(m.proposal.tool)} size={15} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="admin-kicker">{m.estado === "done" && m.ok ? "Registrado" : "Confirmá la acción"}</p>
                          <p className="mt-1 text-[14px] font-medium text-[var(--a-text)]">{m.proposal.resumen}</p>
                          {datos.length > 0 && (
                            <dl className="mt-2.5 grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1 rounded-lg bg-[var(--a-surface)] px-3 py-2">
                              {datos.map((d) => (
                                <Fragment key={d.label}>
                                  <dt className="admin-faint text-[10px] uppercase tracking-[0.08em]">{d.label}</dt>
                                  <dd className="admin-stat text-[13px] font-medium">{d.value}</dd>
                                </Fragment>
                              ))}
                            </dl>
                          )}
                        </div>
                      </div>
                      {m.estado === "pending" ? (
                        <div className="mt-3 flex gap-2 pl-[2.375rem]">
                          <button onClick={() => confirmar(m)} disabled={loading} className="admin-btn rounded-full px-4 py-1.5 text-[13px] font-medium disabled:opacity-50">
                            Confirmar
                          </button>
                          <button onClick={() => cancelar(m)} disabled={loading} className="admin-btn-ghost rounded-full px-4 py-1.5 text-[13px] font-medium disabled:opacity-50">
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <p className={`mt-2.5 whitespace-pre-wrap pl-[2.375rem] text-[13px] font-medium ${m.estado === "cancelled" ? "admin-muted" : m.ok ? "text-[#1c7a45]" : "text-[var(--a-danger)]"}`}>
                          {m.estado === "cancelled" ? "Cancelada." : m.result || (m.ok ? "Hecho." : "No se pudo.")}
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
            )
          )}

          {loading && (
            <div className="chat-rise border-l-2 border-[var(--a-accent)] pl-4">
              <div className="flex items-center gap-1.5 py-1.5">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--a-text-3)] [animation-delay:-0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--a-text-3)] [animation-delay:-0.1s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--a-text-3)]" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* (C) Composer */}
      <div className="border-t border-[var(--a-border)] bg-[var(--a-surface)] px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-3">
        <form onSubmit={(e) => { e.preventDefault(); enviar(input); }} className="mx-auto w-full max-w-[620px]">
          <div className="admin-input flex items-end gap-2 rounded-[26px] px-2 py-1.5 transition-shadow focus-within:border-[var(--a-accent)] focus-within:shadow-[0_0_0_3px_rgba(138,74,102,0.16)]">
            <textarea
              ref={taRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(input); } }}
              rows={1}
              disabled={recording || transcribing}
              placeholder={recording ? "Grabando… tocá para terminar" : transcribing ? "Transcribiendo tu nota…" : "Escribí o decí lo que necesitás…"}
              className="max-h-[7.5rem] flex-1 resize-none border-0 bg-transparent px-2 py-2 text-[14px] text-[var(--a-text)] placeholder:text-[var(--a-text-3)] focus:outline-none disabled:opacity-60"
            />
            <button
              type="button"
              onClick={toggleMic}
              disabled={loading || transcribing}
              aria-label={recording ? "Detener grabación" : "Grabar audio"}
              className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40 sm:h-10 sm:w-10 ${recording ? "bg-[var(--a-accent-soft)] text-[var(--a-accent-ink)]" : "admin-btn-ghost"}`}
            >
              {recording && <span className="absolute inset-0 animate-ping rounded-full bg-[var(--a-accent)] opacity-20" />}
              <span className="relative flex items-center justify-center">
                {transcribing ? (
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                ) : recording ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2.5" /></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4" /></svg>
                )}
              </span>
            </button>
            <button
              type="submit"
              disabled={loading || recording || transcribing || !input.trim()}
              aria-label="Enviar"
              className="admin-btn flex h-11 w-11 shrink-0 items-center justify-center rounded-full disabled:opacity-40 disabled:shadow-none sm:h-10 sm:w-10"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" /></svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
