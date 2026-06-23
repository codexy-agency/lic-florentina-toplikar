"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { NuevoTurnoModal, type PacienteMini } from "./NuevoTurnoModal";
import type { Service, Staff } from "@/lib/scheduling/types";

export type CalTurno = {
  id: string;
  nombre: string;
  startsAt: string; // ISO AR (-03:00)
  endsAt?: string;
  serviceName?: string;
  modalidad?: string;
  estado: string;
  pacienteId?: string;
};

const HOUR_H = 56; // alto de una franja de 1 hora (px)
const DIAS_LARGO = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const DIAS_CORTO = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MESES_CORTO = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const ESTADO: Record<string, { box: string; dot: string; label: string }> = {
  pendiente: { box: "border-[#E4C589] bg-[#F6EFDD] text-[#7E5E18]", dot: "bg-[#C99A3B]", label: "Pendiente" },
  confirmado: { box: "border-[var(--a-accent)]/40 bg-[var(--a-accent-soft)] text-[var(--a-accent-ink)]", dot: "bg-[var(--a-accent)]", label: "Confirmado" },
  realizado: { box: "border-[#A9C3A4] bg-[#E8F0E7] text-[#3F5E3C]", dot: "bg-[#6E9268]", label: "Realizado" },
  no_asistio: { box: "border-[var(--a-danger)]/40 bg-[var(--a-danger-soft)] text-[var(--a-danger)]", dot: "bg-[var(--a-danger)]", label: "No asistió" },
};
const estadoDe = (e: string) => ESTADO[e] || ESTADO.confirmado;

// ── helpers de fecha sobre strings YYYY-MM-DD (sin líos de zona horaria) ──
const ymdOf = (iso: string) => iso.slice(0, 10);
const hmOf = (iso: string) => iso.slice(11, 16);
const minOf = (iso: string) => {
  const [h, m] = hmOf(iso).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
function parseYmd(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function fmtYmd(dt: Date) {
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}
function addDays(ymd: string, n: number) {
  const dt = parseYmd(ymd);
  dt.setDate(dt.getDate() + n);
  return fmtYmd(dt);
}
function addMonths(ymd: string, n: number) {
  const dt = parseYmd(ymd);
  dt.setMonth(dt.getMonth() + n, 1);
  return fmtYmd(dt);
}
function startOfWeek(ymd: string) {
  const dt = parseYmd(ymd);
  const off = (dt.getDay() + 6) % 7; // lunes = 0
  dt.setDate(dt.getDate() - off);
  return fmtYmd(dt);
}
const weekdayOf = (ymd: string) => parseYmd(ymd).getDay();
const dayNum = (ymd: string) => Number(ymd.slice(8, 10));
const monthOf = (ymd: string) => Number(ymd.slice(5, 7)) - 1;
const yearOf = (ymd: string) => Number(ymd.slice(0, 4));

type Vista = "dia" | "semana" | "mes";

export function AgendaCalendario({
  turnos,
  bloqueos,
  horaMin,
  horaMax,
  hoy,
  services,
  staff,
  pacientes,
}: {
  turnos: CalTurno[];
  bloqueos: string[];
  horaMin: number;
  horaMax: number;
  hoy: string; // YYYY-MM-DD (AR)
  services: Service[];
  staff: Staff[];
  pacientes: PacienteMini[];
}) {
  const [vista, setVista] = useState<Vista>("semana");
  const [cursor, setCursor] = useState(hoy);
  // Fecha "YYYY-MM-DDTHH:MM" del nuevo turno (null = modal cerrado).
  const [nuevo, setNuevo] = useState<string | null>(null);
  const dosDig = (n: number) => String(n).padStart(2, "0");

  const bloqSet = useMemo(() => new Set(bloqueos), [bloqueos]);
  const porDia = useMemo(() => {
    const m = new Map<string, CalTurno[]>();
    for (const t of turnos) {
      if (!t.startsAt) continue;
      const k = ymdOf(t.startsAt);
      (m.get(k) || m.set(k, []).get(k)!).push(t);
    }
    for (const arr of m.values()) arr.sort((a, b) => minOf(a.startsAt) - minOf(b.startsAt));
    return m;
  }, [turnos]);

  const hours = useMemo(
    () => Array.from({ length: Math.max(1, horaMax - horaMin) }, (_, i) => horaMin + i),
    [horaMin, horaMax]
  );
  const semanaDias = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor), i)),
    [cursor]
  );

  function navegar(dir: -1 | 1) {
    if (vista === "dia") setCursor((c) => addDays(c, dir));
    else if (vista === "semana") setCursor((c) => addDays(c, dir * 7));
    else setCursor((c) => addMonths(c, dir));
  }

  const titulo = (() => {
    if (vista === "dia") {
      const w = weekdayOf(cursor);
      return `${DIAS_LARGO[w]} ${dayNum(cursor)} ${MESES_CORTO[monthOf(cursor)]}`;
    }
    if (vista === "semana") {
      const ini = startOfWeek(cursor);
      const fin = addDays(ini, 6);
      const mi = monthOf(ini), mf = monthOf(fin);
      return mi === mf
        ? `${dayNum(ini)} – ${dayNum(fin)} ${MESES_CORTO[mf]}`
        : `${dayNum(ini)} ${MESES_CORTO[mi]} – ${dayNum(fin)} ${MESES_CORTO[mf]}`;
    }
    return `${MESES[monthOf(cursor)]} ${yearOf(cursor)}`;
  })();

  return (
    <div className="admin-card overflow-hidden rounded-2xl">
      {/* Barra de control */}
      <div className="flex flex-col gap-3 border-b border-[var(--a-border)] p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="flex items-center gap-1.5">
          <button onClick={() => navegar(-1)} aria-label="Anterior" className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--a-border)] text-espresso transition-colors hover:bg-[var(--a-surface-2)]">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <button onClick={() => setCursor(hoy)} className="rounded-lg border border-[var(--a-border)] px-3 py-2 text-[13px] font-medium text-espresso transition-colors hover:bg-[var(--a-surface-2)]">
            Hoy
          </button>
          <button onClick={() => navegar(1)} aria-label="Siguiente" className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--a-border)] text-espresso transition-colors hover:bg-[var(--a-surface-2)]">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
          </button>
          <span className="ml-2 text-[15px] font-semibold capitalize tracking-tight text-espresso">{titulo}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setNuevo(`${cursor}T${dosDig(Math.max(horaMin, 8))}:00`)}
            className="inline-flex items-center gap-1.5 rounded-full bg-espresso px-3.5 py-1.5 text-[13px] font-medium text-cream transition-all hover:-translate-y-px"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Turno
          </button>
          <div className="inline-flex rounded-full border border-[var(--a-border)] bg-[var(--a-surface-2)] p-0.5">
            {(["dia", "semana", "mes"] as Vista[]).map((v) => (
              <button
                key={v}
                onClick={() => setVista(v)}
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium capitalize transition-colors ${
                  vista === v ? "bg-[var(--a-accent)] text-white shadow-sm" : "text-espresso-soft hover:text-espresso"
                }`}
              >
                {v === "dia" ? "Día" : v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {vista === "mes" ? (
        <MesView cursor={cursor} hoy={hoy} porDia={porDia} bloqSet={bloqSet} onDia={(d) => { setCursor(d); setVista("dia"); }} />
      ) : vista === "dia" ? (
        <GrillaTiempo dias={[cursor]} hours={hours} horaMin={horaMin} hoy={hoy} porDia={porDia} bloqSet={bloqSet} compacto={false} onSlot={(f) => setNuevo(f)} />
      ) : (
        <>
          {/* Semana: en mobile, lista por día (la grilla de 7 columnas no se lee
              en un teléfono); en desktop, la grilla de tiempo. */}
          <div className="md:hidden">
            <SemanaLista
              dias={semanaDias}
              porDia={porDia}
              bloqSet={bloqSet}
              hoy={hoy}
              horaMin={horaMin}
              onSlot={(f) => setNuevo(f)}
              onDia={(d) => { setCursor(d); setVista("dia"); }}
            />
          </div>
          <div className="hidden md:block">
            <GrillaTiempo dias={semanaDias} hours={hours} horaMin={horaMin} hoy={hoy} porDia={porDia} bloqSet={bloqSet} compacto onSlot={(f) => setNuevo(f)} />
          </div>
        </>
      )}

      <NuevoTurnoModal
        open={nuevo !== null}
        fecha={nuevo || ""}
        onClose={() => setNuevo(null)}
        services={services}
        staff={staff}
        pacientes={pacientes}
      />
    </div>
  );
}

// ───────────────────────── Grilla de tiempo (día / semana) ─────────────────────────
function GrillaTiempo({
  dias,
  hours,
  horaMin,
  hoy,
  porDia,
  bloqSet,
  compacto,
  onSlot,
}: {
  dias: string[];
  hours: number[];
  horaMin: number;
  hoy: string;
  porDia: Map<string, CalTurno[]>;
  bloqSet: Set<string>;
  compacto: boolean;
  onSlot: (fecha: string) => void;
}) {
  const gridH = hours.length * HOUR_H;
  const dd = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-fit">
        {/* Gutter de horas */}
        <div className="sticky left-0 z-10 w-12 shrink-0 bg-[var(--a-surface)]">
          <div className="h-10 border-b border-[var(--a-border)]" />
          <div className="relative" style={{ height: gridH }}>
            {hours.map((h, i) => (
              <div key={h} className="absolute left-0 right-2 text-right text-[11px] tabular-nums text-[var(--a-text-3)]" style={{ top: i * HOUR_H + 3 }}>
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>
        </div>

        {/* Columnas de día */}
        <div className="flex flex-1">
          {dias.map((d) => {
            const w = weekdayOf(d);
            const esHoy = d === hoy;
            const bloqueado = bloqSet.has(d);
            const items = porDia.get(d) || [];
            return (
              <div key={d} className={`flex-1 border-l border-[var(--a-border)] ${compacto ? "min-w-[8.5rem]" : "min-w-[12rem]"}`}>
                {/* Cabecera del día */}
                <div className={`flex h-10 items-center justify-center gap-1.5 border-b border-[var(--a-border)] text-[12.5px] font-medium ${esHoy ? "bg-[var(--a-accent-soft)] text-[var(--a-accent-ink)]" : "text-espresso-soft"}`}>
                  <span className="capitalize">{DIAS_CORTO[w]}</span>
                  <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 tabular-nums ${esHoy ? "bg-[var(--a-accent)] text-white" : "text-espresso"}`}>{dayNum(d)}</span>
                </div>
                {/* Cuerpo */}
                <div
                  className={`group/col relative ${bloqueado ? "bg-[repeating-linear-gradient(45deg,var(--a-surface-2),var(--a-surface-2)_8px,transparent_8px,transparent_16px)]" : "cursor-pointer"}`}
                  style={{ height: gridH }}
                  onClick={
                    bloqueado
                      ? undefined
                      : (e) => {
                          if ((e.target as HTMLElement).closest("[data-turno]")) return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          const y = e.clientY - rect.top;
                          let mins = horaMin * 60 + Math.round((y / HOUR_H) * 2) * 30;
                          mins = Math.max(horaMin * 60, mins);
                          onSlot(`${d}T${dd(Math.floor(mins / 60))}:${dd(mins % 60)}`);
                        }
                  }
                >
                  {/* Líneas de hora */}
                  {hours.map((h, i) => (
                    <div key={h} className="absolute inset-x-0 border-b border-[var(--a-border)]/60" style={{ top: i * HOUR_H, height: HOUR_H }} />
                  ))}
                  {bloqueado && (
                    <div className="absolute inset-x-0 top-2 text-center text-[11px] font-medium text-[var(--a-text-3)]">No atiende</div>
                  )}
                  {/* Turnos */}
                  {items.map((t) => {
                    const top = ((minOf(t.startsAt) - horaMin * 60) / 60) * HOUR_H;
                    const dur = t.endsAt ? (minOf(t.endsAt) - minOf(t.startsAt)) : 50;
                    const h = Math.max(26, (dur / 60) * HOUR_H - 3);
                    const c = estadoDe(t.estado);
                    const inner = (
                      <>
                        <span className="block truncate font-semibold leading-tight">{hmOf(t.startsAt)} {t.nombre}</span>
                        {!compacto && h > 38 && t.serviceName && (
                          <span className="block truncate opacity-80">{t.serviceName}</span>
                        )}
                      </>
                    );
                    const cls = `absolute left-1 right-1 overflow-hidden rounded-lg border px-2 py-1 text-[11px] ${c.box}`;
                    return t.pacienteId ? (
                      <Link key={t.id} data-turno href={`/admin/pacientes/${t.pacienteId}`} className={`${cls} transition-shadow hover:shadow-md`} style={{ top, height: h }} title={`${hmOf(t.startsAt)} · ${t.nombre} · ${c.label}`}>
                        {inner}
                      </Link>
                    ) : (
                      <div key={t.id} data-turno className={cls} style={{ top, height: h }} title={`${hmOf(t.startsAt)} · ${t.nombre} · ${c.label}`}>
                        {inner}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ───────────── Vista semana en mobile: lista por día (agenda) ─────────────
function SemanaLista({
  dias,
  porDia,
  bloqSet,
  hoy,
  horaMin,
  onSlot,
  onDia,
}: {
  dias: string[];
  porDia: Map<string, CalTurno[]>;
  bloqSet: Set<string>;
  hoy: string;
  horaMin: number;
  onSlot: (fecha: string) => void;
  onDia: (ymd: string) => void;
}) {
  const dd = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="divide-y divide-[var(--a-border)]">
      {dias.map((d) => {
        const items = porDia.get(d) || [];
        const bloqueado = bloqSet.has(d);
        const esHoy = d === hoy;
        const w = weekdayOf(d);
        return (
          <div key={d} className={`px-3 py-3 ${esHoy ? "bg-[var(--a-accent-soft)]/35" : ""}`}>
            <div className="flex items-center justify-between gap-2">
              <button onClick={() => onDia(d)} className="flex min-w-0 items-center gap-2 text-left">
                <span className={`flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-[13px] font-semibold tabular-nums ${esHoy ? "bg-[var(--a-accent)] text-white" : "bg-[var(--a-surface-2)] text-espresso"}`}>
                  {dayNum(d)}
                </span>
                <span className="text-[13.5px] font-semibold capitalize text-espresso">{DIAS_LARGO[w]}</span>
                {items.length > 0 && (
                  <span className="admin-faint text-[12px]">· {items.length} {items.length === 1 ? "turno" : "turnos"}</span>
                )}
                {bloqueado && <span className="text-[11.5px] font-medium text-[var(--a-text-3)]">· No atiende</span>}
              </button>
              {!bloqueado && (
                <button
                  onClick={() => onSlot(`${d}T${dd(Math.max(horaMin, 8))}:00`)}
                  aria-label="Agendar turno"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--a-border)] text-espresso-soft transition-colors hover:bg-[var(--a-surface-2)] hover:text-espresso"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                </button>
              )}
            </div>

            {items.length === 0 ? (
              !bloqueado && <p className="admin-faint mt-1.5 pl-9 text-[12.5px]">Sin turnos</p>
            ) : (
              <ul className="mt-2.5 space-y-1.5">
                {items.map((t) => {
                  const c = estadoDe(t.estado);
                  const inner = (
                    <>
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${c.dot}`} />
                      <span className="w-12 shrink-0 text-[13px] font-semibold tabular-nums text-espresso">{hmOf(t.startsAt)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium text-espresso">{t.nombre}</span>
                        {t.serviceName && <span className="admin-muted block truncate text-[12px]">{t.serviceName}</span>}
                      </span>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${c.box}`}>{c.label}</span>
                    </>
                  );
                  return t.pacienteId ? (
                    <li key={t.id}>
                      <Link href={`/admin/pacientes/${t.pacienteId}`} className="flex items-center gap-2.5 rounded-xl border border-[var(--a-border)] bg-[var(--a-surface)] px-3 py-2.5 transition-colors hover:bg-[var(--a-surface-2)]">
                        {inner}
                      </Link>
                    </li>
                  ) : (
                    <li key={t.id} className="flex items-center gap-2.5 rounded-xl border border-[var(--a-border)] bg-[var(--a-surface)] px-3 py-2.5">
                      {inner}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ───────────────────────── Vista mes ─────────────────────────
function MesView({
  cursor,
  hoy,
  porDia,
  bloqSet,
  onDia,
}: {
  cursor: string;
  hoy: string;
  porDia: Map<string, CalTurno[]>;
  bloqSet: Set<string>;
  onDia: (ymd: string) => void;
}) {
  const mes = monthOf(cursor);
  const ini = startOfWeek(`${cursor.slice(0, 8)}01`);
  const celdas = Array.from({ length: 42 }, (_, i) => addDays(ini, i));
  return (
    <div className="p-2 sm:p-3">
      <div className="grid grid-cols-7 gap-px text-center text-[11px] font-semibold uppercase tracking-wide text-[var(--a-text-3)]">
        {["lun", "mar", "mié", "jue", "vie", "sáb", "dom"].map((d) => (
          <div key={d} className="py-1.5">{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {celdas.map((d) => {
          const items = porDia.get(d) || [];
          const otroMes = monthOf(d) !== mes;
          const esHoy = d === hoy;
          const bloqueado = bloqSet.has(d);
          return (
            <button
              key={d}
              onClick={() => onDia(d)}
              className={`flex min-h-[4.2rem] flex-col items-stretch rounded-xl border p-1.5 text-left transition-colors sm:min-h-[5.5rem] ${
                esHoy ? "border-[var(--a-accent)] bg-[var(--a-accent-soft)]/50" : "border-[var(--a-border)] hover:bg-[var(--a-surface-2)]"
              } ${otroMes ? "opacity-40" : ""}`}
            >
              <span className="flex items-center justify-between">
                <span className={`text-[12.5px] font-semibold tabular-nums ${esHoy ? "text-[var(--a-accent-ink)]" : "text-espresso"}`}>{dayNum(d)}</span>
                {items.length > 0 && (
                  <span className="rounded-full bg-[var(--a-accent)] px-1.5 text-[10px] font-semibold tabular-nums text-white">{items.length}</span>
                )}
              </span>
              {bloqueado ? (
                <span className="mt-auto text-[10px] text-[var(--a-text-3)]">No atiende</span>
              ) : (
                <span className="mt-1 flex flex-col gap-0.5 overflow-hidden">
                  {items.slice(0, 3).map((t) => (
                    <span key={t.id} className={`truncate rounded px-1 text-[10px] leading-tight ${estadoDe(t.estado).box}`}>
                      {hmOf(t.startsAt)} {t.nombre}
                    </span>
                  ))}
                  {items.length > 3 && <span className="px-1 text-[10px] text-[var(--a-text-3)]">+{items.length - 3}</span>}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
