"use client";

import { WHATSAPP_URL } from "./Reveal";

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
      className={`group inline-flex items-center gap-3 rounded-full pl-6 pr-2 py-2 text-[15px] font-medium tracking-tight transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:opacity-95 active:scale-[0.98] ${base} ${className}`}
    >
      <span>{label}</span>
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-px group-hover:scale-105 ${iconBg}`}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 17 17 7M9 7h8v8" />
        </svg>
      </span>
    </a>
  );
}
