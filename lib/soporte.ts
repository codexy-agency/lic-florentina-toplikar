// Acceso de SOPORTE de Codexy a la cuenta de un cliente.
//
// Es la función más delicada del sistema: permite entrar al consultorio de otra
// persona, donde hay datos de salud. Se diseña con cuatro reglas duras:
//
//  1. NUNCA la historia clínica. El soporte ayuda con la herramienta, no necesita
//     leer la evolución de un paciente (need-to-know, Ley 25.326).
//  2. Siempre visible. El panel muestra un cartel mientras dura la sesión: el
//     cliente ve que alguien de Codexy está adentro.
//  3. Siempre auditado. Cada ingreso queda registrado y el cliente lo ve en
//     Equipo → Actividad reciente.
//  4. El cliente lo puede apagar. Si desactiva el soporte, ni Codexy entra.
//
// Configuración: SOPORTE_EMAILS="ana@codexy.com,juan@codexy.com" (env, server-side).

import type { Permiso, Rol } from "./permisos";

/** Emails habilitados para soporte (equipo de Codexy). */
function emailsDeSoporte(): Set<string> {
  return new Set(
    (process.env.SOPORTE_EMAILS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function esEmailDeSoporte(email: string): boolean {
  const e = (email || "").trim().toLowerCase();
  return !!e && emailsDeSoporte().has(e);
}

export function soporteConfigurado(): boolean {
  return emailsDeSoporte().size > 0;
}

/** Rol efectivo de una sesión de soporte. */
export const ROL_SOPORTE: Rol = "admin";

/** Permisos que una sesión de soporte NO tiene nunca.
 *
 *  `notas_clinicas` es obvio: es el dato de salud.
 *
 *  `equipo` NO es obvio y es igual de importante: quien administra los accesos
 *  puede crear un miembro con rol `profesional` y una contraseña que elige él
 *  mismo, y entrar con esa cuenta. `permisosPorRol("profesional")` incluye
 *  `notas_clinicas`, así que negar sólo la historia clínica dejaba la puerta
 *  abierta en dos pasos. Negando `equipo` se cierra el camino entero de una vez:
 *  invitarMiembro, actualizarMiembro, resetearPassword, quitarAcceso y el toggle
 *  de soporte pasan todos por `requirePermiso("equipo")`.
 *
 *  Consecuencia buscada: el soporte de Codexy no puede darse más permisos que
 *  los que tiene, ni fabricarse una identidad dentro del consultorio. Para
 *  cambiar accesos está el dueño, que es de quien son los datos. */
const NEGADOS_A_SOPORTE: ReadonlySet<Permiso> = new Set<Permiso>(["notas_clinicas", "equipo"]);

/** Qué puede hacer alguien de soporte: todo lo operativo menos lo de arriba.
 *  Es un tope duro: no se puede ampliar desde ninguna pantalla. */
export function puedeSoporte(p: Permiso): boolean {
  return !NEGADOS_A_SOPORTE.has(p);
}

/** Duración de una sesión de soporte, en segundos: más corta que una normal
 *  (12 h). Se aplica al maxAge de la cookie en app/api/admin/route.ts. */
export const TTL_SOPORTE_SEG = 60 * 60; // 1 hora
