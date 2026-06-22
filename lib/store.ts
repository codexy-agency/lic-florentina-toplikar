// Capa de datos del MVP — persistencia en archivo JSON con escritura ATÓMICA
// y cola de escritura (evita la condición de carrera detectada en la auditoría).
// Firmas estables: migrar a Supabase = cambiar SOLO la implementación interna.
import { promises as fs } from "fs";
import { randomUUID } from "crypto";
import path from "path";
import {
  type AvailabilityRule,
  type SchedulingConfig,
  type DateException,
  type BusyRange,
  type Service,
  type Staff,
  DEFAULT_CONFIG,
} from "./scheduling/types";
import {
  getServiceClient,
  supabaseConfigurado,
  assertBackendConfigOk,
  PROFESSIONAL_ID,
} from "./supabase";
import { endFromStart } from "./scheduling/slots";

export type { Service, Staff } from "./scheduling/types";

export type Estado =
  | "pendiente"
  | "confirmado"
  | "rechazado"
  | "realizado"
  | "no_asistio";

export interface Solicitud {
  id: string;
  nombre: string;
  contacto: string;
  modalidad: string;
  serviceId?: string; // servicio elegido
  serviceName?: string; // snapshot del nombre (no depende de que el servicio siga existiendo)
  staffId?: string; // profesional elegida
  staffName?: string; // snapshot
  precio?: number; // snapshot del precio del servicio al reservar (ARS)
  pagado?: boolean;
  metodoPago?: string; // efectivo | transferencia | mercadopago | tarjeta
  fechaPago?: string; // ISO
  startsAt?: string; // slot elegido (ISO -03:00)
  endsAt?: string;
  preferencia: string; // fallback si no hay slots
  motivo: string;
  estado: Estado;
  creadoEn: string;
}

export interface Paciente {
  id: string;
  nombre: string;
  contacto: string;
  modalidad: string;
  notas: string; // ficha / resumen fijo
  creadoEn: string;
}

/** Nota de la historia clínica (evolución). Modela la tabla clinical_notes. */
export interface NotaClinica {
  id: string;
  patientId: string;
  fecha: string; // fecha de la sesión/nota (ISO, editable)
  titulo?: string; // título opcional (ej: "Primera consulta", "Sesión 3")
  contenido: string;
  creadoEn: string;
}

interface Scheduling {
  config: SchedulingConfig;
  rules: AvailabilityRule[];
  exceptions: DateException[];
}

/** Ingreso cargado a mano (plata que cobra en el consultorio, fuera del sistema
 *  de reservas). Cuenta como ya cobrado. */
export interface MovimientoManual {
  id: string;
  concepto: string;
  monto: number;
  fecha: string; // ISO
  creadoEn: string;
}

interface DB {
  solicitudes: Solicitud[];
  pacientes: Paciente[];
  notasClinicas: NotaClinica[];
  services: Service[];
  staff: Staff[];
  scheduling: Scheduling;
  movimientosManuales: MovimientoManual[];
}

const DB_PATH = path.join(process.cwd(), "data", "db.json");

function emptyDB(): DB {
  return {
    solicitudes: [],
    pacientes: [],
    notasClinicas: [],
    services: [],
    staff: [],
    scheduling: { config: DEFAULT_CONFIG, rules: [], exceptions: [] },
    movimientosManuales: [],
  };
}

function mergeConfig(stored: Partial<SchedulingConfig>): SchedulingConfig {
  const config = { ...DEFAULT_CONFIG, ...stored };
  // Migración: configs viejas sin "slotIntervalMin" preservan su espaciado
  // anterior (duración + descanso) para no cambiar los horarios de golpe.
  if (stored.slotIntervalMin == null) {
    config.slotIntervalMin =
      (stored.slotDurationMin ?? DEFAULT_CONFIG.slotDurationMin) +
      (stored.bufferAfterMin ?? 0);
  }
  return config;
}

/** Aplica defaults/migraciones a un objeto crudo (de archivo o de Supabase). */
function normalize(raw: Partial<DB> & { scheduling?: Partial<Scheduling> }): DB {
  return {
    solicitudes: raw.solicitudes ?? [],
    pacientes: raw.pacientes ?? [],
    notasClinicas: raw.notasClinicas ?? [],
    services: raw.services ?? [],
    staff: raw.staff ?? [],
    scheduling: {
      config: mergeConfig(raw.scheduling?.config ?? {}),
      rules: raw.scheduling?.rules ?? [],
      exceptions: raw.scheduling?.exceptions ?? [],
    },
    movimientosManuales: raw.movimientosManuales ?? [],
  };
}

// ── Persistencia en ARCHIVO (local / fallback) ──
async function fileRead(): Promise<DB> {
  let raw: string;
  try {
    raw = await fs.readFile(DB_PATH, "utf-8");
  } catch {
    return emptyDB(); // archivo no existe → base vacía
  }
  return normalize(JSON.parse(raw)); // si está corrupto, que lance
}

async function fileWrite(db: DB): Promise<void> {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  const tmp = `${DB_PATH}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf-8");
  await fs.rename(tmp, DB_PATH); // rename es atómico en el mismo FS
}

// ── Persistencia en SUPABASE (JSONB versionado, escritura atómica) ──
async function sbRead(): Promise<{ db: DB; rev: number }> {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("app_state")
    .select("data, rev")
    .eq("professional_id", PROFESSIONAL_ID)
    .maybeSingle();
  if (error) {
    console.error("[supabase] sbRead error:", error.message);
    throw error;
  }
  if (!data) return { db: emptyDB(), rev: 0 };
  return { db: normalize((data.data ?? {}) as Partial<DB>), rev: Number(data.rev) || 0 };
}

/** Escribe SOLO si rev no cambió (optimistic lock). false = conflicto → reintentar. */
async function sbWrite(db: DB, rev: number): Promise<boolean> {
  const sb = getServiceClient();
  if (rev === 0) {
    const { error } = await sb
      .from("app_state")
      .insert({ professional_id: PROFESSIONAL_ID, data: db, rev: 1 });
    if (error) {
      const code = (error as { code?: string }).code;
      if (code === "23505") return false; // ya existía → conflicto recuperable
      if (code === "23503") {
        // FK: el PROFESSIONAL_ID no existe en professionals (env mal configurada)
        console.error(
          `[supabase] sbWrite: PROFESSIONAL_ID '${PROFESSIONAL_ID}' no existe en professionals. Revisá la env var.`
        );
      } else {
        console.error("[supabase] sbWrite insert error:", error.message);
      }
      throw error;
    }
    return true;
  }
  const { data, error } = await sb
    .from("app_state")
    .update({ data: db, rev: rev + 1, updated_at: new Date().toISOString() })
    .eq("professional_id", PROFESSIONAL_ID)
    .eq("rev", rev)
    .select("rev");
  if (error) {
    console.error("[supabase] sbWrite update error:", error.message);
    throw error;
  }
  return Array.isArray(data) && data.length > 0; // 0 filas = rev cambió = conflicto
}

// Lectura (no mutante): despacha a Supabase o archivo.
async function read(): Promise<DB> {
  assertBackendConfigOk();
  if (supabaseConfigurado) return (await sbRead()).db;
  return fileRead();
}

// Cola: serializa las mutaciones (read-modify-write) para que no se pisen DENTRO
// de una instancia. Entre instancias serverless, el rev (optimistic lock) evita
// que dos escrituras concurrentes se pisen (reintenta el ciclo completo).
let queue: Promise<unknown> = Promise.resolve();
function mutate<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  const next = queue.then(async () => {
    assertBackendConfigOk();
    if (supabaseConfigurado) {
      for (let intento = 0; intento < 6; intento++) {
        const { db, rev } = await sbRead();
        const result = await fn(db);
        if (await sbWrite(db, rev)) return result;
        // conflicto de rev → re-leer y re-aplicar contra el estado más fresco
      }
      throw new Error("No se pudo guardar: conflicto de concurrencia (6 intentos).");
    }
    const db = await fileRead();
    const result = await fn(db);
    await fileWrite(db);
    return result;
  });
  queue = next.catch(() => {});
  return next;
}

// Una reserva sin confirmar deja de "ocupar" su horario tras 48h: así no queda
// un slot squatteado para siempre por alguien que reservó y nunca se confirmó
// (la profesional confirma/rechaza dentro de ese plazo en la práctica).
const PENDING_HOLD_MS = 48 * 60 * 60 * 1000;

/** ¿Esta solicitud sigue reservando su horario? Confirmados, siempre; pendientes,
 *  solo dentro de PENDING_HOLD_MS desde que se crearon. Centraliza el criterio
 *  para que el cálculo de slots y los anti-solape coincidan (si no, un slot
 *  podría verse libre pero rechazar la reserva, o al revés). */
function holdActivo(s: Solicitud, now = Date.now()): boolean {
  if (s.estado === "confirmado") return true;
  if (s.estado !== "pendiente") return false;
  const t = new Date(s.creadoEn).getTime();
  // creadoEn corrupto (NaN): mantenemos el hold (fail-safe hacia NO overbookear).
  // Sólo ocurre con datos corruptos externos; el flujo normal siempre setea ISO.
  return Number.isFinite(t) ? now - t < PENDING_HOLD_MS : true;
}

/** ¿Un turno con staffId `a` ocupa la agenda de la profesional `b`? Criterio
 *  ÚNICO usado por getBusy y por los anti-solape (si difieren, un slot puede
 *  verse libre pero la reserva ser rechazada). Un turno sin profesional asignada
 *  ocupa a todas; consultar sin profesional mira la agenda completa. */
function mismoStaff(a?: string, b?: string): boolean {
  return !a || !b || a === b;
}

// ───────────────────────── Solicitudes / Pacientes ─────────────────────────

export async function listSolicitudes(): Promise<Solicitud[]> {
  const db = await read();
  return [...db.solicitudes].sort((a, b) =>
    a.creadoEn < b.creadoEn ? 1 : a.creadoEn > b.creadoEn ? -1 : 0
  );
}

export async function listPacientes(): Promise<Paciente[]> {
  const db = await read();
  return [...db.pacientes].sort((a, b) =>
    a.creadoEn < b.creadoEn ? 1 : a.creadoEn > b.creadoEn ? -1 : 0
  );
}

export async function getPaciente(id: string): Promise<Paciente | null> {
  const db = await read();
  return db.pacientes.find((p) => p.id === id) ?? null;
}

/** Crea un paciente a mano. Si ya existe ese contacto, devuelve el existente. */
export async function addPaciente(input: {
  nombre: string;
  contacto: string;
  modalidad?: string;
  notas?: string;
}): Promise<Paciente> {
  return mutate((db) => {
    const key = input.contacto.trim().toLowerCase();
    const existe = db.pacientes.find((p) => p.contacto.trim().toLowerCase() === key);
    if (existe) return existe;
    const p: Paciente = {
      id: randomUUID(),
      nombre: input.nombre,
      contacto: input.contacto,
      modalidad: input.modalidad || "online",
      notas: input.notas || "",
      creadoEn: new Date().toISOString(),
    };
    db.pacientes.unshift(p);
    return p;
  });
}

/** Turnos del paciente (match por contacto normalizado). */
export async function getPacienteTurnos(contacto: string): Promise<Solicitud[]> {
  const key = contacto.trim().toLowerCase();
  const db = await read();
  return db.solicitudes
    .filter((s) => s.contacto.trim().toLowerCase() === key)
    .sort(
      (a, b) =>
        new Date(b.startsAt || b.creadoEn).getTime() -
        new Date(a.startsAt || a.creadoEn).getTime()
    );
}

export async function updatePacienteFicha(id: string, notas: string): Promise<void> {
  await mutate((db) => {
    const p = db.pacientes.find((x) => x.id === id);
    if (p) p.notas = notas;
  });
}

// ── Historia clínica (notas por paciente) ──

export async function listNotas(patientId: string): Promise<NotaClinica[]> {
  const db = await read();
  // Orden por instante real (admite mezcla de formatos ISO) y desempate estable
  // por creadoEn, para notas con la misma fecha (más nueva primero).
  return db.notasClinicas
    .filter((n) => n.patientId === patientId)
    .sort(
      (a, b) =>
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime() ||
        new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime()
    );
}

export async function addNota(
  patientId: string,
  contenido: string,
  fecha?: string,
  titulo?: string
): Promise<NotaClinica> {
  return mutate((db) => {
    const n: NotaClinica = {
      id: randomUUID(),
      patientId,
      fecha: fecha || new Date().toISOString(),
      titulo: titulo || undefined,
      contenido,
      creadoEn: new Date().toISOString(),
    };
    db.notasClinicas.unshift(n);
    return n;
  });
}

export async function removeNota(id: string): Promise<void> {
  await mutate((db) => {
    db.notasClinicas = db.notasClinicas.filter((n) => n.id !== id);
  });
}

export async function addSolicitud(
  input: Omit<Solicitud, "id" | "estado" | "creadoEn">
): Promise<Solicitud> {
  return mutate((db) => {
    const s: Solicitud = {
      ...input,
      id: randomUUID(),
      estado: "pendiente",
      creadoEn: new Date().toISOString(),
    };
    db.solicitudes.unshift(s);
    return s;
  });
}

/** Inserta la solicitud SOLO si el slot sigue libre para esa profesional.
 *  El chequeo de solape y el insert ocurren en la MISMA sección crítica (cola
 *  mutate), eliminando el TOCTOU del check-then-insert. Devuelve null si choca. */
export async function addSolicitudSiLibre(
  input: Omit<Solicitud, "id" | "estado" | "creadoEn">
): Promise<Solicitud | null> {
  return mutate((db) => {
    if (input.startsAt && input.endsAt) {
      const s = new Date(input.startsAt).getTime();
      const e = new Date(input.endsAt).getTime();
      const choca = db.solicitudes.some((x) => {
        if (!holdActivo(x)) return false;
        if (!mismoStaff(x.staffId, input.staffId)) return false;
        if (!x.startsAt || !x.endsAt) return false;
        const bs = new Date(x.startsAt).getTime();
        const be = new Date(x.endsAt).getTime();
        return s < be && bs < e;
      });
      if (choca) return null;
    }
    const sol: Solicitud = {
      ...input,
      id: randomUUID(),
      estado: "pendiente",
      creadoEn: new Date().toISOString(),
    };
    db.solicitudes.unshift(sol);
    return sol;
  });
}

/** Agenda un turno a mano (desde el panel): lo crea YA confirmado y registra al
 *  paciente, todo en una sola operación atómica con chequeo de solape. */
export async function crearTurnoManual(input: {
  nombre: string;
  contacto: string;
  modalidad: string;
  serviceId?: string;
  serviceName?: string;
  staffId?: string;
  staffName?: string;
  precio?: number;
  startsAt: string;
  endsAt: string;
}): Promise<Solicitud | null> {
  return mutate((db) => {
    const s = new Date(input.startsAt).getTime();
    const e = new Date(input.endsAt).getTime();
    const choca = db.solicitudes.some((x) => {
      if (!holdActivo(x)) return false;
      if (!mismoStaff(x.staffId, input.staffId)) return false;
      if (!x.startsAt || !x.endsAt) return false;
      const bs = new Date(x.startsAt).getTime();
      const be = new Date(x.endsAt).getTime();
      return s < be && bs < e;
    });
    if (choca) return null;
    const sol: Solicitud = {
      ...input,
      preferencia: "",
      motivo: "",
      id: randomUUID(),
      estado: "confirmado",
      creadoEn: new Date().toISOString(),
    };
    db.solicitudes.unshift(sol);
    const key = input.contacto.trim().toLowerCase();
    if (!db.pacientes.find((p) => p.contacto.trim().toLowerCase() === key)) {
      db.pacientes.unshift({
        id: randomUUID(),
        nombre: input.nombre,
        contacto: input.contacto,
        modalidad: input.modalidad,
        notas: "",
        creadoEn: new Date().toISOString(),
      });
    }
    return sol;
  });
}

export async function setEstado(
  solicitudId: string,
  estado: Estado,
  startsAt?: string,
  endsAt?: string
): Promise<Solicitud | null> {
  return mutate((db) => {
    const s = db.solicitudes.find((x) => x.id === solicitudId);
    if (!s) return null;

    // Fin del turno: lo recalculamos según la duración REAL del servicio (no la
    // global), corrigiendo el endsAt que venía calculado con slotDurationMin.
    let ns = s.startsAt;
    let ne = s.endsAt;
    if (startsAt) {
      ns = startsAt;
      const svc = s.serviceId ? db.services.find((x) => x.id === s.serviceId) : undefined;
      const dur = svc?.durationMin ?? db.scheduling.config.slotDurationMin;
      ne = endFromStart(startsAt, dur);
    } else if (endsAt) {
      ne = endsAt;
    }

    // Anti doble-booking: confirmar/reprogramar NO puede pisar otro turno YA
    // confirmado de la misma profesional (mismo criterio que la reserva pública).
    if (estado === "confirmado" && ns && ne) {
      const sMs = new Date(ns).getTime();
      const eMs = new Date(ne).getTime();
      const choca = db.solicitudes.some((x) => {
        if (x.id === s.id) return false;
        if (x.estado !== "confirmado") return false;
        if (!mismoStaff(x.staffId, s.staffId)) return false;
        if (!x.startsAt || !x.endsAt) return false;
        const bs = new Date(x.startsAt).getTime();
        const be = new Date(x.endsAt).getTime();
        return sMs < be && bs < eMs;
      });
      if (choca) {
        throw new Error("Ese horario se superpone con otro turno confirmado. Elegí otro.");
      }
    }

    s.estado = estado;
    s.startsAt = ns;
    s.endsAt = ne;
    // Si se rechaza un turno que estaba cobrado, se anula el pago (no queda
    // plata "cobrada" sobre un turno que no va a suceder).
    if (estado === "rechazado" && s.pagado) {
      s.pagado = false;
      s.metodoPago = undefined;
      s.fechaPago = undefined;
    }
    if (estado === "confirmado") {
      const key = s.contacto.trim().toLowerCase();
      const existe = db.pacientes.find((p) => p.contacto.trim().toLowerCase() === key);
      if (!existe) {
        db.pacientes.unshift({
          id: randomUUID(),
          nombre: s.nombre,
          contacto: s.contacto,
          modalidad: s.modalidad,
          notas: "",
          creadoEn: new Date().toISOString(),
        });
      }
    }
    return s;
  });
}

export async function stats() {
  const db = await read();
  return {
    pendientes: db.solicitudes.filter((s) => s.estado === "pendiente").length,
    confirmados: db.solicitudes.filter((s) => s.estado === "confirmado").length,
    pacientes: db.pacientes.length,
  };
}

/** Rangos ocupados: solicitudes con slot en estado pendiente/confirmado.
 *  Si se pasa staffId, devuelve SOLO los de esa profesional (dos profesionales
 *  pueden tener el mismo horario sin pisarse). */
export async function getBusy(staffId?: string): Promise<BusyRange[]> {
  const db = await read();
  const now = Date.now();
  return db.solicitudes
    .filter(
      (s) =>
        holdActivo(s, now) &&
        s.startsAt &&
        s.endsAt &&
        mismoStaff(s.staffId, staffId)
    )
    .map((s) => ({ startsAt: s.startsAt!, endsAt: s.endsAt!, staffId: s.staffId }));
}

// ───────────────────────── Servicios / Profesionales ─────────────────────────

export async function listServices(soloActivos = false): Promise<Service[]> {
  const db = await read();
  const list = soloActivos ? db.services.filter((s) => s.activo) : db.services;
  return [...list];
}

export async function saveServices(services: Service[]): Promise<void> {
  await mutate((db) => {
    db.services = services;
    // Integridad referencial: al borrar un servicio, sacamos su id de cada
    // staff.serviceIds para no acumular referencias muertas.
    const ids = new Set(services.map((s) => s.id));
    db.staff = db.staff.map((st) => ({
      ...st,
      serviceIds: st.serviceIds.filter((id) => ids.has(id)),
    }));
  });
}

export async function listStaff(soloActivos = false): Promise<Staff[]> {
  const db = await read();
  const list = soloActivos ? db.staff.filter((s) => s.activo) : db.staff;
  return [...list];
}

export async function saveStaff(staff: Staff[]): Promise<void> {
  await mutate((db) => {
    db.staff = staff;
  });
}

/** Config pública para el wizard de reserva: servicios activos + quién los hace. */
export async function getBookingConfig(): Promise<{
  services: Service[];
  staff: Staff[];
}> {
  const db = await read();
  const staff = db.staff.filter((s) => s.activo);
  return {
    // Solo servicios activos Y que tenga al menos una profesional activa que los
    // ofrezca: si no, el wizard mostraría un servicio que al elegirlo no tiene
    // con quién agendarse (callejón sin salida en el paso "Profesional").
    services: db.services.filter(
      (s) => s.activo && staff.some((st) => st.serviceIds.includes(s.id))
    ),
    staff,
  };
}

// ───────────────────────── Finanzas / Pagos ─────────────────────────

const MESES_CORTO = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

export interface Movimiento {
  id: string;
  nombre: string;
  serviceName?: string;
  staffName?: string;
  fecha?: string; // startsAt
  monto: number;
  pagado: boolean;
  metodoPago?: string;
  estado: Estado;
  manual?: boolean; // ingreso cargado a mano (consultorio)
}

export async function addMovimientoManual(input: {
  concepto: string;
  monto: number;
  fecha?: string;
}): Promise<MovimientoManual> {
  return mutate((db) => {
    const m: MovimientoManual = {
      id: randomUUID(),
      concepto: input.concepto,
      monto: input.monto,
      fecha: input.fecha || new Date().toISOString(),
      creadoEn: new Date().toISOString(),
    };
    db.movimientosManuales.unshift(m);
    return m;
  });
}

export async function removeMovimientoManual(id: string): Promise<void> {
  await mutate((db) => {
    db.movimientosManuales = db.movimientosManuales.filter((m) => m.id !== id);
  });
}

export interface FinanzasResumen {
  facturado: number; // total esperado (turnos confirmados/realizados)
  cobrado: number; // total ya pagado
  porCobrar: number;
  cantTurnos: number;
  cantCobrados: number;
  ticketProm: number;
  porServicio: { nombre: string; cantidad: number; monto: number; cobrado: number }[];
  porProfesional: { nombre: string; cantidad: number; monto: number; cobrado: number }[];
  porMes: { key: string; label: string; facturado: number; cobrado: number }[];
  movimientos: Movimiento[];
}

/** Marca/desmarca un turno como pagado. */
export async function setPago(
  id: string,
  pagado: boolean,
  metodo?: string
): Promise<Solicitud | null> {
  return mutate((db) => {
    const s = db.solicitudes.find((x) => x.id === id);
    if (!s) return null;
    s.pagado = pagado;
    if (pagado) {
      s.metodoPago = metodo || s.metodoPago || "efectivo";
      s.fechaPago = new Date().toISOString();
    } else {
      s.fechaPago = undefined;
    }
    return s;
  });
}

export async function getFinanzas(): Promise<FinanzasResumen> {
  const db = await read();
  const turnos = db.solicitudes.filter(
    (s) => s.estado === "confirmado" || s.estado === "realizado"
  );

  let facturado = 0;
  let cobrado = 0;
  let cantCobrados = 0;
  const svc = new Map<string, { cantidad: number; monto: number; cobrado: number }>();
  const prof = new Map<string, { cantidad: number; monto: number; cobrado: number }>();
  const mes = new Map<string, { facturado: number; cobrado: number }>();

  for (const t of turnos) {
    const monto = t.precio ?? 0;
    facturado += monto;
    if (t.pagado) {
      cobrado += monto;
      cantCobrados++;
    }
    const sName = t.serviceName || "Sin servicio";
    const a = svc.get(sName) || { cantidad: 0, monto: 0, cobrado: 0 };
    a.cantidad++;
    a.monto += monto;
    if (t.pagado) a.cobrado += monto;
    svc.set(sName, a);

    const pName = t.staffName || "—";
    const b = prof.get(pName) || { cantidad: 0, monto: 0, cobrado: 0 };
    b.cantidad++;
    b.monto += monto;
    if (t.pagado) b.cobrado += monto;
    prof.set(pName, b);

    if (t.startsAt) {
      const key = t.startsAt.slice(0, 7); // "2026-06"
      const m = mes.get(key) || { facturado: 0, cobrado: 0 };
      m.facturado += monto;
      if (t.pagado) m.cobrado += monto;
      mes.set(key, m);
    }
  }

  // Ingresos cargados a mano (consultorio): cuentan como cobrado y facturado,
  // pero NO entran al ticket promedio por turno (no son turnos).
  const facturadoTurnos = facturado;
  for (const m of db.movimientosManuales) {
    facturado += m.monto;
    cobrado += m.monto;
    const key = (m.fecha || "").slice(0, 7);
    if (key) {
      const mm = mes.get(key) || { facturado: 0, cobrado: 0 };
      mm.facturado += m.monto;
      mm.cobrado += m.monto;
      mes.set(key, mm);
    }
  }

  const movimientos: Movimiento[] = [
    ...turnos.map((t) => ({
      id: t.id,
      nombre: t.nombre,
      serviceName: t.serviceName,
      staffName: t.staffName,
      fecha: t.startsAt,
      monto: t.precio ?? 0,
      pagado: !!t.pagado,
      metodoPago: t.metodoPago,
      estado: t.estado,
    })),
    ...db.movimientosManuales.map((m) => ({
      id: m.id,
      nombre: m.concepto,
      fecha: m.fecha,
      monto: m.monto,
      pagado: true,
      metodoPago: "manual",
      estado: "realizado" as Estado,
      manual: true,
    })),
  ].sort((a, b) => ((a.fecha || "") < (b.fecha || "") ? 1 : -1));

  const porMes = [...mes.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .slice(-6)
    .map(([key, v]) => {
      const [y, mm] = key.split("-");
      return {
        key,
        label: `${MESES_CORTO[Number(mm) - 1]} ${y}`,
        facturado: v.facturado,
        cobrado: v.cobrado,
      };
    });

  return {
    facturado,
    cobrado,
    porCobrar: facturado - cobrado,
    cantTurnos: turnos.length,
    cantCobrados,
    ticketProm: turnos.length ? Math.round(facturadoTurnos / turnos.length) : 0,
    porServicio: [...svc.entries()]
      .map(([nombre, v]) => ({ nombre, ...v }))
      .sort((a, b) => b.monto - a.monto),
    porProfesional: [...prof.entries()]
      .map(([nombre, v]) => ({ nombre, ...v }))
      .sort((a, b) => b.monto - a.monto),
    porMes,
    movimientos,
  };
}

// ───────────────────────── Disponibilidad (config) ─────────────────────────

export async function getScheduling(): Promise<Scheduling> {
  return (await read()).scheduling;
}

export async function saveConfig(config: SchedulingConfig): Promise<void> {
  await mutate((db) => {
    db.scheduling.config = config;
  });
}

/** Guarda config + rules + exceptions en UN SOLO write atómico (no 3 sueltos).
 *  Evita estados inconsistentes si una de las 3 escrituras falla. */
export async function saveDisponibilidad(input: {
  config: SchedulingConfig;
  rules: AvailabilityRule[];
  exceptions: DateException[];
}): Promise<void> {
  await mutate((db) => {
    db.scheduling.config = input.config;
    db.scheduling.rules = input.rules;
    db.scheduling.exceptions = input.exceptions;
  });
}

export async function saveRules(rules: AvailabilityRule[]): Promise<void> {
  await mutate((db) => {
    db.scheduling.rules = rules;
  });
}

export async function addException(ex: Omit<DateException, "id">): Promise<void> {
  await mutate((db) => {
    db.scheduling.exceptions.unshift({ ...ex, id: randomUUID() });
  });
}

export async function removeException(id: string): Promise<void> {
  await mutate((db) => {
    db.scheduling.exceptions = db.scheduling.exceptions.filter((e) => e.id !== id);
  });
}

export async function setExceptions(list: DateException[]): Promise<void> {
  await mutate((db) => {
    db.scheduling.exceptions = list;
  });
}
