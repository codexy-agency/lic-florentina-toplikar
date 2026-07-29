"use server";

import { revalidatePath } from "next/cache";
import { requirePermiso } from "@/lib/session";
import { crearMiembro, revocarAcceso, cambiarPassword, setSoporteHabilitado, soporteHabilitado } from "@/lib/accounts";
import { esRolValido, PERMISOS, type Permisos, type Rol } from "@/lib/permisos";
import { leerAuth, mutarAuth, logAudit } from "@/lib/accounts-store";

export type EquipoState = { ok: boolean; error?: string; mensaje?: string };

/** Solo un dueño puede crear o tocar a otro dueño. */
async function exigirOwnerParaOwner(rolDestino: Rol, rolActual: Rol) {
  if (rolDestino === "owner" && rolActual !== "owner") {
    throw new Error("Solo un dueño puede designar a otro dueño.");
  }
}

export async function invitarMiembro(
  _prev: EquipoState | null,
  formData: FormData
): Promise<EquipoState> {
  try {
    const s = await requirePermiso("equipo");
    if (!s.pid) return { ok: false, error: "Consultorio no resuelto." };

    const rol = String(formData.get("rol") || "asistente");
    if (!esRolValido(rol)) return { ok: false, error: "Rol inválido." };
    await exigirOwnerParaOwner(rol, s.rol);

    const res = await crearMiembro({
      email: String(formData.get("email") || ""),
      nombre: String(formData.get("nombre") || ""),
      password: String(formData.get("password") || ""),
      rol,
      professionalId: s.pid,
      porUserId: s.userId ?? undefined,
    });
    if (!res.ok) return { ok: false, error: res.error };

    revalidatePath("/admin/equipo");
    return {
      ok: true,
      mensaje: "Acceso creado. Pasale el email y la contraseña por un canal seguro; que la cambie al entrar.",
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo crear el acceso." };
  }
}

export async function quitarAcceso(formData: FormData) {
  const s = await requirePermiso("equipo");
  if (!s.pid) return;
  const userId = String(formData.get("userId") || "");
  if (!userId) return;
  if (userId === s.userId) throw new Error("No podés quitarte el acceso a vos misma/o.");
  await revocarAcceso(userId, s.pid, s.userId ?? undefined);
  revalidatePath("/admin/equipo");
}

/** Cambia rol y permisos de un miembro. */
export async function actualizarMiembro(formData: FormData) {
  const s = await requirePermiso("equipo");
  if (!s.pid) return;
  const userId = String(formData.get("userId") || "");
  const rol = String(formData.get("rol") || "");
  if (!userId || !esRolValido(rol)) return;
  await exigirOwnerParaOwner(rol, s.rol);

  const permisos: Permisos = {};
  for (const p of PERMISOS) permisos[p] = formData.get(`permiso_${p}`) === "on";

  await mutarAuth((d) => {
    const m = d.memberships.find((x) => x.userId === userId && x.professionalId === s.pid && x.activo);
    if (!m) return;
    // Un consultorio no puede quedarse sin dueño.
    if (m.rol === "owner" && rol !== "owner") {
      const owners = d.memberships.filter((x) => x.professionalId === s.pid && x.activo && x.rol === "owner");
      if (owners.length <= 1) throw new Error("No podés dejar el consultorio sin dueño.");
    }
    m.rol = rol;
    m.permisos = permisos;
  });
  await logAudit({
    userId: s.userId ?? undefined,
    professionalId: s.pid,
    accion: "miembro_actualizado",
    entidad: "usuario",
    entidadId: userId,
    meta: { rol },
  });
  revalidatePath("/admin/equipo");
}

/** Genera una contraseña temporal para alguien que la perdió (la entrega el dueño
 *  por su canal). Mientras no haya email transaccional, este es el camino. */
export async function resetearPassword(formData: FormData): Promise<void> {
  const s = await requirePermiso("equipo");
  if (!s.pid) return;
  const userId = String(formData.get("userId") || "");
  if (!userId) return;
  const temporal = "Temp-" + Math.random().toString(36).slice(2, 10) + "-" + Math.random().toString(36).slice(2, 6);
  await cambiarPassword(userId, temporal, s.userId ?? undefined, s.pid);
  await mutarAuth((d) => {
    const u = d.users.find((x) => x.id === userId);
    if (u) (u as { passwordTemporal?: string }).passwordTemporal = temporal;
  });
  revalidatePath("/admin/equipo");
}

/** El cliente decide si el equipo de Codexy puede entrar a ayudarlo. */
export async function alternarSoporte(formData: FormData) {
  const s = await requirePermiso("equipo");
  if (!s.pid) return;
  const habilitar = String(formData.get("habilitar") || "") === "1";
  await setSoporteHabilitado(s.pid, habilitar, s.userId ?? undefined);
  revalidatePath("/admin/equipo");
}

/** Últimos accesos del consultorio (para la tarjeta de actividad). */
export async function ultimosAccesos(professionalId: string, limite = 12) {
  const db = await leerAuth();
  return db.audit.filter((a) => a.professionalId === professionalId).slice(0, limite);
}
export async function estadoSoporte(pid: string) { return soporteHabilitado(pid); }
