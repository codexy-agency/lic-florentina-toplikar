"use client";

import { useEffect, useRef, useState } from "react";
import { borrarNota } from "@/app/admin/pacientes/actions";
import { IconoX } from "@/components/iconos";

/** Borrar una nota de la historia clínica, con confirmación.
 *
 *  Antes era un botón pelado: un click y la nota desaparecía para siempre, sin
 *  preguntar y sin deshacer. El mismo repositorio ya confirmaba el borrado de un
 *  servicio y de un profesional —cosas que se vuelven a cargar en dos minutos—
 *  mientras que una evolución clínica no se recupera.
 *
 *  La confirmación dice QUÉ se borra (la fecha) y que no hay vuelta atrás. No es
 *  un "¿estás seguro?" genérico, que la gente aprende a saltear. */
export function BorrarNota({
  id,
  patientId,
  cuando,
}: {
  id: string;
  patientId: string;
  /** Fecha legible de la nota, para que la confirmación diga cuál. */
  cuando: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    const onClick = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("keydown", onEsc);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.removeEventListener("mousedown", onClick);
    };
  }, [abierto]);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="admin-faint inline-flex items-center gap-1.5 text-[12px] transition-colors hover:text-[var(--a-danger)]"
      >
        <IconoX size={12} />
        Eliminar
      </button>
    );
  }

  return (
    <div
      ref={caja}
      className="rounded-xl border border-[var(--a-danger)]/35 bg-[var(--a-danger-soft)] px-3 py-2.5"
    >
      <p className="text-[12.5px] leading-snug text-[var(--a-danger)]">
        Se borra la nota del <strong>{cuando}</strong>. No se puede deshacer.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <form action={borrarNota}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="patientId" value={patientId} />
          <button className="rounded-full bg-[var(--a-danger)] px-3.5 py-1.5 text-[12px] font-medium text-white">
            Sí, borrarla
          </button>
        </form>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="admin-btn-ghost rounded-full px-3.5 py-1.5 text-[12px] font-medium"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
