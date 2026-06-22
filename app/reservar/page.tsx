import type { Metadata } from "next";
import Link from "next/link";
import { TurnoForm } from "@/components/TurnoForm";
import { WHATSAPP_URL } from "@/components/Reveal";
import { Arrow, ArrowLeft } from "@/components/Arrow";

export const metadata: Metadata = {
  title: "Reservá tu turno",
  description:
    "Elegí servicio, profesional, día y horario y reservá tu turno con la Lic. Paulina Pilotti. Online a todo el país y presencial en Viedma.",
  alternates: { canonical: "/reservar" },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: "/reservar",
    title: "Reservá tu turno | Lic. Paulina Pilotti",
    description: "Elegí servicio, profesional y horario disponible. Reservá en un minuto.",
  },
};

const ESPERAR = [
  {
    t: "Vos elegís todo",
    d: "Servicio, modalidad —online o presencial en Viedma— y el horario que mejor te quede.",
    icon: (
      <>
        <path d="M9 11.5 11 13.5 15.5 9" />
        <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
      </>
    ),
  },
  {
    t: "Horarios reales, al instante",
    d: "Ves mi agenda libre de verdad y reservás en segundos. Sin esperas ni idas y vueltas.",
    icon: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5v5l3.2 1.8" />
      </>
    ),
  },
  {
    t: "Te confirmo yo misma",
    d: "Recibís la confirmación al contacto que dejes, normalmente dentro de las 24 hs.",
    icon: (
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    ),
  },
];

// Tira de confianza compacta para mobile (reemplaza la lista larga, que empuja
// el reservador demasiado abajo en pantallas chicas).
const TRUST = [
  {
    l: "Sin pago online",
    icon: <><rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  },
  {
    l: "Confirmo en 24 h",
    icon: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v5l3.2 1.8" /></>,
  },
  {
    l: "Online y presencial",
    icon: <><rect x="3" y="6" width="13" height="12" rx="2" /><path d="m16 10 5-3v10l-5-3" /></>,
  },
];

export default function ReservarPage() {
  return (
    <div className="grain min-h-[100dvh] bg-[#FBF8F2]">
      {/* Header minimal */}
      <header className="border-b border-[var(--color-line)] bg-cream-deep/30">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 md:px-8">
          <Link href="/" className="group inline-flex items-center gap-2 font-serif text-[17px] tracking-tight text-espresso">
            <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
            Paulina<span className="italic text-sage-deep"> Pilotti</span>
          </Link>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] font-medium text-sage-deep underline-offset-4 transition-colors hover:text-espresso hover:underline"
          >
            <span className="inline-flex items-center gap-1.5">¿Dudas? Escribime <Arrow className="h-4 w-4" /></span>
          </a>
        </div>
      </header>

      <main className="reservar-main mx-auto grid max-w-6xl gap-6 px-5 py-8 md:px-8 md:py-12 lg:grid-cols-12 lg:gap-10">
        {/* Panel de marca (izquierda) */}
        <aside className="min-w-0 lg:col-span-5">
          <div className="lg:sticky lg:top-8">
            <div className="relative overflow-hidden rounded-[2rem] p-6 text-cream shadow-[0_30px_70px_-30px_rgba(58,49,55,0.55)] sm:p-7 md:p-9">
              {/* Fondo con gradiente cálido de marca + textura sutil */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#9C5475] via-[#7E5A75] to-[#403C52]" />
              <div aria-hidden className="absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_0%,rgba(255,255,255,0.14),transparent_55%)]" />
              <div aria-hidden className="absolute -right-12 -top-12 h-52 w-52 rounded-full bg-[#E7B9CA]/25 blur-3xl" />
              <div aria-hidden className="absolute -bottom-14 -left-10 h-52 w-52 rounded-full bg-[#C9B6D6]/20 blur-3xl" />

              <div className="relative">
                <span className="inline-flex items-center gap-2 rounded-full bg-cream/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cream/90 ring-1 ring-cream/15">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E7B9CA]/70" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#E7B9CA]" />
                  </span>
                  Turnos online
                </span>
                <h1 className="mt-5 text-balance font-serif text-[clamp(2.1rem,5vw,3.1rem)] font-light leading-[1.04] tracking-tight">
                  Reservá tu turno
                  <span className="italic text-[#EBC4D2]"> en un minuto</span>
                </h1>
                <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-cream/90">
                  Sin llamados ni idas y vueltas: elegí el horario que mejor te
                  quede y te lo confirmo personalmente.
                </p>

                {/* MOBILE — tira de confianza compacta (la lista larga se oculta) */}
                <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-2.5 lg:hidden">
                  {TRUST.map((x) => (
                    <li key={x.l} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-cream/90">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-[#EBC4D2]">
                        {x.icon}
                      </svg>
                      {x.l}
                    </li>
                  ))}
                </ul>

                {/* DESKTOP — beneficios desarrollados */}
                <ul className="mt-8 hidden space-y-4 lg:block">
                  {ESPERAR.map((x) => (
                    <li key={x.t} className="flex gap-3.5">
                      <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-cream/12 text-[#EBC4D2] ring-1 ring-cream/15">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                          {x.icon}
                        </svg>
                      </span>
                      <div>
                        <p className="font-medium">{x.t}</p>
                        <p className="mt-0.5 text-[14px] leading-relaxed text-cream/80">{x.d}</p>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Firma profesional (en mobile la identidad ya está en el header) */}
                <div className="mt-7 hidden items-center gap-3 border-t border-cream/15 pt-5 lg:flex">
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-cream/12 font-serif text-[17px] tracking-tight text-cream ring-1 ring-cream/25">
                    PP
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[14px] font-medium leading-tight">
                      Lic. Paulina Pilotti
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-[#EBC4D2]" aria-label="Matrícula verificada">
                        <path d="M9 12.5 11 14.5 15.5 10" /><circle cx="12" cy="12" r="9" />
                      </svg>
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-cream/70">
                      Psicóloga clínica · MP 7321
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Wizard (derecha) */}
        <div className="min-w-0 lg:col-span-7">
          <TurnoForm />
        </div>
      </main>
    </div>
  );
}
