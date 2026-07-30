"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Pantalla de error del PANEL.
 *
 *  Antes decía "puede que ese horario ya esté ocupado" para CUALQUIER fallo, y
 *  su único control era Reintentar. Dos problemas:
 *
 *   - MENTÍA. Los errores que llegan acá son de todo tipo: sin permiso, cuenta
 *     en solo lectura, tope del plan alcanzado, la base que no contesta. Decirle
 *     a alguien que el problema es un horario cuando le falta un permiso lo manda
 *     a buscar al lugar equivocado.
 *   - NO TENÍA SALIDA. Para los errores que se repiten siempre —un permiso que
 *     no está, un tope alcanzado— Reintentar vuelve a fallar para siempre, y no
 *     había link de vuelta. La pantalla ocupa todo el alto, sin sidebar: quedaba
 *     encerrado.
 *
 *  Ahora el mensaje se muestra tal cual cuando es uno nuestro —los que lanzamos
 *  están escritos para que los lea una persona— y siempre hay por dónde salir. */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[panel]", error.digest ?? error.message);
  }, [error]);

  // Los errores que lanzamos nosotros ya vienen redactados para el usuario
  // (lib/session.ts, lib/planes.ts, las server actions). Los que no reconocemos
  // pueden traer detalles internos —nombres de tablas, rutas—, así que no se
  // muestran.
  const mensaje = error.message || "";
  const esNuestro =
    mensaje.length < 300 &&
    /permiso|solo lectura|plan |cupo|dueño|consultorio|contraseña|superpone|horario|acceso/i.test(
      mensaje
    );

  return (
    <div className="admin-shell flex min-h-[100dvh] items-center justify-center px-6 py-12">
      <div className="admin-card w-full max-w-md rounded-2xl p-8">
        <span
          aria-hidden
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--a-surface-2)] text-[var(--a-text-3)]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4.5M12 16h.01" />
          </svg>
        </span>

        <h2 className="mt-5 text-[19px] font-semibold tracking-tight text-espresso">
          No se pudo completar la acción
        </h2>
        <p className="admin-muted mt-2 text-[14px] leading-relaxed">
          {esNuestro
            ? mensaje
            : "Hubo un problema al procesar lo que pediste. Tus datos están bien: no se guardó nada a medias."}
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={reset}
            className="admin-btn rounded-full px-5 py-2.5 text-[14px] font-medium"
          >
            Reintentar
          </button>
          <Link
            href="/admin"
            className="admin-btn-ghost rounded-full px-5 py-2.5 text-[14px] font-medium"
          >
            Volver al panel
          </Link>
        </div>

        {error.digest && (
          <p className="admin-faint mt-6 font-mono text-[11.5px]">
            Si nos escribís, pasanos este código: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
