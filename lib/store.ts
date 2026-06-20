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

export type { Service, Staff } from "./scheduling/types";

export type Estado = "pendiente" | "confirmado" | "rechazado" | "realizado";

export interface Solicitud {
  id: string;
  nombre: string;
  contacto: string;
  modalidad: string;
  serviceId?: string; // servicio elegido
  serviceName?: string; // snapshot del nombre (no depende de que el servicio siga existiendo)
  staffId?: string; // profesional elegida
  staffName?: string; // snapshot
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
  notas: string;
  creadoEn: string;
}

interface Scheduling {
  config: SchedulingConfig;
  rules: AvailabilityRule[];
  exceptions: DateException[];
}

interface DB {
  solicitudes: Solicitud[];
  pacientes: Paciente[];
  services: Service[];
  staff: Staff[];
  scheduling: Scheduling;
}

const DB_PATH = path.join(process.cwd(), "data", "db.json");

function emptyDB(): DB {
  return {
    solicitudes: [],
    pacientes: [],
    services: [],
    staff: [],
    scheduling: { config: DEFAULT_CONFIG, rules: [], exceptions: [] },
  };
}

async function read(): Promise<DB> {
  let raw: string;
  try {
    raw = await fs.readFile(DB_PATH, "utf-8");
  } catch {
    return emptyDB(); // archivo no existe → base vacía
  }
  const db = JSON.parse(raw); // si está corrupto, que lance (no perder datos en silencio)
  return {
    solicitudes: db.solicitudes ?? [],
    pacientes: db.pacientes ?? [],
    services: db.services ?? [],
    staff: db.staff ?? [],
    scheduling: {
      config: { ...DEFAULT_CONFIG, ...(db.scheduling?.config ?? {}) },
      rules: db.scheduling?.rules ?? [],
      exceptions: db.scheduling?.exceptions ?? [],
    },
  };
}

async function writeAtomic(db: DB): Promise<void> {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  const tmp = `${DB_PATH}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf-8");
  await fs.rename(tmp, DB_PATH); // rename es atómico en el mismo FS
}

// Cola: serializa las mutaciones (read-modify-write) para que no se pisen.
let queue: Promise<unknown> = Promise.resolve();
function mutate<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  const next = queue.then(async () => {
    const db = await read();
    const result = await fn(db);
    await writeAtomic(db);
    return result;
  });
  queue = next.catch(() => {});
  return next;
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

export async function setEstado(
  solicitudId: string,
  estado: Estado,
  startsAt?: string,
  endsAt?: string
): Promise<Solicitud | null> {
  return mutate((db) => {
    const s = db.solicitudes.find((x) => x.id === solicitudId);
    if (!s) return null;
    s.estado = estado;
    if (startsAt) s.startsAt = startsAt;
    if (endsAt) s.endsAt = endsAt;
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
  return db.solicitudes
    .filter(
      (s) =>
        (s.estado === "pendiente" || s.estado === "confirmado") &&
        s.startsAt &&
        s.endsAt &&
        (!staffId || s.staffId === staffId)
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
  return {
    services: db.services.filter((s) => s.activo),
    staff: db.staff.filter((s) => s.activo),
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
