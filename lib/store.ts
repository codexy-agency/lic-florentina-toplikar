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

  const movimientos: Movimiento[] = turnos
    .map((t) => ({
      id: t.id,
      nombre: t.nombre,
      serviceName: t.serviceName,
      staffName: t.staffName,
      fecha: t.startsAt,
      monto: t.precio ?? 0,
      pagado: !!t.pagado,
      metodoPago: t.metodoPago,
      estado: t.estado,
    }))
    .sort((a, b) => ((a.fecha || "") < (b.fecha || "") ? 1 : -1));

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
    ticketProm: turnos.length ? Math.round(facturado / turnos.length) : 0,
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
