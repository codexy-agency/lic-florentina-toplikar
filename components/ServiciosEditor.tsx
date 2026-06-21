"use client";

import { useState } from "react";
import { guardarServicios } from "@/app/admin/servicios/actions";
import type { Service } from "@/lib/scheduling/types";

type Row = Service;

export function ServiciosEditor({ initial }: { initial: Service[] }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [estado, setEstado] = useState<"idle" | "guardando" | "ok" | "error">("idle");

  const milesFmt = new Intl.NumberFormat("es-AR");
  const formatPrecio = (v: number | undefined) =>
    typeof v === "number" && Number.isFinite(v) ? `$${milesFmt.format(v)}` : "";

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
    try {
      await guardarServicios(rows);
      setEstado("ok");
      setTimeout(() => setEstado("idle"), 2200);
    } catch {
      setEstado("error");
      setTimeout(() => setEstado("idle"), 4000);
    }
  }

  const inp =
    "admin-input px-3 py-2 text-[14px] text-espresso";

  return (
    <div className="space-y-4">
      {rows.length === 0 && (
        <p className="rounded-2xl admin-empty p-8 text-center">
          Todavía no hay servicios. Agregá el primero.
        </p>
      )}

      {rows.map((s, i) => (
        <div
          key={s.id}
          className="rounded-2xl admin-soft p-4"
        >
          <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto]">
            <label className="flex flex-col gap-1.5">
              <span className="admin-label text-[12px] font-medium">Nombre</span>
              <input
                value={s.nombre}
                onChange={(e) => patch(i, { nombre: e.target.value })}
                placeholder="Nombre del servicio"
                aria-label="Nombre del servicio"
                className={`${inp} w-full font-medium`}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="admin-label text-[12px] font-medium">Duración</span>
              <span className="flex items-center gap-2">
                <input
                  type="number"
                  value={s.durationMin}
                  onChange={(e) => patch(i, { durationMin: Number(e.target.value) })}
                  className={`${inp} w-20`}
                />
                <span className="admin-muted text-[13px]">min</span>
              </span>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="admin-label text-[12px] font-medium">Precio</span>
              <span className="flex items-center gap-2">
                <span className="admin-muted text-[14px]">$</span>
                <input
                  type="number"
                  value={s.priceARS ?? ""}
                  onChange={(e) =>
                    patch(i, { priceARS: e.target.value ? Number(e.target.value) : undefined })
                  }
                  placeholder="precio"
                  className={`${inp} w-28`}
                />
                {formatPrecio(s.priceARS) && (
                  <span className="admin-stat text-[14px] font-semibold tabular-nums">
                    {formatPrecio(s.priceARS)}
                  </span>
                )}
              </span>
            </label>
          </div>
          <input
            value={s.descripcion ?? ""}
            onChange={(e) => patch(i, { descripcion: e.target.value })}
            placeholder="Descripción breve (opcional)"
            aria-label="Descripción del servicio"
            className={`${inp} mt-3 w-full`}
          />
          <div className="mt-3 flex items-center gap-4">
            <label className="flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={s.activo}
                onChange={(e) => patch(i, { activo: e.target.checked })}
                className="h-4 w-4 accent-[var(--a-accent)]"
              />
              <span className="admin-muted">Activo</span>
            </label>
            <button
              onClick={() => del(i)}
              className="admin-danger ml-auto text-[13px] font-medium transition-colors"
            >
              Eliminar
            </button>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={add}
          className="admin-btn-ghost rounded-full px-4 py-2 text-[13px] font-medium"
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
          <span className="text-[14px] font-medium text-[var(--a-accent-ink)]">✓ Guardado</span>
        )}
        {estado === "error" && (
          <span className="admin-danger text-[14px] font-medium">
            No se pudo guardar. Reintentá.
          </span>
        )}
      </div>
    </div>
  );
}
