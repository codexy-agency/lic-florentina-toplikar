"use client";

import Link from "next/link";
import { useState } from "react";
import { WhatsAppButton } from "./WhatsAppButton";
import type { PacienteResumen } from "@/lib/store";

const money = (n: number) => "$" + (n || 0).toLocaleString("es-AR");

function fmtTurno(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return "";
  }
}

const FILTROS = [
  { k: "todos", l: "Todos" },
  { k: "deuda", l: "Con deuda" },
  { k: "pendiente", l: "Con turno" },
] as const;
type FiltroKey = (typeof FILTROS)[number]["k"];

export function PacientesList({ pacientes }: { pacientes: PacienteResumen[] }) {
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<FiltroKey>("todos");

  const norm = q.trim().toLowerCase();
  const cuenta = {
    todos: pacientes.length,
    deuda: pacientes.filter((p) => p.deuda > 0).length,
    pendiente: pacientes.filter((p) => p.tienePendiente).length,
  };

  const lista = pacientes
    .filter((p) =>
      filtro === "deuda" ? p.deuda > 0 : filtro === "pendiente" ? p.tienePendiente : true
    )
    .filter((p) =>
      norm ? `${p.nombre} ${p.contacto}`.toLowerCase().includes(norm) : true
    );

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre o contacto…"
          className="admin-input w-full px-4 py-2.5 text-[14px] sm:max-w-xs"
        />
        <div className="flex flex-wrap items-center gap-2">
          {FILTROS.map((f) => {
            const active = filtro === f.k;
            return (
              <button
                key={f.k}
                onClick={() => setFiltro(f.k)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  active
                    ? "bg-[var(--a-accent)] text-white"
                    : "admin-chip hover:border-[var(--a-border-strong)]"
                }`}
              >
                {f.l}
                <span
                  className={`tabular-nums ${active ? "text-white/80" : "text-[var(--a-text-3)]"}`}
                >
                  {cuenta[f.k]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {lista.length === 0 ? (
        <p className="admin-empty admin-muted mt-5 rounded-2xl p-8 text-center text-[14px]">
          {pacientes.length === 0
            ? "Todavía no hay pacientes. Se crean automáticamente al confirmar un turno."
            : "Ningún paciente coincide con el filtro."}
        </p>
      ) : (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((p) => (
            <li
              key={p.id}
              className="admin-card admin-card-link group flex min-w-0 items-center gap-2 rounded-2xl p-3 pl-4"
            >
              {/* Abrir la ficha interna (historia clínica + datos) */}
              <Link
                href={`/admin/pacientes/${p.id}`}
                aria-label={`Abrir ficha de ${p.nombre}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--a-border)] bg-[var(--a-accent-soft)] font-medium text-[var(--a-accent-ink)]">
                  {(p.nombre.trim()[0] || "?").toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-espresso">{p.nombre}</span>
                  <span className="admin-muted block truncate text-[13px]">{p.contacto}</span>
                  {(p.deuda > 0 || p.tienePendiente) && (
                    <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {p.deuda > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--a-danger-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--a-danger)]">
                          Debe {money(p.deuda)}
                        </span>
                      )}
                      {p.tienePendiente && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--a-accent-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--a-accent-ink)]">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                          </svg>
                          {p.proximoTurno ? fmtTurno(p.proximoTurno) : "Turno"}
                        </span>
                      )}
                    </span>
                  )}
                </span>
              </Link>

              {/* Acción secundaria: derivar por WhatsApp */}
              <WhatsAppButton
                phone={p.contacto}
                nombre={p.nombre}
                variant="icon"
                align="right"
              />

              <span aria-hidden className="hidden h-7 w-px shrink-0 bg-[var(--a-border)] sm:block" />

              {/* Acción principal explícita: abrir la vista interna */}
              <Link
                href={`/admin/pacientes/${p.id}`}
                aria-label={`Ver ficha de ${p.nombre}`}
                className="flex shrink-0 items-center gap-0.5 rounded-full px-2 py-2 text-[12.5px] font-medium text-[var(--a-accent-ink)] transition-colors hover:bg-[var(--a-accent-soft)]"
              >
                <span>Ficha</span>
                <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
