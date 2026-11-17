"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

/**
 * Comparador antes / después.
 *
 * - Con el dedo o el mouse: se arrastra en cualquier punto de la foto (no hay
 *   que acertarle a la manija). `touch-action: pan-y` deja que el scroll vertical
 *   de la página siga funcionando sobre la foto.
 * - Con teclado: es un <input type="range"> real. Flechas mueven de a 2 %,
 *   Inicio/Fin van a los extremos, y el lector de pantalla anuncia el valor.
 * - La posición es una variable CSS (--pos): mover no dispara layout, solo
 *   recorta la foto de arriba con clip-path.
 */
export function AntesDespues({
  antes,
  despues,
  tratamiento,
}: {
  antes: string;
  despues: string;
  tratamiento: string;
}) {
  const [pos, setPos] = useState(50);
  const [tocado, setTocado] = useState(false);
  const marco = useRef<HTMLDivElement>(null);
  const arrastrando = useRef(false);
  const id = useId();

  const desdeX = useCallback((clientX: number) => {
    const el = marco.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width === 0) return;
    const p = ((clientX - r.left) / r.width) * 100;
    setPos(Math.max(0, Math.min(100, p)));
  }, []);

  // Pista de uso: la primera vez que la tarjeta entra en pantalla, la línea se
  // corre sola un poco y vuelve. Una sola vez, y nunca si la persona pidió menos
  // movimiento o ya la tocó.
  useEffect(() => {
    const el = marco.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let cancelado = false;
    const io = new IntersectionObserver(
      (entradas) => {
        if (!entradas.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const inicio = performance.now();
        const dur = 1400;
        const paso = (t: number) => {
          if (cancelado || arrastrando.current) return;
          const k = Math.min(1, (t - inicio) / dur);
          // va hasta 68 % y vuelve a 50 %
          setPos(50 + Math.sin(k * Math.PI) * 18);
          if (k < 1) raf = requestAnimationFrame(paso);
        };
        raf = requestAnimationFrame(paso);
      },
      { threshold: 0.6 }
    );
    io.observe(el);
    return () => {
      cancelado = true;
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, []);

  return (
    <div
      ref={marco}
      className="rs-ba"
      style={{ ["--pos" as string]: `${pos}%` }}
      onPointerDown={(e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        arrastrando.current = true;
        setTocado(true);
        e.currentTarget.setPointerCapture(e.pointerId);
        desdeX(e.clientX);
      }}
      onPointerMove={(e) => {
        if (arrastrando.current) desdeX(e.clientX);
      }}
      onPointerUp={() => (arrastrando.current = false)}
      onPointerCancel={() => (arrastrando.current = false)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="rs-ba__img"
        src={despues}
        alt={`Después: ${tratamiento}, paciente de RS Odontología`}
        width={900}
        height={600}
        loading="lazy"
        decoding="async"
        draggable={false}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="rs-ba__img rs-ba__img--antes"
        src={antes}
        alt={`Antes: ${tratamiento}, paciente de RS Odontología`}
        width={900}
        height={600}
        loading="lazy"
        decoding="async"
        draggable={false}
      />

      <span className="rs-ba__rotulo rs-ba__rotulo--antes" aria-hidden style={{ opacity: pos < 14 ? 0 : 1 }}>
        Antes
      </span>
      <span className="rs-ba__rotulo rs-ba__rotulo--despues" aria-hidden style={{ opacity: pos > 86 ? 0 : 1 }}>
        Después
      </span>

      <label htmlFor={id} className="rs-sr">
        Comparar antes y después de {tratamiento}. Usá las flechas para mover la línea.
      </label>
      <input
        id={id}
        className="rs-ba__rango"
        type="range"
        min={0}
        max={100}
        step={2}
        value={Math.round(pos)}
        aria-valuetext={`${Math.round(pos)} % de la foto de antes a la vista`}
        onChange={(e) => {
          setTocado(true);
          setPos(Number(e.target.value));
        }}
      />

      <span className="rs-ba__linea" aria-hidden>
        <span className={`rs-ba__manija${tocado ? "" : " rs-ba__manija--pista"}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 7-5 5 5 5M15 7l5 5-5 5" />
          </svg>
        </span>
      </span>
    </div>
  );
}
