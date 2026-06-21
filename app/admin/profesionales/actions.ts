"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { saveStaff } from "@/lib/store";
import { verifyToken, SESSION_COOKIE } from "@/lib/auth";
import type { Staff } from "@/lib/scheduling/types";

type Entrada = Partial<Staff> & { nombre: string };

export async function guardarProfesionales(list: Entrada[]) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifyToken(token))) throw new Error("No autorizado");

  const staff: Staff[] = (list || [])
    .filter((s) => s.nombre && s.nombre.trim())
    .map((s) => ({
      id: s.id && /^[\w-]+$/.test(s.id) ? s.id : randomUUID(),
      nombre: s.nombre.trim().slice(0, 80),
      titulo: s.titulo ? String(s.titulo).trim().slice(0, 120) : undefined,
      bio: s.bio ? String(s.bio).trim().slice(0, 280) : undefined,
      serviceIds: Array.isArray(s.serviceIds)
        ? s.serviceIds.filter((x) => typeof x === "string").slice(0, 50)
        : [],
      color: typeof s.color === "string" && /^#[0-9a-fA-F]{6}$/.test(s.color) ? s.color : undefined,
      imageUrl: safeImageUrl(s.imageUrl),
      activo: s.activo !== false,
    }));

  try {
    await saveStaff(staff);
  } catch (e) {
    console.error("[profesionales] guardar:", e);
    throw new Error("No se pudieron guardar los profesionales. Reintentá.");
  }
  revalidatePath("/admin/profesionales");
  revalidatePath("/reservar");
}

/** Acepta: foto subida (data:image/... recomprimida en el navegador) o ruta
 *  interna del sitio (/...). Bloquea javascript:, data:text, svg+xml (XSS), URLs
 *  externas (hotlinking / fuga de IP de visitantes) y protocol-relative (//host). */
const MAX_DATA_URL = 200_000; // ~150KB: holgado para un jpeg 256px, lejos de los 2MB

function safeImageUrl(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  if (!s) return undefined;
  // Foto subida (data URL). RECHAZAMOS si excede el tope —no truncamos, porque
  // cortar un base64 corrompe la imagen y, peor, infla el blob JSONB.
  if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(s)) {
    return s.length <= MAX_DATA_URL ? s : undefined;
  }
  // Solo rutas internas: "/algo" pero NO "//host" (protocol-relative externo).
  if (s.startsWith("/") && !s.startsWith("//")) return s.slice(0, 500);
  return undefined;
}
