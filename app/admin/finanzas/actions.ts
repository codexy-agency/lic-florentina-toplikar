"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { setPago } from "@/lib/store";
import { verifyToken, SESSION_COOKIE } from "@/lib/auth";

async function auth() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifyToken(token))) throw new Error("No autorizado");
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
