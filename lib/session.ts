import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { readToken, SESSION_COOKIE } from "./auth";
import { TENANT_HEADER, esMultiTenant, esTenantConocido } from "./tenant";
import { sesionActiva, permisosDe, suscripcionDe } from "./accounts";
import { dentroDelLimite, puedeEscribir, type Limites, type Suscripcion } from "./planes";
import { tienePermiso, type Permiso, type Rol } from "./permisos";

/** Sesión resuelta: quién es y qué puede hacer en ESTE consultorio. */
export interface Sesion {
  /** consultorio (professional_id) */
  pid: string | null;
  /** usuario; null en la ventana legacy (consultorio sin cuentas todavía) */
  userId: string | null;
  sessionId: string | null;
  rol: Rol;
  puede: (p: Permiso) => boolean;
  /** true si entró con la contraseña vieja del consultorio (sin cuenta propia) */
  legacy: boolean;
  /** true si es una sesión de SOPORTE de Codexy (se muestra un cartel en el panel) */
  soporte?: boolean;
}

/** Tenant (professional_id) del request actual, según el header que puso el proxy. */
export async function tenantDelRequest(): Promise<string | null> {
  let pid: string | null = null;
  try {
    pid = (await headers()).get(TENANT_HEADER);
  } catch {
    pid = null;
  }
  if (pid) return esTenantConocido(pid) ? pid : null;
  if (esMultiTenant()) return null;
  return (process.env.PROFESSIONAL_ID || "").trim().toLowerCase() || null;
}

// Caché corta del chequeo de revocación/membresía: evita ir al almacén de
// identidad en cada request. Consecuencia: revocar una sesión tarda hasta 60s
// en cortar (documentado en docs/SEGURIDAD.md).
const CACHE_MS = 60_000;
const cache = new Map<string, { hasta: number; ok: boolean; rol: Rol; permisos: (p: Permiso) => boolean; soporte?: boolean }>();

/** ÚNICA verificación de sesión del lado servidor. Valida:
 *   1. la cookie firmada (y que el tenant coincida con el host),
 *   2. que la sesión no esté revocada y la membresía siga activa,
 *   3. devuelve el rol y los permisos efectivos.
 *  Devuelve null si no hay sesión válida (null es falsy: los call sites que
 *  hacen `if (!(await sesionValida()))` siguen funcionando igual). */
export async function sesionValida(): Promise<Sesion | null> {
  const pid = await tenantDelRequest();
  if (esMultiTenant() && !pid) return null;

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  let claims;
  try {
    claims = await readToken(token, pid ?? undefined);
  } catch {
    return null; // falta ADMIN_SECRET u otro error → no autenticado
  }
  if (!claims) return null;

  // Ventana legacy: sesión abierta con la contraseña del consultorio, sin cuenta
  // individual. Tiene acceso completo (es como funcionaba antes), pero sin
  // trazabilidad. Se apaga solo cuando el consultorio crea su primera cuenta.
  if (claims.uid === "-" || claims.sid === "-") {
    return {
      pid,
      userId: null,
      sessionId: null,
      rol: "owner",
      puede: () => true,
      legacy: true,
    };
  }

  const clave = `${claims.sid}:${claims.uid}:${pid}`;
  const hit = cache.get(clave);
  const ahora = Date.now();
  if (hit && hit.hasta > ahora) {
    if (!hit.ok) return null;
    return { pid, userId: claims.uid, sessionId: claims.sid, rol: hit.rol, puede: hit.permisos, legacy: false, soporte: hit.soporte };
  }

  try {
    const viva = await sesionActiva(claims.sid, claims.uid, pid!);
    if (!viva) {
      cache.set(clave, { hasta: ahora + CACHE_MS, ok: false, rol: "asistente", permisos: () => false });
      return null;
    }
    const perm = await permisosDe(claims.uid, pid!);
    if (!perm) {
      cache.set(clave, { hasta: ahora + CACHE_MS, ok: false, rol: "asistente", permisos: () => false });
      return null;
    }
    cache.set(clave, { hasta: ahora + CACHE_MS, ok: true, rol: perm.rol, permisos: perm.puede, soporte: perm.soporte });
    return { pid, userId: claims.uid, sessionId: claims.sid, rol: perm.rol, puede: perm.puede, legacy: false, soporte: perm.soporte };
  } catch (e) {
    console.error("[session] error verificando la sesión:", e);
    return null; // fail-closed
  }
}

/** Atajo para server actions: lanza si no hay sesión. */
export async function requireSesion(): Promise<Sesion> {
  const s = await sesionValida();
  if (!s) throw new Error("No autorizado");
  return s;
}

/** Exige un permiso concreto. Usar en las server actions de cada sección. */
export async function requirePermiso(p: Permiso): Promise<Sesion> {
  const s = await requireSesion();
  if (!s.puede(p)) throw new Error("No tenés permiso para hacer esto.");
  return s;
}

/** Exige permiso Y que la suscripción permita escribir.
 *
 *  Va aparte de `requirePermiso` a propósito: el permiso es "quién sos", la
 *  suscripción es "cómo está la cuenta". Mezclarlos haría que un problema de
 *  facturación se reporte como falta de permisos.
 *
 *  Se usa sólo en las acciones que CREAN o MODIFICAN. Leer, buscar y exportar
 *  quedan siempre abiertos: son historias clínicas de pacientes en tratamiento,
 *  y no se le corta a un profesional el acceso a sus propios registros por una
 *  factura. La regla está también en docs/planes. */
export async function requireEscritura(p: Permiso): Promise<Sesion> {
  const s = await requirePermiso(p);
  if (!s.pid) return s;
  const sus = await suscripcionDe(s.pid);
  if (!puedeEscribir(sus)) {
    throw new Error(
      "Tu cuenta está en modo solo lectura. Podés consultar y exportar todo; " +
        "para volver a cargar datos, escribinos y lo resolvemos."
    );
  }
  return s;
}

/** ¿Le queda cupo a este consultorio para agregar uno más de `recurso`?
 *
 *  Se pregunta desde la acción que crea, no desde el store: el límite es de la
 *  plataforma (qué plan pagás) y el store guarda dominio (qué cargaste). Meter
 *  planes dentro del store mezclaría las dos cosas.
 *
 *  Devuelve el motivo redactado para el usuario cuando no hay cupo. */
export async function hayCupo(
  pid: string,
  recurso: keyof Limites,
  usoActual: number
): Promise<{ ok: true } | { ok: false; motivo: string }> {
  const sus = await suscripcionDe(pid);
  const r = dentroDelLimite(sus, recurso, usoActual);
  if (r.ok) return { ok: true };
  return {
    ok: false,
    motivo: `${r.motivo} Ya tenés ${usoActual}. Escribinos y lo ampliamos en el momento.`,
  };
}

/** Estado de suscripción del consultorio actual, para mostrarlo en el panel. */
export async function suscripcionActual(): Promise<Suscripcion | null> {
  const pid = await tenantDelRequest();
  if (!pid) return null;
  try {
    return await suscripcionDe(pid);
  } catch {
    return null;
  }
}

/** Versión booleana para route handlers (que responden 401/403 en vez de lanzar). */
export async function puede(p: Permiso): Promise<boolean> {
  const s = await sesionValida();
  return !!s && s.puede(p);
}

/** Defensa en profundidad para las páginas del panel: además del proxy,
 *  re-verificamos en el árbol de Server Components (los bypass de middleware son
 *  un vector real — CVE-2025-29927). Si falta el permiso, manda al panel. */
export async function requireAdmin(permiso?: Permiso): Promise<Sesion> {
  const s = await sesionValida();
  if (!s) redirect("/admin/login");
  if (permiso && !s.puede(permiso)) redirect("/admin");
  return s;
}

export { tienePermiso };
