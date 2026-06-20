"use client";

import Link from "next/link";
import { useState } from "react";
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
        <p className="admin-empty mt-5 rounded-2xl p-8 text-center text-[14px] text-espresso-soft">
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
                className="admin-card group flex items-center gap-3 rounded-2xl p-4 transition-transform duration-200 hover:-translate-y-0.5"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sage/15 font-medium text-sage-deep">
                  {(p.nombre.trim()[0] || "?").toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-espresso">{p.nombre}</span>
                  <span className="block truncate text-[13px] text-espresso-soft">{p.contacto}</span>
                </span>
                <span className="text-espresso-soft/60 transition-transform duration-200 group-hover:translate-x-0.5">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
