"use client";

import { useState } from "react";
import { WhatsAppCTA } from "./WhatsAppCTA";

const LINKS = [
  { label: "Sobre mí", href: "#sobre-mi" },
  { label: "Servicios", href: "#servicios" },
  { label: "Cómo trabajo", href: "#proceso" },
  { label: "Preguntas", href: "#faq" },
];

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex justify-center px-4">
        <nav className="mt-6 flex w-full max-w-3xl items-center justify-between gap-4 rounded-full border border-[var(--color-line)] bg-cream/70 px-3 py-2 pl-6 backdrop-blur-xl">
          <a href="#inicio" className="font-serif text-[17px] tracking-tight">
            Florentina<span className="text-sage"> Toplikar</span>
          </a>

          <div className="hidden items-center gap-7 md:flex">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-[14px] text-espresso-soft transition-colors duration-300 hover:text-espresso"
              >
                {l.label}
              </a>
            ))}
          </div>

          <div className="hidden md:block">
            <WhatsAppCTA label="Consulta" />
          </div>

          {/* Hamburger */}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Menú"
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-espresso/5 md:hidden"
          >
            <span
              className={`absolute h-[1.5px] w-5 bg-espresso transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                open ? "rotate-45" : "-translate-y-1.5"
              }`}
            />
            <span
              className={`absolute h-[1.5px] w-5 bg-espresso transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                open ? "-rotate-45" : "translate-y-1.5"
              }`}
            />
          </button>
        </nav>
      </header>

      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-cream/90 backdrop-blur-2xl transition-opacity duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {LINKS.map((l, i) => (
          <a
            key={l.href}
            href={l.href}
            onClick={() => setOpen(false)}
            style={{ transitionDelay: open ? `${0.08 + i * 0.06}s` : "0s" }}
            className={`font-serif text-4xl tracking-tight text-espresso transition-all duration-600 ease-[cubic-bezier(0.32,0.72,0,1)] ${
              open ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
            }`}
          >
            {l.label}
          </a>
        ))}
        <div
          style={{ transitionDelay: open ? `${0.08 + LINKS.length * 0.06}s` : "0s" }}
          className={`mt-8 transition-all duration-600 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            open ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          <WhatsAppCTA label="Agendar consulta" />
        </div>
      </div>
    </>
  );
}
