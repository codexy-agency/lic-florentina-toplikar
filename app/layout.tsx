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

const SITE_URL = "https://florentinatoplikar.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Lic. Florentina Toplikar | Psicóloga Clínica en Paraná y Online",
    template: "%s | Lic. Florentina Toplikar",
  },
  description:
    "Psicóloga clínica especializada en Terapia Cognitivo Conductual (TCC) y ACT. Atención presencial en Paraná y online a todo el mundo para adolescentes, jóvenes y adultos. Agendá tu primera consulta por WhatsApp.",
  keywords: [
    "psicóloga Paraná",
    "psicóloga online",
    "terapia cognitivo conductual",
    "terapia ACT",
    "psicóloga clínica",
    "Florentina Toplikar",
    "terapia adolescentes",
    "terapia ansiedad",
    "salud mental Paraná",
    "psicólogo Entre Ríos",
  ],
  authors: [{ name: "Lic. Florentina Toplikar" }],
  creator: "Lic. Florentina Toplikar",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: SITE_URL,
    siteName: "Lic. Florentina Toplikar — Psicóloga Clínica",
    title: "Lic. Florentina Toplikar | Psicóloga Clínica en Paraná y Online",
    description:
      "Terapia Cognitivo Conductual y ACT. Atención presencial en Paraná y online a todo el mundo. Un espacio para cuidar tu salud mental.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lic. Florentina Toplikar | Psicóloga Clínica",
    description:
      "Terapia Cognitivo Conductual y ACT. Presencial en Paraná y online a todo el mundo.",
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
  name: "Lic. Florentina Toplikar",
  description:
    "Psicóloga clínica especializada en Terapia Cognitivo Conductual (TCC) y ACT. Atención presencial en Paraná y online.",
  url: SITE_URL,
  image: `${SITE_URL}/og.jpg`,
  telephone: "+5400000000000",
  priceRange: "$$",
  medicalSpecialty: "Psychiatric",
  knowsLanguage: "es",
  areaServed: [
    { "@type": "City", name: "Paraná, Entre Ríos, Argentina" },
    { "@type": "Place", name: "Atención online a todo el mundo" },
  ],
  availableService: [
    { "@type": "MedicalTherapy", name: "Terapia Cognitivo Conductual (TCC)" },
    { "@type": "MedicalTherapy", name: "Terapia de Aceptación y Compromiso (ACT)" },
  ],
  address: {
    "@type": "PostalAddress",
    addressLocality: "Paraná",
    addressRegion: "Entre Ríos",
    addressCountry: "AR",
  },
  sameAs: ["https://www.instagram.com/psic.florentinatoplikar/"],
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
