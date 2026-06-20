"use client";

import { useEffect, useRef, useState } from "react";
import { WhatsAppCTA } from "./WhatsAppCTA";
import { BookingCTA } from "./BookingCTA";

const LINKS = [
  { label: "Sobre mí", href: "#sobre-mi" },
  { label: "Servicios", href: "#servicios" },
  { label: "Turnos", href: "/reservar" },
  { label: "Pagos", href: "#pagos" },
  { label: "Preguntas", href: "#faq" },
];

const EASE = "ease-[cubic-bezier(0.32,0.72,0,1)]";

/**
 * Nav con 3 estados:
 * 1. Arriba de todo (hero): integrado y discreto — sin píldora marcada.
 * 2. Scrolleando hacia abajo: se esconde para dar espacio de lectura.
 * 3. Scrolleando hacia arriba: reaparece "espejado" (espresso sobre crema → crema sobre espresso).
 */
export function Nav() {
  const [open, setOpen] = useState(false);
  const [atTop, setAtTop] = useState(true);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setAtTop(y < 48);
      const delta = y - lastY.current;
      // umbral anti-flicker
      if (Math.abs(delta) > 6) {
        if (y > 140 && delta > 0) setHidden(true);
        else setHidden(false);
        lastY.current = y;
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const mirrored = !atTop;

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-40 flex justify-center px-4 transition-transform duration-500 ${EASE} ${
          hidden && !open ? "-translate-y-[130%]" : "translate-y-0"
        }`}
      >
        <nav
          className={`mt-6 flex w-full max-w-3xl items-center justify-between gap-4 rounded-full border px-3 py-2 pl-6 transition-all duration-500 ${EASE} ${
            mirrored
              ? "border-white/10 bg-espresso/95 shadow-float backdrop-blur-md"
              : "border-transparent bg-transparent"
          }`}
        >
          <a
            href="#inicio"
            className="font-serif text-[17px] tracking-tight text-cream transition-colors duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream/70 focus-visible:ring-offset-2 focus-visible:ring-offset-espresso"
          >
            Paulina<span className="text-[#E7B9CA]"> Pilotti</span>
          </a>

          <div className="hidden items-center gap-7 md:flex">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="group relative text-[14px] text-cream/75 transition-colors duration-300 hover:text-cream focus-visible:text-cream focus-visible:outline-none"
              >
                {l.label}
                <span className={`absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-[#E7B9CA] transition-transform duration-400 ${EASE} group-hover:scale-x-100`} />
              </a>
            ))}
          </div>

          <div className="hidden md:block">
            <BookingCTA label="Reservar turno" variant="light" />
          </div>

          {/* Hamburger */}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-cream/10 transition-colors duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream/70 md:hidden"
          >
            <span
              className={`absolute h-[1.5px] w-5 transition-all duration-500 ${EASE} ${
                open ? "rotate-45 bg-espresso" : "-translate-y-1.5 bg-cream"
              }`}
            />
            <span
              className={`absolute h-[1.5px] w-5 transition-all duration-500 ${EASE} ${
                open ? "-rotate-45 bg-espresso" : "translate-y-1.5 bg-cream"
              }`}
            />
          </button>
        </nav>
      </header>

      {/* Mobile overlay */}
      <div
        id="mobile-menu"
        {...(!open ? { inert: "" as unknown as boolean } : {})}
        className={`fixed inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-cream/95 backdrop-blur-2xl transition-opacity duration-500 ${EASE} md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <Sprig className="pointer-events-none absolute right-8 top-24 h-40 w-20 text-sage/20" />
        {LINKS.map((l, i) => (
          <a
            key={l.href}
            href={l.href}
            onClick={() => setOpen(false)}
            style={{ transitionDelay: open ? `${0.08 + i * 0.06}s` : "0s" }}
            className={`font-serif text-4xl tracking-tight text-espresso transition-all duration-600 ${EASE} ${
              open ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
            }`}
          >
            {l.label}
          </a>
        ))}
        <div
          style={{ transitionDelay: open ? `${0.08 + LINKS.length * 0.06}s` : "0s" }}
          className={`mt-8 flex flex-col items-center gap-3 transition-all duration-600 ${EASE} ${
            open ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          <div onClick={() => setOpen(false)}>
            <BookingCTA label="Reservar turno" variant="dark" />
          </div>
          <WhatsAppCTA label="Consulta por WhatsApp" variant="light" />
        </div>
      </div>
    </>
  );
}

function Sprig({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 200" fill="none" aria-hidden="true">
      <path d="M60 200V20" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      {[40, 70, 100, 130, 160].map((y) => (
        <g key={y}>
          <path d={`M60 ${y}C40 ${y - 14} 26 ${y - 6} 20 ${y + 8}C36 ${y + 12} 50 ${y + 4} 60 ${y}Z`} stroke="currentColor" strokeWidth="0.8" />
          <path d={`M60 ${y - 18}C80 ${y - 32} 94 ${y - 24} 100 ${y - 10}C84 ${y - 6} 70 ${y - 14} 60 ${y - 18}Z`} stroke="currentColor" strokeWidth="0.8" />
        </g>
      ))}
    </svg>
  );
}
