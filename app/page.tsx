import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarCheck,
  Clock,
  InstagramLogo,
  MapPin,
  WhatsappLogo,
} from "@phosphor-icons/react/dist/ssr";
import { getMarca } from "@/lib/store";
import { whatsappUrl } from "@/lib/marca";
import { CASOS, EQUIPO, RS, TRATAMIENTOS, waLink } from "@/lib/rs";
import { AntesDespues } from "@/components/rs/AntesDespues";
import { BarraTurno } from "@/components/rs/BarraTurno";
import { IconoTratamiento } from "@/components/rs/IconoTratamiento";
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

          <div className="rs-hero__texto">
            <div className="rs-hero__objeto" aria-hidden>
              <Image src="/rs/muela-3d.webp" alt="" width={760} height={760} priority sizes="(min-width: 980px) 300px, 190px" />
            </div>
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
            <figure className="rs-marco rs-marco--oscuro rs-hero__foto">
              <Image
                src="/rs/puerta.webp"
                alt="Puerta del consultorio con el isotipo de RS: una muela con un rayo"
                width={1100}
                height={1486}
                priority
                sizes="(min-width: 980px) 38vw, 92vw"
              />
            </figure>
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
            <header className="rs-cabeza">
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
              {CASOS.map((c) => (
                <li key={c.id} className="rs-caso">
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
            <header className="rs-cabeza rs-trat__cabeza">
              <h2 className="rs-h2">Lo que hacemos en el consultorio.</h2>
              <figure className="rs-marco rs-trat__foto" aria-hidden>
                <Image src="/rs/instrumental.webp" alt="" width={1010} height={650} sizes="(min-width: 980px) 460px, 92vw" />
              </figure>
            </header>

            <ul className="rs-trat__lista">
              {TRATAMIENTOS.map((t) => (
                <li key={t.nombre} className="rs-trat__item">
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

            <div className="rs-trat__cierre">
              <MuelaFondo className="rs-trat__marca" />
              <p>¿No sabés qué necesitás? Empezá por una primera consulta y lo vemos juntas.</p>
              <BotonTurno />
            </div>
          </div>
        </section>

        {/* ── Quiénes somos ── */}
        <section id="equipo" className="rs-equipo">
          <div className="rs-ancho rs-equipo__grid">
            <div className="rs-equipo__marco">
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
            <div className="rs-equipo__texto">
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
            <figure className="rs-marco rs-marco--tinta rs-prot__foto" aria-hidden>
              <Image src="/rs/protector-3d.webp" alt="" width={820} height={660} sizes="(min-width: 980px) 420px, 92vw" />
            </figure>
            <div className="rs-prot__texto">
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

        {/* ── Dónde y cuándo ── */}
        <section id="donde" className="rs-donde">
          <MuelaFondo className="rs-donde__marca" />
          <div className="rs-ancho">
            <figure className="rs-marco rs-marco--oscuro rs-donde__foto">
              <Image
                src="/rs/frente.webp"
                alt="Frente del consultorio, con el cartel RS Odontología"
                width={1600}
                height={459}
                sizes="100vw"
              />
            </figure>
            <div className="rs-donde__grid">
              <div className="rs-donde__lugar">
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
              <div className="rs-donde__panel" data-oculta-barra>
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
        <div className="rs-ancho rs-pie__grid">
          <Image src="/rs/logo-blanco.png" alt="RS Odontología" width={1045} height={513} className="rs-pie__logo" />
          <ul className="rs-pie__links">
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
            <li>
              <a href={wa("Hola, quiero hacer una consulta.")} target="_blank" rel="noopener noreferrer">
                <WhatsappLogo weight="duotone" aria-hidden /> {RS.whatsappVisible}
              </a>
            </li>
          </ul>
          <p className="rs-pie__legal">
            {RS.nombre} · {RS.direccion}, {RS.ciudad}, {RS.provincia}
          </p>
          <Link href="/admin" className="rs-pie__panel">
            Acceso del equipo
          </Link>
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
