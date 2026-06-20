// Notificador de Telegram — avisa a la profesional cada turno nuevo.
// Configurá en .env.local: TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID.
// Si faltan, no rompe nada (modo demo).
import type { Solicitud } from "./store";
import { fechaHoraAR } from "./scheduling/slots";

// Escapa los caracteres especiales de Markdown para que un nombre con * _ [ `
// no rompa el formato ni haga fallar la API (bug detectado en auditoría).
function esc(s: string) {
  return s.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, "\\$1");
}

export async function notificarTurno(s: Solicitud): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.log("[telegram] sin credenciales — turno no notificado (modo demo)");
    return;
  }
  const horario = s.startsAt ? fechaHoraAR(s.startsAt) : s.preferencia || "a coordinar";
  const texto =
    `🌸 *Nueva solicitud de turno*\n\n` +
    `*Nombre:* ${esc(s.nombre)}\n` +
    `*Contacto:* ${esc(s.contacto)}\n` +
    (s.serviceName ? `*Servicio:* ${esc(s.serviceName)}\n` : "") +
    (s.staffName ? `*Profesional:* ${esc(s.staffName)}\n` : "") +
    `*Modalidad:* ${esc(s.modalidad)}\n` +
    `*Horario:* ${esc(horario)}\n` +
    // El motivo de consulta es dato de salud: NO se envía a un tercero (Telegram).
    // Queda solo en el panel.
    `\nEntrá al panel para ver el detalle y confirmar\\.`;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: texto, parse_mode: "MarkdownV2" }),
    });
  } catch (e) {
    console.error("[telegram] error al notificar:", e);
  }
}
