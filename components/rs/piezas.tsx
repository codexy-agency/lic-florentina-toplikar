import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, WhatsappLogo } from "@phosphor-icons/react/dist/ssr";

/** Rayo del isotipo de RS, con el trazo redondeado del logo. */
export function Rayo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        d="M14.200 2.500 5.500 13.300h5.300L9.600 21.500l8.900-11h-5.400l1.100-8Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.600"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Muela del isotipo, solo contorno: se usa de marca de agua en los fondos. */
export function MuelaFondo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden focusable="false">
      <path
        d="M16 7c-5.500 0-9 4-9 9.500 0 4 1.700 7 2.600 10.800 1 4.200 1.400 13.700 5.200 13.700 3.400 0 3-9.500 6.200-9.500h6c3.200 0 2.800 9.500 6.200 9.500 3.800 0 4.200-9.500 5.200-13.700.900-3.800 2.600-6.800 2.600-10.800C41 11 37.500 7 32 7c-3.400 0-5.300 1.800-8 1.800S19.400 7 16 7Z"
        stroke="currentColor"
        strokeWidth="0.600"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Separador con intención: una línea que hace el quiebre del rayo en el medio. */
export function Pulso({ className = "" }: { className?: string }) {
  return (
    <div className={`rs-pulso ${className}`} aria-hidden>
      <span />
      <svg viewBox="0 0 56 24" fill="none">
        <path d="M0 12h14l6-9 8 18 7-13 4 4h17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span />
    </div>
  );
}

/** Botón principal: lleva a la reserva. Rayo a la izquierda, flecha en cápsula. */
export function BotonTurno({
  children = "Sacar turno",
  className = "",
  href = "/reservar",
}: {
  children?: ReactNode;
  className?: string;
  href?: string;
}) {
  return (
    <Link href={href} className={`rs-btn rs-btn--volt ${className}`}>
      <Rayo className="rs-btn__rayo" />
      <span className="rs-btn__texto">{children}</span>
      <span className="rs-btn__capsula" aria-hidden>
        <ArrowRight weight="bold" />
      </span>
    </Link>
  );
}

export function BotonWhatsApp({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`rs-btn rs-btn--vidrio ${className}`}>
      <span className="rs-btn__capsula rs-btn__capsula--wa" aria-hidden>
        <WhatsappLogo weight="fill" />
      </span>
      <span className="rs-btn__texto">{children}</span>
    </a>
  );
}
