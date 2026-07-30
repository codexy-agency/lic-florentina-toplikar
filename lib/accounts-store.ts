// Almacén de IDENTIDAD (cuentas, membresías, sesiones, auditoría).
//
// Va SEPARADO de lib/store.ts a propósito:
//  - La identidad es CROSS-TENANT ("¿a qué consultorios pertenece este email?"),
//    y el store de dominio guarda un blob POR consultorio: no puede responder eso.
//  - El login no debe tocar (ni bloquear con su lock optimista) el documento que
//    contiene la historia clínica.
//
// Adaptador dual, igual que el store de dominio:
//  - Modo ARCHIVO  → data/auth.json (un único archivo global). Dev/local.
//  - Modo SUPABASE → tablas dedicadas con service_role (ver migración 0006).

import { promises as fs } from "fs";
import { randomUUID } from "crypto";
import path from "path";
import { getServiceClient, supabaseConfigurado } from "./supabase";
import type { Permisos, Rol } from "./permisos";
import type { Suscripcion } from "./planes";
import { podar } from "./poda";
import { avisarSinEsperar } from "./alertas";

export interface AppUser {
  id: string;
  email: string; // siempre en minúsculas
  nombre: string;
  activo: boolean;
  creadoEn: string;
}

export interface Membership {
  id: string;
  userId: string;
  professionalId: string; // el consultorio (tenant)
  rol: Rol;
  permisos: Permisos;
  activo: boolean;
  creadoEn: string;
}

export interface Sesion {
  id: string;
  userId: string;
  professionalId: string;
  creadoEn: string;
  revocadaEn?: string;
  userAgent?: string;
}

export interface AuditEntry {
  id: string;
  ts: string;
  userId?: string;
  professionalId?: string;
  accion: string;
  entidad?: string;
  entidadId?: string;
  /** NUNCA guardar acá contenido clínico (motivo de consulta, notas). */
  meta?: Record<string, unknown>;
}

interface Throttle {
  intentos: number;
  bloqueadoHasta?: string;
  ultimoIntento: string;
}

interface AuthDB {
  users: AppUser[];
  credentials: Record<string, { hash: string; actualizadoEn: string }>;
  memberships: Membership[];
  sesiones: Sesion[];
  throttle: Record<string, Throttle>;
  audit: AuditEntry[];
  /** Acceso de soporte de Codexy por consultorio. Ausente = habilitado. */
  soporte: Record<string, boolean>;
  /** Suscripción por consultorio: qué plan tiene y si está al día.
   *  Va acá y no en el blob de dominio porque es dato de la PLATAFORMA, no del
   *  consultorio: lo escribe Codexy, no el psicólogo. */
  suscripciones: Record<string, Suscripcion>;
  /** Consumo del asistente IA: "<pid>:<AAAA-MM>" -> mensajes. Se poda a 3 meses. */
  usoAsistente: Record<string, number>;
}

function vacia(): AuthDB {
  return { users: [], credentials: {}, memberships: [], sesiones: [], throttle: {}, audit: [], soporte: {}, suscripciones: {}, usoAsistente: {} };
}

/** Campos que NUNCA deben persistir en un usuario, aunque estén en el blob.
 *  `passwordTemporal` se guardaba en texto plano y nadie la borraba: se limpia
 *  acá, así el próximo write la saca del almacén sin necesidad de migración. */
function limpiarUsuario(u: AppUser): AppUser {
  if ("passwordTemporal" in (u as object)) {
    const copia = { ...u } as AppUser & { passwordTemporal?: string };
    delete copia.passwordTemporal;
    return copia;
  }
  return u;
}

/** Igual que normalize() en lib/store.ts, y por la misma razón: arranca de
 *  `{...raw}` y PISA lo conocido, en vez de reconstruir con claves fijas.
 *
 *  Acá el descuido costaba caro. Durante un deploy conviven instancias vieja y
 *  nueva; si la vieja hace un ciclo leer-modificar-escribir, todo lo que su
 *  versión no conozca desaparece del blob. Las tres claves nuevas —`soporte`,
 *  `suscripciones` y `usoAsistente`— son justamente las que no se pueden
 *  perder:
 *
 *   - borrar `soporte` REACTIVA el acceso de soporte en los consultorios que lo
 *     habían apagado (ausente = habilitado, ver soporteHabilitado);
 *   - borrar `suscripciones` deja a todos los clientes de vuelta en "prueba", y
 *     no hay forma de reconstruir quién pagó;
 *   - borrar `usoAsistente` regala el cupo del mes.
 *
 *  Conservar lo desconocido es siempre la opción segura: un campo de más no
 *  rompe nada, uno de menos sí. */
function normalizar(raw: Partial<AuthDB> | null | undefined): AuthDB {
  const d = raw || {};
  return {
    ...d,
    users: Array.isArray(d.users) ? d.users.map(limpiarUsuario) : [],
    credentials: d.credentials && typeof d.credentials === "object" ? d.credentials : {},
    memberships: Array.isArray(d.memberships) ? d.memberships : [],
    sesiones: Array.isArray(d.sesiones) ? d.sesiones : [],
    throttle: d.throttle && typeof d.throttle === "object" ? d.throttle : {},
    audit: Array.isArray(d.audit) ? d.audit : [],
    soporte: d.soporte && typeof d.soporte === "object" ? d.soporte : {},
    suscripciones: d.suscripciones && typeof d.suscripciones === "object" ? d.suscripciones : {},
    usoAsistente: d.usoAsistente && typeof d.usoAsistente === "object" ? d.usoAsistente : {},
  };
}

export const normalizarEmail = (e: string) => (e || "").trim().toLowerCase();

// ───────────────────────────── Modo ARCHIVO ─────────────────────────────
const AUTH_PATH = path.join(process.cwd(), "data", "auth.json");

async function fileRead(): Promise<AuthDB> {
  try {
    return normalizar(JSON.parse(await fs.readFile(AUTH_PATH, "utf-8")));
  } catch {
    return vacia();
  }
}

async function fileWrite(db: AuthDB): Promise<void> {
  await fs.mkdir(path.dirname(AUTH_PATH), { recursive: true });
  const tmp = `${AUTH_PATH}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf-8");
  await fs.rename(tmp, AUTH_PATH); // atómico en el mismo FS
}

// ──────────────────────────── Modo SUPABASE ────────────────────────────
// Tabla única `auth_state` con un blob (mismo patrón probado que app_state) para
// no depender de que las tablas relacionales estén aplicadas. La migración 0006
// crea las tablas normalizadas; este adaptador usa el blob mientras tanto y se
// puede cambiar por dentro sin tocar los llamadores.
const AUTH_ROW = "identidad";

async function sbRead(): Promise<{ db: AuthDB; rev: number }> {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("auth_state")
    .select("data, rev")
    .eq("id", AUTH_ROW)
    .maybeSingle();
  if (error) {
    console.error("[accounts] sbRead:", error.message);
    throw error;
  }
  if (!data) return { db: vacia(), rev: 0 };
  return { db: normalizar((data.data ?? {}) as Partial<AuthDB>), rev: Number(data.rev) || 0 };
}

async function sbWrite(db: AuthDB, rev: number): Promise<boolean> {
  const sb = getServiceClient();
  if (rev === 0) {
    const { error } = await sb.from("auth_state").insert({ id: AUTH_ROW, data: db, rev: 1 });
    if (error) {
      if ((error as { code?: string }).code === "23505") return false; // ya existía
      console.error("[accounts] sbWrite insert:", error.message);
      throw error;
    }
    return true;
  }
  const { data, error } = await sb
    .from("auth_state")
    .update({ data: db, rev: rev + 1, updated_at: new Date().toISOString() })
    .eq("id", AUTH_ROW)
    .eq("rev", rev)
    .select("rev");
  if (error) {
    console.error("[accounts] sbWrite update:", error.message);
    throw error;
  }
  return Array.isArray(data) && data.length > 0;
}

// ─────────────────────────── Lectura / mutación ───────────────────────────
export async function leerAuth(): Promise<AuthDB> {
  if (supabaseConfigurado) return (await sbRead()).db;
  return fileRead();
}

let cola: Promise<unknown> = Promise.resolve();

/** Mutación serializada con lock optimista (mismo patrón que el store de dominio). */
export function mutarAuth<T>(fn: (db: AuthDB) => T | Promise<T>): Promise<T> {
  const next = cola.then(async () => {
    if (supabaseConfigurado) {
      for (let intento = 0; intento < 10; intento++) {
        if (intento > 0) {
          await new Promise((r) => setTimeout(r, 25 * 2 ** Math.min(intento, 5) + Math.random() * 40));
        }
        const { db, rev } = await sbRead();
        const res = await fn(db);
        podar(db);
        if (await sbWrite(db, rev)) return res;
      }
      // 10 intentos agotados sobre la fila única de identidad: alguien no puede
      // entrar, o quedó a medias un cambio de accesos.
      avisarSinEsperar("S1", "Conflicto de concurrencia en el almacén de identidad", {
        extra: "10 reintentos agotados sobre auth_state. Un login o un cambio de acceso falló.",
      });
      throw new Error("No se pudo guardar la cuenta: conflicto de concurrencia.");
    }
    const db = await fileRead();
    const res = await fn(db);
    podar(db);
    await fileWrite(db);
    return res;
  });
  cola = next.catch(() => {});
  return next;
}

// ───────────────────────────── Auditoría ─────────────────────────────

/** Registra una acción. `meta` NUNCA debe llevar contenido clínico. */
export async function logAudit(e: Omit<AuditEntry, "id" | "ts">): Promise<void> {
  try {
    await mutarAuth((db) => {
      db.audit.unshift({ ...e, id: randomUUID(), ts: new Date().toISOString() });
      // La poda por consultorio corre sola en mutarAuth.
    });
  } catch (err) {
    // La auditoría nunca debe tumbar la operación principal.
    console.error("[accounts] logAudit:", err);
  }
}
