import type { Metadata } from "next";
import Link from "next/link";
import { TurnoForm } from "@/components/TurnoForm";
import { WHATSAPP_URL } from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Reservá tu turno",
  description:
    "Elegí día y horario y reservá tu turno con la Lic. Paulina Pilotti. Atención online a todo el país y presencial en Viedma. Sesiones de 50 minutos.",
  alternates: { canonical: "/reservar" },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: "/reservar",
    title: "Reservá tu turno | Lic. Paulina Pilotti",
    description:
      "Elegí día y horario disponible y reservá tu turno online o presencial en un minuto.",
  },
};

const ESPERAR = [
  {
    t: "Online o presencial",
    d: "Sesiones por videollamada a todo el país o presenciales en el consultorio de Viedma.",
  },
  {
    t: "50 minutos",
    d: "Cada encuentro dura aproximadamente 50 minutos. La frecuencia la definimos juntos.",
  },
  {
    t: "Confirmación personal",
    d: "Reservás el horario y te confirmo personalmente al contacto que dejes, dentro de las 24 hs.",
  },
];

export default function ReservarPage() {
  return (
    <div className="grain min-h-[100dvh] bg-[#FBF8F2]">
      {/* Header minimal y rápido */}
      <header className="border-b border-[var(--color-line)] bg-cream-deep/30">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 md:px-8">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 font-serif text-[17px] tracking-tight text-espresso"
          >
            <span className="transition-transform duration-300 group-hover:-translate-x-0.5">
              ←
            </span>
            Paulina<span className="italic text-sage-deep"> Pilotti</span>
          </Link>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] font-medium text-sage-deep underline-offset-4 transition-colors hover:text-espresso hover:underline"
          >
            ¿Dudas? Escribime →
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-16">
        {/* Encabezado */}
        <div className="max-w-2xl">
          <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-sage-deep">
            Turnos
          </span>
          <h1 className="mt-4 text-balance font-serif text-4xl font-light leading-[1.05] tracking-tight text-espresso md:text-5xl">
            Reservá tu turno
            <span className="italic text-sage-deep"> en un minuto</span>
          </h1>
          <p className="mt-5 max-w-lg text-[16px] leading-relaxed text-espresso-soft md:text-[17px]">
            Elegí la modalidad y un horario disponible. Te confirmo personalmente
            al contacto que dejes — sin idas y vueltas.
          </p>
        </div>

        {/* Grid: info + formulario */}
        <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:gap-12">
          {/* Qué esperar */}
          <aside className="lg:col-span-5">
            <div className="lg:sticky lg:top-10">
              <ul className="space-y-4">
                {ESPERAR.map((x, i) => (
                  <li
                    key={x.t}
                    className="flex gap-4 rounded-2xl border border-[var(--color-line)] bg-white/50 p-5"
                  >
                    <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-sage/15 font-serif text-[15px] italic text-sage-deep">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-medium text-espresso">{x.t}</p>
                      <p className="mt-1 text-[14px] leading-relaxed text-espresso-soft">
                        {x.d}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-5 px-1 text-[13px] leading-relaxed text-espresso-soft/70">
                Lic. Paulina Pilotti · MP 7321. Tus datos se usan únicamente para
                coordinar y confirmar el turno.
              </p>
            </div>
          </aside>

          {/* Formulario de reserva (slots reales) */}
          <div className="lg:col-span-7">
            <TurnoForm />
          </div>
        </div>
      </main>
    </div>
  );
}
