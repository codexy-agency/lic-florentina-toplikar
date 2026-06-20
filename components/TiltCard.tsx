"use client";

import { useRef, type ReactNode, type MouseEvent } from "react";

/** Tarjeta con inclinación 3D que sigue al mouse (solo desktop con puntero). */
export function TiltCard({
  children,
  className = "",
  max = 4,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  function onMove(e: MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el || window.matchMedia("(pointer: coarse)").matches) return;
    cancelAnimationFrame(frame.current);
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    frame.current = requestAnimationFrame(() => {
      el.style.transform = `perspective(900px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg)`;
    });
  }

  function onLeave() {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(frame.current);
    el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)";
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`transition-transform duration-300 ease-out [transform-style:preserve-3d] ${className}`}
    >
      {children}
    </div>
  );
}
