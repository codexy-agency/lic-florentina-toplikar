"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export const WHATSAPP_URL =
  "https://wa.me/542920612515?utm_source=web&utm_medium=cta";

type Dir = "up" | "left" | "right" | "scale" | "none";

const OFFSET: Record<Dir, string> = {
  up: "translate3d(0,48px,0)",
  left: "translate3d(-56px,0,0)",
  right: "translate3d(56px,0,0)",
  scale: "scale(0.94)",
  none: "translate3d(0,0,0)",
};

export function Reveal({
  children,
  delay = 0,
  className = "",
  from = "up",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  from?: Dir;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Si el usuario pidió menos movimiento, mostramos al instante sin animación.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "-80px" }
    );
    io.observe(el);
    // Failsafe: si el observer no dispara (conexión lenta, layout raro, navegador
    // sin soporte), revelamos igual a los 1.4 s para no dejar contenido "a medias".
    const t = setTimeout(() => setShown(true), 1400);
    return () => {
      io.disconnect();
      clearTimeout(t);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        transitionDelay: `${delay}s`,
        transitionProperty: "opacity, transform, filter",
        transitionDuration: "900ms",
        transitionTimingFunction: "cubic-bezier(0.32,0.72,0,1)",
        opacity: shown ? 1 : 0,
        transform: shown ? "translate3d(0,0,0) scale(1)" : OFFSET[from],
        filter: shown ? "blur(0)" : "blur(8px)",
      }}
    >
      {children}
    </div>
  );
}
