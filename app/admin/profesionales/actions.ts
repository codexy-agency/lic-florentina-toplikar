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

/** Solo URLs http(s) o rutas locales (/...). Evita javascript:, data:, etc. */
function safeImageUrl(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim().slice(0, 500);
  if (!s) return undefined;
  if (s.startsWith("/") || /^https?:\/\//i.test(s)) return s;
  return undefined;
}
