"use client";

import { useState } from "react";
import { guardarDisponibilidad } from "@/app/admin/disponibilidad/actions";
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
    initialExceptions.filter((e) => e.type === "block_day").map((e) => e.date)
  );
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [estado, setEstado] = useState<"idle" | "guardando" | "ok">("idle");

  function addFranja(day: number) {
    setByDay((p) => ({
      ...p,
      [day]: [...p[day], { startTime: "09:00", endTime: "13:00", modalidad: "online" }],
    }));
  }
  function setFranja(day: number, idx: number, patch: Partial<Franja>) {
    setByDay((p) => ({
      ...p,
      [day]: p[day].map((f, i) => (i === idx ? { ...f, ...patch } : f)),
    }));
  }
  function delFranja(day: number, idx: number) {
    setByDay((p) => ({ ...p, [day]: p[day].filter((_, i) => i !== idx) }));
  }
  function copiarLunesATodos() {
    const base = byDay[1];
    setByDay((p) => {
      const n = { ...p };
      for (const d of DIAS) if (d.i !== 0 && d.i !== 6) n[d.i] = base.map((f) => ({ ...f }));
      return n;
    });
  }

  async function guardar() {
    setEstado("guardando");
    const rules = DIAS.flatMap((d) =>
      byDay[d.i].map((f) => ({ weekday: d.i, ...f }))
    );
    await guardarDisponibilidad({ config, rules, blockedDates: blocked });
    setEstado("ok");
    setTimeout(() => setEstado("idle"), 2200);
  }

  const num =
    "w-20 rounded-xl border border-[var(--color-line)] bg-cream px-3 py-2 text-[14px] text-espresso focus:border-sage/60 focus:outline-none";
  const time =
    "rounded-xl border border-[var(--color-line)] bg-cream px-3 py-2 text-[14px] text-espresso focus:border-sage/60 focus:outline-none";

  return (
    <div className="space-y-10">
      {/* Ajustes */}
      <section>
        <h2 className="font-serif text-xl tracking-tight text-espresso">Ajustes</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { k: "slotDurationMin", l: "Duración (min)" },
            { k: "bufferAfterMin", l: "Descanso entre turnos (min)" },
            { k: "minNoticeHours", l: "Anticipación mínima (hs)" },
            { k: "bookingWindowDays", l: "Reservar hasta (días)" },
          ].map((x) => (
            <label key={x.k} className="block">
              <span className="mb-1.5 block text-[12px] uppercase tracking-[0.1em] text-sage-deep">
                {x.l}
              </span>
              <input
                type="number"
                value={config[x.k as keyof SchedulingConfig]}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, [x.k]: Number(e.target.value) }))
                }
                className={num + " w-full"}
              />
            </label>
          ))}
        </div>
      </section>

      {/* Horario semanal */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-xl tracking-tight text-espresso">
            Horario semanal
          </h2>
          <button
            onClick={copiarLunesATodos}
            className="rounded-full border border-[var(--color-line)] px-4 py-2 text-[13px] text-espresso-soft transition-colors hover:text-espresso"
          >
            Copiar lunes a días hábiles
          </button>
        </div>
        <div className="mt-5 space-y-3">
          {DIAS.map((d) => (
            <div
              key={d.i}
              className="rounded-2xl border border-[var(--color-line)] bg-white/50 p-4"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="w-24 font-medium text-espresso">{d.n}</span>
                <div className="flex-1 space-y-2">
                  {byDay[d.i].length === 0 && (
                    <span className="text-[14px] text-espresso-soft/70">No atiende</span>
                  )}
                  {byDay[d.i].map((f, idx) => (
                    <div key={idx} className="flex flex-wrap items-center gap-2">
                      <input
                        type="time"
                        value={f.startTime}
                        onChange={(e) => setFranja(d.i, idx, { startTime: e.target.value })}
                        className={time}
                      />
                      <span className="text-espresso-soft">a</span>
                      <input
                        type="time"
                        value={f.endTime}
                        onChange={(e) => setFranja(d.i, idx, { endTime: e.target.value })}
                        className={time}
                      />
                      <select
                        value={f.modalidad}
                        onChange={(e) =>
                          setFranja(d.i, idx, { modalidad: e.target.value as Modalidad })
                        }
                        className={time}
                      >
                        <option value="online">Online</option>
                        <option value="presencial">Presencial</option>
                      </select>
                      <button
                        onClick={() => delFranja(d.i, idx)}
                        className="text-[13px] text-espresso-soft transition-colors hover:text-[#9C5475]"
                        aria-label="Eliminar franja"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => addFranja(d.i)}
                  className="rounded-full border border-sage/30 bg-sage/10 px-3 py-1.5 text-[13px] font-medium text-sage-deep transition-colors hover:bg-sage/20"
                >
                  + Franja
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bloqueos */}
      <section>
        <h2 className="font-serif text-xl tracking-tight text-espresso">
          Días que no atiende
        </h2>
        <p className="mt-1 text-[14px] text-espresso-soft">
          Feriados, vacaciones o días puntuales que querés bloquear.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={nuevaFecha}
            onChange={(e) => setNuevaFecha(e.target.value)}
            className={time}
          />
          <button
            onClick={() => {
              if (nuevaFecha && !blocked.includes(nuevaFecha)) {
                setBlocked((b) => [...b, nuevaFecha].sort());
                setNuevaFecha("");
              }
            }}
            className="rounded-full bg-espresso px-4 py-2 text-[13px] font-medium text-cream"
          >
            Bloquear
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {blocked.map((d) => (
            <span
              key={d}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-cream-deep/40 px-3 py-1.5 text-[13px] text-espresso"
            >
              {d}
              <button
                onClick={() => setBlocked((b) => b.filter((x) => x !== d))}
                className="text-espresso-soft hover:text-[#9C5475]"
                aria-label="Quitar"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      </section>

      {/* Guardar */}
      <div className="sticky bottom-4 flex items-center gap-4">
        <button
          onClick={guardar}
          disabled={estado === "guardando"}
          className="rounded-full bg-espresso px-7 py-3.5 text-[15px] font-medium text-cream shadow-float transition-all duration-300 hover:-translate-y-px disabled:opacity-60"
        >
          {estado === "guardando" ? "Guardando…" : "Guardar disponibilidad"}
        </button>
        {estado === "ok" && (
          <span className="text-[14px] font-medium text-sage-deep">✓ Guardado</span>
        )}
      </div>
    </div>
  );
}
