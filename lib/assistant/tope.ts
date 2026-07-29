// Tope de uso del asistente IA.
//
// Es el único costo variable del producto: una sola OPENAI_API_KEY global, y
// cada mensaje del usuario puede disparar hasta 6 llamadas al modelo (el loop
// agéntico) más el historial. Sin tope, un consultorio puede gastar sin techo y
// el gasto no es atribuible a nadie.
//
// Dos capas, porque protegen de cosas distintas:
//
//  1. Ráfaga POR USUARIO: contra un bucle en el cliente o un botón apretado 40
//     veces. Ventana corta, en memoria (lib/ratelimit), suficiente para eso.
//  2. Cupo MENSUAL POR CONSULTORIO: es el límite comercial del plan. Va contado
//     en el almacén de identidad, porque tiene que sobrevivir a los reinicios de
//     la lambda; el rate-limit en memoria no sirve para un cupo mensual.

import { rateLimit } from "../ratelimit";
import { suscripcionDe } from "../accounts";
import { leerAuth, mutarAuth } from "../accounts-store";
import { PLANES } from "../planes";
import type { Sesion } from "../session";

/** Ráfaga: 20 mensajes cada 5 minutos por usuario. Un uso humano intenso son
 *  3 o 4 en ese lapso; 20 deja margen y corta cualquier bucle. */
const RAFAGA_LIMITE = 20;
const RAFAGA_MS = 5 * 60_000;

/** Clave del mes en curso, en hora argentina (el corte del mes es comercial, no
 *  técnico: no importa que un tenant en México cierre unas horas corrido). */
export function mesActual(ahora = new Date()): string {
  return ahora.toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
  }); // "2026-07"
}

export interface Resultado {
  ok: boolean;
  motivo?: string;
  retryAfter?: number;
}

/** ¿Puede mandar otro mensaje al asistente? Si sí, cuenta el consumo. */
export async function topeAsistente(sesion: Sesion): Promise<Resultado> {
  const pid = sesion.pid;
  if (!pid) return { ok: true }; // sin tenant no hay a quién cobrarle: no se cuenta

  // 1) Ráfaga por usuario.
  const quien = sesion.userId ?? "legacy";
  const r = rateLimit(`asistente:${pid}:${quien}`, RAFAGA_LIMITE, RAFAGA_MS);
  if (!r.ok) {
    return {
      ok: false,
      retryAfter: r.retryAfter,
      motivo: "Fueron muchos mensajes seguidos. Esperá un momento y seguimos.",
    };
  }

  // 2) Cupo mensual del plan.
  const sus = await suscripcionDe(pid);
  const tope = PLANES[sus.plan].limites.asistenteMes;
  if (tope === null) return { ok: true };

  const mes = mesActual();
  const clave = `${pid}:${mes}`;
  const db = await leerAuth();
  const usados = db.usoAsistente?.[clave] ?? 0;
  if (usados >= tope) {
    return {
      ok: false,
      motivo:
        `Llegaste a los ${tope} mensajes del asistente de este mes (plan ${PLANES[sus.plan].nombre}). ` +
        `Se renueva el mes que viene, y si lo necesitás ahora escribinos y lo ampliamos.`,
    };
  }

  // Se cuenta al entrar, no al salir: si la llamada a OpenAI falla igual costó
  // (el gasto ocurre del lado del proveedor antes de que sepamos el resultado).
  await mutarAuth((d) => {
    d.usoAsistente[clave] = (d.usoAsistente[clave] ?? 0) + 1;
    // Poda: sólo se guardan los últimos 3 meses de cada consultorio. Sin esto el
    // blob de identidad crece un contador por consultorio por mes, para siempre.
    const vigentes = mesesVigentes();
    for (const k of Object.keys(d.usoAsistente)) {
      const m = k.slice(k.lastIndexOf(":") + 1);
      if (!vigentes.has(m)) delete d.usoAsistente[k];
    }
  });

  return { ok: true };
}

function mesesVigentes(): Set<string> {
  const hoy = new Date();
  const out = new Set<string>();
  for (let i = 0; i < 3; i++) {
    out.add(mesActual(new Date(hoy.getFullYear(), hoy.getMonth() - i, 15)));
  }
  return out;
}

/** Consumo del mes, para mostrarlo en el panel. */
export async function usoAsistenteDelMes(pid: string): Promise<{ usados: number; tope: number | null }> {
  const [db, sus] = await Promise.all([leerAuth(), suscripcionDe(pid)]);
  return {
    usados: db.usoAsistente?.[`${pid}:${mesActual()}`] ?? 0,
    tope: PLANES[sus.plan].limites.asistenteMes,
  };
}
