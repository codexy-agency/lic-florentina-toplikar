// Casos de uso de cuentas. Acá viven las reglas de autorización.
import { randomUUID } from "crypto";
import {
  leerAuth,
  mutarAuth,
  logAudit,
  normalizarEmail,
  type AppUser,
  type Membership,
} from "./accounts-store";
import { hashPassword, verifyPassword, necesitaRehash, DUMMY_HASH, validarPassword } from "./passwords";
import { permisosPorRol, normalizarPermisos, esRolValido, type Permiso, type Rol, tienePermiso } from "./permisos";
import { esEmailDeSoporte, puedeSoporte, ROL_SOPORTE, TTL_SOPORTE_SEG } from "./soporte";
import { normalizarSuscripcion, suscripcionPorDefecto, type Suscripcion } from "./planes";

// Anti-fuerza-bruta POR CUENTA (además del rate-limit por IP del endpoint).
const MAX_INTENTOS = 8;
const BLOQUEO_MS = 15 * 60_000;

export interface LoginOk {
  ok: true;
  user: AppUser;
  membership: Membership;
  sessionId: string;
  /** true si entró por el camino de soporte de Codexy (sin membresía).
   *  El llamador lo usa para darle a la cookie el TTL corto. */
  soporte?: boolean;
}
export interface LoginError {
  ok: false;
  error: string;
  /** segundos a esperar, si está bloqueado por intentos */
  retryAfter?: number;
}

/** ¿Este consultorio ya tiene cuentas? Mientras no tenga, se acepta la
 *  contraseña vieja de ADMIN_PASSWORDS (ventana de transición). */
export async function tieneCuentas(professionalId: string): Promise<boolean> {
  const db = await leerAuth();
  return db.memberships.some((m) => m.professionalId === professionalId && m.activo);
}

/** ¿Este consultorio permite el acceso de soporte de Codexy? Por defecto sí
 *  (para poder ayudar), y el cliente lo puede apagar desde su panel. */
export async function soporteHabilitado(professionalId: string): Promise<boolean> {
  const db = await leerAuth();
  return db.soporte?.[professionalId] !== false;
}

export async function setSoporteHabilitado(
  professionalId: string,
  habilitado: boolean,
  porUserId?: string
): Promise<void> {
  await mutarAuth((d) => {
    d.soporte[professionalId] = habilitado;
  });
  await logAudit({
    userId: porUserId,
    professionalId,
    accion: habilitado ? "soporte_habilitado" : "soporte_deshabilitado",
  });
}

// ─────────────────────────── Suscripción ───────────────────────────
// Lo que Codexy le cobra al psicólogo. Se lee mucho (una vez por request) y se
// escribe poco (cuando entra un pago), así que vive en el mismo blob de
// identidad, con el patrón del toggle de soporte.

/** Suscripción de un consultorio. Si no tiene registro, arranca en prueba: un
 *  consultorio sin dato administrativo casi siempre es uno recién creado, y no
 *  se deja a nadie afuera de su agenda por eso. */
export async function suscripcionDe(professionalId: string): Promise<Suscripcion> {
  const db = await leerAuth();
  const s = db.suscripciones?.[professionalId];
  return s ? normalizarSuscripcion(s) : suscripcionPorDefecto();
}

/** Escribe la suscripción. La usa el panel de Codexy (y, más adelante, el
 *  webhook de la pasarela: mismos campos, sin tocar nada más). */
export async function setSuscripcion(
  professionalId: string,
  cambios: Partial<Omit<Suscripcion, "actualizadoEn">>,
  porUserId?: string
): Promise<Suscripcion> {
  const actualizada = await mutarAuth((d) => {
    const previa = d.suscripciones[professionalId]
      ? normalizarSuscripcion(d.suscripciones[professionalId])
      : suscripcionPorDefecto();
    const nueva = normalizarSuscripcion({
      ...previa,
      ...cambios,
      actualizadoEn: new Date().toISOString(),
    });
    d.suscripciones[professionalId] = nueva;
    return nueva;
  });
  await logAudit({
    userId: porUserId,
    professionalId,
    accion: "suscripcion_cambiada",
    meta: { plan: actualizada.plan, estado: actualizada.estado, moneda: actualizada.moneda },
  });
  return actualizada;
}

/** Todos los consultorios con suscripción, para el panel de Codexy. */
export async function listarSuscripciones(): Promise<
  { professionalId: string; suscripcion: Suscripcion; miembros: number }[]
> {
  const db = await leerAuth();
  const pids = new Set<string>([
    ...Object.keys(db.suscripciones || {}),
    ...db.memberships.filter((m) => m.activo).map((m) => m.professionalId),
  ]);
  return [...pids]
    .map((pid) => ({
      professionalId: pid,
      suscripcion: db.suscripciones?.[pid]
        ? normalizarSuscripcion(db.suscripciones[pid])
        : suscripcionPorDefecto(),
      miembros: db.memberships.filter((m) => m.professionalId === pid && m.activo).length,
    }))
    .sort((a, b) => a.professionalId.localeCompare(b.professionalId));
}

/** Login por email + contraseña, siempre dentro de UN consultorio. */
export async function login(
  emailRaw: string,
  password: string,
  professionalId: string,
  meta?: { userAgent?: string }
): Promise<LoginOk | LoginError> {
  const email = normalizarEmail(emailRaw);
  const clave = `${professionalId}:${email}`;
  const db = await leerAuth();

  // 1) Bloqueo por intentos fallidos (persistente, no solo en memoria).
  const t = db.throttle[clave];
  if (t?.bloqueadoHasta && new Date(t.bloqueadoHasta).getTime() > Date.now()) {
    const retryAfter = Math.ceil((new Date(t.bloqueadoHasta).getTime() - Date.now()) / 1000);
    return { ok: false, error: "Demasiados intentos. Probá de nuevo en unos minutos.", retryAfter };
  }

  // 2) Buscar usuario y membresía ACTIVA en ESTE consultorio.
  const user = db.users.find((u) => u.email === email && u.activo);
  const membership = user
    ? db.memberships.find((m) => m.userId === user.id && m.professionalId === professionalId && m.activo)
    : undefined;

  // 3) Verificar SIEMPRE (contra un hash señuelo si no existe) para que el tiempo
  //    de respuesta no revele si el email tiene cuenta en este consultorio.
  const hash = user ? db.credentials[user.id]?.hash : undefined;
  const okPass = await verifyPassword(password, hash || DUMMY_HASH);

  // ACCESO DE SOPORTE: alguien del equipo de Codexy entrando a ayudar. No tiene
  // membresía en este consultorio, pero sí cuenta propia y contraseña válida.
  // Solo si el consultorio lo permite (lo puede apagar desde su panel).
  const esSoporte = !membership && !!user && !!hash && okPass && esEmailDeSoporte(email);
  if (esSoporte) {
    if (!(await soporteHabilitado(professionalId))) {
      await logAudit({ professionalId, accion: "soporte_rechazado", meta: { email } });
      return { ok: false, error: "Este consultorio tiene el soporte desactivado." };
    }
    const sessionId = randomUUID();
    await mutarAuth((d) => {
      delete d.throttle[clave];
      d.sesiones.unshift({
        id: sessionId,
        userId: user!.id,
        professionalId,
        creadoEn: new Date().toISOString(),
        userAgent: meta?.userAgent?.slice(0, 200),
      });
    });
    // Queda registrado para que el cliente lo vea en Equipo → Actividad.
    await logAudit({ userId: user!.id, professionalId, accion: "soporte_ingreso", meta: { email } });
    return {
      ok: true,
      user: user!,
      membership: {
        id: "soporte",
        userId: user!.id,
        professionalId,
        rol: ROL_SOPORTE,
        permisos: {},
        activo: true,
        creadoEn: new Date().toISOString(),
      },
      sessionId,
      soporte: true,
    };
  }

  if (!user || !membership || !hash || !okPass) {
    await registrarFallo(clave);
    await logAudit({
      professionalId,
      accion: "login_fallido",
      meta: { email, motivo: !user ? "sin_usuario" : !membership ? "sin_membresia" : "password" },
    });
    return { ok: false, error: "Email o contraseña incorrectos." };
  }

  // 4) Éxito: limpiar throttle, crear sesión y rehashear si el costo quedó viejo.
  const sessionId = randomUUID();
  await mutarAuth(async (d) => {
    delete d.throttle[clave];
    d.sesiones.unshift({
      id: sessionId,
      userId: user.id,
      professionalId,
      creadoEn: new Date().toISOString(),
      userAgent: meta?.userAgent?.slice(0, 200),
    });
    if (d.sesiones.length > 500) d.sesiones.length = 500;
    if (necesitaRehash(hash)) {
      d.credentials[user.id] = { hash: await hashPassword(password), actualizadoEn: new Date().toISOString() };
    }
  });
  await logAudit({ userId: user.id, professionalId, accion: "login", meta: { email } });
  return { ok: true, user, membership, sessionId };
}

async function registrarFallo(clave: string): Promise<void> {
  await mutarAuth((d) => {
    const prev = d.throttle[clave];
    const intentos = (prev?.intentos || 0) + 1;
    d.throttle[clave] = {
      intentos,
      ultimoIntento: new Date().toISOString(),
      bloqueadoHasta:
        intentos >= MAX_INTENTOS ? new Date(Date.now() + BLOQUEO_MS).toISOString() : prev?.bloqueadoHasta,
    };
  });
}

/** ¿La sesión sigue viva? (no revocada y con membresía activa). */
export async function sesionActiva(sessionId: string, userId: string, professionalId: string): Promise<boolean> {
  const db = await leerAuth();
  const s = db.sesiones.find((x) => x.id === sessionId);
  if (!s || s.revocadaEn || s.userId !== userId || s.professionalId !== professionalId) return false;
  if (db.memberships.some((m) => m.userId === userId && m.professionalId === professionalId && m.activo)) return true;
  // Sesión de soporte: sin membresía, pero con email habilitado y permiso del cliente.
  const u = db.users.find((x) => x.id === userId && x.activo);
  if (!u || !esEmailDeSoporte(u.email)) return false;
  // El TTL corto se valida ACÁ, no en la cookie: el maxAge del navegador es una
  // sugerencia, y si alguien copió el token seguiría siendo válido sin esto.
  if (Date.parse(s.creadoEn) + TTL_SOPORTE_SEG * 1000 < Date.now()) return false;
  return soporteHabilitado(professionalId);
}

export async function revocarSesion(sessionId: string): Promise<void> {
  await mutarAuth((d) => {
    const s = d.sesiones.find((x) => x.id === sessionId);
    if (s && !s.revocadaEn) s.revocadaEn = new Date().toISOString();
  });
}

/** Permisos efectivos de un usuario en un consultorio. */
export async function permisosDe(userId: string, professionalId: string): Promise<{
  rol: Rol;
  puede: (p: Permiso) => boolean;
  soporte?: boolean;
} | null> {
  const db = await leerAuth();
  const m = db.memberships.find((x) => x.userId === userId && x.professionalId === professionalId && x.activo);
  if (m) return { rol: m.rol, puede: (p: Permiso) => tienePermiso(m.rol, m.permisos, p) };

  // Sin membresía: puede ser una sesión de SOPORTE de Codexy.
  const u = db.users.find((x) => x.id === userId && x.activo);
  if (u && esEmailDeSoporte(u.email) && (await soporteHabilitado(professionalId))) {
    return { rol: ROL_SOPORTE, puede: puedeSoporte, soporte: true };
  }
  return null;
}

export interface MiembroEquipo {
  user: AppUser;
  membership: Membership;
}

/** Equipo de un consultorio. */
export async function listarEquipo(professionalId: string): Promise<MiembroEquipo[]> {
  const db = await leerAuth();
  return db.memberships
    .filter((m) => m.professionalId === professionalId)
    .map((m) => {
      const user = db.users.find((u) => u.id === m.userId);
      return user ? { user, membership: m } : null;
    })
    .filter((x): x is MiembroEquipo => !!x)
    .sort((a, b) => (a.membership.creadoEn < b.membership.creadoEn ? -1 : 1));
}

/** Crea (o reutiliza) una persona y le da acceso a un consultorio.
 *  La identidad es GLOBAL por email: si ya existe, se le suma la membresía. */
export async function crearMiembro(input: {
  email: string;
  nombre: string;
  password: string;
  rol: Rol;
  professionalId: string;
  permisos?: unknown;
  porUserId?: string;
}): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const email = normalizarEmail(input.email);
  if (!email.includes("@")) return { ok: false, error: "Email inválido." };
  if (!input.nombre?.trim()) return { ok: false, error: "Falta el nombre." };
  if (!esRolValido(input.rol)) return { ok: false, error: "Rol inválido." };
  const malPass = validarPassword(input.password);
  if (malPass) return { ok: false, error: malPass };

  const hash = await hashPassword(input.password);
  const res = await mutarAuth((d) => {
    let user = d.users.find((u) => u.email === email);
    if (!user) {
      user = {
        id: randomUUID(),
        email,
        nombre: input.nombre.trim().slice(0, 120),
        activo: true,
        creadoEn: new Date().toISOString(),
      };
      d.users.unshift(user);
      d.credentials[user.id] = { hash, actualizadoEn: new Date().toISOString() };
    }
    const yaEsta = d.memberships.find(
      (m) => m.userId === user!.id && m.professionalId === input.professionalId
    );
    if (yaEsta) {
      if (yaEsta.activo) return { ok: false as const, error: "Esa persona ya tiene acceso a este consultorio." };
      yaEsta.activo = true;
      yaEsta.rol = input.rol;
      yaEsta.permisos = normalizarPermisos(input.permisos ?? permisosPorRol(input.rol));
      return { ok: true as const, userId: user!.id };
    }
    d.memberships.unshift({
      id: randomUUID(),
      userId: user.id,
      professionalId: input.professionalId,
      rol: input.rol,
      permisos: normalizarPermisos(input.permisos ?? permisosPorRol(input.rol)),
      activo: true,
      creadoEn: new Date().toISOString(),
    });
    return { ok: true as const, userId: user.id };
  });

  if (res.ok) {
    await logAudit({
      userId: input.porUserId,
      professionalId: input.professionalId,
      accion: "miembro_creado",
      entidad: "usuario",
      entidadId: res.userId,
      meta: { email, rol: input.rol },
    });
  }
  return res;
}

/** Quita el acceso de una persona a un consultorio (no borra la persona). */
export async function revocarAcceso(
  userId: string,
  professionalId: string,
  porUserId?: string
): Promise<{ ok: boolean; error?: string }> {
  const res = await mutarAuth((d) => {
    const m = d.memberships.find((x) => x.userId === userId && x.professionalId === professionalId && x.activo);
    if (!m) return { ok: false, error: "Esa persona no tiene acceso." };
    // Un consultorio no puede quedarse sin dueño.
    if (m.rol === "owner") {
      const owners = d.memberships.filter(
        (x) => x.professionalId === professionalId && x.activo && x.rol === "owner"
      );
      if (owners.length <= 1) return { ok: false, error: "No podés quitar al único dueño del consultorio." };
    }
    m.activo = false;
    // Cortar sus sesiones abiertas en ESTE consultorio.
    for (const s of d.sesiones) {
      if (s.userId === userId && s.professionalId === professionalId && !s.revocadaEn) {
        s.revocadaEn = new Date().toISOString();
      }
    }
    return { ok: true };
  });
  if (res.ok) {
    await logAudit({
      userId: porUserId,
      professionalId,
      accion: "acceso_revocado",
      entidad: "usuario",
      entidadId: userId,
    });
  }
  return res;
}

/** Cambia la contraseña de una persona (la propia, o la de otro si sos owner). */
export async function cambiarPassword(
  userId: string,
  nueva: string,
  porUserId?: string,
  professionalId?: string
): Promise<{ ok: boolean; error?: string }> {
  const mal = validarPassword(nueva);
  if (mal) return { ok: false, error: mal };
  const hash = await hashPassword(nueva);
  await mutarAuth((d) => {
    d.credentials[userId] = { hash, actualizadoEn: new Date().toISOString() };
    // Cambiar la contraseña cierra las demás sesiones de esa persona.
    for (const s of d.sesiones) {
      if (s.userId === userId && !s.revocadaEn) s.revocadaEn = new Date().toISOString();
    }
  });
  await logAudit({
    userId: porUserId,
    professionalId,
    accion: "password_cambiada",
    entidad: "usuario",
    entidadId: userId,
  });
  return { ok: true };
}
