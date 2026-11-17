import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarCheck,
  Clock,
  InstagramLogo,
  MapPin,
  Plus,
  WhatsappLogo,
} from "@phosphor-icons/react/dist/ssr";
import { getMarca } from "@/lib/store";
import { whatsappUrl } from "@/lib/marca";
import { CASOS, EQUIPO, PREGUNTAS, RS, TRATAMIENTOS, waLink } from "@/lib/rs";
import { CODEXY } from "@/lib/codexy";
import { AntesDespues } from "@/components/rs/AntesDespues";
import { BarraTurno } from "@/components/rs/BarraTurno";
import { IconoTratamiento } from "@/components/rs/IconoTratamiento";
import { Movimiento } from "@/components/rs/Movimiento";
import { BotonTurno, BotonWhatsApp, MuelaFondo, Pulso, Rayo } from "@/components/rs/piezas";
import "./rs.css";

// El WhatsApp sale de la marca del consultorio (editable desde el panel), así
// que la página se arma por request.
export const dynamic = "force-dynamic";

export default async function Home() {
  // Si en el panel cambian el número, el sitio lo toma. Si el store no responde,
  // se usa el que publican en su Instagram.
  let numero: string = RS.whatsapp;
  try {
    const marca = await getMarca();
    if (whatsappUrl(marca)) numero = marca.whatsapp;
  } catch {
    /* sin store: número publicado */
  }
  const wa = (texto: string) => waLink(texto, numero);
  const ig = `https://www.instagram.com/${RS.instagram}/`;
  const igProtectores = `https://www.instagram.com/${RS.instagramProtectores}/`;

  return (
    <div className="rs">
      <Movimiento />
      <a href="#contenido" className="rs-saltar">
        Ir al contenido
      </a>

      <header className="rs-top">
        <Link href="/" className="rs-top__logo" aria-label="RS Odontología, inicio">
          <Image src="/rs/logo-blanco.png" alt="" width={1045} height={513} priority />
        </Link>
        <nav className="rs-top__nav" aria-label="Secciones">
          <a href="#casos">Casos</a>
          <a href="#tratamientos">Tratamientos</a>
          <a href="#equipo">Quiénes somos</a>
          <a href="#preguntas">Preguntas</a>
          <a href="#donde">Dónde estamos</a>
        </nav>
        <Link href="/reservar" className="rs-top__turno">
          <CalendarCheck weight="duotone" aria-hidden />
          Sacar turno
        </Link>
      </header>

      <main id="contenido">
        {/* ── Portada ── */}
        <section className="rs-hero">
          <MuelaFondo className="rs-hero__marca" />

          {/* Pieza central: la muela con el rayo. Una sola imagen con dirección de
              arte: recorte cuadrado en celular, composición completa en escritorio. */}
          <figure className="rs-hero__pieza" aria-hidden>
            <picture>
              <source
                media="(min-width: 980px)"
                srcSet="/rs/hero-muela-640.webp 640w, /rs/hero-muela.webp 928w"
                sizes="38vw"
                width={928}
                height={1152}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/rs/hero-muela-cuadrada.webp" alt="" width={600} height={614} fetchPriority="high" decoding="async" />
            </picture>
          </figure>

          <div className="rs-hero__texto">
            <h1 className="rs-hero__titulo">
              Tu sonrisa,
              <br />
              en pleno centro
              <br />
              de Paraná<span className="rs-volt">.</span>
            </h1>
            <p className="rs-hero__bajada">
              {RS.especialidad}. Atendemos en {RS.direccion}, siempre con turno.
            </p>
            <div className="rs-hero__botones" data-oculta-barra>
              <BotonTurno>Sacar turno online</BotonTurno>
              <BotonWhatsApp href={wa("Hola, quiero pedir un turno en RS Odontología.")}>
                Escribir por WhatsApp
              </BotonWhatsApp>
            </div>
          </div>

          <div className="rs-hero__lado">
            <dl className="rs-ticket rs-hero__horas">
              <div className="rs-ticket__icono" aria-hidden>
                <Clock weight="duotone" />
              </div>
              {RS.horarios.map((h) => (
                <div key={h.dias} className="rs-ticket__dato">
                  <dt>{h.dias}</dt>
                  <dd>{h.horas}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ── Casos antes / después ── */}
        <section id="casos" className="rs-casos">
          <div className="rs-ancho">
            <header className="rs-cabeza" data-aparece>
              <h2 className="rs-h2">
                Antes y después.
                <br />
                Compará vos.
              </h2>
              <p className="rs-intro">
                Son bocas de pacientes de RS, tal como las publicamos. Arrastrá la línea de cada foto, o
                movela con las flechas del teclado.
              </p>
            </header>

            <ul className="rs-casos__grilla">
              {CASOS.map((c, i) => (
                <li key={c.id} className="rs-caso" data-aparece style={{ "--i": i } as CSSProperties}>
                  <h3 className="rs-caso__nombre">
                    <span className="rs-ficha" aria-hidden>
                      <IconoTratamiento id={c.icono} />
                    </span>
                    {c.tratamiento}
                  </h3>
                  <AntesDespues antes={c.antes} despues={c.despues} tratamiento={c.tratamiento} />
                  <p className="rs-caso__detalle">{c.detalle}</p>
                  <Link href="/reservar" className="rs-enlace">
                    <span>Quiero que me evalúen</span>
                    <span className="rs-enlace__capsula" aria-hidden>
                      <ArrowRight weight="bold" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            <p className="rs-casos__nota">
              Cada boca es distinta: el resultado depende de tu caso. Lo vemos en la primera consulta.
            </p>
          </div>
        </section>

        <Pulso />

        {/* ── Tratamientos ── */}
        <section id="tratamientos" className="rs-trat">
          <div className="rs-ancho">
            <header className="rs-cabeza rs-trat__cabeza" data-aparece>
              <h2 className="rs-h2">Lo que hacemos en el consultorio.</h2>
              <figure className="rs-marco rs-trat__foto" aria-hidden>
                <Image src="/rs/instrumental.webp" alt="" width={1010} height={650} sizes="(min-width: 980px) 460px, 92vw" />
              </figure>
            </header>

            <ul className="rs-trat__lista">
              {TRATAMIENTOS.map((t, i) => (
                <li key={t.nombre} className="rs-trat__item" data-aparece style={{ "--i": i % 3 } as CSSProperties}>
                  <span className="rs-ficha rs-ficha--grande" aria-hidden>
                    <IconoTratamiento id={t.icono} />
                  </span>
                  <div>
                    <h3>{t.nombre}</h3>
                    <p>{t.texto}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="rs-trat__cierre" data-aparece>
              <MuelaFondo className="rs-trat__marca" />
              <p>¿No sabés qué necesitás? Empezá por una primera consulta y lo vemos juntas.</p>
              <BotonTurno />
            </div>
          </div>
        </section>

        {/* ── Quiénes somos ── */}
        <section id="equipo" className="rs-equipo">
          <div className="rs-ancho rs-equipo__grid">
            <div className="rs-equipo__marco" data-aparece>
              <figure className="rs-marco rs-equipo__foto">
                <Image
                  src="/rs/equipo.webp"
                  alt="Nadia Vivanco y Arantxa Rodriguez Signes en el consultorio"
                  width={720}
                  height={531}
                  sizes="(min-width: 980px) 45vw, 92vw"
                />
              </figure>
            </div>
            <div className="rs-equipo__texto" data-aparece style={{ "--i": 1 } as CSSProperties}>
              <h2 className="rs-h2">Somos Aran y Nanu.</h2>
              <blockquote className="rs-equipo__cita">
                <Rayo className="rs-equipo__rayo" />
                <p>“La que hoy cuida a sus pacientes como si fueran sus amigos.”</p>
                <footer>Así se presenta Arantxa en el Instagram del consultorio.</footer>
              </blockquote>
              <ul className="rs-equipo__lista">
                {EQUIPO.map((p) => (
                  <li key={p.id} className="rs-persona">
                    <span className="rs-persona__sigla" aria-hidden>
                      {p.nombre
                        .split(" ")
                        .slice(0, 2)
                        .map((x) => x[0])
                        .join("")}
                    </span>
                    <div>
                      <h3>{p.nombre}</h3>
                      <p className="rs-persona__rol">{p.rol}</p>
                      <p>{p.texto}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Protectores Bucales RS ── */}
        <section className="rs-prot">
          <div className="rs-ancho rs-prot__grid">
            <figure className="rs-marco rs-marco--tinta rs-prot__foto" aria-hidden data-aparece>
              <Image src="/rs/protector-3d.webp" alt="" width={820} height={660} sizes="(min-width: 980px) 420px, 92vw" />
            </figure>
            <div className="rs-prot__texto" data-aparece style={{ "--i": 1 } as CSSProperties}>
              <h2 className="rs-h2">También hacemos protectores bucales a medida.</h2>
              <p>
                Si jugás un deporte de contacto, el protector es tu mejor aliado, y uno genérico no es lo
                mismo que uno hecho sobre tu boca. Los hacemos nosotras: es Protectores Bucales RS.
              </p>
              <a href={igProtectores} target="_blank" rel="noopener noreferrer" className="rs-btn rs-btn--tinta">
                <span className="rs-btn__capsula rs-btn__capsula--ig" aria-hidden>
                  <InstagramLogo weight="duotone" />
                </span>
                <span className="rs-btn__texto">Ver @{RS.instagramProtectores}</span>
                <ArrowUpRight weight="bold" className="rs-btn__fuera" aria-hidden />
              </a>
            </div>
          </div>
        </section>

        {/* ── Preguntas ── */}
        <section id="preguntas" className="rs-faq">
          <div className="rs-ancho rs-faq__grid">
            <header className="rs-cabeza" data-aparece>
              <h2 className="rs-h2">Antes de venir.</h2>
              <p className="rs-intro">Lo que más nos preguntan, respondido corto.</p>
            </header>
            <ol className="rs-faq__lista">
              {PREGUNTAS.map((q, i) => (
                <li key={q.pregunta} data-aparece style={{ "--i": i } as CSSProperties}>
                  <details className="rs-faq__item" name="rs-faq">
                    <summary>
                      <span className="rs-faq__num" aria-hidden>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="rs-faq__texto">{q.pregunta}</span>
                      <span className="rs-faq__mas" aria-hidden>
                        <Plus weight="bold" />
                      </span>
                    </summary>
                    <p>{q.respuesta}</p>
                  </details>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Dónde y cuándo ── */}
        <section id="donde" className="rs-donde">
          <MuelaFondo className="rs-donde__marca" />
          <div className="rs-ancho">
            <div className="rs-donde__fotos" data-aparece>
              <figure className="rs-marco rs-marco--oscuro rs-donde__foto">
                <Image
                  src="/rs/frente.webp"
                  alt="Frente del consultorio, con el cartel RS Odontología"
                  width={1600}
                  height={459}
                  sizes="(min-width: 980px) 70vw, 92vw"
                />
              </figure>
              <figure className="rs-marco rs-marco--oscuro rs-donde__puerta">
                <Image
                  src="/rs/puerta-detalle.webp"
                  alt="Puerta del consultorio con el isotipo de RS: una muela con un rayo"
                  width={800}
                  height={648}
                  sizes="(min-width: 980px) 26vw, 92vw"
                />
              </figure>
            </div>
            <div className="rs-donde__grid">
              <div className="rs-donde__lugar" data-aparece>
                <span className="rs-donde__pin" aria-hidden>
                  <MapPin weight="duotone" />
                </span>
                <h2 className="rs-h2">
                  {RS.direccion},
                  <br />
                  {RS.ciudad}.
                </h2>
                <p className="rs-donde__ref">{RS.referencia}.</p>
                <a href={RS.mapa} target="_blank" rel="noopener noreferrer" className="rs-enlace rs-enlace--claro">
                  <span>Cómo llegar</span>
                  <span className="rs-enlace__capsula" aria-hidden>
                    <ArrowUpRight weight="bold" />
                  </span>
                </a>
              </div>
              <div className="rs-donde__panel" data-oculta-barra data-aparece style={{ "--i": 1 } as CSSProperties}>
                <table className="rs-donde__tabla">
                  <caption className="rs-sr">Horarios de atención</caption>
                  <tbody>
                    {RS.horarios.map((h) => (
                      <tr key={h.dias}>
                        <th scope="row">{h.dias}</th>
                        <td>{h.horas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="rs-donde__aviso">
                  <CalendarCheck weight="duotone" aria-hidden />
                  Atendemos siempre con turno previo.
                </p>
                <div className="rs-donde__botones">
                  <BotonTurno>Sacar turno online</BotonTurno>
                  <BotonWhatsApp href={wa("Hola, quiero pedir un turno en RS Odontología.")}>
                    {RS.whatsappVisible}
                  </BotonWhatsApp>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="rs-pie">
        <MuelaFondo className="rs-pie__marca" />
        <div className="rs-ancho">
          <div className="rs-pie__cierre" data-oculta-barra data-aparece>
            <span className="rs-pie__rayo" aria-hidden>
              <Rayo />
            </span>
            <h2 className="rs-h2">¿Sacamos ese turno?</h2>
            <p>Elegís día y horario online, sin llamar. Y si preferís, nos escribís.</p>
            <div className="rs-pie__botones">
              <BotonTurno>Sacar turno online</BotonTurno>
              <BotonWhatsApp href={wa("Hola, quiero pedir un turno en RS Odontología.")}>
                {RS.whatsappVisible}
              </BotonWhatsApp>
            </div>
          </div>

          <div className="rs-pie__grid">
            <div className="rs-pie__sobre" data-aparece>
              <Image src="/rs/logo-blanco.png" alt="RS Odontología" width={1045} height={513} className="rs-pie__logo" />
              <p>
                {RS.especialidad} en {RS.ciudad}.
              </p>
            </div>

            <div className="rs-pie__col" data-aparece style={{ "--i": 1 } as CSSProperties}>
              <h3>
                <MapPin weight="duotone" aria-hidden /> Dónde
              </h3>
              <p>
                {RS.direccion}, {RS.ciudad}
                <br />
                {RS.referencia}
              </p>
              <a href={RS.mapa} target="_blank" rel="noopener noreferrer" className="rs-pie__link">
                Cómo llegar <ArrowUpRight weight="bold" aria-hidden />
              </a>
            </div>

            <div className="rs-pie__col" data-aparece style={{ "--i": 2 } as CSSProperties}>
              <h3>
                <Clock weight="duotone" aria-hidden /> Horarios
              </h3>
              <dl className="rs-pie__horas">
                {RS.horarios.map((h) => (
                  <div key={h.dias}>
                    <dt>{h.dias}</dt>
                    <dd>{h.horas}</dd>
                  </div>
                ))}
              </dl>
              <p className="rs-pie__nota">Siempre con turno previo.</p>
            </div>

            <div className="rs-pie__col" data-aparece style={{ "--i": 3 } as CSSProperties}>
              <h3>
                <WhatsappLogo weight="duotone" aria-hidden /> Contacto
              </h3>
              <ul className="rs-pie__links">
                <li>
                  <a href={wa("Hola, quiero hacer una consulta.")} target="_blank" rel="noopener noreferrer">
                    <WhatsappLogo weight="duotone" aria-hidden /> {RS.whatsappVisible}
                  </a>
                </li>
                <li>
                  <a href={ig} target="_blank" rel="noopener noreferrer">
                    <InstagramLogo weight="duotone" aria-hidden /> @{RS.instagram}
                  </a>
                </li>
                <li>
                  <a href={igProtectores} target="_blank" rel="noopener noreferrer">
                    <InstagramLogo weight="duotone" aria-hidden /> @{RS.instagramProtectores}
                  </a>
                </li>
              </ul>
            </div>

            <nav className="rs-pie__col rs-pie__nav" aria-label="Secciones del sitio" data-aparece style={{ "--i": 4 } as CSSProperties}>
              <h3>En esta página</h3>
              <ul>
                <li>
                  <a href="#casos">Antes y después</a>
                </li>
                <li>
                  <a href="#tratamientos">Tratamientos</a>
                </li>
                <li>
                  <a href="#equipo">Quiénes somos</a>
                </li>
                <li>
                  <a href="#preguntas">Preguntas</a>
                </li>
                <li>
                  <Link href="/reservar">Sacar turno</Link>
                </li>
              </ul>
            </nav>
          </div>

          <p className="rs-pie__nombre" aria-hidden>
            RS Odontología
          </p>

          <div className="rs-pie__base">
            <p>
              © {new Date().getFullYear()} {RS.nombre} · {RS.direccion}, {RS.ciudad}, {RS.provincia}
            </p>
            <Link href="/admin" className="rs-pie__panel">
              Acceso del equipo
            </Link>
            <a href={CODEXY.sitio} target="_blank" rel="noopener noreferrer" className="rs-pie__codexy">
              Hecho por Codexy
            </a>
          </div>
        </div>
      </footer>

      {/* Barra flotante del celular: el turno siempre a un toque. */}
      <BarraTurno>
        <BotonTurno>Sacar turno</BotonTurno>
        <a
          href={wa("Hola, quiero pedir un turno en RS Odontología.")}
          target="_blank"
          rel="noopener noreferrer"
          className="rs-barra__wa"
          aria-label="Escribir por WhatsApp"
        >
          <WhatsappLogo weight="fill" aria-hidden />
        </a>
      </BarraTurno>
    </div>
  );
}
