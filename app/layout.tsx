import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Lic. Paulina Pilotti | Psicóloga Clínica en Viedma y Online",
    template: "%s | Lic. Paulina Pilotti",
  },
  description:
    "Psicóloga clínica especializada en Terapia Cognitivo Conductual (TCC) y ACT. Atención presencial en Viedma y online a todo el mundo para adolescentes, jóvenes y adultos. Agendá tu primera consulta por WhatsApp.",
  keywords: [
    "psicóloga Viedma",
    "psicóloga online",
    "terapia cognitivo conductual",
    "terapia ACT",
    "psicóloga clínica",
    "Paulina Pilotti",
    "terapia adolescentes",
    "terapia ansiedad",
    "salud mental Viedma",
    "psicóloga Río Negro",
  ],
  authors: [{ name: "Lic. Paulina Pilotti" }],
  creator: "Lic. Paulina Pilotti",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: SITE_URL,
    siteName: "Lic. Paulina Pilotti — Psicóloga Clínica",
    title: "Lic. Paulina Pilotti | Psicóloga Clínica en Viedma y Online",
    description:
      "Terapia Cognitivo Conductual y ACT. Atención presencial en Viedma y online a todo el mundo. Un espacio para cuidar tu salud mental.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lic. Paulina Pilotti | Psicóloga Clínica",
    description:
      "Terapia Cognitivo Conductual y ACT. Presencial en Viedma y online a todo el mundo.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  category: "health",
};

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
  sameAs: ["https://www.instagram.com/"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
      </head>
      <body className="min-h-full flex flex-col bg-[#FBF8F2] text-[#2B2722]">
        {children}
      </body>
    </html>
  );
}
