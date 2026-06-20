"use client";

import { useState } from "react";
import { guardarProfesionales } from "@/app/admin/profesionales/actions";
import type { Staff, Service } from "@/lib/scheduling/types";

const COLORES = ["#9C5475", "#7c8a6f", "#C9A227", "#6E7BA6", "#B07154"];

export function ProfesionalesEditor({
  initial,
  services,
}: {
  initial: Staff[];
  services: Service[];
}) {
  const [rows, setRows] = useState<Staff[]>(initial);
  const [estado, setEstado] = useState<"idle" | "guardando" | "ok">("idle");

  function add() {
    setRows((r) => [
      ...r,
      {
        id: `nuevo-${r.length}-${Date.now()}`,
        nombre: "",
        titulo: "",
        bio: "",
        serviceIds: services.map((s) => s.id),
        color: COLORES[r.length % COLORES.length],
        activo: true,
      },
    ]);
  }
  function patch(i: number, p: Partial<Staff>) {
    setRows((r) => r.map((x, idx) => (idx === i ? { ...x, ...p } : x)));
  }
  function toggleSvc(i: number, svcId: string) {
    setRows((r) =>
      r.map((x, idx) => {
        if (idx !== i) return x;
        const has = x.serviceIds.includes(svcId);
        return {
          ...x,
          serviceIds: has
            ? x.serviceIds.filter((id) => id !== svcId)
            : [...x.serviceIds, svcId],
        };
      })
    );
  }
  function del(i: number) {
    setRows((r) => r.filter((_, idx) => idx !== i));
  }
  async function guardar() {
    setEstado("guardando");
    await guardarProfesionales(rows);
    setEstado("ok");
    setTimeout(() => setEstado("idle"), 2200);
  }

  const inp =
    "admin-input px-3 py-2 text-[14px] text-espresso";

  return (
    <div className="space-y-4">
      {services.length === 0 && (
        <p className="rounded-2xl admin-empty p-5 text-center text-[14px] text-espresso-soft">
          Primero cargá algún servicio para poder asignárselo a cada profesional.
        </p>
      )}

      {rows.map((m, i) => (
        <div key={m.id} className="rounded-2xl admin-card p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[14px] font-medium"
              style={{ backgroundColor: `${m.color || "#7c8a6f"}22`, color: m.color || "#7c8a6f" }}
            >
              {(m.nombre.trim()[0] || "?").toUpperCase()}
            </span>
            <input
              value={m.nombre}
              onChange={(e) => patch(i, { nombre: e.target.value })}
              placeholder="Nombre y apellido"
              aria-label="Nombre y apellido"
              className={`${inp} min-w-[180px] flex-1 font-medium`}
            />
            <input
              value={m.titulo ?? ""}
              onChange={(e) => patch(i, { titulo: e.target.value })}
              placeholder="Título · matrícula"
              aria-label="Título o matrícula"
              className={`${inp} min-w-[180px] flex-1`}
            />
            <label className="flex items-center gap-2 text-[13px] text-espresso-soft">
              <input
                type="checkbox"
                checked={m.activo}
                onChange={(e) => patch(i, { activo: e.target.checked })}
                className="h-4 w-4 accent-[#9C5475]"
              />
              Activo
            </label>
            <button
              onClick={() => del(i)}
              className="text-[13px] text-espresso-soft transition-colors hover:text-[#9C5475]"
            >
              Eliminar
            </button>
          </div>

          <input
            value={m.bio ?? ""}
            onChange={(e) => patch(i, { bio: e.target.value })}
            placeholder="Bio / especialidad (opcional)"
            aria-label="Bio o especialidad"
            className={`${inp} mt-3 w-full`}
          />

          {/* Color */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[12px] uppercase tracking-[0.1em] text-sage-deep">Color</span>
            {COLORES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => patch(i, { color: c })}
                aria-label={`Color del avatar`}
                aria-pressed={m.color === c}
                className={`h-7 w-7 rounded-full border-2 transition-transform ${
                  m.color === c ? "scale-110 border-espresso" : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          {/* Servicios que ofrece */}
          {services.length > 0 && (
            <div className="mt-3">
              <span className="mb-2 block text-[12px] uppercase tracking-[0.1em] text-sage-deep">
                Servicios que ofrece
              </span>
              <div className="flex flex-wrap gap-2">
                {services.map((svc) => {
                  const on = m.serviceIds.includes(svc.id);
                  return (
                    <button
                      key={svc.id}
                      onClick={() => toggleSvc(i, svc.id)}
                      className={`rounded-full border px-3 py-1.5 text-[13px] transition-colors ${
                        on
                          ? "border-sage bg-sage/15 text-espresso"
                          : "border-[rgba(58,49,55,0.14)] bg-[#FBF7F8] text-espresso-soft hover:border-sage/40"
                      }`}
                    >
                      {on ? "✓ " : ""}
                      {svc.nombre}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={add}
          className="rounded-full border border-sage/30 bg-sage/10 px-4 py-2 text-[13px] font-medium text-sage-deep transition-colors hover:bg-sage/20"
        >
          + Agregar profesional
        </button>
        <button
          onClick={guardar}
          disabled={estado === "guardando"}
          className="rounded-full bg-espresso px-6 py-2.5 text-[14px] font-medium text-cream transition-all hover:-translate-y-px disabled:opacity-60"
        >
          {estado === "guardando" ? "Guardando…" : "Guardar profesionales"}
        </button>
        {estado === "ok" && (
          <span className="text-[14px] font-medium text-sage-deep">✓ Guardado</span>
        )}
      </div>
    </div>
  );
}
