// Telegram — notificador de salida + helper reutilizable de envío.
// Configurá en .env (Vercel): TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID.
// Si faltan, no rompe nada (modo demo).
import type { Solicitud } from "./store";
import { fechaHoraAR } from "./scheduling/slots";
import { esMultiTenant } from "./tenant";

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

/** Chat de Telegram de ESTE consultorio. En multi-tenant hay que mapear cada
 *  profesional a SU chat: TELEGRAM_CHAT_IDS={"<professional_id>":"<chat_id>"}.
 *  Si el tenant no tiene chat propio, NO se notifica (fail-closed): mandar los
 *  datos del paciente al chat de otra persona sería una cesión indebida. */
function chatDeTenant(pid?: string): string | undefined {
  const raw = process.env.TELEGRAM_CHAT_IDS;
  if (raw && raw.trim()) {
    if (!pid) return undefined;
    try {
      const map = JSON.parse(raw) as Record<string, unknown>;
      const v = map?.[pid] ?? map?.[pid.toLowerCase()];
      const chat = v == null ? "" : String(v).trim();
      return chat || undefined;
    } catch {
      console.error("[telegram] TELEGRAM_CHAT_IDS no es JSON válido.");
      return undefined;
    }
  }
  // Sin mapa por tenant: solo válido en single-tenant (un solo consultorio).
  return esMultiTenant() ? undefined : process.env.TELEGRAM_CHAT_ID;
}

/** Avisa a la profesional cada turno nuevo (al chat de SU consultorio). */
export async function notificarTurno(s: Solicitud, pid?: string): Promise<void> {
  const chatId = chatDeTenant(pid);
  if (!process.env.TELEGRAM_BOT_TOKEN || !chatId) {
    console.log("[telegram] sin chat configurado para este consultorio — turno no notificado");
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
