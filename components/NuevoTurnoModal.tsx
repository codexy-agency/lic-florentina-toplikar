"use client";

import { useActionState, useEffect, useState } from "react";
import { agendarTurnoManual, type ManualState } from "@/app/admin/actions";
import { SubmitButton } from "./SubmitButton";
import type { Service, Staff } from "@/lib/scheduling/types";

export type PacienteMini = { id: string; nombre: string; contacto: string; proximoTurno?: string };

function fmtCorto(iso: string) {
  if (!iso || iso.length < 16) return "";
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)} ${iso.slice(11, 16)} hs`;
}

/**
 * Modal para crear un turno desde el panel (p. ej. tocando un hueco del
 * calendario). Permite elegir un paciente existente o cargar uno nuevo, y
 * asignarle servicio, profesional, modalidad y horario. Usa la misma acción que
 * "Agendar a mano" (queda confirmado + registra/vincula al paciente).
 */
export function NuevoTurnoModal({
  open,
  fecha,
  onClose,
  services,
  staff,
  pacientes,
}: {
  open: boolean;
  fecha: string; // "YYYY-MM-DDTHH:MM"
  onClose: () => void;
  services: Service[];
  staff: Staff[];
  pacientes: PacienteMini[];
}) {
  const [state, formAction] = useActionState<ManualState | null, FormData>(
    agendarTurnoManual,
    null
  );
  const [modo, setModo] = useState<"existente" | "nuevo">("existente");
  const [pacienteId, setPacienteId] = useState("");
  const [fechaVal, setFechaVal] = useState(fecha);

  useEffect(() => {
    if (open) {
      setFechaVal(fecha);
      setPacienteId("");
      setModo(pacientes.length ? "existente" : "nuevo");
    }
  }, [open, fecha, pacientes.length]);

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  useEffect(() => {
    if (!open) return;
    const f = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", f);
    return () => document.removeEventListener("keydown", f);
  }, [open, onClose]);

  if (!open) return null;
  const pac = pacientes.find((p) => p.id === pacienteId);
  const field = "admin-input w-full rounded-xl px-3.5 py-2.5 text-[14px] text-espresso";
  const label = "admin-kicker mb-1.5 block text-[12px]";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Nuevo turno"
        className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface)] p-5 shadow-[0_28px_70px_-22px_rgba(43,39,41,0.55)] sm:p-6"
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[18px] font-semibold tracking-tight text-espresso">Nuevo turno</h3>
          <button onClick={onClose} aria-label="Cerrar" className="flex h-8 w-8 items-center justify-center rounded-full text-espresso-soft transition-colors hover:bg-[var(--a-surface-2)] hover:text-espresso">✕</button>
        </div>

        <form action={formAction} className="mt-4 grid gap-4 sm:grid-cols-2">
          {/* Paciente: existente o nuevo */}
          <div className="sm:col-span-2">
            <span className={label}>Paciente</span>
            {pacientes.length > 0 && (
              <div className="mb-2 inline-flex rounded-full border border-[var(--a-border)] bg-[var(--a-surface-2)] p-0.5">
                {(["existente", "nuevo"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setModo(m)}
                    className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium capitalize transition-colors ${
                      modo === m ? "bg-[var(--a-accent)] text-white" : "text-espresso-soft hover:text-espresso"
                    }`}
                  >
                    {m === "existente" ? "Existente" : "Nuevo"}
                  </button>
                ))}
              </div>
            )}

            {modo === "existente" && pacientes.length > 0 ? (
              <>
                <select
                  value={pacienteId}
                  onChange={(e) => setPacienteId(e.target.value)}
                  className={field}
                  aria-label="Elegir paciente"
                >
                  <option value="">— Elegí un paciente —</option>
                  {pacientes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} · {p.contacto}
                    </option>
                  ))}
                </select>
                <input type="hidden" name="nombre" value={pac?.nombre || ""} />
                <input type="hidden" name="contacto" value={pac?.contacto || ""} />
                {pac?.proximoTurno && (
                  <p className="mt-2 flex items-start gap-2 rounded-xl bg-[#F6EFDD] px-3 py-2 text-[12.5px] font-medium leading-snug text-[#7E5E18]">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" />
                    </svg>
                    Ya tiene un turno el {fmtCorto(pac.proximoTurno)}. Revisá que no lo estés duplicando.
                  </p>
                )}
              </>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <input name="nombre" required maxLength={120} className={field} placeholder="Nombre y apellido" />
                <input name="contacto" required maxLength={160} className={field} placeholder="WhatsApp o email" />
              </div>
            )}
          </div>

          <label className="block">
            <span className={label}>Fecha y hora</span>
            <input
              type="datetime-local"
              name="fecha"
              required
              value={fechaVal}
              onChange={(e) => setFechaVal(e.target.value)}
              className={field}
            />
          </label>
          <label className="block">
            <span className={label}>Modalidad</span>
            <select name="modalidad" defaultValue="online" className={field}>
              <option value="online">Online</option>
              <option value="presencial">Presencial</option>
            </select>
          </label>
          {services.length > 0 && (
            <label className="block">
              <span className={label}>Servicio</span>
              <select name="serviceId" defaultValue={services[0]?.id ?? ""} className={field}>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre} · {s.durationMin} min
                  </option>
                ))}
              </select>
            </label>
          )}
          {staff.length > 1 ? (
            <label className="block">
              <span className={label}>Profesional</span>
              <select name="staffId" defaultValue={staff[0]?.id ?? ""} className={field}>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </label>
          ) : staff.length === 1 ? (
            <input type="hidden" name="staffId" value={staff[0].id} />
          ) : null}

          <div className="mt-1 flex flex-wrap items-center justify-end gap-3 sm:col-span-2">
            {state && !state.ok && state.error && (
              <span className="admin-danger mr-auto text-[13px] font-medium">{state.error}</span>
            )}
            <button type="button" onClick={onClose} className="rounded-full border border-[var(--a-border-strong)] px-5 py-2.5 text-[14px] font-medium text-[var(--a-text-2)] transition-colors hover:bg-[var(--a-surface-2)]">
              Cancelar
            </button>
            <SubmitButton
              pendingText="Agendando…"
              className="admin-btn rounded-full px-6 py-2.5 text-[14px] font-medium"
            >
              Agendar turno
            </SubmitButton>
          </div>
        </form>
      </div>
    </>
  );
}
