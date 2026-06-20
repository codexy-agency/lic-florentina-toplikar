// Tipos del motor de reservas. Modelan 1:1 las futuras tablas de Supabase,
// así la migración es cambiar la implementación del repo, no estos contratos.

export type Modalidad = "online" | "presencial";

/** Regla semanal recurrente. weekday: 0=domingo … 6=sábado (hora local AR). */
export interface AvailabilityRule {
  id: string;
  weekday: number; // 0-6
  startTime: string; // "09:00" wall-clock AR
  endTime: string; // "13:00"
  modalidad: Modalidad;
}

/** Ajustes globales del profesional. */
export interface SchedulingConfig {
  slotDurationMin: number; // duración de la sesión, ej 50
  slotIntervalMin: number; // cada cuánto ARRANCA un turno (grilla), ej 60 → en hora redonda
  bufferAfterMin: number; // legacy: descanso. Ya no define la grilla (ver slotIntervalMin)
  minNoticeHours: number; // anticipación mínima reservable, ej 24
  bookingWindowDays: number; // ventana a futuro, ej 30
}

/** Excepción por fecha concreta (gana sobre las reglas semanales). */
export interface DateException {
  id: string;
  date: string; // "2026-07-09" fecha local AR
  type: "block_day" | "extra";
  startTime?: string; // para "extra"
  endTime?: string;
  modalidad?: Modalidad;
  reason?: string;
}

/** Un horario concreto ofrecido al paciente. */
export interface Slot {
  startsAt: string; // ISO con offset -03:00
  endsAt: string;
  modalidad: Modalidad;
}

/** Día con sus slots libres (para el selector público). */
export interface DaySlots {
  date: string; // "2026-07-15" AR
  label: string; // "Mar 15 jul"
  slots: Slot[];
}

/** Rango ocupado (turno/solicitud que reserva el horario). */
export interface BusyRange {
  startsAt: string;
  endsAt: string;
  staffId?: string; // de quién es el turno (para no bloquear a otras profesionales)
}

/** Servicio ofrecido (ej. "Sesión individual"). Define duración y precio. */
export interface Service {
  id: string;
  nombre: string;
  durationMin: number; // duración propia de este servicio
  priceARS?: number; // precio de referencia (opcional)
  descripcion?: string;
  activo: boolean;
}

/** Profesional que atiende (staff dentro del negocio/tenant). */
export interface Staff {
  id: string;
  nombre: string;
  titulo?: string; // ej. "Psicóloga · MP 7321"
  bio?: string;
  serviceIds: string[]; // qué servicios ofrece
  color?: string; // acento del avatar, ej "#C9A227"
  imageUrl?: string; // foto de perfil (URL); si falta, se usa el avatar con inicial
  activo: boolean;
}

export const DEFAULT_CONFIG: SchedulingConfig = {
  slotDurationMin: 50,
  slotIntervalMin: 60,
  bufferAfterMin: 0,
  minNoticeHours: 24,
  bookingWindowDays: 30,
};
