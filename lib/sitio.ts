// URL base del sitio DE ESTE consultorio.
//
// Existe porque había una constante `SITE_URL = "https://paulinapilotti.com"`
// usada como fallback en los metadatos, en robots.txt y en el sitemap. En un
// SaaS eso significa que cada suscriptor le declara a Google el dominio de otra
// persona: el canonical, el sitemap y las tarjetas al compartir apuntan afuera.
//
// Orden de preferencia:
//  1. El dominio propio que el profesional cargó en "Mi sitio".
//  2. El host real del request (su subdominio de la plataforma).
//  3. La URL de producción de Vercel, para procesos sin request (build, cron).

import type { Marca } from "./marca";

function limpiar(host: string): string {
  return host.trim().toLowerCase().replace(/\/$/, "");
}

/** Base a partir de un host crudo (puede venir con puerto en desarrollo). */
export function baseDeHost(host: string | null | undefined): string | null {
  const h = limpiar(host || "");
  if (!h) return null;
  const local = h.startsWith("localhost") || h.startsWith("127.0.0.1");
  return `${local ? "http" : "https"}://${h}`;
}

/** Base de la plataforma, para cuando no hay request (build, sitemap estático). */
export function baseDePlataforma(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

/** Base del sitio para este request. `marca` es opcional: si viene y tiene
 *  dominio propio, gana, porque es la dirección que el profesional publicita. */
export async function baseDelRequest(
  h: Headers,
  marca?: Marca | null
): Promise<string> {
  if (marca?.dominio) return `https://${limpiar(marca.dominio)}`;
  return baseDeHost(h.get("host")) ?? baseDePlataforma();
}
