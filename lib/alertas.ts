// AVISOS A CODEXY cuando algo se rompe.
//
// El problema que resuelve: hoy Codexy se entera de que el consultorio de
// alguien está roto porque el psicólogo llama. Los runbooks de
// docs/guias/OPERACION.md son buenos, pero sirven para diagnosticar un incidente
// que un humano ya descubrió — no para descubrirlo.
//
// Deliberadamente chico y sin dependencias: reusa sendTelegram(), que ya tiene
// timeout y verifica la respuesta. No es observabilidad de verdad (para eso hace
// falta Sentry o similar); es el aviso mínimo para que un problema de datos de
// salud no pase la noche sin que nadie lo sepa.
//
// Config: CODEXY_ALERTAS_CHAT_ID (un chat de Telegram del equipo).

import { sendTelegram } from "./telegram";

export type Severidad = "S0" | "S1" | "S2";

const ICONO: Record<Severidad, string> = {
  S0: "🔴", // fuga de datos, aislamiento roto, todos los clientes caídos
  S1: "🟠", // un cliente no puede trabajar
  S2: "🟡", // degradado, hay workaround
};

/** Anti-inundación: la misma alerta no se manda más de una vez cada 10 minutos.
 *  Sin esto, un error en un loop de render llena el chat y se deja de mirar. */
const VENTANA_MS = 10 * 60_000;
const ultima = new Map<string, number>();

function deboAvisar(clave: string): boolean {
  const ahora = Date.now();
  const prev = ultima.get(clave);
  if (prev && ahora - prev < VENTANA_MS) return false;
  ultima.set(clave, ahora);
  // Poda: el Map vive en memoria de la lambda, pero igual no lo dejamos crecer.
  if (ultima.size > 500) {
    for (const [k, t] of ultima) if (ahora - t > VENTANA_MS) ultima.delete(k);
  }
  return true;
}

/**
 * Avisa a Codexy. Nunca lanza y nunca bloquea la operación principal.
 *
 * IMPORTANTE: `detalle` va a un chat de Telegram, que es un tercero. NUNCA
 * incluir nombre de paciente, teléfono, motivo de consulta ni contenido de una
 * nota clínica. El professionalId sí: es un UUID opaco y es lo que hace falta
 * para saber a quién llamar.
 */
export async function avisarCodexy(
  sev: Severidad,
  titulo: string,
  detalle?: { pid?: string | null; extra?: string; clave?: string }
): Promise<void> {
  try {
    const chat = process.env.CODEXY_ALERTAS_CHAT_ID;
    if (!chat) return; // sin configurar: silencio, no error

    const clave = detalle?.clave ?? `${sev}:${titulo}:${detalle?.pid ?? ""}`;
    if (!deboAvisar(clave)) return;

    const lineas = [
      `${ICONO[sev]} ${sev} · ${titulo}`,
      detalle?.pid ? `consultorio: ${detalle.pid}` : null,
      detalle?.extra ? detalle.extra.slice(0, 500) : null,
      `env: ${process.env.VERCEL_ENV || process.env.NODE_ENV || "local"}`,
    ].filter(Boolean);

    await sendTelegram(chat, lineas.join("\n"));
  } catch {
    // Un aviso que falla no puede tumbar lo que estaba pasando.
  }
}

/** Atajo para los catch: avisa y devuelve, sin await, para no frenar la
 *  respuesta. Usar cuando el aviso es best-effort de verdad. */
export function avisarSinEsperar(
  sev: Severidad,
  titulo: string,
  detalle?: { pid?: string | null; extra?: string; clave?: string }
): void {
  void avisarCodexy(sev, titulo, detalle);
}
