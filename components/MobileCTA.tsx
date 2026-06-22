"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { WHATSAPP_URL } from "./Reveal";

/**
 * Barra de CTA fija para mobile: aparece al pasar el hero y se retira
 * cerca del cierre (donde ya están el CTA final y el footer) para no duplicar.
 * Acción principal: RESERVAR TURNO (página dedicada). WhatsApp como secundario.
 */
export function MobileCTA() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const nearBottom =
        window.innerHeight + y > document.body.scrollHeight - 700;
      setShow(y > 560 && !nearBottom);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed inset-x-4 bottom-4 z-30 flex items-stretch gap-2.5 pb-[env(safe-area-inset-bottom)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] md:hidden ${
        show
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-6 opacity-0"
      }`}
    >
      <Link
        href="/reservar"
        className="flex flex-1 items-center justify-center gap-2.5 rounded-full border border-white/10 bg-espresso px-6 py-4 text-[15px] font-medium tracking-tight text-cream shadow-float active:scale-[0.98]"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="4.5" width="18" height="17" rx="2.5" />
          <path d="M3 9.5h18M8 2.5v4M16 2.5v4M8.5 14.5l2.5 2.5 4.5-4.5" />
        </svg>
        Reservar turno
      </Link>
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Consultar por WhatsApp"
        className="flex items-center justify-center rounded-full border border-[var(--color-line)] bg-cream px-4 text-espresso shadow-float active:scale-[0.98]"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      </a>
    </div>
  );
}
