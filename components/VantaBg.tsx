"use client";

import { useEffect, useRef } from "react";

/**
 * Fondo WebGL vivo (Vanta FOG) en paleta crema/sage.
 * - Solo desktop con puntero fino y sin reduced-motion (en mobile: gradiente CSS animado, ver .living-gradient).
 * - Carga diferida: no bloquea el LCP.
 */
export function VantaBg() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const isDesktop = window.matchMedia(
      "(min-width: 768px) and (pointer: fine)"
    ).matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!isDesktop || reduced) return;

    let effect: { destroy: () => void } | null = null;
    let cancelled = false;

    (async () => {
      try {
        const THREE = await import("three");
        const FOG = (await import("vanta/dist/vanta.fog.min")).default;
        if (cancelled) return;
        effect = FOG({
          el,
          THREE,
          mouseControls: true,
          touchControls: false,
          gyroControls: false,
          minHeight: 200,
          minWidth: 200,
          highlightColor: 0xfbf7f7, // base rosada
          midtoneColor: 0xf0dfe6, // rosa empolvado pálido
          lowlightColor: 0xe7cfdc, // malva suave
          baseColor: 0xf6eef1, // base con cast rosa (sin zonas "peladas")
          blurFactor: 0.9,
          speed: 0.6,
          zoom: 0.3, // nubes grandes y envolventes
        });
      } catch {
        // si WebGL no está disponible, queda el gradiente CSS
      }
    })();

    return () => {
      cancelled = true;
      effect?.destroy();
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="living-gradient pointer-events-none absolute inset-0 -z-10"
    />
  );
}
