"use client";

import { useActionState, useState } from "react";
import { cambiarMiPassword, type CuentaState } from "@/app/admin/cuenta/actions";
import { IconoCheck } from "@/components/iconos";

const campo = "admin-input w-full px-3 py-2.5 text-[14px] text-espresso";

export function CambiarPassword() {
  const [state, formAction, pending] = useActionState<CuentaState | null, FormData>(
    cambiarMiPassword,
    null
  );
  const [ver, setVer] = useState(false);

  return (
    <form action={formAction} className="mt-4 space-y-4">
      <label className="block max-w-sm">
        <span className="admin-kicker mb-1.5 block text-[12px]">Contraseña actual</span>
        <input
          name="actual"
          type={ver ? "text" : "password"}
          required
          autoComplete="current-password"
          className={campo}
        />
      </label>

      <div className="grid max-w-lg gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="admin-kicker mb-1.5 block text-[12px]">Contraseña nueva</span>
          <input
            name="nueva"
            type={ver ? "text" : "password"}
            required
            minLength={10}
            autoComplete="new-password"
            className={campo}
          />
        </label>
        <label className="block">
          <span className="admin-kicker mb-1.5 block text-[12px]">Repetila</span>
          <input
            name="repetir"
            type={ver ? "text" : "password"}
            required
            minLength={10}
            autoComplete="new-password"
            className={campo}
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-[13px] text-[var(--a-text-2)]">
        <input
          type="checkbox"
          checked={ver}
          onChange={(e) => setVer(e.target.checked)}
          className="h-4 w-4 accent-[var(--a-accent)]"
        />
        Ver lo que escribo
      </label>

      <p className="admin-faint text-[12.5px]">
        Al menos 10 caracteres. Una frase que recuerdes es mejor que algo corto y raro.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          disabled={pending}
          className="admin-btn rounded-full px-5 py-2.5 text-[14px] font-medium disabled:opacity-60"
        >
          {pending ? "Cambiando…" : "Cambiar contraseña"}
        </button>
        {state?.ok && (
          <span className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[var(--a-ok)]">
            <IconoCheck size={14} /> {state.mensaje}
          </span>
        )}
        {state?.error && (
          <span className="admin-danger text-[13.5px] font-medium">{state.error}</span>
        )}
      </div>
    </form>
  );
}
