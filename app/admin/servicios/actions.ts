"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { saveServices } from "@/lib/store";
import { verifyToken, SESSION_COOKIE } from "@/lib/auth";
import type { Service } from "@/lib/scheduling/types";

type Entrada = Partial<Service> & { nombre: string };

export async function guardarServicios(list: Entrada[]) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifyToken(token))) throw new Error("No autorizado");

  const services: Service[] = (list || [])
    .filter((s) => s.nombre && s.nombre.trim())
    .map((s) => ({
      id: s.id && /^[\w-]+$/.test(s.id) ? s.id : randomUUID(),
      nombre: s.nombre.trim().slice(0, 80),
      durationMin: clampInt(s.durationMin, 10, 240, 50),
      priceARS:
        s.priceARS != null && Number.isFinite(Number(s.priceARS))
          ? Math.max(0, Math.round(Number(s.priceARS)))
          : undefined,
      descripcion: s.descripcion ? String(s.descripcion).trim().slice(0, 200) : undefined,
      activo: s.activo !== false,
    }));

  await saveServices(services);
  revalidatePath("/admin/servicios");
  revalidatePath("/admin/profesionales");
  revalidatePath("/reservar");
}

function clampInt(v: unknown, min: number, max: number, def: number) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, n));
}
