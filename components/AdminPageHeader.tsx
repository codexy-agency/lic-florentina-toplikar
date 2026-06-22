import type { ReactNode } from "react";

/**
 * Encabezado consistente de cada sección del panel: una barra de acento vertical
 * (el "toque" de marca), título grande y prolijo + descripción, y un slot
 * opcional a la derecha para una acción (ej. "Agregar ingreso").
 */
export function AdminPageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--a-border)] pb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
      <div className="flex items-stretch gap-3.5">
        <span
          aria-hidden
          className="w-1 shrink-0 rounded-full bg-gradient-to-b from-[var(--a-accent)] to-[var(--a-accent-ink)]"
        />
        <div className="min-w-0">
          <h1 className="text-[27px] font-semibold leading-tight tracking-[-0.02em] text-[var(--a-text)] md:text-[33px]">
            {title}
          </h1>
          {description && (
            <p className="admin-muted mt-1.5 max-w-xl text-[14px] leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>
      {children && <div className="w-full sm:w-auto sm:shrink-0">{children}</div>}
    </div>
  );
}
