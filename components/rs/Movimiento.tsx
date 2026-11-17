"use client";

import { useEffect, useLayoutEffect } from "react";

// En el servidor useLayoutEffect no corre (y avisa): ahí alcanza con useEffect.
const usarEfectoDeLayout = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Aparición de los bloques al hacer scroll.
 *
 * El HTML llega VISIBLE. Recién cuando este componente monta se le pone
 * `data-mov` a la página, y ahí el CSS esconde lo que tiene `data-aparece`
 * hasta que entra en pantalla. Sin JavaScript, o si algo falla, no queda nada
 * oculto. Lo que ya está a la vista al cargar se marca en el mismo tick, antes
 * del primer pintado, para que no parpadee.
 *
 * Solo transform y opacity. Con "reducir movimiento" no se activa.
 */
export function Movimiento() {
  usarEfectoDeLayout(() => {
    const raiz = document.querySelector<HTMLElement>(".rs");
    if (!raiz) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof IntersectionObserver === "undefined") return;

    const piezas = [...raiz.querySelectorAll<HTMLElement>("[data-aparece]")];
    const alto = window.innerHeight;
    for (const p of piezas) {
      if (p.getBoundingClientRect().top < alto * 0.92) p.setAttribute("data-visto", "");
    }
    raiz.setAttribute("data-mov", "");

    const io = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          e.target.setAttribute("data-visto", "");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.01 }
    );
    piezas.filter((p) => !p.hasAttribute("data-visto")).forEach((p) => io.observe(p));

    // Red de seguridad: si por lo que sea el observador no dispara (pestaña en
    // segundo plano, vista previa embebida), a los 4 s se muestra todo.
    const red = window.setTimeout(() => {
      if (document.visibilityState === "hidden") piezas.forEach((p) => p.setAttribute("data-visto", ""));
    }, 4000);

    return () => {
      io.disconnect();
      window.clearTimeout(red);
    };
  }, []);

  return null;
}
