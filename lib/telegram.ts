// Telegram — notificador de salida + helper reutilizable de envío.
// Configurá en .env (Vercel): TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID.
// Si faltan, no rompe nada (modo demo).
import type { Solicitud } from "./store";
import { fechaHoraAR } from "./scheduling/slots";

const API = "https://api.telegram.org";

// Escapa los caracteres especiales de MarkdownV2 para que un nombre con * _ [ `
// no rompa el formato ni haga fallar la API.
export function escMarkdown(s: string) {
  return s.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, "\\$1");
}

/** Envía un mensaje por Telegram con timeout y verificación de la respuesta.
 *  Devuelve true sólo si Telegram aceptó el mensaje (ok:true). No lanza. */
export async function sendTelegram(
  chatId: string | number,
  text: string,
  opts?: { markdown?: boolean }
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 5000);
  try {
    const res = await fetch(`${API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        ...(opts?.markdown ? { parse_mode: "MarkdownV2" } : {}),
      }),
      signal: ac.signal,
    });
    if (!res.ok) {
      console.error("[telegram] sendMessage HTTP", res.status);
      return false;
    }
    const data = (await res.json().catch(() => null)) as { ok?: boolean; description?: string } | null;
    if (!data?.ok) {
      console.error("[telegram] sendMessage no ok:", data?.description);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[telegram] sendMessage error:", e);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Avisa a la profesional cada turno nuevo. */
export async function notificarTurno(s: Solicitud): Promise<void> {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!process.env.TELEGRAM_BOT_TOKEN || !chatId) {
    console.log("[telegram] sin credenciales — turno no notificado (modo demo)");
    return;
  }
  const horario = s.startsAt ? fechaHoraAR(s.startsAt) : s.preferencia || "a coordinar";
  const texto =
    `🌸 *Nueva solicitud de turno*\n\n` +
    `*Nombre:* ${escMarkdown(s.nombre)}\n` +
    `*Contacto:* ${escMarkdown(s.contacto)}\n` +
    (s.serviceName ? `*Servicio:* ${escMarkdown(s.serviceName)}\n` : "") +
    (s.staffName ? `*Profesional:* ${escMarkdown(s.staffName)}\n` : "") +
    `*Modalidad:* ${escMarkdown(s.modalidad)}\n` +
    `*Horario:* ${escMarkdown(horario)}\n` +
    // El motivo de consulta es dato de salud: NO se envía a un tercero (Telegram).
    `\nEntrá al panel para ver el detalle y confirmar\\.`;
  await sendTelegram(chatId, texto, { markdown: true });
}
