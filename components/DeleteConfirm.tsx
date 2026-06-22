"use client";

import { useEffect, useState } from "react";

/**
 * Botón de eliminar con confirmación (popover). Evita el borrado accidental:
 * al tocar el ícono se abre "¿Eliminar X?" con Eliminar / Cancelar, sin tocar
 * nada hasta confirmar. El ícono es neutro y se pone rojo al pasar/abrir.
 */
export function DeleteConfirm({
  onConfirm,
  itemLabel,
  hint = "Se quita de la lista. Se aplica al Guardar.",
}: {
  onConfirm: () => void;
  itemLabel?: string;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Eliminar${itemLabel ? ` ${itemLabel}` : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-[var(--a-danger-soft)] hover:text-[var(--a-danger)] sm:h-9 sm:w-9 ${
          open ? "bg-[var(--a-danger-soft)] text-[var(--a-danger)]" : "text-[var(--a-text-3)]"
        }`}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />
        </svg>
      </button>

      {open && (
        <>
          {/* Mini-modal centrado: nunca se sale de pantalla, claro para acción destructiva */}
          <div
            className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirmar eliminación"
            className="fixed left-1/2 top-1/2 z-50 w-[min(21rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface)] p-5 text-left shadow-[0_28px_70px_-22px_rgba(43,39,41,0.55)]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--a-danger-soft)] text-[var(--a-danger)]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />
              </svg>
            </span>
            <p className="mt-3.5 text-[16px] font-semibold tracking-tight text-[var(--a-text)]">
              ¿Eliminar {itemLabel || "este elemento"}?
            </p>
            <p className="admin-muted mt-1 text-[13.5px] leading-relaxed">{hint}</p>
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-full border border-[var(--a-border-strong)] bg-[var(--a-surface)] px-4 py-2.5 text-[14px] font-medium text-[var(--a-text-2)] transition-colors hover:bg-[var(--a-surface-2)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onConfirm();
                }}
                className="flex-1 rounded-full bg-[var(--a-danger)] px-4 py-2.5 text-[14px] font-semibold text-white transition-[filter] hover:brightness-110"
              >
                Eliminar
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
