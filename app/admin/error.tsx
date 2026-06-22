"use client";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="admin-shell flex min-h-[100dvh] items-center justify-center px-6">
      <div className="admin-card max-w-md rounded-2xl p-8 text-center">
        <h2 className="font-serif text-xl tracking-tight text-espresso">
          No se pudo completar la acción
        </h2>
        <p className="admin-muted mt-2 text-[14px] leading-relaxed">
          {error.message?.includes("superpone")
            ? error.message
            : "Puede que ese horario ya esté ocupado o que haya un problema momentáneo. Probá de nuevo."}
        </p>
        <button
          onClick={reset}
          className="admin-btn mt-6 rounded-full px-6 py-2.5 text-[14px] font-medium"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
