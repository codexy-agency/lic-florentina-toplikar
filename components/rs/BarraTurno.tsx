"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Barra flotante del celular. Aparece recién cuando los botones de la portada
 * salen de pantalla (antes sería el mismo botón dos veces) y se esconde al
 * llegar al bloque de contacto, que ya trae los suyos.
 */
export function BarraTurno({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const objetivos = [...document.querySelectorAll<HTMLElement>("[data-oculta-barra]")];
    if (!objetivos.length || typeof IntersectionObserver === "undefined") {
      const t = setTimeout(() => setVisible(true), 0);
      return () => clearTimeout(t);
    }
    const aLaVista = new Set<Element>();
    const io = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) aLaVista.add(e.target);
          else aLaVista.delete(e.target);
        }
        setVisible(aLaVista.size === 0);
      },
      { threshold: 0.2 }
    );
    objetivos.forEach((o) => io.observe(o));
    return () => io.disconnect();
  }, []);

  return (
    <div className={`rs-barra${visible ? " rs-barra--visible" : ""}`} aria-hidden={!visible} inert={!visible}>
      {children}
    </div>
  );
}
