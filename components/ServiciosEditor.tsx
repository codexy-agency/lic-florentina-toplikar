"use client";

import { useState } from "react";
import { guardarServicios } from "@/app/admin/servicios/actions";
import { DeleteConfirm } from "@/components/DeleteConfirm";
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
    // Guardrail: si no queda ningún servicio activo, el reservador del sitio
    // queda sin nada para reservar. Confirmamos antes de aplicar.
    const activos = rows.filter((r) => r.nombre.trim() && r.activo).length;
    if (
      activos === 0 &&
      !window.confirm(
        "No va a quedar ningún servicio activo: los pacientes no van a poder reservar turnos. ¿Guardar igual?"
      )
    ) {
      return;
    }
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
        <div key={s.id} className="admin-card rounded-2xl p-5">
          {/* Header de la tarjeta: índice + nombre vivo + activo + eliminar */}
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--a-border)] pb-3 md:flex-nowrap md:gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--a-accent-soft)] text-[12px] font-semibold text-[var(--a-accent-ink)]">
              {i + 1}
            </span>
            <span className="min-w-0 w-full truncate text-[15px] font-semibold text-espresso md:w-auto md:flex-1">
              {s.nombre || "Servicio nuevo"}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={s.activo}
              aria-label={s.activo ? "Servicio activo" : "Servicio inactivo"}
              onClick={() => patch(i, { activo: !s.activo })}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                s.activo ? "bg-[var(--a-accent)]" : "bg-[var(--a-border-strong)]"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  s.activo ? "translate-x-[22px]" : "translate-x-0.5"
                }`}
              />
            </button>
            <span className="admin-faint hidden md:inline w-14 text-[12px]">{s.activo ? "Activo" : "Inactivo"}</span>
            <DeleteConfirm
              onConfirm={() => del(i)}
              itemLabel={s.nombre ? `"${s.nombre}"` : "este servicio"}
            />
          </div>

          {/* Campos */}
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="admin-label mb-1.5 block text-[12px] font-medium">Nombre</span>
              <input
                value={s.nombre}
                onChange={(e) => patch(i, { nombre: e.target.value })}
                placeholder="Nombre del servicio"
                className={`${inp} w-full font-medium`}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="admin-label mb-1.5 block text-[12px] font-medium">Duración del turno</span>
                <span className="flex items-center gap-2">
                  <input
                    type="number"
                    value={Number.isFinite(s.durationMin) ? s.durationMin : ""}
                    onChange={(e) =>
                      patch(i, { durationMin: e.target.value === "" ? NaN : Number(e.target.value) })
                    }
                    className={`${inp} w-full sm:w-24`}
                  />
                  <span className="admin-muted text-[13px]">minutos</span>
                </span>
              </label>
              <label className="block">
                <span className="admin-label mb-1.5 block text-[12px] font-medium">Precio de referencia</span>
                <span className="flex flex-wrap items-center gap-2">
                  <span className="admin-muted text-[14px]">$</span>
                  <input
                    type="number"
                    value={s.priceARS ?? ""}
                    onChange={(e) =>
                      patch(i, { priceARS: e.target.value ? Number(e.target.value) : undefined })
                    }
                    placeholder="precio"
                    className={`${inp} flex-1 sm:w-28 sm:flex-none`}
                  />
                  {formatPrecio(s.priceARS) && (
                    <span className="text-[15px] font-semibold tabular-nums text-espresso">
                      {formatPrecio(s.priceARS)}
                    </span>
                  )}
                </span>
              </label>
            </div>
            <label className="block">
              <span className="admin-label mb-1.5 block text-[12px] font-medium">Descripción <span className="admin-faint normal-case">(opcional)</span></span>
              <input
                value={s.descripcion ?? ""}
                onChange={(e) => patch(i, { descripcion: e.target.value })}
                placeholder="Breve descripción que ve el paciente al reservar"
                className={`${inp} w-full`}
              />
            </label>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={add}
          className="admin-btn-ghost w-full rounded-full px-4 py-2.5 text-[13px] font-medium sm:w-auto"
        >
          + Agregar servicio
        </button>
        <button
          onClick={guardar}
          disabled={estado === "guardando"}
          className="w-full rounded-full bg-espresso px-6 py-2.5 text-[14px] font-medium text-cream transition-all hover:-translate-y-px disabled:opacity-60 sm:w-auto"
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
