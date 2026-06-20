"use client";

import { lazy, Suspense, useEffect, useRef, useState } from "react";

const Spline = lazy(() => import("@splinetool/react-spline"));

/**
 * Slot para una escena 3D interactiva de Spline.
 *
 * Cómo usarlo:
 *  1. Elegí/armá una escena en https://spline.design (Community: buscar
 *     "organic shapes", "zen", "floating blobs").
 *  2. Export → "Code Export" → copiá la URL .splinecode.
 *  3. Pegala en SPLINE_SCENE_URL (o pasala por prop) y listo.
 *
 * Carga perezosa: solo descarga el runtime cuando entra al viewport
 * y hay una URL configurada. Si no hay URL, no renderiza nada.
 */
export const SPLINE_SCENE_URL = ""; // ej: "https://prod.spline.design/XXXX/scene.splinecode"

export function SplineScene({
  url = SPLINE_SCENE_URL,
  className = "",
}: {
  url?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!url || !ref.current) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [url]);

  if (!url) return null;

  return (
    <div ref={ref} className={className} aria-hidden="true">
      {visible && (
        <Suspense fallback={null}>
          <Spline scene={url} />
        </Suspense>
      )}
    </div>
  );
}
