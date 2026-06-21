"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { agendarTurnoManual, type ManualState } from "@/app/admin/actions";
import type { Service, Staff } from "@/lib/scheduling/types";
import { SubmitButton } from "./SubmitButton";

/** Carga manual de un turno desde el panel: para quien reserva por WhatsApp o
 *  teléfono. Queda confirmado al instante y registra al paciente. */
export function AgendarManualForm({
  services,
  staff,
}: {
  services: Service[];
  staff: Staff[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ManualState | null, FormData>(
    agendarTurnoManual,
    null
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      const t = setTimeout(() => setOpen(false), 2000);
      return () => clearTimeout(t);
    }
  }, [state]);

  const field =
    "admin-input w-full rounded-xl px-3.5 py-2.5 text-[14px] text-espresso";
  const label =
    "mb-1.5 block text-[12px] uppercase tracking-[0.1em] text-sage-deep";

  if (!open) {
    return (
      <div className="mt-5">
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-espresso px-5 py-2.5 text-[14px] font-medium text-cream shadow-float transition-all duration-300 hover:-translate-y-px"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Agendar turno a mano
        </button>
        {state?.ok && (
          <span className="ml-3 text-[14px] font-medium text-sage-deep">
            ✓ Turno agendado{state.nombre ? ` para ${state.nombre}` : ""}.
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-2xl admin-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg tracking-tight text-espresso">
          Agendar turno a mano
        </h3>
        <button
          onClick={() => setOpen(false)}
          className="text-[13px] text-espresso-soft transition-colors hover:text-espresso"
          aria-label="Cerrar"
        >
          ✕
        </button>
      </div>
      <p className="mt-1 text-[13px] text-espresso-soft">
        Para quien te escribe por WhatsApp o teléfono. Queda confirmado al
        instante y se agrega a Pacientes.
      </p>

      <form ref={formRef} action={formAction} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={label}>Nombre</span>
          <input name="nombre" required maxLength={120} className={field} placeholder="Nombre y apellido" />
        </label>
        <label className="block">
          <span className={label}>WhatsApp o teléfono</span>
          <input name="contacto" required maxLength={160} className={field} placeholder="+54 9 ..." />
        </label>
        <label className="block">
          <span className={label}>Fecha y hora</span>
          <input type="datetime-local" name="fecha" required className={field} />
        </label>
        <label className="block">
          <span className={label}>Modalidad</span>
          <select name="modalidad" className={field} defaultValue="online">
            <option value="online">Online</option>
            <option value="presencial">Presencial</option>
          </select>
        </label>
        {services.length > 0 && (
          <label className="block">
            <span className={label}>Servicio</span>
            <select name="serviceId" className={field} defaultValue={services[0]?.id ?? ""}>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} · {s.durationMin} min
                </option>
              ))}
            </select>
          </label>
        )}
        {staff.length > 1 && (
          <label className="block">
            <span className={label}>Profesional</span>
            <select name="staffId" className={field} defaultValue={staff[0]?.id ?? ""}>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </label>
        )}
        {staff.length === 1 && <input type="hidden" name="staffId" value={staff[0].id} />}

        <div className="sm:col-span-2 mt-1 flex flex-wrap items-center gap-3">
          <SubmitButton
            pendingText="Agendando…"
            className="rounded-full bg-espresso px-6 py-3 text-[14px] font-medium text-cream transition-all duration-300 hover:-translate-y-px"
          >
            Agendar turno
          </SubmitButton>
          {state && !state.ok && state.error && (
            <span className="text-[13px] font-medium text-[#9C5475]">{state.error}</span>
          )}
          {state?.ok && (
            <span className="text-[13px] font-medium text-sage-deep">✓ Agendado.</span>
          )}
        </div>
      </form>
    </div>
  );
}
