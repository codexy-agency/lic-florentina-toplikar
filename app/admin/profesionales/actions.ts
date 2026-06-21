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

/** Acepta: foto subida (data:image/...), URL http(s) o ruta local (/...).
 *  Bloquea javascript:, data:text, etc. */
function safeImageUrl(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  if (!s) return undefined;
  // Foto subida desde el dispositivo (redimensionada en el navegador). ~20-40KB.
  if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(s)) return s.slice(0, 2_000_000);
  if (s.startsWith("/") || /^https?:\/\//i.test(s)) return s.slice(0, 500);
  return undefined;
}
