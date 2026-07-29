"use server";

import { revalidatePath } from "next/cache";
import { requireSesion } from "@/lib/session";
import { setSuscripcion } from "@/lib/accounts";
import { esEstadoValido, esMonedaValida, esPlanValido, DIAS_DE_PRUEBA } from "@/lib/planes";
import { esEmailDeSoporte } from "@/lib/soporte";
import { leerAuth } from "@/lib/accounts-store";

export type CodexyState = { ok: boolean; error?: string; mensaje?: string };

/** Solo el equipo de Codexy entra acá.
 *
 *  No alcanza con un permiso del consultorio: esta pantalla ve y modifica la
 *  facturación de TODOS los clientes. La puerta es la lista SOPORTE_EMAILS, la
 *  misma que habilita el acceso de soporte, y se verifica contra el email real
 *  del usuario logueado (no contra el rol, que es del consultorio). */
async function requireCodexy() {
  const s = await requireSesion();
  if (!s.userId) throw new Error("No autorizado.");
  const db = await leerAuth();
  const u = db.users.find((x) => x.id === s.userId && x.activo);
  if (!u || !esEmailDeSoporte(u.email)) throw new Error("No autorizado.");
  return { sesion: s, email: u.email };
}

export async function cambiarSuscripcion(
  _prev: CodexyState | null,
  formData: FormData
): Promise<CodexyState> {
  try {
    const { sesion } = await requireCodexy();

    const pid = String(formData.get("pid") || "").trim().toLowerCase();
    if (!pid) return { ok: false, error: "Falta el consultorio." };

    const plan = String(formData.get("plan") || "");
    const estado = String(formData.get("estado") || "");
    const moneda = String(formData.get("moneda") || "");
    if (!esPlanValido(plan)) return { ok: false, error: "Plan inválido." };
    if (!esEstadoValido(estado)) return { ok: false, error: "Estado inválido." };
    if (!esMonedaValida(moneda)) return { ok: false, error: "Moneda inválida." };

    // El periodo se puede escribir a mano o pedir "+1 mes" / "prueba".
    const atajo = String(formData.get("atajo") || "");
    let periodoHasta: string | null = null;
    const fecha = String(formData.get("periodoHasta") || "").trim();
    if (atajo === "mes") {
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      periodoHasta = d.toISOString();
    } else if (atajo === "prueba") {
      const d = new Date();
      d.setDate(d.getDate() + DIAS_DE_PRUEBA);
      periodoHasta = d.toISOString();
    } else if (fecha) {
      const t = Date.parse(fecha);
      if (Number.isNaN(t)) return { ok: false, error: "La fecha no es válida." };
      periodoHasta = new Date(t).toISOString();
    }

    const nota = String(formData.get("nota") || "").trim().slice(0, 500);

    await setSuscripcion(
      pid,
      { plan, estado, moneda, periodoHasta, nota: nota || undefined },
      sesion.userId ?? undefined
    );

    revalidatePath("/admin/codexy");
    return { ok: true, mensaje: "Suscripción actualizada." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo guardar." };
  }
}

/** ¿El usuario logueado es del equipo de Codexy? Para decidir si mostrar el link. */
export async function esDeCodexy(): Promise<boolean> {
  try {
    await requireCodexy();
    return true;
  } catch {
    return false;
  }
}
