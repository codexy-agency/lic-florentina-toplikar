"use server";

import { requireSesion } from "@/lib/session";
import { cambiarPassword, verificarPasswordActual } from "@/lib/accounts";

export type CuentaState = { ok: boolean; error?: string; mensaje?: string };

/** Cambio de contraseña PROPIO.
 *
 *  No existía: el panel pedía tres veces que la persona cambiara su contraseña
 *  al entrar, y el error de la sección Equipo la mandaba a "Mi cuenta", una
 *  pantalla que no estaba en ningún lado.
 *
 *  Pide la contraseña ACTUAL, y eso no es burocracia: sin ese chequeo, alguien
 *  que encuentra una sesión abierta en una computadora del consultorio se
 *  apropia de la cuenta cambiando la clave. */
export async function cambiarMiPassword(
  _prev: CuentaState | null,
  formData: FormData
): Promise<CuentaState> {
  try {
    const s = await requireSesion();
    if (!s.userId) {
      return {
        ok: false,
        error:
          "Tu sesión es de las viejas, sin cuenta propia. Creá tu acceso desde Equipo y volvé a entrar.",
      };
    }

    const actual = String(formData.get("actual") || "");
    const nueva = String(formData.get("nueva") || "");
    const repetir = String(formData.get("repetir") || "");

    if (!actual) return { ok: false, error: "Escribí tu contraseña actual." };
    if (nueva !== repetir) return { ok: false, error: "Las dos contraseñas nuevas no coinciden." };
    if (nueva === actual) return { ok: false, error: "La contraseña nueva tiene que ser distinta." };

    if (!(await verificarPasswordActual(s.userId, actual))) {
      return { ok: false, error: "La contraseña actual no es correcta." };
    }

    const r = await cambiarPassword(s.userId, nueva, s.userId, s.pid ?? undefined);
    if (!r.ok) return { ok: false, error: r.error };

    // cambiarPassword revoca las demás sesiones, así que quien esté con tu
    // cuenta en otro equipo queda afuera. Se dice, porque es lo que la persona
    // quiere saber cuando cambia una clave.
    return {
      ok: true,
      mensaje:
        "Listo. Se cerraron las sesiones abiertas en otros equipos; en éste seguís adentro.",
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo cambiar." };
  }
}
