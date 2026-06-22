"use client";

import { useState } from "react";
import { guardarDisponibilidad, setBloqueos } from "@/app/admin/disponibilidad/actions";
import type {
  AvailabilityRule,
  SchedulingConfig,
  DateException,
  Modalidad,
} from "@/lib/scheduling/types";

const DIAS = [
  { i: 1, n: "Lunes" },
  { i: 2, n: "Martes" },
  { i: 3, n: "Miércoles" },
  { i: 4, n: "Jueves" },
  { i: 5, n: "Viernes" },
  { i: 6, n: "Sábado" },
  { i: 0, n: "Domingo" },
];

type Franja = { startTime: string; endTime: string; modalidad: Modalidad };

// Formatea YYYY-MM-DD como "lun 23 jun" sin desfase de zona horaria.
function fmtFecha(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function DisponibilidadEditor({
  initialConfig,
  initialRules,
  initialExceptions,
}: {
  initialConfig: SchedulingConfig;
  initialRules: AvailabilityRule[];
  initialExceptions: DateException[];
}) {
  const [config, setConfig] = useState<SchedulingConfig>(initialConfig);
  const [byDay, setByDay] = useState<Record<number, Franja[]>>(() => {
    const m: Record<number, Franja[]> = {};
    for (const d of DIAS) m[d.i] = [];
    for (const r of initialRules)
      (m[r.weekday] ||= []).push({
        startTime: r.startTime,
        endTime: r.endTime,
        modalidad: r.modalidad,
      });
    return m;
  });
  const [blocked, setBlocked] = useState<string[]>(
    initialExceptions.filter((e) => e.type === "block_day").map((e) => e.date).sort()
  );
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [estado, setEstado] = useState<"idle" | "guardando" | "ok" | "error">("idle");
  // Cambios staged de HORARIOS/AJUSTES que todavía no se guardaron (los bloqueos
  // ya NO entran acá: se aplican al instante).
  const [dirty, setDirty] = useState(false);
  // Estado del bloqueo inmediato.
  const [blockBusy, setBlockBusy] = useState(false);
  const [blockErr, setBlockErr] = useState<string | null>(null);

  function addFranja(day: number) {
    setDirty(true);
    setByDay((p) => ({
      ...p,
      [day]: [...p[day], { startTime: "09:00", endTime: "13:00", modalidad: "online" }],
    }));
  }
  function setFranja(day: number, idx: number, patch: Partial<Franja>) {
    setDirty(true);
    setByDay((p) => ({
      ...p,
      [day]: p[day].map((f, i) => (i === idx ? { ...f, ...patch } : f)),
    }));
  }
  function delFranja(day: number, idx: number) {
    setDirty(true);
    setByDay((p) => ({ ...p, [day]: p[day].filter((_, i) => i !== idx) }));
  }
  function franjaInvalida(f: Franja) {
    return f.endTime <= f.startTime;
  }
  function copiarLunesATodos() {
    setDirty(true);
    const base = byDay[1];
    setByDay((p) => {
      const n = { ...p };
      for (const d of DIAS) if (d.i !== 0 && d.i !== 6) n[d.i] = base.map((f) => ({ ...f }));
      return n;
    });
  }

  // ─── Bloqueos: se persisten AL INSTANTE (optimista + reconcilia con el server) ───
  async function persistBloqueos(next: string[], prev: string[]) {
    setBlocked(next);
    setBlockBusy(true);
    setBlockErr(null);
    try {
      await setBloqueos(next);
    } catch {
      setBlocked(prev);
      setBlockErr("No se pudo aplicar. Reintentá.");
    } finally {
      setBlockBusy(false);
    }
  }
  function addBloqueo() {
    if (!nuevaFecha || blocked.includes(nuevaFecha)) return;
    const prev = blocked;
    const next = [...blocked, nuevaFecha].sort();
    setNuevaFecha("");
    persistBloqueos(next, prev);
  }
  function quitarBloqueo(d: string) {
    const prev = blocked;
    persistBloqueos(blocked.filter((x) => x !== d), prev);
  }

  // No dejamos guardar si hay alguna franja con fin <= inicio.
  const hayInvalidas = DIAS.some((d) => byDay[d.i].some(franjaInvalida));
  const diasActivos = DIAS.filter((d) => byDay[d.i].length > 0).length;

  async function guardar() {
    if (hayInvalidas) return;
    setEstado("guardando");
    const rules = DIAS.flatMap((d) =>
      byDay[d.i].map((f) => ({ weekday: d.i, ...f }))
    );
    try {
      await guardarDisponibilidad({ config, rules, blockedDates: blocked });
      setDirty(false);
      setEstado("ok");
      setTimeout(() => setEstado("idle"), 2600);
    } catch {
      setEstado("error");
    }
  }

  const time = "admin-input px-3 py-2 text-[14px] text-espresso";

  return (
    <div className="space-y-6">
      {/* ───────────── Horario semanal ───────────── */}
      <section className="admin-card p-5 md:p-6">
        <div className="flex flex-col gap-3 border-b border-[var(--a-border)] pb-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div>
            <span className="admin-kicker text-[12px]">Tu semana</span>
            <h2 className="mt-1 text-[18px] font-semibold tracking-tight text-espresso">
              Horario semanal
            </h2>
            <p className="admin-muted mt-1 text-[13px]">
              {diasActivos > 0
                ? `Atendés ${diasActivos} ${diasActivos === 1 ? "día" : "días"} por semana. El sitio publica los horarios libres solo.`
                : "Agregá franjas a los días que atendés."}
            </p>
          </div>
          <button
            onClick={copiarLunesATodos}
            className="admin-btn-ghost w-full self-start rounded-full px-4 py-2 text-[13px] sm:w-auto sm:self-auto"
          >
            Copiar lunes a hábiles
          </button>
        </div>

        <div className="mt-1">
          {DIAS.map((d) => {
            const franjas = byDay[d.i];
            const atiende = franjas.length > 0;
            return (
              <div
                key={d.i}
                className="grid gap-x-4 gap-y-3 border-b border-[var(--a-border)] py-3.5 last:border-0 sm:grid-cols-[8rem_1fr_auto] sm:items-start sm:gap-y-2"
              >
                <span
                  className={`flex items-center gap-2 pt-1.5 font-medium ${atiende ? "text-espresso" : "text-espresso-soft/70"}`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${atiende ? "bg-[var(--a-accent)]" : "bg-[var(--a-border)]"}`}
                  />
                  {d.n}
                </span>
                <div className="min-w-0 space-y-2">
                  {!atiende && (
                    <span className="inline-block py-1.5 text-[13.5px] text-espresso-soft/70">
                      No atiende
                    </span>
                  )}
                  {franjas.map((f, idx) => {
                    const invalida = franjaInvalida(f);
                    return (
                      <div
                        key={idx}
                        className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:flex sm:flex-wrap"
                      >
                        <input
                          type="time"
                          value={f.startTime}
                          onChange={(e) => setFranja(d.i, idx, { startTime: e.target.value })}
                          className={
                            (invalida ? time + " border-[var(--a-danger)]" : time) +
                            " w-full min-w-0 sm:w-auto"
                          }
                          aria-invalid={invalida}
                        />
                        <span className="admin-muted text-[13px]">a</span>
                        <input
                          type="time"
                          value={f.endTime}
                          onChange={(e) => setFranja(d.i, idx, { endTime: e.target.value })}
                          className={
                            (invalida ? time + " border-[var(--a-danger)]" : time) +
                            " w-full min-w-0 sm:w-auto"
                          }
                          aria-invalid={invalida}
                        />
                        <div className="col-span-3 flex items-center gap-2 sm:contents">
                          <select
                            value={f.modalidad}
                            onChange={(e) =>
                              setFranja(d.i, idx, { modalidad: e.target.value as Modalidad })
                            }
                            className={time + " w-full sm:w-auto"}
                          >
                            <option value="online">Online</option>
                            <option value="presencial">Presencial</option>
                          </select>
                          <button
                            onClick={() => delFranja(d.i, idx)}
                            className="admin-danger flex h-10 w-10 items-center justify-center rounded-full text-[14px] transition-colors hover:bg-[var(--a-danger)]/10 sm:h-8 sm:w-8"
                            aria-label="Eliminar franja"
                          >
                            ✕
                          </button>
                        </div>
                        {invalida && (
                          <span className="admin-danger col-span-3 w-full text-[12px]">
                            El fin debe ser posterior al inicio.
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={() => addFranja(d.i)}
                  className="admin-btn-ghost justify-self-start rounded-full px-3.5 py-2.5 text-[13px] font-medium sm:justify-self-end sm:py-1.5"
                >
                  + Franja
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* ───────────── Días que no atiende (inmediato) ───────────── */}
      <section className="admin-card p-5 md:p-6">
        <div className="border-b border-[var(--a-border)] pb-4">
          <div className="flex items-center gap-2">
            <span className="admin-kicker text-[12px]">Excepciones</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--a-accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--a-accent-ink)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--a-accent)]" />
              Se aplica al instante
            </span>
          </div>
          <h2 className="mt-1 text-[18px] font-semibold tracking-tight text-espresso">
            Días que no atiende
          </h2>
          <p className="admin-muted mt-1 text-[13px]">
            Feriados, vacaciones o días puntuales. Al bloquear un día,
            desaparece de la agenda online <strong>en el momento</strong>.
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <input
            type="date"
            value={nuevaFecha}
            onChange={(e) => setNuevaFecha(e.target.value)}
            className={time + " w-full sm:w-auto"}
          />
          <button
            onClick={addBloqueo}
            disabled={!nuevaFecha || blockBusy}
            className="w-full rounded-full bg-espresso px-4 py-2 text-[13px] font-medium text-cream transition-all hover:-translate-y-px disabled:opacity-50 sm:w-auto"
          >
            Bloquear día
          </button>
          {blockBusy && (
            <span className="admin-muted inline-flex items-center gap-1.5 text-[13px]">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--a-border)] border-t-[var(--a-accent)]" />
              Guardando…
            </span>
          )}
          {blockErr && <span className="admin-danger text-[13px] font-medium">{blockErr}</span>}
        </div>

        {blocked.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {blocked.map((d) => (
              <span
                key={d}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--a-border)] bg-[var(--a-surface-2)] py-1.5 pl-3 pr-1.5 text-[13px] font-medium text-espresso"
              >
                <span className="capitalize">{fmtFecha(d)}</span>
                <button
                  onClick={() => quitarBloqueo(d)}
                  disabled={blockBusy}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-espresso-soft transition-colors hover:bg-[var(--a-danger)]/12 hover:text-[var(--a-danger)] disabled:opacity-50 sm:h-6 sm:w-6"
                  aria-label={`Quitar bloqueo del ${fmtFecha(d)}`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="admin-faint mt-4 text-[13px]">
            No hay días bloqueados. Atendés según tu horario semanal.
          </p>
        )}
      </section>

      {/* ───────────── Ajustes avanzados (colapsado) ───────────── */}
      <details className="admin-card group overflow-hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 md:p-6 [&::-webkit-details-marker]:hidden">
          <div>
            <h2 className="text-[18px] font-semibold tracking-tight text-espresso">
              Ajustes avanzados
            </h2>
            <p className="admin-muted mt-1 text-[13px]">
              Duración, intervalo y ventana de reserva. Cambialo solo si lo necesitás.
            </p>
          </div>
          <svg
            className="h-5 w-5 shrink-0 text-espresso-soft transition-transform duration-300 group-open:rotate-180"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </summary>
        <div className="border-t border-[var(--a-border)] p-5 md:p-6">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { k: "slotDurationMin", l: "Duración de la sesión (min)" },
              { k: "slotIntervalMin", l: "Cada cuánto un turno (min)" },
              { k: "minNoticeHours", l: "Anticipación mínima (hs)" },
              { k: "bookingWindowDays", l: "Reservar hasta (días)" },
            ].map((x) => (
              <label key={x.k} className="block">
                <span className="admin-kicker mb-1.5 block text-[12px]">{x.l}</span>
                <input
                  type="number"
                  value={config[x.k as keyof SchedulingConfig]}
                  onChange={(e) => {
                    setDirty(true);
                    setConfig((c) => ({ ...c, [x.k]: Number(e.target.value) }));
                  }}
                  className="admin-input w-full px-3 py-2 text-[14px] text-espresso"
                />
              </label>
            ))}
          </div>
          <p className="admin-muted mt-3 text-[13px] leading-relaxed">
            Los turnos arrancan <strong>cada {config.slotIntervalMin} min</strong> (en
            horarios redondos) y cada uno dura {config.slotDurationMin} min.
            {config.slotIntervalMin > config.slotDurationMin
              ? ` Quedan ${config.slotIntervalMin - config.slotDurationMin} min de aire entre turnos.`
              : " Sin descanso entre turnos (uno pegado al otro)."}
          </p>
        </div>
      </details>

      {/* ───────────── Guardar (horarios + ajustes) ───────────── */}
      <div
        className={`sticky bottom-0 z-10 -mx-1 flex flex-col items-stretch gap-2 rounded-2xl border px-4 py-3 backdrop-blur transition-colors sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 ${
          dirty
            ? "border-[var(--a-accent)] bg-[var(--a-accent-soft)]/90"
            : "border-[var(--a-border)] bg-[var(--a-surface-2)]/85"
        }`}
      >
        <button
          onClick={guardar}
          disabled={estado === "guardando" || hayInvalidas || !dirty}
          className="w-full rounded-full bg-espresso px-7 py-3 text-[15px] font-medium text-cream shadow-float transition-all duration-300 hover:-translate-y-px disabled:opacity-60 sm:w-auto sm:py-3.5"
        >
          {estado === "guardando" ? "Guardando…" : "Guardar horarios"}
        </button>
        {hayInvalidas ? (
          <span className="admin-danger text-[14px] font-medium">
            Revisá las franjas marcadas (el fin debe ser posterior al inicio).
          </span>
        ) : estado === "error" ? (
          <span className="admin-danger text-[14px] font-medium">
            No se pudo guardar. Reintentá.
          </span>
        ) : estado === "ok" ? (
          <span className="text-[14px] font-medium text-[var(--a-accent-ink)]">
            ✓ Horarios guardados
          </span>
        ) : dirty ? (
          <span className="inline-flex items-center gap-2 text-[14px] font-medium text-[var(--a-accent-ink)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--a-accent)]" />
            Tenés cambios de horario sin guardar
          </span>
        ) : (
          <span className="admin-muted text-[13px]">
            Los días bloqueados se guardan solos. Acá guardás cambios de horario.
          </span>
        )}
      </div>
    </div>
  );
}
