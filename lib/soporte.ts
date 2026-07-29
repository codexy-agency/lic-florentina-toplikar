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

/** Qué puede hacer alguien de soporte: todo lo operativo MENOS la historia
 *  clínica. Es un tope duro: no se puede ampliar desde ninguna pantalla. */
export function puedeSoporte(p: Permiso): boolean {
  if (p === "notas_clinicas") return false;
  return true;
}

/** Duración de una sesión de soporte: más corta que una normal (12 h). */
export const TTL_SOPORTE_MS = 60 * 60 * 1000; // 1 hora
