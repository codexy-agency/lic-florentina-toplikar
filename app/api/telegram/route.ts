import { NextResponse, after } from "next/server";
import { cookies } from "next/headers";
import { listSolicitudes, stats, getFinanzas } from "@/lib/store";
import { horaAR, fechaHoraAR } from "@/lib/scheduling/slots";
import { sendTelegram } from "@/lib/telegram";
import { verifyToken, SESSION_COOKIE } from "@/lib/auth";

const AR = "America/Argentina/Buenos_Aires";
const money = (n?: number) => "$" + (n ?? 0).toLocaleString("es-AR");
const dayAR = (iso?: string) => {
  try {
    return iso ? new Date(iso).toLocaleDateString("en-CA", { timeZone: AR }) : "";
  } catch {
    return "";
  }
};

function allowedChats(): Set<string> {
  return new Set(
    (process.env.TELEGRAM_ALLOWED_CHAT_IDS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

const AYUDA =
  "🤖 Asistente del panel\n\n" +
  "Comandos disponibles:\n" +
  "• /hoy — turnos de hoy\n" +
  "• /proximos — próximos turnos\n" +
  "• /pendientes — solicitudes sin confirmar\n" +
  "• /finanzas — resumen del mes\n" +
  "• /ayuda — esta lista";

async function cmdHoy(): Promise<string> {
  const sols = await listSolicitudes();
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: AR });
  const items = sols
    .filter((s) => s.estado === "confirmado" && dayAR(s.startsAt) === hoy)
    .sort((a, b) => ((a.startsAt || "") < (b.startsAt || "") ? -1 : 1));
  if (!items.length) return "📅 Hoy no tenés turnos confirmados.";
  return (
    `📅 Turnos de hoy (${items.length}):\n` +
    items
      .map((s) => `• ${horaAR(s.startsAt!)} — ${s.nombre}${s.serviceName ? ` · ${s.serviceName}` : ""}`)
      .join("\n")
  );
}

async function cmdProximos(): Promise<string> {
  const sols = await listSolicitudes();
  const now = Date.now();
  const items = sols
    .filter((s) => s.estado === "confirmado" && s.startsAt && new Date(s.startsAt).getTime() >= now)
    .sort((a, b) => ((a.startsAt || "") < (b.startsAt || "") ? -1 : 1))
    .slice(0, 8);
  if (!items.length) return "🗓️ No hay próximos turnos confirmados.";
  return (
    `🗓️ Próximos turnos (${items.length}):\n` +
    items.map((s) => `• ${fechaHoraAR(s.startsAt!)} hs — ${s.nombre}${s.serviceName ? ` · ${s.serviceName}` : ""}`).join("\n")
  );
}

async function cmdPendientes(): Promise<string> {
  const sols = await listSolicitudes();
  const items = sols
    .filter((s) => s.estado === "pendiente")
    .sort((a, b) => ((a.startsAt || "") < (b.startsAt || "") ? -1 : 1));
  if (!items.length) return "✅ No tenés solicitudes pendientes.";
  return (
    `📥 Solicitudes pendientes (${items.length}):\n` +
    items
      .map((s) => `• ${s.startsAt ? `${fechaHoraAR(s.startsAt)} hs` : "a coordinar"} — ${s.nombre} (${s.contacto})`)
      .join("\n") +
    "\n\nEntrá al panel para confirmarlas."
  );
}

async function cmdFinanzas(): Promise<string> {
  const f = await getFinanzas("mes");
  return (
    `💰 Finanzas — ${f.periodoLabel}\n\n` +
    `Cobrado: ${money(f.cobrado)}\n` +
    `Por cobrar: ${money(f.porCobrar)} (${f.cantTurnos - f.cantCobrados} turnos)\n` +
    `Facturado: ${money(f.facturado)} · ${f.cantTurnos} turnos\n` +
    (f.cobranza.length ? `\n⚠️ ${f.cobranza.length} sesión(es) realizadas sin pagar.` : "")
  );
}

// ── Webhook entrante de Telegram ──
export async function POST(req: Request) {
  // Verificación del secreto (Telegram lo envía en este header si registramos el
  // webhook con secret_token). Sin esto, cualquiera podría postear updates falsos.
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = await req.json().catch(() => null);
  const msg = update?.message ?? update?.edited_message;
  const chatId = msg?.chat?.id;
  const text = String(msg?.text || "").trim();
  if (!chatId || !text.startsWith("/")) return NextResponse.json({ ok: true });

  const cmd = text.split(/\s+/)[0].toLowerCase().replace(/@.*/, ""); // saca @nombrebot
  const isAllowed = allowedChats().has(String(chatId));

  // Respondemos 200 enseguida y procesamos en after() (Telegram no espera).
  after(async () => {
    try {
      // Bootstrap: /start y /ayuda andan sin lista blanca, así la dueña obtiene su
      // chat ID para autorizarse. Los comandos con DATOS exigen lista blanca.
      if (cmd === "/start" || cmd === "/ayuda" || cmd === "/help") {
        await sendTelegram(
          chatId,
          AYUDA + (isAllowed ? "" : `\n\nTu chat ID es ${chatId}. Para usar los comandos, agregalo a TELEGRAM_ALLOWED_CHAT_IDS.`)
        );
        return;
      }
      if (!isAllowed) {
        await sendTelegram(chatId, `🔒 No estás autorizada/o. Tu chat ID es ${chatId}.`);
        return;
      }
      let resp: string;
      if (cmd === "/hoy") resp = await cmdHoy();
      else if (cmd === "/proximos") resp = await cmdProximos();
      else if (cmd === "/pendientes") resp = await cmdPendientes();
      else if (cmd === "/finanzas") resp = await cmdFinanzas();
      else resp = "No reconozco ese comando. Probá /ayuda.";
      await sendTelegram(chatId, resp);
    } catch (e) {
      console.error("[telegram webhook]", e);
    }
  });

  return NextResponse.json({ ok: true });
}

// ── Registro del webhook (solo admin logueada) ──
// GET /api/telegram?setup=1  → registra el webhook contra este dominio.
export async function GET(req: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifyToken(token))) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  const url = new URL(req.url);
  if (url.searchParams.get("setup") !== "1") {
    return NextResponse.json({ ok: true, hint: "Usá ?setup=1 para registrar el webhook." });
  }
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!botToken || !secret) {
    return NextResponse.json(
      { ok: false, error: "Faltan TELEGRAM_BOT_TOKEN y/o TELEGRAM_WEBHOOK_SECRET en las variables de entorno." },
      { status: 400 }
    );
  }
  const webhookUrl = `https://${req.headers.get("host")}/api/telegram`;
  try {
    const r = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl, secret_token: secret, allowed_updates: ["message"] }),
    });
    const data = await r.json();
    return NextResponse.json({ ok: !!data.ok, webhookUrl, telegram: data });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 502 });
  }
}
