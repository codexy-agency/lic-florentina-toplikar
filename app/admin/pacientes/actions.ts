"use server";

import { requirePermiso } from "@/lib/session";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addNota, removeNota, updatePacienteFicha, updatePacienteDatos, addPaciente } from "@/lib/store";

import { arLocalToIso } from "@/lib/scheduling/slots";

async function auth() {
  return requirePermiso("pacientes");
}

export async function crearPaciente(formData: FormData) {
  await auth();
  const nombre = String(formData.get("nombre") || "").trim().slice(0, 120);
  const contacto = String(formData.get("contacto") || "").trim().slice(0, 160);
  const email = String(formData.get("email") || "").trim().slice(0, 160);
  const modalidad = String(formData.get("modalidad") || "online") === "presencial" ? "presencial" : "online";
  if (!nombre || !contacto) return;
  const p = await addPaciente({ nombre, contacto, email: email || undefined, modalidad });
  revalidatePath("/admin/pacientes");
  redirect(`/admin/pacientes/${p.id}`); // va directo a su historia
}

export async function agregarNota(formData: FormData) {
  // La HISTORIA CLÍNICA es dato de salud: exige su propio permiso, aparte del de
  // pacientes (una secretaria puede ver el contacto, no la evolución clínica).
  await requirePermiso("notas_clinicas");
  const patientId = String(formData.get("patientId") || "");
  const contenido = String(formData.get("contenido") || "").trim().slice(0, 4000);
  const titulo = String(formData.get("titulo") || "").trim().slice(0, 80) || undefined;
  const fechaLocal = String(formData.get("fecha") || "").trim();
  if (!patientId || !contenido) return;
  const fecha = fechaLocal ? arLocalToIso(fechaLocal) || undefined : undefined;
  await addNota(patientId, contenido, fecha, titulo);
  revalidatePath(`/admin/pacientes/${patientId}`);
}

export async function borrarNota(formData: FormData) {
  await requirePermiso("notas_clinicas");
  const id = String(formData.get("id") || "");
  const patientId = String(formData.get("patientId") || "");
  if (id) await removeNota(id);
  revalidatePath(`/admin/pacientes/${patientId}`);
}

export async function editarPaciente(formData: FormData) {
  await auth();
  const id = String(formData.get("id") || "");
  const nombre = String(formData.get("nombre") || "").trim().slice(0, 120);
  const contacto = String(formData.get("contacto") || "").trim().slice(0, 160);
  const email = String(formData.get("email") || "").trim().slice(0, 160);
  const modalidad = String(formData.get("modalidad") || "online");
  if (!id || !nombre || !contacto) return;
  await updatePacienteDatos(id, { nombre, contacto, email: email || undefined, modalidad });
  revalidatePath(`/admin/pacientes/${id}`);
  revalidatePath("/admin/pacientes");
}

export async function guardarFicha(formData: FormData) {
  await auth();
  const id = String(formData.get("id") || "");
  const notas = String(formData.get("notas") || "").trim().slice(0, 2000);
  if (id) await updatePacienteFicha(id, notas);
  revalidatePath(`/admin/pacientes/${id}`);
}
