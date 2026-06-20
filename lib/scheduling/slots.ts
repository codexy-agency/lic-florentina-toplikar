// Motor de generación de slots — FUNCIÓN PURA y testeable.
// Zona horaria: Argentina (UTC-3 fijo; el país no aplica DST hoy).
// Si vuelve el horario de verano, se reemplaza este módulo por una versión
// TZ-aware (luxon/Temporal) sin tocar el resto del sistema.
import type {
  AvailabilityRule,
  SchedulingConfig,
  DateException,
  Slot,
  DaySlots,
  BusyRange,
  Modalidad,
} from "./types";

const AR_OFFSET_H = -3; // UTC-3
const DAY_MS = 86_400_000;
const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Componentes wall-clock AR de un instante. */
function arWall(t: Date) {
  const ar = new Date(t.getTime() + AR_OFFSET_H * 3_600_000); // restar 3h
  return {
    y: ar.getUTCFullYear(),
    m: ar.getUTCMonth(),
    d: ar.getUTCDate(),
    hh: ar.getUTCHours(),
    mm: ar.getUTCMinutes(),
    weekday: ar.getUTCDay(),
  };
}

/** Instante (Date) de fecha AR (y,m0,d) + hora "HH:MM" AR. */
function arInstant(y: number, m0: number, d: number, hhmm: string): Date {
  const [h, min] = hhmm.split(":").map(Number);
  // 09:00 AR (UTC-3) = 12:00 UTC → sumar 3h
  return new Date(Date.UTC(y, m0, d, h - AR_OFFSET_H, min, 0, 0));
}

function isoAR(y: number, m0: number, d: number, hh: number, mm: number): string {
  return `${y}-${pad(m0 + 1)}-${pad(d)}T${pad(hh)}:${pad(mm)}:00-03:00`;
}

function dateKey(y: number, m0: number, d: number) {
  return `${y}-${pad(m0 + 1)}-${pad(d)}`;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd; // rangos semiabiertos [start, end)
}

interface Args {
  now?: Date;
  daysAhead?: number;
  modalidad?: Modalidad;
  durationMin?: number; // override de duración (del servicio elegido)
  rules: AvailabilityRule[];
  config: SchedulingConfig;
  exceptions: DateException[];
  busy: BusyRange[];
}

/** Días con slots libres dentro de la ventana de reserva. */
export function getAvailableSlots({
  now = new Date(),
  daysAhead,
  modalidad,
  durationMin,
  rules,
  config,
  exceptions,
  busy,
}: Args): DaySlots[] {
  const earliest = now.getTime() + config.minNoticeHours * 3_600_000;
  const window = Math.min(daysAhead ?? config.bookingWindowDays, config.bookingWindowDays);
  const slotMin = durationMin && durationMin > 0 ? durationMin : config.slotDurationMin;
  const busyRanges = busy.map(
    (b) => [new Date(b.startsAt).getTime(), new Date(b.endsAt).getTime()] as const
  );
  const today = arWall(now);
  const out: DaySlots[] = [];

  for (let i = 0; i <= window; i++) {
    // Avanzar i días sobre la fecha AR de hoy (mediodía UTC evita bordes).
    const probe = new Date(Date.UTC(today.y, today.m, today.d, 12) + i * DAY_MS);
    const day = arWall(probe);
    const key = dateKey(day.y, day.m, day.d);

    const dayExc = exceptions.filter((e) => e.date === key);
    if (dayExc.some((e) => e.type === "block_day")) continue;

    let franjas = rules
      .filter((r) => r.weekday === day.weekday)
      .map((r) => ({ desde: r.startTime, hasta: r.endTime, mod: r.modalidad }));
    for (const ex of dayExc) {
      if (ex.type === "extra" && ex.startTime && ex.endTime) {
        franjas.push({ desde: ex.startTime, hasta: ex.endTime, mod: ex.modalidad ?? "online" });
      }
    }
    if (modalidad) franjas = franjas.filter((f) => f.mod === modalidad);
    if (!franjas.length) continue;

    // La grilla la define el INTERVALO (cada cuánto arranca un turno), no la
    // duración: así los turnos quedan en horarios redondos sin desfasaje.
    const interval =
      config.slotIntervalMin && config.slotIntervalMin > 0
        ? config.slotIntervalMin
        : slotMin;
    const step = interval * 60_000;
    const dur = slotMin * 60_000;
    const slots: Slot[] = [];

    for (const f of franjas) {
      const fStart = arInstant(day.y, day.m, day.d, f.desde).getTime();
      const fEnd = arInstant(day.y, day.m, day.d, f.hasta).getTime();
      for (let s = fStart; s + dur <= fEnd; s += step) {
        const e = s + dur;
        if (s < earliest) continue;
        if (busyRanges.some(([bs, be]) => overlaps(s, e, bs, be))) continue;
        const ws = arWall(new Date(s));
        const we = arWall(new Date(e));
        slots.push({
          startsAt: isoAR(ws.y, ws.m, ws.d, ws.hh, ws.mm),
          endsAt: isoAR(we.y, we.m, we.d, we.hh, we.mm),
          modalidad: f.mod,
        });
      }
    }
    if (slots.length) {
      slots.sort((a, b) => (a.startsAt < b.startsAt ? -1 : 1));
      out.push({ date: key, label: `${DIAS[day.weekday]} ${day.d} ${MESES[day.m]}`, slots });
    }
  }
  return out;
}

/** Hora AR "HH:MM" de un ISO de slot. */
export function horaAR(iso: string): string {
  const w = arWall(new Date(iso));
  return `${pad(w.hh)}:${pad(w.mm)}`;
}

/** "Mar 15 jul · 14:00" de un ISO. */
export function fechaHoraAR(iso: string): string {
  const w = arWall(new Date(iso));
  return `${DIAS[w.weekday]} ${w.d} ${MESES[w.m]} · ${pad(w.hh)}:${pad(w.mm)}`;
}

/** "2026-06-20T14:00" (datetime-local, hora AR) → ISO "…-03:00". "" si inválido. */
export function arLocalToIso(local: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!m) return "";
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00-03:00`;
}

/** ISO de fin = inicio + duración (minutos), en pared AR. */
export function endFromStart(startIso: string, durationMin: number): string {
  const e = new Date(new Date(startIso).getTime() + durationMin * 60_000);
  const w = arWall(e);
  return isoAR(w.y, w.m, w.d, w.hh, w.mm);
}

/** Valor para <input type="datetime-local"> a partir de un ISO AR. */
export function isoToArLocal(iso: string): string {
  const w = arWall(new Date(iso));
  return `${w.y}-${pad(w.m + 1)}-${pad(w.d)}T${pad(w.hh)}:${pad(w.mm)}`;
}
