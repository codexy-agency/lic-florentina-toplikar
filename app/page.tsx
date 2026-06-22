import Image from "next/image";
import Link from "next/link";
import { listServices } from "@/lib/store";
import { Nav } from "@/components/Nav";
import { Reveal, WHATSAPP_URL } from "@/components/Reveal";
import { WhatsAppCTA } from "@/components/WhatsAppCTA";
import { Divider, Leaf } from "@/components/Divider";
import { VineConnectorH, VineConnectorV } from "@/components/Botanical";
import { MobileCTA } from "@/components/MobileCTA";
import { TurnoForm } from "@/components/TurnoForm";
import { BookingCTA } from "@/components/BookingCTA";
import { CopyAlias } from "@/components/CopyAlias";

const SERVICES = [
  {
    tag: "TCC",
    title: "Terapia Cognitivo Conductual",
    body: "Un enfoque con evidencia científica para identificar y transformar patrones de pensamiento y conducta que generan malestar. Práctico, colaborativo y orientado a objetivos concretos.",
  },
  {
    tag: "ACT",
    title: "Terapia de Aceptación y Compromiso",
    body: "Aprendé a relacionarte de otra forma con tus pensamientos y emociones difíciles, para vivir una vida con sentido y alineada a tus valores, sin quedar atrapado en la lucha interna.",
  },
];

const PROCESS = [
  {
    n: "01",
    title: "Primer contacto",
    body: "Me escribís por WhatsApp y conversamos sobre lo que te trae. Sin compromiso, a tu ritmo.",
  },
  {
    n: "02",
    title: "Consulta inicial",
    body: "Nos conocemos, entiendo tu situación y juntos definimos objetivos claros para el proceso.",
  },
  {
    n: "03",
    title: "Proceso terapéutico",
    body: "Encuentros regulares, presenciales en Viedma u online, con herramientas concretas para tu día a día.",
  },
];

const FAQ = [
  {
    q: "¿Atendés de forma online?",
    a: "Sí. Trabajo de manera presencial en Viedma y también online a todo el país. La terapia online tiene la misma efectividad y te permite hacer tu proceso desde donde estés.",
  },
  {
    q: "¿Cuánto dura cada sesión?",
    a: "Cada encuentro tiene una duración aproximada de 50 minutos. La frecuencia suele ser semanal, aunque la definimos juntos según tus necesidades.",
  },
  {
    q: "¿Con qué temas trabajás?",
    a: "Acompaño procesos de ansiedad, estado de ánimo, autoestima, manejo emocional, etapas de cambio y crecimiento personal, en adolescentes, jóvenes y adultos.",
  },
  {
    q: "¿Cómo agendo mi primera consulta?",
    a: "Simplemente escribime por WhatsApp con el botón de esta página. Coordinamos día y horario, y damos el primer paso.",
  },
];

// ISR: la landing se regenera cada 10 min para reflejar precios del catálogo
// (los turnos vienen del mismo origen que el reservador → nunca se desfasan).
export const revalidate = 600;

const money = (n?: number) => (n ? "$" + n.toLocaleString("es-AR") : null);

export default async function Home() {
  // Precios reales del catálogo (mismos que usa el reservador). Si el store no
  // está disponible, la landing NO se rompe: cae a un fallback estático.
  let serviciosLanding: { id: string; nombre: string; priceARS?: number }[] = [];
  try {
    serviciosLanding = (await listServices(true)).filter((s) => s.priceARS);
  } catch {
    serviciosLanding = [];
  }
  return (
    <div className="grain relative overflow-x-hidden">
      <Nav />

      <main>
      {/* HERO — full-bleed inmersivo: imagen pastel + velo + texto abajo-izquierda */}
      <section
        id="inicio"
        className="relative flex min-h-[100dvh] flex-col justify-end overflow-hidden"
      >
        {/* Imagen full-bleed (cerezos pastel) con Ken Burns */}
        <Image
          src="/hero/c1.jpg"
          alt="Cerezos en flor — un espacio de calma y crecimiento"
          fill
          priority
          sizes="100vw"
          className="kenburns object-cover object-center"
        />
        {/* Teñido para unificar con la paleta rosa */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[#9C5475] opacity-15 mix-blend-soft-light" />
        {/* Velo para legibilidad: oscuro abajo-izquierda, transparente arriba-derecha */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-espresso/90 via-espresso/45 to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-espresso/70 to-transparent" />
        {/* Velo superior para el nav */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-espresso/55 to-transparent" />

        {/* Contenido — abajo-izquierda */}
        <div className="text-veil relative z-10 mx-auto w-full max-w-7xl px-6 pb-20 pt-36 md:px-10 md:pb-24">
          <div className="max-w-2xl">
            <div className="hero-rise" style={{ "--d": "0.05s" } as React.CSSProperties}>
              <span className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-cream/90">
                <span className="h-1.5 w-1.5 rounded-full bg-[#E7B9CA]" />
                Lic. Paulina Pilotti · Psicóloga clínica
              </span>
            </div>

            {/* Titular: cada palabra emerge de su máscara */}
            <h1 className="mt-5 text-balance font-serif text-[clamp(2.8rem,7vw,5.4rem)] font-light leading-[1.02] tracking-[-0.02em] text-cream md:mt-6 md:leading-[1]">
              {[
                { w: "Un" },
                { w: "espacio" },
                { w: "para" },
                { w: "cuidar", cls: "italic text-[#EBC4D2]" },
                { w: "tu" },
                { w: "salud" },
                { w: "mental.", cls: "" },
              ].map((x, i, arr) => (
                <span key={i}>
                  <span className="hero-mask">
                    <span
                      className={`hero-word ${x.cls ?? ""}`}
                      style={{ "--d": `${0.12 + i * 0.07}s` } as React.CSSProperties}
                    >
                      {x.w}
                    </span>
                  </span>
                  {i < arr.length - 1 ? " " : ""}
                </span>
              ))}
            </h1>

            <div className="hero-rise" style={{ "--d": "0.55s" } as React.CSSProperties}>
              <p className="mt-6 max-w-lg text-[16px] leading-relaxed text-cream/85 md:text-[18px]">
                Terapia con respaldo científico para la ansiedad, el estrés y los
                momentos de cambio. Con calidez y sin juicios. Consultorio en Viedma
                y sesiones online a todo el país.
              </p>
            </div>

            <div className="hero-rise mt-8 flex flex-col items-stretch gap-3 [text-shadow:none] sm:flex-row sm:items-center sm:gap-4 md:mt-9" style={{ "--d": "0.7s" } as React.CSSProperties}>
              <BookingCTA label="Reservar turno" variant="light" />
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center justify-center gap-2 rounded-full border border-cream/35 bg-cream/5 px-6 py-3 text-[15px] font-medium text-cream backdrop-blur-sm transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-cream/60 hover:bg-cream/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream/70"
              >
                Consultar por WhatsApp
                <span className="transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5">
                  →
                </span>
              </a>
            </div>

            <p className="hero-rise mt-4 text-[13px] text-cream/75 [text-shadow:none]" style={{ "--d": "0.85s" } as React.CSSProperties}>
              Sesiones de 50 min · Online o presencial en Viedma · Te respondo en menos de 24 h
            </p>
          </div>
        </div>

        {/* Indicador de scroll — esquina inferior derecha */}
        <a
          href="#sobre-mi"
          aria-label="Deslizá para conocer más"
          className="hero-rise group absolute bottom-8 right-8 z-10 hidden flex-col items-center gap-2.5 focus-visible:outline-none lg:flex"
          style={{ "--d": "0.95s" } as React.CSSProperties}
        >
          <span className="text-[9px] font-medium uppercase tracking-[0.3em] text-cream/70 transition-colors duration-300 group-hover:text-cream [writing-mode:vertical-rl]">
            Deslizá
          </span>
          <span className="relative h-12 w-px overflow-hidden bg-cream/25">
            <span className="scroll-wheel absolute inset-x-0 top-0 h-4 bg-cream" />
          </span>
        </a>
      </section>

      {/* Franja de valores reales (de su bio) */}
      <div className="border-b border-[var(--color-line)] bg-cream-deep/30">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-7 gap-y-2 px-6 py-7 md:gap-x-14 md:py-9">
          {["Empatía", "Escucha", "Formación", "Respeto"].map((v, i) => (
            <span key={v} className="flex items-center gap-x-7 md:gap-x-14">
              {i > 0 && <span aria-hidden className="h-1 w-1 rounded-full bg-sage/60" />}
              <span className="font-serif text-base text-espresso md:text-lg">{v}</span>
            </span>
          ))}
        </div>
      </div>

      {/* SOBRE MÍ — con imagen natural */}
      <section id="sobre-mi" className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-36">
        <div className="grid items-center gap-10 md:grid-cols-12 md:gap-14">
          {/* Image frame — capa media con parallax */}
          <div className="parallax-mid md:col-span-5">
            <Reveal from="left">
              <div className="group relative rounded-[2rem] border border-[var(--color-line)] bg-white/40 p-2 shadow-card transition-shadow duration-700 hover:shadow-card-hover">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[calc(2rem-0.5rem)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]">
                  <Image
                    src="/sobre-mi.jpg"
                    alt="Campo de lavanda al atardecer — un espacio de calma"
                    fill
                    sizes="(max-width: 768px) 92vw, 40vw"
                    className="object-cover saturate-[0.82] transition-transform duration-[1.2s] ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105"
                  />
                  {/* Teñido pastel para unificar con la paleta rosa/lavanda */}
                  <div aria-hidden className="absolute inset-0 bg-[#D9A7B8] opacity-25 mix-blend-soft-light" />
                  <div className="absolute inset-0 bg-gradient-to-t from-espresso/40 via-transparent to-transparent" />
                  <span className="absolute bottom-5 left-5 rounded-full bg-cream/85 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-sage-deep backdrop-blur">
                    MP 7321
                  </span>
                </div>
              </div>
            </Reveal>
          </div>

          <div className="md:col-span-6 md:col-start-7">
            <Reveal delay={0.1}>
              <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-sage-deep">
                Sobre mí
              </span>
              <h2 className="mt-5 text-balance font-serif text-4xl font-light leading-tight tracking-tight md:text-5xl">
                Acompañar es mi vocación
              </h2>
              <p className="mt-7 text-lg leading-relaxed text-espresso-soft first-letter:float-left first-letter:pr-3 first-letter:font-serif first-letter:text-[4.6rem] first-letter:font-light first-letter:leading-[0.78] first-letter:text-sage-deep md:text-xl">
                Mi formación es en Terapia Cognitivo Conductual y marcos
                contextuales, siempre{" "}
                <span className="text-espresso">basada en evidencia</span>. Pero
                antes que cualquier técnica está la persona: creo en una terapia
                humana, cercana y sin juicios, donde puedas sentirte escuchado de
                verdad.
              </p>
              <p className="mt-5 leading-relaxed text-espresso-soft md:text-lg">
                Cuidar tu salud mental también es una forma de cuidarte. Estoy
                acá para acompañarte en tu proceso, con herramientas reales y al
                ritmo que cada momento necesita.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      <Divider />

      {/* SERVICIOS — Double-Bezel cards */}
      <section
        id="servicios"
        className="relative mx-auto max-w-7xl overflow-hidden px-5 py-20 md:px-10 md:py-36"
      >
        {/* Rama acuarela teñida en el margen derecho — capa de fondo con parallax */}
        <div className="parallax-back pointer-events-none absolute -right-24 top-1/3 hidden w-[30rem] lg:block xl:-right-16">
          <div className="-scale-x-100 opacity-20 [--sway-origin:100%_50%]">
            <Image src="/decor/rama-1.png" alt="" width={1500} height={1000} className="botanic sway-slow h-auto w-full" />
          </div>
        </div>
        <Reveal>
          <div className="max-w-2xl">
            <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-sage-deep">
              Enfoques
            </span>
            <h2 className="mt-5 text-balance font-serif text-4xl font-light leading-tight tracking-tight md:text-5xl">
              Cómo puedo ayudarte
            </h2>
            <p className="mt-5 text-lg text-espresso-soft">
              Dos enfoques con respaldo científico, adaptados a vos y a tu
              momento.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-6 md:mt-14 md:grid-cols-2">
          {SERVICES.map((s, i) => (
            <Reveal key={s.tag} delay={i * 0.12}>
              <div className="group h-full rounded-[2rem] border border-[var(--color-line)] bg-white/40 p-2 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1.5 hover:border-sage/40 hover:shadow-card-hover">
                <div className="relative flex h-full flex-col overflow-hidden rounded-[calc(2rem-0.5rem)] bg-cream-deep/40 p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] md:p-10">
                  <Leaf className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 text-sage/10 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:rotate-12 group-hover:scale-110" />
                  <span className="relative font-serif text-5xl italic text-sage transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1">
                    {s.tag}
                  </span>
                  <h3 className="relative mt-6 font-serif text-2xl tracking-tight text-espresso">
                    {s.title}
                  </h3>
                  <p className="relative mt-4 leading-relaxed text-espresso-soft">
                    {s.body}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Motivos de consulta — presentados como prosa, no como tags */}
        <Reveal delay={0.15}>
          <p className="mx-auto mt-12 max-w-3xl text-center text-lg leading-relaxed text-espresso-soft md:mt-16 md:text-xl">
            Acompaño procesos de{" "}
            <span className="text-espresso">ansiedad, crisis de pánico,
            depresión, autoestima, estrés, duelo</span>, dificultades en los
            vínculos y momentos de cambio.
          </p>
        </Reveal>
      </section>

      {/* INTERLUDIO NATURAL — banda con imagen y frase */}
      <section className="relative mx-auto mt-16 max-w-7xl px-5 md:mt-28 md:px-10">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] border border-[var(--color-line)]">
            <Image
              src="/interludio.jpg"
              alt="Atardecer suave sobre el horizonte — calma"
              width={1600}
              height={700}
              sizes="(max-width: 768px) 100vw, 80vw"
              className="parallax-img h-[42vh] w-full object-cover saturate-[0.85] md:h-[52vh]"
            />
            <div aria-hidden className="absolute inset-0 bg-[#9C5475] opacity-20 mix-blend-soft-light" />
            <div className="absolute inset-0 bg-gradient-to-t from-espresso/80 via-espresso/35 to-espresso/15" />
            <figure className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <span aria-hidden className="font-serif text-6xl font-light leading-none text-cream/40 md:text-7xl">
                &ldquo;
              </span>
              <blockquote className="-mt-4 max-w-2xl font-serif text-[clamp(1.6rem,4vw,3rem)] font-light italic leading-tight text-cream">
                Crecer también es aprender a habitar la calma.
              </blockquote>
            </figure>
          </div>
        </Reveal>
      </section>

      <div className="mt-20 md:mt-36">
        <Divider />
      </div>

      {/* PROCESO — con follaje de fondo + enredadera que conecta los pasos */}
      <section id="proceso" className="relative overflow-hidden py-20 md:py-36">
        {/* Subtle foliage backdrop */}
        <Image
          src="/nature/foliage.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-[0.05]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-cream from-15% via-cream/85 to-cream" />

        <div className="relative mx-auto max-w-7xl px-5 md:px-10">
          <Reveal>
            <div className="max-w-2xl">
              <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-sage-deep">
                El proceso
              </span>
              <h2 className="mt-5 text-balance font-serif text-4xl font-light leading-tight tracking-tight md:text-5xl">
                Tan simple como dar el primer paso
              </h2>
            </div>
          </Reveal>

          <div className="relative mt-16 md:mt-24">
            {/* Enredadera conectora vertical (mobile) — el tallo atraviesa los nodos 01→02→03 */}
            <div className="pointer-events-none absolute -left-2 top-8 bottom-12 z-10 w-20 text-sage md:hidden">
              <VineConnectorV className="h-full w-full opacity-70" />
            </div>

            {/* Enredadera conectora (desktop) — tallo dibujado a medida que pasa por el centro de los nodos */}
            <div className="pointer-events-none absolute top-0 left-8 right-8 z-10 hidden h-16 text-sage md:block">
              <VineConnectorH className="h-full w-full opacity-75" />
            </div>

            <div className="grid gap-8 md:grid-cols-3 md:gap-6">
              {PROCESS.map((p, i) => (
                <Reveal key={p.n} delay={i * 0.14} from="up" className="h-full">
                  <div className="group relative flex h-full flex-col">
                    {/* Nodo numerado — se asienta sobre la enredadera */}
                    <div className="relative z-20 flex h-16 w-16 items-center justify-center rounded-full border border-sage/30 bg-cream font-serif text-xl italic text-sage-deep shadow-[0_10px_28px_-14px_rgba(95,110,84,0.55)]">
                      {p.n}
                      <span className="absolute inset-0 -z-10 rounded-full bg-sage/10 blur-md" />
                    </div>
                    <h3 className="mt-7 font-serif text-2xl tracking-tight text-espresso">
                      {p.title}
                    </h3>
                    <p className="mt-3 max-w-xs leading-relaxed text-espresso-soft">
                      {p.body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Divider />

      {/* FAQ */}
      <section id="faq" className="relative mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-36">
        {/* Rama grande entrando desde el costado izquierdo, bajo el título */}
        <div className="parallax-back pointer-events-none absolute -left-28 bottom-16 hidden w-[30rem] lg:block">
          <div className="-rotate-6 opacity-[0.16] [--sway-origin:0%_50%]">
            <Image src="/decor/rama-2.png" alt="" width={1500} height={1000} className="botanic sway-slow h-auto w-full" />
          </div>
        </div>

        <div className="grid gap-10 md:grid-cols-12 md:gap-14">
          <div className="md:col-span-4">
            <Reveal>
              <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-sage-deep">
                Preguntas frecuentes
              </span>
              <h2 className="mt-5 text-balance font-serif text-4xl font-light leading-tight tracking-tight md:text-5xl">
                Despejá tus dudas
              </h2>
              <p className="mt-5 max-w-[18rem] leading-relaxed text-espresso-soft md:mt-6 md:max-w-[16rem]">
                ¿Tenés otra pregunta? Escribime por WhatsApp y te respondo
                personalmente.
              </p>
            </Reveal>
          </div>
          <div className="md:col-span-8">
            <div className="divide-y divide-[var(--color-line)]">
              {FAQ.map((f, i) => (
                <Reveal key={f.q} delay={i * 0.09}>
                  <details className="faq group py-6">
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-6 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-4 focus-visible:ring-offset-cream">
                      <span className="font-serif text-xl tracking-tight text-espresso transition-colors duration-300 group-hover:text-sage-deep md:text-2xl">
                        {f.q}
                      </span>
                      <span
                        aria-hidden="true"
                        className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-sage/30 bg-cream-deep/40 text-sage-deep shadow-[0_3px_10px_-3px_rgba(95,110,84,0.3)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-open:rotate-45 group-open:border-sage group-open:bg-sage group-open:text-cream group-hover:border-sage/60"
                      >
                        <svg width="13" height="13" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none">
                          <path d="M6 1v10M1 6h10" />
                        </svg>
                      </span>
                    </summary>
                    <div className="faq-body">
                      <div>
                        <p className="mt-4 max-w-2xl leading-relaxed text-espresso-soft">
                          {f.a}
                        </p>
                      </div>
                    </div>
                  </details>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIOS — prueba social antes del cierre */}
      <section className="mx-auto max-w-7xl px-5 pb-20 md:px-10 md:pb-32">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-sage-deep">
              Testimonios
            </span>
            <h2 className="mt-5 text-balance font-serif text-4xl font-light leading-tight tracking-tight md:text-5xl">
              Historias que empiezan con valentía
            </h2>
          </div>
        </Reveal>
        <div className="mt-12 grid gap-6 md:mt-16 md:grid-cols-3">
          {[
            {
              quote:
                "Llegué con la ansiedad a mil y sin poder dormir. Hoy tengo herramientas concretas y me entiendo mucho más. Fue la mejor decisión del año.",
              autor: "M., 28 años · Viedma",
            },
            {
              quote:
                "Dudaba de hacer terapia online, pero la calidez es la misma que en el consultorio. Te escucha de verdad, sin juzgarte nunca.",
              autor: "J., 34 años · Online",
            },
            {
              quote:
                "Me ayudó a poner en palabras cosas que venía cargando hace años. Salgo de cada sesión más liviana y con algo claro para trabajar.",
              autor: "L., 22 años · Viedma",
            },
          ].map((t, i) => (
            <Reveal key={t.autor} delay={i * 0.12} className="h-full">
              <figure className="flex h-full flex-col rounded-[2rem] border border-[var(--color-line)] bg-white/40 p-2 shadow-card transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:border-sage/40 hover:shadow-card-hover">
                <div className="flex h-full flex-col rounded-[calc(2rem-0.5rem)] bg-cream-deep/40 p-7 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] md:p-8">
                  <span aria-hidden className="font-serif text-6xl font-light italic leading-none text-sage/50">
                    &ldquo;
                  </span>
                  <blockquote className="mt-2 flex-1 leading-relaxed text-espresso-soft">
                    {t.quote}
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-3 border-t border-[var(--color-line)] pt-5">
                    <Leaf className="h-4 w-4 text-sage" />
                    <span className="text-[12px] font-medium uppercase tracking-[0.14em] text-sage-deep">
                      {t.autor}
                    </span>
                  </figcaption>
                </div>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

      <Divider />

      {/* TURNOS — sistema propio, centraliza la solicitud */}
      <section id="turnos" className="relative overflow-hidden py-20 md:py-36">
        {/* Fondo lavanda suave full-bleed: diferencia y jerarquiza la franja */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-b from-[#ECE6F1]/80 via-[#F4EFF5]/55 to-transparent"
        />
        <div className="mx-auto max-w-7xl px-5 md:px-10">
          <div className="grid gap-12 md:grid-cols-12 md:gap-14">
            <div className="min-w-0 md:col-span-5">
              <Reveal>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-sage-deep ring-1 ring-sage/20">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sage/50" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sage-deep" />
                  </span>
                  Agenda abierta
                </span>
                <h2 className="mt-5 text-balance font-serif text-4xl font-light leading-tight tracking-tight md:text-5xl">
                  Pedí tu turno en un minuto
                </h2>
                <p className="mt-6 max-w-md leading-relaxed text-espresso-soft md:text-lg">
                  Elegí la modalidad y reservá <strong className="font-medium text-espresso">en el momento</strong> uno
                  de los horarios libres. Sin esperas: el calendario de al lado
                  está activo.
                </p>
                {/* Cómo funciona — pasos conectados, con sentido */}
                <div className="mt-9">
                  {[
                    {
                      t: "Elegís servicio y horario",
                      d: "Online o presencial en Viedma, el día que mejor te quede.",
                      icon: (
                        <path d="M3 4h18v18H3zM3 10h18M16 2v4M8 2v4" />
                      ),
                    },
                    {
                      t: "Queda reservado al instante",
                      d: "Sin idas y vueltas: el horario se toma en el momento.",
                      icon: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />,
                    },
                    {
                      t: "Te confirmo en persona",
                      d: "Te escribo por WhatsApp o mail en menos de 24 horas.",
                      icon: (
                        <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5Z" />
                      ),
                    },
                  ].map((s, i, arr) => (
                    <div key={s.t} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sage-deep shadow-[0_6px_18px_-10px_rgba(156,84,117,0.5)] ring-1 ring-sage/25">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                            {s.icon}
                          </svg>
                        </span>
                        {i < arr.length - 1 && (
                          <span className="my-1 w-px flex-1 bg-gradient-to-b from-sage/40 to-sage/5" />
                        )}
                      </div>
                      <div className="pb-6">
                        <p className="font-medium text-espresso">{s.t}</p>
                        <p className="mt-1 text-[14px] leading-relaxed text-espresso-soft">{s.d}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Nota cálida — la persona detrás */}
                <div className="flex items-start gap-3 rounded-2xl border border-sage/20 bg-white/55 p-4 backdrop-blur-sm">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage/12 text-sage-deep">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 21s-7-4.35-7-10a7 7 0 0 1 14 0c0 5.65-7 10-7 10Z" /><circle cx="12" cy="11" r="2.5" />
                    </svg>
                  </span>
                  <p className="text-[14px] leading-relaxed text-espresso">
                    <strong className="font-medium">Del otro lado hay una persona, no un bot.</strong>{" "}
                    Leo y respondo personalmente cada consulta.
                  </p>
                </div>

                <div className="mt-6">
                  <Link
                    href="/reservar"
                    className="group inline-flex items-center gap-1.5 text-[14px] font-medium text-sage-deep underline-offset-4 transition-colors hover:text-espresso hover:underline"
                  >
                    ¿Preferís verlo en pantalla completa?
                    <span className="transition-transform duration-300 group-hover:translate-x-0.5">→</span>
                  </Link>
                </div>
              </Reveal>
            </div>
            <div className="min-w-0 md:col-span-6 md:col-start-7">
              <Reveal delay={0.1}>
                <TurnoForm />
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      <Divider />

      {/* PAGOS — métodos y valor de referencia */}
      <section id="pagos" className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-36">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-sage-deep">
              Pagos
            </span>
            <h2 className="mt-5 text-balance font-serif text-4xl font-light leading-tight tracking-tight md:text-5xl">
              Simple y seguro
            </h2>
            <p className="mt-5 text-lg text-espresso-soft">
              Una vez confirmado el turno, podés abonar por cualquiera de estos
              medios.
            </p>
          </div>
        </Reveal>

        <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:mt-16 md:grid-cols-3">
          {/* Mercado Pago */}
          <Reveal delay={0}>
            <div className="flex h-full flex-col rounded-[2rem] border border-[var(--color-line)] bg-white/40 p-2 shadow-card transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:border-sage/40 hover:shadow-card-hover">
              <div className="flex h-full flex-col rounded-[calc(2rem-0.5rem)] bg-cream-deep/40 p-7 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]">
                <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-sage-deep">
                  Tarjeta / dinero en cuenta
                </span>
                <h3 className="mt-3 font-serif text-2xl tracking-tight text-espresso">
                  Mercado Pago
                </h3>
                <p className="mt-3 flex-1 leading-relaxed text-espresso-soft">
                  Pagá con débito, crédito (en cuotas) o saldo de Mercado Pago de
                  forma segura.
                </p>
                <a
                  href="https://link.mercadopago.com.ar/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-espresso px-5 py-3 text-[14px] font-medium text-cream transition-all duration-300 hover:-translate-y-px hover:shadow-card-hover"
                >
                  Pagar con Mercado Pago
                  <span aria-hidden>↗</span>
                </a>
              </div>
            </div>
          </Reveal>

          {/* Transferencia */}
          <Reveal delay={0.1}>
            <div className="flex h-full flex-col rounded-[2rem] border border-[var(--color-line)] bg-white/40 p-2 shadow-card transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:border-sage/40 hover:shadow-card-hover">
              <div className="flex h-full flex-col rounded-[calc(2rem-0.5rem)] bg-cream-deep/40 p-7 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]">
                <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-sage-deep">
                  Sin comisión
                </span>
                <h3 className="mt-3 font-serif text-2xl tracking-tight text-espresso">
                  Transferencia
                </h3>
                <p className="mt-3 flex-1 leading-relaxed text-espresso-soft">
                  Transferí desde tu banco o billetera al alias. Enviame el
                  comprobante y listo.
                </p>
                <div className="mt-6">
                  <CopyAlias alias="paulina.pilotti.psi" />
                </div>
              </div>
            </div>
          </Reveal>

          {/* Valor de referencia */}
          <Reveal delay={0.2}>
            <div className="flex h-full flex-col rounded-[2rem] border border-[var(--color-line)] bg-white/40 p-2 shadow-card transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:border-sage/40 hover:shadow-card-hover">
              <div className="flex h-full flex-col rounded-[calc(2rem-0.5rem)] bg-cream-deep/40 p-7 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]">
                <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-sage-deep">
                  Aranceles
                </span>
                <h3 className="mt-3 font-serif text-2xl tracking-tight text-espresso">
                  Valores de referencia
                </h3>
                {serviciosLanding.length > 0 ? (
                  <ul className="mt-5 space-y-0.5">
                    {serviciosLanding.map((s) => (
                      <li
                        key={s.id}
                        className="flex items-baseline justify-between gap-4 border-b border-[var(--color-line)]/60 py-2.5 last:border-0"
                      >
                        <span className="text-[15px] text-espresso">{s.nombre}</span>
                        <span className="whitespace-nowrap font-serif text-xl font-light text-espresso">
                          {money(s.priceARS)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 font-serif text-3xl font-light text-espresso">
                    Consultá los valores por WhatsApp
                  </p>
                )}
                <p className="mt-5 flex-1 leading-relaxed text-espresso-soft">
                  Sesiones de 50 minutos. Consultá por planes de continuidad y
                  obras sociales por WhatsApp.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA FINAL — cinematográfico, cierra el círculo con el video del hero */}
      <section className="mx-auto max-w-7xl px-5 pb-20 md:px-10 md:pb-32">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] border border-[var(--color-line)] px-7 py-20 text-center md:px-10 md:py-32">
            <video
              autoPlay
              loop
              muted
              playsInline
              preload="none"
              poster="/nature/calm.jpg"
              className="absolute inset-0 h-full w-full scale-105 object-cover"
            >
              <source src="/video/hero-opt.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-gradient-to-t from-espresso/80 via-espresso/55 to-sage-deep/40" />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-balance font-serif text-[clamp(2rem,5vw,3.5rem)] font-light leading-tight tracking-tight text-cream">
                Tu bienestar merece un espacio.
              </h2>
              <p className="mx-auto mt-5 max-w-md text-lg text-cream/85">
                Elegí un horario y demos juntos el primer paso de tu proceso.
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
                <BookingCTA label="Reservar turno" variant="light" />
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center justify-center gap-2 rounded-full border border-cream/35 bg-cream/5 px-6 py-3 text-[15px] font-medium text-cream backdrop-blur-sm transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-cream/60 hover:bg-cream/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream/70"
                >
                  Consultar por WhatsApp
                  <span className="transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5">
                    →
                  </span>
                </a>
              </div>
              <p className="mt-6 text-[12px] uppercase tracking-[0.18em] text-cream/70">
                Respondo personalmente cada consulta en menos de 24 horas
              </p>
              <p className="mx-auto mt-5 max-w-md text-[12px] leading-relaxed text-cream/60">
                Los turnos no son un servicio de urgencia. Si estás atravesando una
                crisis o tenés pensamientos de hacerte daño, comunicate de inmediato
                con el <strong className="text-cream/80">911</strong> o con la guardia de salud mental más cercana.
              </p>
            </div>
          </div>
        </Reveal>
      </section>
      </main>

      {/* FOOTER */}
      <footer className="relative mt-8 overflow-hidden border-t border-[var(--color-line)] bg-cream-deep/30">
        {/* Rama grande entrando desde la izquierda */}
        <div className="parallax-back pointer-events-none absolute -bottom-4 -left-20 w-72 sm:w-96 lg:-left-24 lg:-bottom-8 lg:w-[34rem]">
          <div className="-rotate-12 -scale-x-100 opacity-30 [--sway-origin:0%_100%]">
            <Image src="/decor/rama-2.png" alt="" width={1500} height={1000} className="botanic sway-slow h-auto w-full" />
          </div>
        </div>
        {/* Rama grande entrando desde la derecha */}
        <div className="parallax-back pointer-events-none absolute -right-24 -top-10 w-72 sm:w-96 lg:-right-28 lg:-top-16 lg:w-[36rem]">
          <div className="rotate-6 opacity-25 [--sway-origin:100%_0%]">
            <Image src="/decor/rama-1.png" alt="" width={1500} height={1000} className="botanic sway h-auto w-full" />
          </div>
        </div>

        <div className="relative mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-20">
          <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-12 md:gap-8">
            {/* Brand + tagline + CTA */}
            <div className="sm:col-span-2 md:col-span-5">
              <Reveal>
                <a href="#inicio" className="font-serif text-3xl font-light tracking-tight text-espresso">
                  Paulina<span className="italic text-sage-deep"> Pilotti</span>
                </a>
                <p className="mt-4 max-w-sm leading-relaxed text-espresso-soft">
                  Un espacio de terapia humana y con evidencia, para que te
                  reencuentres con tu bienestar.
                </p>
                <div className="mt-7">
                  <WhatsAppCTA label="Agendar consulta" />
                </div>
              </Reveal>
            </div>

            {/* Navegación */}
            <nav className="md:col-span-3 md:col-start-8" aria-label="Pie de página">
              <Reveal delay={0.05}>
                <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-sage-deep">
                  Navegación
                </p>
                <ul className="mt-5 space-y-3.5 text-espresso-soft">
                  {[
                    { l: "Sobre mí", h: "#sobre-mi" },
                    { l: "Servicios", h: "#servicios" },
                    { l: "Turnos", h: "#turnos" },
                    { l: "Pagos", h: "#pagos" },
                    { l: "Preguntas", h: "#faq" },
                  ].map((x) => (
                    <li key={x.h}>
                      <a
                        href={x.h}
                        className="group inline-flex items-center gap-2 transition-colors duration-300 hover:text-espresso focus-visible:outline-none focus-visible:text-espresso"
                      >
                        <span className="h-px w-0 bg-sage transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:w-4" />
                        {x.l}
                      </a>
                    </li>
                  ))}
                </ul>
              </Reveal>
            </nav>

            {/* Contacto */}
            <div className="md:col-span-3 md:col-start-11">
              <Reveal delay={0.1}>
                <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-sage-deep">
                  Contacto
                </p>
                <ul className="mt-5 space-y-3.5 text-espresso-soft">
                  <li className="flex items-start gap-2.5">
                    <Leaf className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-sage" /> Viedma, Río Negro
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Leaf className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-sage" /> Sesiones online a todo el país
                  </li>
                  <li>
                    <a
                      href="https://www.instagram.com/psicoterapia.pauli/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-1.5 whitespace-nowrap text-espresso transition-colors duration-300 hover:text-sage-deep focus-visible:outline-none"
                    >
                      <span>@psicoterapia.pauli</span>
                      <span className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                        ↗
                      </span>
                    </a>
                  </li>
                </ul>
              </Reveal>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-14 flex flex-col gap-4 border-t border-[var(--color-line)] pt-7 text-sm text-espresso-soft sm:flex-row sm:items-center sm:justify-between md:mt-20">
            <p>© 2026 Lic. Paulina Pilotti · MP 7321</p>
            <a
              href="#inicio"
              className="group inline-flex items-center gap-2 text-espresso-soft transition-colors duration-300 hover:text-espresso"
            >
              Volver arriba
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--color-line)] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-0.5">
                ↑
              </span>
            </a>
          </div>
        </div>
      </footer>

      {/* Barra de WhatsApp fija (solo mobile) */}
      <MobileCTA />
    </div>
  );
}
