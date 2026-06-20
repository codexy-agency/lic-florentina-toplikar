"use client";

import { useState } from "react";
import { guardarServicios } from "@/app/admin/servicios/actions";
import type { Service } from "@/lib/scheduling/types";

type Row = Service;

export function ServiciosEditor({ initial }: { initial: Service[] }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [estado, setEstado] = useState<"idle" | "guardando" | "ok">("idle");

  function add() {
    setRows((r) => [
      ...r,
      {
        id: `nuevo-${r.length}-${Date.now()}`,
        nombre: "",
        durationMin: 50,
        priceARS: undefined,
        descripcion: "",
        activo: true,
      },
    ]);
  }
  function patch(i: number, p: Partial<Row>) {
    setRows((r) => r.map((x, idx) => (idx === i ? { ...x, ...p } : x)));
  }
  function del(i: number) {
    setRows((r) => r.filter((_, idx) => idx !== i));
  }
  async function guardar() {
    setEstado("guardando");
    await guardarServicios(rows);
    setEstado("ok");
    setTimeout(() => setEstado("idle"), 2200);
  }

  const inp =
    "admin-input px-3 py-2 text-[14px] text-espresso";

  return (
    <div className="space-y-4">
      {rows.length === 0 && (
        <p className="rounded-2xl admin-empty p-8 text-center text-espresso-soft">
          Todavía no hay servicios. Agregá el primero.
        </p>
      )}

      {rows.map((s, i) => (
        <div
          key={s.id}
          className="rounded-2xl admin-card p-4"
        >
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={s.nombre}
              onChange={(e) => patch(i, { nombre: e.target.value })}
              placeholder="Nombre del servicio"
              aria-label="Nombre del servicio"
              className={`${inp} min-w-[200px] flex-1 font-medium`}
            />
            <label className="flex items-center gap-2 text-[13px] text-espresso-soft">
              <input
                type="number"
                value={s.durationMin}
                onChange={(e) => patch(i, { durationMin: Number(e.target.value) })}
                className={`${inp} w-20`}
              />
              min
            </label>
            <label className="flex items-center gap-2 text-[13px] text-espresso-soft">
              $
              <input
                type="number"
                value={s.priceARS ?? ""}
                onChange={(e) =>
                  patch(i, { priceARS: e.target.value ? Number(e.target.value) : undefined })
                }
                placeholder="precio"
                className={`${inp} w-28`}
              />
            </label>
            <label className="flex items-center gap-2 text-[13px] text-espresso-soft">
              <input
                type="checkbox"
                checked={s.activo}
                onChange={(e) => patch(i, { activo: e.target.checked })}
                className="h-4 w-4 accent-[#9C5475]"
              />
              Activo
            </label>
            <button
              onClick={() => del(i)}
              className="ml-auto text-[13px] text-espresso-soft transition-colors hover:text-[#9C5475]"
            >
              Eliminar
            </button>
          </div>
          <input
            value={s.descripcion ?? ""}
            onChange={(e) => patch(i, { descripcion: e.target.value })}
            placeholder="Descripción breve (opcional)"
            aria-label="Descripción del servicio"
            className={`${inp} mt-3 w-full`}
          />
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={add}
          className="rounded-full border border-sage/30 bg-sage/10 px-4 py-2 text-[13px] font-medium text-sage-deep transition-colors hover:bg-sage/20"
        >
          + Agregar servicio
        </button>
        <button
          onClick={guardar}
          disabled={estado === "guardando"}
          className="rounded-full bg-espresso px-6 py-2.5 text-[14px] font-medium text-cream transition-all hover:-translate-y-px disabled:opacity-60"
        >
          {estado === "guardando" ? "Guardando…" : "Guardar servicios"}
        </button>
        {estado === "ok" && (
          <span className="text-[14px] font-medium text-sage-deep">✓ Guardado</span>
        )}
      </div>
    </div>
  );
}
