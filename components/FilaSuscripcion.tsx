"use client";

import { useActionState } from "react";
import { cambiarSuscripcion, type CodexyState } from "@/app/admin/codexy/actions";
import { IconoCheck, IconoChevron } from "@/components/iconos";
import type { Suscripcion } from "@/lib/planes";

type Opcion = { v: string; l: string };

/** Una fila del panel de Codexy: el estado de un consultorio y el formulario
 *  para ponerlo al día cuando entra un pago.
 *
 *  El flujo está pensado para que cobrar a mano sea de tres clics: elegir
 *  "Al día", apretar "+1 mes", guardar. Si eso cuesta trabajo, se deja de hacer
 *  y el dato de facturación se desactualiza, que es peor que no tenerlo. */
export function FilaSuscripcion({
  pid,
  miembros,
  suscripcion,
  planes,
  estados,
  monedas,
  dias,
}: {
  pid: string;
  miembros: number;
  suscripcion: Suscripcion;
  planes: Opcion[];
  estados: Opcion[];
  monedas: Opcion[];
  dias: number | null;
}) {
  const [state, formAction, pending] = useActionState<CodexyState | null, FormData>(
    cambiarSuscripcion,
    null
  );

  const alerta =
    suscripcion.estado === "vencida" || suscripcion.estado === "solo_lectura"
      ? "border-[var(--a-danger)]/30"
      : dias !== null && dias <= 3
      ? "border-[var(--a-accent)]/40"
      : "border-[var(--a-border)]";

  const chip =
    suscripcion.estado === "activa" || suscripcion.estado === "prueba"
      ? "admin-chip-ok"
      : suscripcion.estado === "vencida"
      ? "admin-chip-accent"
      : "bg-[var(--a-danger-soft)] text-[var(--a-danger)]";

  return (
    <details className={`group rounded-2xl border bg-[var(--a-surface)] ${alerta}`}>
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-2 p-4 [&::-webkit-details-marker]:hidden">
        <code className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-[var(--a-text-2)]">
          {pid}
        </code>
        <span className="admin-muted text-[12.5px] tabular-nums">
          {miembros} {miembros === 1 ? "persona" : "personas"}
        </span>
        <span className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${chip}`}>
          {estados.find((e) => e.v === suscripcion.estado)?.l ?? suscripcion.estado}
        </span>
        <span className="admin-muted w-24 shrink-0 text-right text-[12.5px] tabular-nums">
          {dias === null ? "—" : dias >= 0 ? `${dias} días` : `venció`}
        </span>
        <IconoChevron className="admin-faint transition-transform group-open:rotate-180" />
      </summary>

      <form action={formAction} className="border-t border-[var(--a-border)] p-4">
        <input type="hidden" name="pid" value={pid} />
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="admin-kicker mb-1.5 block text-[11.5px]">Plan</span>
            <select name="plan" defaultValue={suscripcion.plan} className="admin-input w-full px-3 py-2 text-[13.5px]">
              {planes.map((p) => (
                <option key={p.v} value={p.v}>{p.l}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="admin-kicker mb-1.5 block text-[11.5px]">Estado</span>
            <select name="estado" defaultValue={suscripcion.estado} className="admin-input w-full px-3 py-2 text-[13.5px]">
              {estados.map((e) => (
                <option key={e.v} value={e.v}>{e.l}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="admin-kicker mb-1.5 block text-[11.5px]">Moneda</span>
            <select name="moneda" defaultValue={suscripcion.moneda} className="admin-input w-full px-3 py-2 text-[13.5px]">
              {monedas.map((m) => (
                <option key={m.v} value={m.v}>{m.l}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="admin-kicker mb-1.5 block text-[11.5px]">Pago hasta</span>
            <input
              type="date"
              name="periodoHasta"
              defaultValue={suscripcion.periodoHasta ? suscripcion.periodoHasta.slice(0, 10) : ""}
              className="admin-input w-full px-3 py-2 text-[13.5px]"
            />
          </label>
          <label className="block">
            <span className="admin-kicker mb-1.5 block text-[11.5px]">
              Nota interna <span className="admin-faint normal-case">(cómo pagó, nº de factura)</span>
            </span>
            <input
              name="nota"
              defaultValue={suscripcion.nota ?? ""}
              maxLength={500}
              placeholder="Transferencia 29/07, factura B-0001"
              className="admin-input w-full px-3 py-2 text-[13.5px]"
            />
          </label>
        </div>

        <p className="admin-faint mt-2 text-[11.5px]">
          Nunca escribas acá datos de tarjeta.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            name="atajo"
            value="mes"
            disabled={pending}
            className="admin-btn rounded-full px-4 py-2 text-[13px] font-medium disabled:opacity-60"
          >
            Guardar y +1 mes
          </button>
          <button
            name="atajo"
            value=""
            disabled={pending}
            className="admin-btn-ghost rounded-full px-4 py-2 text-[13px] font-medium disabled:opacity-60"
          >
            Guardar
          </button>
          <button
            name="atajo"
            value="prueba"
            disabled={pending}
            className="admin-faint rounded-full px-3.5 py-2 text-[12.5px] font-medium transition-colors hover:text-[var(--a-text)] disabled:opacity-60"
          >
            Extender prueba
          </button>

          {state?.ok && (
            <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--a-ok)]">
              <IconoCheck size={14} /> {state.mensaje}
            </span>
          )}
          {state?.error && <span className="admin-danger text-[13px] font-medium">{state.error}</span>}
        </div>
      </form>
    </details>
  );
}
