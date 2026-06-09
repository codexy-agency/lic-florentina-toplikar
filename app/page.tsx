import { Nav } from "@/components/Nav";
import { Reveal } from "@/components/Reveal";
import { WhatsAppCTA } from "@/components/WhatsAppCTA";

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

const AUDIENCE = ["Adolescentes", "Jóvenes", "Adultos"];

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
    body: "Encuentros regulares, presenciales en Paraná u online, con herramientas concretas para tu día a día.",
  },
];

const FAQ = [
  {
    q: "¿Atendés de forma online?",
    a: "Sí. Trabajo de manera presencial en Paraná y también online a cualquier parte del mundo. La terapia online tiene la misma efectividad y te permite hacer tu proceso desde donde estés.",
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

export default function Home() {
  return (
    <div className="grain relative overflow-x-hidden">
      <Nav />

      {/* HERO — Editorial Split */}
      <section
        id="inicio"
        className="relative mx-auto flex min-h-[100dvh] max-w-7xl flex-col justify-center px-5 pt-32 pb-20 md:px-10"
      >
        <div className="pointer-events-none absolute -right-40 top-20 h-[34rem] w-[34rem] rounded-full bg-sage/15 blur-[120px]" />
        <div className="pointer-events-none absolute -left-32 bottom-0 h-96 w-96 rounded-full bg-clay/20 blur-[110px]" />

        <div className="relative grid items-center gap-12 md:grid-cols-12">
          <div className="md:col-span-7">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-cream-deep/60 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-sage-deep">
                <span className="h-1.5 w-1.5 rounded-full bg-sage" />
                Psicóloga clínica · MP 3164
              </span>
            </Reveal>

            <Reveal delay={0.08}>
              <h1 className="mt-7 font-serif text-[clamp(2.8rem,7vw,5.6rem)] font-light leading-[0.98] tracking-[-0.02em] text-espresso">
                Un espacio para
                <br />
                <span className="italic text-sage-deep">cuidar</span> tu salud
                <br />
                mental.
              </h1>
            </Reveal>

            <Reveal delay={0.16}>
              <p className="mt-8 max-w-md text-[17px] leading-relaxed text-espresso-soft">
                Soy{" "}
                <strong className="font-semibold text-espresso">
                  Lic. Florentina Toplikar
                </strong>
                . Acompaño a adolescentes, jóvenes y adultos con Terapia
                Cognitivo Conductual y ACT — presencial en Paraná y online a todo
                el mundo.
              </p>
            </Reveal>

            <Reveal delay={0.24}>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <WhatsAppCTA label="Agendar mi consulta" />
                <a
                  href="#servicios"
                  className="text-[15px] font-medium text-espresso-soft underline-offset-4 transition-colors hover:text-espresso hover:underline"
                >
                  Conocer más
                </a>
              </div>
            </Reveal>
          </div>

          {/* Portrait card — Double-Bezel */}
          <div className="md:col-span-5">
            <Reveal delay={0.2}>
              <div className="rounded-[2rem] border border-[var(--color-line)] bg-white/40 p-2 shadow-[0_30px_80px_-40px_rgba(43,39,34,0.35)] backdrop-blur-sm">
                <div className="relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-[calc(2rem-0.5rem)] bg-gradient-to-br from-sage/30 via-cream-deep to-clay/30 p-7 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]">
                  <div className="absolute right-6 top-6 flex h-14 w-14 items-center justify-center rounded-full bg-cream/70 font-serif text-2xl italic text-sage-deep backdrop-blur">
                    F
                  </div>
                  <p className="font-serif text-2xl leading-snug text-espresso">
                    &ldquo;El primer paso ya es un acto de valentía.&rdquo;
                  </p>
                  <p className="mt-3 text-[13px] uppercase tracking-[0.18em] text-espresso-soft">
                    Terapia con calidez y evidencia
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>

        {/* Trust strip */}
        <Reveal delay={0.3}>
          <div className="mt-16 flex flex-wrap items-center gap-x-10 gap-y-4 border-t border-[var(--color-line)] pt-8 text-[13px] uppercase tracking-[0.16em] text-espresso-soft">
            <span>✦ Presencial · Paraná</span>
            <span>✦ Online · Todo el mundo</span>
            <span>✦ Adolescentes · Jóvenes · Adultos</span>
          </div>
        </Reveal>
      </section>

      {/* SOBRE MÍ */}
      <section id="sobre-mi" className="mx-auto max-w-7xl px-5 py-24 md:px-10 md:py-36">
        <div className="grid gap-14 md:grid-cols-12">
          <div className="md:col-span-4">
            <Reveal>
              <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-sage-deep">
                Sobre mí
              </span>
              <h2 className="mt-5 font-serif text-4xl font-light leading-tight tracking-tight md:text-5xl">
                Acompañar es mi vocación
              </h2>
            </Reveal>
          </div>
          <div className="md:col-span-7 md:col-start-6">
            <Reveal delay={0.1}>
              <p className="text-xl leading-relaxed text-espresso-soft">
                Creo en una terapia{" "}
                <span className="text-espresso">
                  humana, cercana y sin juicios
                </span>
                , donde puedas sentirte escuchado de verdad. Mi trabajo combina
                el rigor de la evidencia científica con la calidez que cada
                persona merece.
              </p>
              <p className="mt-6 text-lg leading-relaxed text-espresso-soft">
                Cuidar tu salud mental también es una forma de cuidarte. Estoy
                acá para ayudarte a encontrar herramientas reales, entenderte
                mejor y construir una vida más alineada con lo que te importa.
              </p>
              <div className="mt-9 flex flex-wrap gap-2">
                {AUDIENCE.map((a) => (
                  <span
                    key={a}
                    className="rounded-full border border-[var(--color-line)] bg-cream-deep/50 px-4 py-1.5 text-sm text-espresso-soft"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* SERVICIOS — Double-Bezel cards */}
      <section
        id="servicios"
        className="mx-auto max-w-7xl px-5 py-24 md:px-10 md:py-36"
      >
        <Reveal>
          <div className="max-w-2xl">
            <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-sage-deep">
              Enfoques
            </span>
            <h2 className="mt-5 font-serif text-4xl font-light leading-tight tracking-tight md:text-5xl">
              Cómo puedo ayudarte
            </h2>
            <p className="mt-5 text-lg text-espresso-soft">
              Dos enfoques con respaldo científico, adaptados a vos y a tu
              momento.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {SERVICES.map((s, i) => (
            <Reveal key={s.tag} delay={i * 0.1}>
              <div className="h-full rounded-[2rem] border border-[var(--color-line)] bg-white/40 p-2">
                <div className="flex h-full flex-col rounded-[calc(2rem-0.5rem)] bg-cream-deep/40 p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] md:p-10">
                  <span className="font-serif text-5xl italic text-sage">
                    {s.tag}
                  </span>
                  <h3 className="mt-6 font-serif text-2xl tracking-tight text-espresso">
                    {s.title}
                  </h3>
                  <p className="mt-4 leading-relaxed text-espresso-soft">
                    {s.body}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* PROCESO */}
      <section id="proceso" className="mx-auto max-w-7xl px-5 py-24 md:px-10 md:py-36">
        <Reveal>
          <div className="max-w-2xl">
            <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-sage-deep">
              El proceso
            </span>
            <h2 className="mt-5 font-serif text-4xl font-light leading-tight tracking-tight md:text-5xl">
              Tan simple como dar el primer paso
            </h2>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-px overflow-hidden rounded-[2rem] border border-[var(--color-line)] bg-[var(--color-line)] md:grid-cols-3">
          {PROCESS.map((p, i) => (
            <Reveal key={p.n} delay={i * 0.1} className="h-full">
              <div className="flex h-full flex-col bg-cream p-8 md:p-10">
                <span className="font-serif text-6xl font-light text-sage/40">
                  {p.n}
                </span>
                <h3 className="mt-6 font-serif text-2xl tracking-tight text-espresso">
                  {p.title}
                </h3>
                <p className="mt-3 leading-relaxed text-espresso-soft">
                  {p.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-7xl px-5 py-24 md:px-10 md:py-36">
        <div className="grid gap-14 md:grid-cols-12">
          <div className="md:col-span-4">
            <Reveal>
              <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-sage-deep">
                Preguntas frecuentes
              </span>
              <h2 className="mt-5 font-serif text-4xl font-light leading-tight tracking-tight md:text-5xl">
                Despejá tus dudas
              </h2>
            </Reveal>
          </div>
          <div className="md:col-span-8">
            <div className="divide-y divide-[var(--color-line)]">
              {FAQ.map((f, i) => (
                <Reveal key={f.q} delay={i * 0.06}>
                  <details className="group py-6">
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-6">
                      <span className="font-serif text-xl tracking-tight text-espresso md:text-2xl">
                        {f.q}
                      </span>
                      <span className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-[var(--color-line)] text-espresso-soft transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-open:rotate-45">
                        +
                      </span>
                    </summary>
                    <p className="mt-4 max-w-2xl leading-relaxed text-espresso-soft">
                      {f.a}
                    </p>
                  </details>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="mx-auto max-w-7xl px-5 pb-24 md:px-10 md:pb-32">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.5rem] border border-[var(--color-line)] bg-espresso px-7 py-16 text-center md:px-10 md:py-24">
            <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-sage/30 blur-[100px]" />
            <div className="pointer-events-none absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-clay/25 blur-[100px]" />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl font-serif text-[clamp(2rem,5vw,3.5rem)] font-light leading-tight tracking-tight text-cream">
                Tu bienestar merece un espacio.
              </h2>
              <p className="mx-auto mt-5 max-w-md text-lg text-cream/70">
                Escribime hoy y empecemos a construir, juntos, tu proceso.
              </p>
              <div className="mt-9 flex justify-center">
                <WhatsAppCTA label="Escribirme por WhatsApp" variant="light" />
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[var(--color-line)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-12 md:flex-row md:items-center md:justify-between md:px-10">
          <div>
            <p className="font-serif text-lg tracking-tight">
              Lic. Florentina Toplikar
            </p>
            <p className="mt-1 text-sm text-espresso-soft">
              Psicóloga clínica · MP 3164 · Paraná &amp; Online
            </p>
          </div>
          <div className="flex items-center gap-6 text-sm text-espresso-soft">
            <a
              href="https://www.instagram.com/psic.florentinatoplikar/"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-espresso"
            >
              Instagram
            </a>
            <span className="text-[var(--color-line)]">·</span>
            <span>© 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
