"use client";

import { useEffect } from "react";

/** Pantalla de error del SITIO PÚBLICO.
 *
 *  Sin esto, un throw en /reservar le mostraba a un paciente la pantalla cruda
 *  de Next: stack trace en desarrollo, "Application error: a client-side
 *  exception has occurred" en producción. A alguien que estaba juntando coraje
 *  para pedir un turno eso no le dice nada y lo saca del proceso.
 *
 *  El texto no se disculpa ni echa la culpa: dice qué pasó, ofrece reintentar y
 *  deja una salida. Y no muestra el mensaje del error, que puede filtrar nombres
 *  de tablas o rutas internas. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // El digest es lo que permite encontrar este error en los logs del servidor
    // sin exponerle nada al visitante.
    console.error("[sitio]", error.digest ?? error.message);
  }, [error]);

  return (
    <main className="grain flex min-h-[100dvh] items-center justify-center bg-cream px-6 py-16">
      <div className="w-full max-w-md text-center">
        <span
          aria-hidden
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cream-deep text-espresso-soft"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4.5M12 16h.01" />
          </svg>
        </span>

        <h1 className="mt-6 font-serif text-[27px] leading-tight tracking-tight text-espresso">
          No pudimos cargar esta página
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-espresso-soft">
          Fue algo de nuestro lado, no tuyo. Probá de nuevo en un momento; si sigue igual,
          escribinos y coordinamos el turno a mano.
        </p>

        <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="w-full rounded-full bg-espresso px-6 py-3 text-[15px] font-medium text-cream transition-transform duration-300 hover:-translate-y-px sm:w-auto"
          >
            Reintentar
          </button>
          <a
            href="/"
            className="w-full rounded-full border border-[var(--color-line)] px-6 py-3 text-[15px] font-medium text-espresso transition-colors hover:bg-cream-deep/50 sm:w-auto"
          >
            Volver al inicio
          </a>
        </div>

        {error.digest && (
          <p className="mt-8 font-mono text-[11.5px] text-espresso-soft/55">
            Si nos escribís, pasanos este código: {error.digest}
          </p>
        )}
      </div>
    </main>
  );
}
