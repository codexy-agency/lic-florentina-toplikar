"use client";

import { useActionState } from "react";
import { resetearPassword, type EquipoState } from "@/app/admin/equipo/actions";
import { IconoCheck, IconoCopiar } from "@/components/iconos";
import { useState } from "react";

/** Genera una contraseña temporal y la muestra UNA vez.
 *
 *  No se guarda en ningún lado: si el dueño cierra la pantalla sin copiarla,
 *  genera otra. Es a propósito — antes quedaba en el almacén en texto plano. */
export function ResetPassword({ userId, nombre }: { userId: string; nombre: string }) {
  const [state, formAction, pending] = useActionState<EquipoState | null, FormData>(
    resetearPassword,
    null
  );
  const [copiado, setCopiado] = useState(false);

  async function copiar(valor: string) {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      /* si el navegador lo bloquea, la contraseña igual está a la vista */
    }
  }

  if (state?.ok && state.mensaje) {
    return (
      <div className="w-full rounded-xl bg-[var(--a-accent-soft)] px-3 py-2.5">
        <p className="text-[12.5px] text-[var(--a-accent-ink)]">
          Contraseña nueva de <strong>{nombre}</strong>. Se muestra una sola vez:
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <code className="rounded-lg bg-white px-2.5 py-1.5 font-mono text-[13px] font-semibold text-espresso">
            {state.mensaje}
          </code>
          <button
            type="button"
            onClick={() => copiar(state.mensaje!)}
            className="admin-btn-ghost inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium"
          >
            {copiado ? <IconoCheck size={13} /> : <IconoCopiar size={13} />}
            {copiado ? "Copiada" : "Copiar"}
          </button>
        </div>
        <p className="admin-faint mt-2 text-[11.5px]">
          Pasásela por un canal seguro y pedile que la cambie al entrar.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="userId" value={userId} />
      <button
        disabled={pending}
        className="admin-btn-ghost rounded-full px-4 py-1.5 text-[12.5px] font-medium disabled:opacity-60"
      >
        {pending ? "Generando…" : "Generar contraseña temporal"}
      </button>
      {state?.error && <p className="admin-danger mt-1.5 text-[12px]">{state.error}</p>}
    </form>
  );
}
