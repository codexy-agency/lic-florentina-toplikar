"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { setPago, addMovimientoManual, removeMovimientoManual } from "@/lib/store";
import { verifyToken, SESSION_COOKIE } from "@/lib/auth";
import { arLocalToIso } from "@/lib/scheduling/slots";

async function auth() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifyToken(token))) throw new Error("No autorizado");
}

export async function agregarMovimiento(formData: FormData) {
  await auth();
  const concepto = String(formData.get("concepto") || "").trim().slice(0, 120);
  const monto = Math.round(Number(formData.get("monto")));
  const fechaLocal = String(formData.get("fecha") || "").trim();
  const tipo = String(formData.get("tipo") || "") === "egreso" ? "egreso" : "ingreso";
  const categoria = String(formData.get("categoria") || "").trim().slice(0, 40) || undefined;
  if (!concepto || !Number.isFinite(monto) || monto <= 0) return;
  const fecha = fechaLocal ? arLocalToIso(fechaLocal) || undefined : undefined;
  await addMovimientoManual({ concepto, monto, fecha, tipo, categoria });
  revalidatePath("/admin/finanzas");
}

export async function quitarMovimiento(formData: FormData) {
  await auth();
  const id = String(formData.get("id") || "");
  if (id) await removeMovimientoManual(id);
  revalidatePath("/admin/finanzas");
}

export async function registrarPago(formData: FormData) {
  await auth();
  const id = String(formData.get("id") || "");
  const metodo = String(formData.get("metodo") || "efectivo");
  if (id) await setPago(id, true, metodo);
  revalidatePath("/admin/finanzas");
  revalidatePath("/admin");
}

export async function quitarPago(formData: FormData) {
  await auth();
  const id = String(formData.get("id") || "");
  if (id) await setPago(id, false);
  revalidatePath("/admin/finanzas");
  revalidatePath("/admin");
}
