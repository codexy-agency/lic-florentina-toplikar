import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { TurnoForm } from "@/components/TurnoForm";
import { getMarca } from "@/lib/store";
import { whatsappUrl } from "@/lib/marca";
import { IMAGEN_COMPARTIR, RS, waLink } from "@/lib/rs";
import { WhatsappLogo } from "@phosphor-icons/react/dist/ssr";
import "../rs.css";

const DESCRIPCION = `Elegí tratamiento, profesional, día y horario y reservá tu turno en ${RS.nombre}, ${RS.direccion}, ${RS.ciudad}.`;

export const metadata: Metadata = {
  title: "Sacá tu turno",
  description: DESCRIPCION,
  alternates: { canonical: "/reservar" },
  // Una página que define openGraph reemplaza entero al del layout: por eso se
  // repiten el tipo, el sitio y la imagen.
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: RS.nombre,
    url: "/reservar",
    title: `Sacá tu turno | ${RS.nombre}`,
    description: DESCRIPCION,
    images: [IMAGEN_COMPARTIR],
  },
  twitter: {
    card: "summary_large_image",
    title: `Sacá tu turno | ${RS.nombre}`,
    description: DESCRIPCION,
    images: [IMAGEN_COMPARTIR.url],
  },
};

export const dynamic = "force-dynamic";

const PASOS = [
  "Elegís el motivo de la consulta y con quién querés atenderte.",
  "Ves los horarios libres de verdad y te quedás con el que te sirve.",
  "Dejás tu contacto. No se paga nada online.",
];

export default async function ReservarPage() {
  let numero: string = RS.whatsapp;
  try {
    const marca = await getMarca();
    if (whatsappUrl(marca)) numero = marca.whatsapp;
  } catch {
    /* sin store: número publicado */
  }

  return (
    <div className="rs rs-reservar">
      <header className="rs-top rs-top--solido">
        <Link href="/" className="rs-top__logo" aria-label="RS Odontología, volver al inicio">
          <Image src="/rs/logo-blanco.png" alt="" width={1045} height={513} priority />
        </Link>
        <a
          href={waLink("Hola, tengo una duda antes de sacar turno.", numero)}
          target="_blank"
          rel="noopener noreferrer"
          className="rs-top__duda"
        >
          <WhatsappLogo weight="duotone" aria-hidden />
          <span>¿Dudas? Escribinos</span>
        </a>
      </header>

      <main className="rs-reservar__main">
        <aside className="rs-reservar__lado">
          <h1 className="rs-h2">Sacá tu turno.</h1>
          <p className="rs-reservar__donde">
            {RS.direccion}, {RS.ciudad}. {RS.horarios[0].dias} de {RS.horarios[0].horas} y{" "}
            {RS.horarios[1].dias.toLowerCase()} de {RS.horarios[1].horas}.
          </p>
          <ol className="rs-reservar__pasos">
            {PASOS.map((p, i) => (
              <li key={i}>
                <span aria-hidden>{i + 1}</span>
                {p}
              </li>
            ))}
          </ol>
        </aside>

        <div className="rs-reservar__form">
          <TurnoForm />
        </div>
      </main>
    </div>
  );
}
