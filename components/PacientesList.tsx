"use client";

import Link from "next/link";
import { useState } from "react";
import { Arrow } from "./Arrow";
import type { Paciente } from "@/lib/store";

export function PacientesList({ pacientes }: { pacientes: Paciente[] }) {
  const [q, setQ] = useState("");
  const norm = q.trim().toLowerCase();
  const lista = norm
    ? pacientes.filter((p) =>
        `${p.nombre} ${p.contacto}`.toLowerCase().includes(norm)
      )
    : pacientes;

  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por nombre o contacto…"
        className="admin-input w-full max-w-sm px-4 py-2.5 text-[14px]"
      />

      {lista.length === 0 ? (
        <p className="admin-empty admin-muted mt-5 rounded-2xl p-8 text-center text-[14px]">
          {pacientes.length === 0
            ? "Todavía no hay pacientes. Se crean automáticamente al confirmar un turno."
            : "Ningún paciente coincide con la búsqueda."}
        </p>
      ) : (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((p) => (
            <li key={p.id}>
              <Link
                href={`/admin/pacientes/${p.id}`}
                className="admin-card admin-card-link group flex items-center gap-3 rounded-2xl p-4"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--a-border)] bg-[var(--a-accent-soft)] font-medium text-[var(--a-accent-ink)]">
                  {(p.nombre.trim()[0] || "?").toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-espresso">{p.nombre}</span>
                  <span className="admin-muted block truncate text-[13px]">{p.contacto}</span>
                </span>
                <span className="admin-faint transition-transform duration-200 group-hover:translate-x-0.5">
                  <Arrow className="h-4 w-4" strokeWidth={2.25} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
