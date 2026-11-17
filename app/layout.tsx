import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { headers } from "next/headers";
import { getMarca } from "@/lib/store";
import { baseDePlataforma, baseDelRequest } from "@/lib/sitio";
import { cssDeMarca, type Marca } from "@/lib/marca";
import { IMAGEN_COMPARTIR, RS } from "@/lib/rs";

// Tipografías AUTOALOJADAS (app/fonts, licencia OFL): no se pide nada a Google.
// Bricolage Grotesque para títulos (variable en peso y ancho: los titulares van
// condensados) y Schibsted Grotesk para el texto.
const display = localFont({
  src: "./fonts/bricolage-grotesque.woff2",
  variable: "--font-serif", // el panel usa esta variable para sus títulos
  weight: "200 800",
  display: "swap",
  declarations: [{ prop: "font-stretch", value: "75% 100%" }],
});

const texto = localFont({
  src: "./fonts/schibsted-grotesk.woff2",
  variable: "--font-sans",
  weight: "400 900",
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

/** Metadatos del consultorio. El nombre y la bajada salen de la marca (editable
 *  desde el panel); la dirección y los horarios, de lib/rs.ts. */
export async function generateMetadata(): Promise<Metadata> {
  let m;
  try {
    m = await getMarca();
  } catch {
    m = null;
  }
  const nombre = m?.nombre || RS.nombre;
  const base = await baseDelSitio(m);
  const tituloCompleto = `${nombre} | ${RS.especialidad} en ${RS.ciudad}`;
  const descripcion =
    m?.heroSubtitulo ||
    `${RS.especialidad} en ${RS.direccion}, ${RS.ciudad}. Sacá tu turno online.`;
  return {
    metadataBase: new URL(base),
    title: { default: tituloCompleto, template: `%s | ${nombre}` },
    description: descripcion,
    authors: [{ name: nombre }],
    creator: nombre,
    applicationName: nombre,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      locale: "es_AR",
      url: base,
      siteName: nombre,
      title: tituloCompleto,
      description: descripcion,
      images: [IMAGEN_COMPARTIR],
    },
    twitter: {
      card: "summary_large_image",
      title: tituloCompleto,
      description: descripcion,
      images: [IMAGEN_COMPARTIR.url],
    },
    robots: { index: true, follow: true },
  };
}

// Color de la barra del navegador en el celular: el verde petróleo del logo.
export const viewport: Viewport = { themeColor: "#1E3A3D" };

/** Datos estructurados (Google): consultorio odontológico, con lo que publican. */
function jsonLdDe(m: Marca | null, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Dentist",
    name: m?.nombre || RS.nombre,
    description: `${RS.especialidad} en ${RS.ciudad}.`,
    url,
    telephone: `+${RS.whatsapp}`,
    address: {
      "@type": "PostalAddress",
      streetAddress: RS.direccion,
      addressLocality: RS.ciudad,
      addressRegion: RS.provincia,
      addressCountry: "AR",
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "08:30",
        closes: "20:00",
      },
      { "@type": "OpeningHoursSpecification", dayOfWeek: "Saturday", opens: "09:30", closes: "12:00" },
    ],
    sameAs: [`https://www.instagram.com/${RS.instagram}/`],
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
      lang="es-AR"
      className={`${display.variable} ${texto.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdDe(marca, base)) }}
        />
        {/* Paleta del consultorio: pisa los tokens por defecto. */}
        {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
      </head>
      <body className="min-h-full flex flex-col bg-cream text-espresso">
        {children}
      </body>
    </html>
  );
}
