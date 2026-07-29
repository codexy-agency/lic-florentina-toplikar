import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { headers } from "next/headers";
import { getMarca } from "@/lib/store";
import { baseDePlataforma, baseDelRequest } from "@/lib/sitio";
import { cssDeMarca, nombreMostrable, type Marca } from "@/lib/marca";

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

// La base sale del host real o del dominio propio del consultorio. Antes era una
// constante con el dominio de una psicóloga, usada como fallback de metadataBase
// y del JSON-LD: todos los suscriptores publicaban ese canonical.
async function baseDelSitio(m: Marca | null): Promise<string> {
  try {
    return await baseDelRequest(await headers(), m);
  } catch {
    return baseDePlataforma();
  }
}

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
  const base = await baseDelSitio(m);
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

/** Datos estructurados (Google) DE ESTE consultorio.
 *  Estaban hardcodeados: cada suscriptor publicaba el nombre, la ciudad y el
 *  Instagram de otra profesional, que además es lo que Google indexa. */
function jsonLdDe(m: Marca | null, url: string) {
  const nombre = m?.nombre || "Consultorio de psicología";
  const titulo = m?.titulo || "";
  const ciudad = m?.ciudad || "";
  const ig = m?.instagram?.trim();

  return {
    "@context": "https://schema.org",
    "@type": "Psychologist",
    name: [titulo, nombre].filter(Boolean).join(" "),
    description:
      m?.heroSubtitulo ||
      `Psicología clínica${ciudad ? ` en ${ciudad}` : ""} y atención online.`,
    url,
    priceRange: "$$",
    knowsLanguage: "es",
    areaServed: [
      ...(ciudad ? [{ "@type": "City", name: ciudad }] : []),
      { "@type": "Place", name: "Atención online" },
    ],
    ...(ciudad ? { address: { "@type": "PostalAddress", addressLocality: ciudad } } : {}),
    ...(ig
      ? { sameAs: [ig.startsWith("http") ? ig : `https://www.instagram.com/${ig.replace(/^@/, "")}/`] }
      : {}),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Colores y datos de ESTE consultorio. Si el store no está disponible (build,
  // o un tenant sin resolver), se usan los tokens por defecto de globals.css.
  let marca: Marca | null = null;
  try {
    marca = await getMarca();
  } catch {
    marca = null;
  }
  const css = marca ? cssDeMarca(marca) : "";
  const base = await baseDelSitio(marca);
  return (
    <html
      lang="es"
      className={`${fraunces.variable} ${jakarta.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdDe(marca, base)) }}
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
