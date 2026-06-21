"use client";

import { useFormStatus } from "react-dom";

/** Botón de submit con feedback de "enviando…" automático para Server Actions.
 *  Debe ir DENTRO de un <form action={...}>. */
export function SubmitButton({
  children,
  pendingText,
  className,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${className ?? ""} disabled:cursor-wait disabled:opacity-60`}
    >
      {pending ? pendingText ?? "Guardando…" : children}
    </button>
  );
}
