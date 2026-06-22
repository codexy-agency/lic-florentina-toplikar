"use client";

import { WHATSAPP_URL } from "./Reveal";
import { ArrowUpRight } from "./Arrow";

export function WhatsAppCTA({
  label = "Agendar consulta",
  variant = "dark",
  className = "",
}: {
  label?: string;
  variant?: "dark" | "light";
  className?: string;
}) {
  const base =
    variant === "dark"
      ? "bg-espresso text-cream"
      : "bg-cream text-espresso ring-1 ring-[var(--color-line)]";
  const iconBg = variant === "dark" ? "bg-white/15" : "bg-espresso/5";

  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-full pl-6 pr-2 py-2 text-[15px] font-medium tracking-tight transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-px hover:shadow-[0_16px_40px_-14px_rgba(124,138,111,0.55)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-cream ${base} ${className}`}
    >
      {/* Sheen sweep on hover */}
      <span className="pointer-events-none absolute inset-0 -translate-x-full skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
      <span className="relative">{label}</span>
      <span
        className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-px group-hover:scale-105 ${iconBg}`}
      >
        <ArrowUpRight className="h-[17px] w-[17px]" />
      </span>
    </a>
  );
}
