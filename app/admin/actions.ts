"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { setEstado, getScheduling } from "@/lib/store";
import { SESSION_COOKIE } from "@/lib/auth";
import { arLocalToIso, endFromStart } from "@/lib/scheduling/slots";

export async function aceptarSolicitud(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;
  // "fecha" (datetime-local AR) es OPCIONAL: si la profesional la deja vacía,
  // se confirma el slot que el paciente ya eligió. Si la completa, reprograma.
  const fechaLocal = String(formData.get("fecha") || "").trim();
  let startsAt: string | undefined;
  let endsAt: string | undefined;
  if (fechaLocal) {
    startsAt = arLocalToIso(fechaLocal) || undefined;
    if (startsAt) {
      const { config } = await getScheduling();
      endsAt = endFromStart(startsAt, config.slotDurationMin);
    }
  }
  await setEstado(id, "confirmado", startsAt, endsAt);
  revalidatePath("/admin");
}

export async function reprogramarTurno(formData: FormData) {
  const id = String(formData.get("id") || "");
  const fechaLocal = String(formData.get("fecha") || "").trim();
  if (!id || !fechaLocal) return;
  const startsAt = arLocalToIso(fechaLocal);
  if (!startsAt) return;
  const { config } = await getScheduling();
  const endsAt = endFromStart(startsAt, config.slotDurationMin);
  await setEstado(id, "confirmado", startsAt, endsAt);
  revalidatePath("/admin");
}

export async function rechazarSolicitud(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (id) await setEstado(id, "rechazado");
  revalidatePath("/admin");
}

export async function marcarRealizado(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (id) await setEstado(id, "realizado");
  revalidatePath("/admin");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}
