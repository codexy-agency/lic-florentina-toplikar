"use client";

import { useActionState, useState } from "react";
import { invitarMiembro, type EquipoState } from "@/app/admin/equipo/actions";
import { ROL_LABEL, ROLES, type Rol } from "@/lib/permisos";
import { SubmitButton } from "./SubmitButton";

/** Alta de un miembro del equipo. Mientras no haya email transaccional, el acceso
 *  se crea con una contraseña que el dueño entrega por su canal. */
export function InvitarMiembro({ puedeCrearOwner }: { puedeCrearOwner: boolean }) {
  const [state, formAction] = useActionState<EquipoState | null, FormData>(invitarMiembro, null);
  const [abierto, setAbierto] = useState(false);

  const field = "admin-input w-full rounded-xl px-3.5 py-2.5 text-[14px] text-espresso";
  const label = "admin-kicker mb-1.5 block text-[12px]";
  const roles: Rol[] = ROLES.filter((r) => r !== "owner" || puedeCrearOwner);

  if (!abierto) {
    return (
      <div className="flex w-full flex-col items-start gap-2 sm:w-auto">
        <button
          onClick={() => setAbierto(true)}
          className="admin-btn inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-medium sm:w-auto"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Dar acceso a alguien
        </button>
        {state?.ok && state.mensaje && (
          <p className="max-w-sm text-[13px] font-medium text-[#1c7a45]">{state.mensaje}</p>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="admin-card w-full space-y-3 rounded-2xl p-4 text-left sm:w-[min(92vw,460px)]">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-espresso">Nuevo acceso</h3>
        <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar" className="admin-faint text-[18px] leading-none hover:text-espresso">
          ✕
        </button>
      </div>

      <label className="block">
        <span className={label}>Nombre</span>
        <input name="nombre" required maxLength={120} placeholder="Nombre y apellido" className={field} />
      </label>
      <label className="block">
        <span className={label}>Email</span>
        <input name="email" type="email" required maxLength={160} placeholder="persona@email.com" className={field} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={label}>Rol</span>
          <select name="rol" defaultValue="asistente" className={field}>
            {roles.map((r) => (
              <option key={r} value={r}>{ROL_LABEL[r]}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={label}>Contraseña inicial</span>
          <input name="password" required minLength={10} placeholder="mínimo 10 caracteres" className={field} />
        </label>
      </div>

      <p className="admin-faint text-[12px] leading-relaxed">
        Pasale el email y la contraseña por un canal seguro y pedile que la cambie al entrar.
        La <strong>historia clínica</strong> solo la ven el dueño y los profesionales.
      </p>

      {state && !state.ok && state.error && (
        <p className="admin-danger text-[13px] font-medium">{state.error}</p>
      )}

      <SubmitButton pendingText="Creando…" className="admin-btn w-full rounded-full px-5 py-2.5 text-[14px] font-medium">
        Crear acceso
      </SubmitButton>
    </form>
  );
}
