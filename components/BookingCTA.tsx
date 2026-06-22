import Link from "next/link";

/**
 * CTA principal para SACAR TURNO. Navega a la página dedicada /reservar
 * (client-side, instantáneo). Mismo lenguaje visual que WhatsAppCTA pero con
 * ícono de calendario, para diferenciar "reservar turno" de "consulta por WhatsApp".
 */
export function BookingCTA({
  label = "Reservar turno",
  variant = "dark",
  className = "",
  href = "/reservar",
}: {
  label?: string;
  variant?: "dark" | "light" | "sage";
  className?: string;
  href?: string;
}) {
  const base =
    variant === "dark"
      ? "bg-espresso text-cream"
      : variant === "sage"
        ? "bg-sage-deep text-cream"
        : "bg-cream text-espresso ring-1 ring-[var(--color-line)]";
  const iconBg = variant === "light" ? "bg-espresso/5" : "bg-white/15";

  return (
    <Link
      href={href}
      className={`group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-full py-2 pl-6 pr-2 text-[15px] font-medium tracking-tight transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-px hover:shadow-[0_16px_40px_-14px_rgba(124,138,111,0.55)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-cream ${base} ${className}`}
    >
      {/* Sheen sweep on hover */}
      <span className="pointer-events-none absolute inset-0 -translate-x-full skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
      <span className="relative">{label}</span>
      <span
        className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-px group-hover:scale-105 ${iconBg}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="4.5" width="18" height="17" rx="2.5" />
          <path d="M3 9.5h18M8 2.5v4M16 2.5v4M8.5 14.5l2.5 2.5 4.5-4.5" />
        </svg>
      </span>
    </Link>
  );
}
