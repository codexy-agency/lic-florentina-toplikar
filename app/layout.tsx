import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { getMarca } from "@/lib/store";
import { cssDeMarca, nombreMostrable } from "@/lib/marca";

const fraunces = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = "https://paulinapilotti.com";

/** Metadatos POR CONSULTORIO: el titulo del navegador, el SEO y las tarjetas al
 *  compartir el link salen de la marca que cada psicologo configura en el panel. */
export async function generateMetadata(): Promise<Metadata> {
  let m;
  try {
    m = await getMarca();
  } catch {
    m = null;
  }
  const nombre = m && m.nombre ? m.nombre : "Consultorio de psicología";
  const titulo = m && m.titulo ? m.titulo : "Psicología clínica";
  const ciudad = m && m.ciudad ? m.ciudad : "";
  const base = m && m.dominio ? `https://${m.dominio}` : SITE_URL;
  const tituloCompleto = ciudad
    ? `${nombre} | ${titulo} en ${ciudad} y online`
    : `${nombre} | ${titulo}`;
  const descripcion =
    (m && m.heroSubtitulo) ||
    `${titulo}${ciudad ? ` en ${ciudad}` : ""} y online. Reservá tu turno en línea.`;
  return {
    metadataBase: new URL(base),
    title: { default: tituloCompleto, template: `%s | ${nombre}` },
    description: descripcion,
    authors: [{ name: nombre }],
    creator: nombre,
    openGraph: {
      type: "website",
      locale: "es_AR",
      url: base,
      siteName: nombre,
      title: tituloCompleto,
      description: descripcion,
    },
    twitter: { card: "summary_large_image", title: tituloCompleto, description: descripcion },
    robots: { index: true, follow: true },
  };
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Psychologist",
  name: "Lic. Paulina Pilotti",
  description:
    "Psicóloga clínica especializada en Terapia Cognitivo Conductual (TCC) y ACT. Atención presencial en Viedma y online.",
  url: SITE_URL,
  priceRange: "$$",
  knowsLanguage: "es",
  areaServed: [
    { "@type": "City", name: "Viedma, Río Negro, Argentina" },
    { "@type": "Place", name: "Atención online a todo el mundo" },
  ],
  availableService: [
    { "@type": "MedicalTherapy", name: "Terapia Cognitivo Conductual (TCC)" },
    { "@type": "MedicalTherapy", name: "Terapia de Aceptación y Compromiso (ACT)" },
  ],
  address: {
    "@type": "PostalAddress",
    addressLocality: "Viedma",
    addressRegion: "Río Negro",
    addressCountry: "AR",
  },
  sameAs: ["https://www.instagram.com/psicoterapia.pauli/"],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Colores de ESTE consultorio. Si el store no está disponible (build, o un
  // tenant sin resolver), se usan los tokens por defecto de globals.css.
  let css = "";
  try {
    css = cssDeMarca(await getMarca());
  } catch {
    css = "";
  }
  return (
    <html
      lang="es"
      className={`${fraunces.variable} ${jakarta.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Paleta del consultorio: pisa los tokens por defecto. */}
        {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
      </head>
      <body className="min-h-full flex flex-col bg-[#FBF8F2] text-[#2B2722]">
        {children}
      </body>
    </html>
  );
}
