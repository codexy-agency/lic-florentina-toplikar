"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { addNota, removeNota, updatePacienteFicha } from "@/lib/store";
import { verifyToken, SESSION_COOKIE } from "@/lib/auth";
import { arLocalToIso } from "@/lib/scheduling/slots";

async function auth() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifyToken(token))) throw new Error("No autorizado");
}

export async function agregarNota(formData: FormData) {
  await auth();
  const patientId = String(formData.get("patientId") || "");
  const contenido = String(formData.get("contenido") || "").trim().slice(0, 4000);
  const fechaLocal = String(formData.get("fecha") || "").trim();
  if (!patientId || !contenido) return;
  const fecha = fechaLocal ? arLocalToIso(fechaLocal) || undefined : undefined;
  await addNota(patientId, contenido, fecha);
  revalidatePath(`/admin/pacientes/${patientId}`);
}

export async function borrarNota(formData: FormData) {
  await auth();
  const id = String(formData.get("id") || "");
  const patientId = String(formData.get("patientId") || "");
  if (id) await removeNota(id);
  revalidatePath(`/admin/pacientes/${patientId}`);
}

export async function guardarFicha(formData: FormData) {
  await auth();
  const id = String(formData.get("id") || "");
  const notas = String(formData.get("notas") || "").trim().slice(0, 2000);
  if (id) await updatePacienteFicha(id, notas);
  revalidatePath(`/admin/pacientes/${id}`);
}
