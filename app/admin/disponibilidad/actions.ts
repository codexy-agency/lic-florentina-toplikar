"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { saveConfig, saveRules, setExceptions } from "@/lib/store";
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

  const config: SchedulingConfig = {
    slotDurationMin: clampInt(payload.config.slotDurationMin, 10, 240, 50),
    bufferAfterMin: clampInt(payload.config.bufferAfterMin, 0, 120, 10),
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

  await Promise.all([saveConfig(config), saveRules(rules), setExceptions(exceptions)]);
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
