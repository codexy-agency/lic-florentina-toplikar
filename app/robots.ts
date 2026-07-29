import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getMarca } from "@/lib/store";
import { baseDelRequest } from "@/lib/sitio";

// Por consultorio. Antes apuntaba fijo a paulinapilotti.com/sitemap.xml: cada
// suscriptor le declaraba a Google el sitemap de otro dominio, y le regalaba el
// SEO a un tercero sin haber hecho nada mal.
export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  let base: string;
  try {
    base = await baseDelRequest(await headers(), await getMarca());
  } catch {
    base = await baseDelRequest(await headers());
  }
  return {
    // El panel y las APIs son privados: no se indexan.
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
