import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getMarca } from "@/lib/store";
import { baseDelRequest } from "@/lib/sitio";

// Por consultorio, y con /reservar incluida — que es la página que de verdad
// convierte y antes no estaba declarada.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let base: string;
  try {
    base = await baseDelRequest(await headers(), await getMarca());
  } catch {
    base = await baseDelRequest(await headers());
  }
  const ahora = new Date();
  return [
    { url: base, lastModified: ahora, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/reservar`, lastModified: ahora, changeFrequency: "weekly", priority: 0.9 },
  ];
}
