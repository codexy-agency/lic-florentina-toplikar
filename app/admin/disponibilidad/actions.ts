"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { saveDisponibilidad, getScheduling, setExceptions } from "@/lib/store";
import { verifyToken, SESSION_COOKIE } from "@/lib/auth";
import { randomUUID } from "crypto";
import type {
  AvailabilityRule,
  SchedulingConfig,
  DateException,
  Modalidad,
} from "@/lib/scheduling/types";

interface Payload {
  config: SchedulingConfig;
  rules: Array<Omit<AvailabilityRule, "id">>;
  blockedDates: string[];
}

export async function guardarDisponibilidad(payload: Payload) {
  // Defensa en profundidad (además del middleware)
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifyToken(token))) throw new Error("No autorizado");

  const slotDurationMin = clampInt(payload.config.slotDurationMin, 10, 240, 50);
  const config: SchedulingConfig = {
    slotDurationMin,
    // el intervalo no puede ser menor que la duración (si no, se solapan raro)
    slotIntervalMin: clampInt(payload.config.slotIntervalMin, slotDurationMin, 480, 60),
    bufferAfterMin: clampInt(payload.config.bufferAfterMin, 0, 120, 0),
    minNoticeHours: clampInt(payload.config.minNoticeHours, 0, 168, 24),
    bookingWindowDays: clampInt(payload.config.bookingWindowDays, 1, 120, 30),
  };

  const rules: AvailabilityRule[] = payload.rules
    .filter((r) => valid(r.startTime) && valid(r.endTime) && r.startTime < r.endTime)
    .map((r) => ({
      id: randomUUID(),
      weekday: clampInt(r.weekday, 0, 6, 1),
      startTime: r.startTime,
      endTime: r.endTime,
      modalidad: (r.modalidad === "presencial" ? "presencial" : "online") as Modalidad,
    }));

  const exceptions: DateException[] = (payload.blockedDates || [])
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .map((d) => ({ id: randomUUID(), date: d, type: "block_day" as const }));

  try {
    await saveDisponibilidad({ config, rules, exceptions });
  } catch (e) {
    console.error("[disponibilidad] guardar:", e);
    throw new Error("No se pudo guardar la disponibilidad. Reintentá.");
  }
  revalidatePath("/admin/disponibilidad");
  revalidatePath("/admin");
}

/**
 * Bloqueo de días que se aplica AL INSTANTE (no espera al "Guardar disponibilidad").
 * Reemplaza la lista de bloqueos (block_day) preservando otras excepciones.
 * Resuelve la confusión de "lo bloqueé pero sigue apareciendo el horario".
 */
export async function setBloqueos(dates: string[]) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifyToken(token))) throw new Error("No autorizado");

  const limpias = [
    ...new Set((dates || []).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))),
  ].sort();

  const { exceptions } = await getScheduling();
  const otras = exceptions.filter((e) => e.type !== "block_day");
  const bloqueos: DateException[] = limpias.map((d) => ({
    id: randomUUID(),
    date: d,
    type: "block_day" as const,
  }));

  try {
    await setExceptions([...otras, ...bloqueos]);
  } catch (e) {
    console.error("[disponibilidad] setBloqueos:", e);
    throw new Error("No se pudo actualizar los días bloqueados.");
  }
  revalidatePath("/admin/disponibilidad");
  revalidatePath("/admin");
}

function clampInt(v: unknown, min: number, max: number, def: number) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, n));
}
function valid(t: string) {
  return /^\d{2}:\d{2}$/.test(t);
}
