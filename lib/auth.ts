// Auth mínima para el panel: cookie de sesión firmada con HMAC (Web Crypto,
// compatible con Edge Runtime del proxy). REQUIERE ADMIN_PASSWORD y ADMIN_SECRET
// definidos (en .env.local local, en Variables de Entorno en Vercel).
// Fail-closed: sin secreto configurado, NO se firma ni se valida nada
// (antes había un fallback conocido que permitía forjar la sesión).
const COOKIE = "pp_admin";
const PASSWORD = process.env.ADMIN_PASSWORD;
const SECRET = process.env.ADMIN_SECRET;
// Versión de sesión rotable: cambiarla en Vercel invalida TODOS los tokens ya
// emitidos (revocación de emergencia ante robo de cookie) sin tocar ADMIN_SECRET.
const SESSION_VERSION = process.env.ADMIN_SESSION_VERSION || "1";

export const SESSION_COOKIE = COOKIE;

function requireSecret(): string {
  if (!SECRET || SECRET.length < 16) {
    throw new Error(
      "ADMIN_SECRET sin configurar o demasiado corto (mínimo 16 caracteres). " +
        "Definilo en .env.local y en las Variables de Entorno de Vercel."
    );
  }
  return SECRET;
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function sign(value: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(requireSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(value));
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function checkPassword(input: string) {
  if (!PASSWORD || PASSWORD.length < 6) {
    throw new Error("ADMIN_PASSWORD sin configurar (mínimo 6 caracteres).");
  }
  return safeEqual(input, PASSWORD);
}

// Token de sesión con vencimiento (TTL). payload = "ok.<version>.<emitido>".
const TTL_MS = 1000 * 60 * 60 * 12; // 12 horas

export async function makeToken(): Promise<string> {
  const payload = `ok.${SESSION_VERSION}.${Date.now()}`;
  return `${payload}.${await sign(payload)}`;
}

export async function verifyToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const i = token.lastIndexOf(".");
  if (i < 0) return false;
  const payload = token.slice(0, i);
  const sig = token.slice(i + 1);
  if (!safeEqual(sig, await sign(payload))) return false;
  // Formato esperado: ok.<version>.<timestamp>
  const parts = payload.split(".");
  if (parts[0] !== "ok") return false;
  // Versión rotada en Vercel ⇒ token viejo inválido (revocación global).
  if (parts[1] !== SESSION_VERSION) return false;
  const ts = Number(parts[2]);
  if (!Number.isFinite(ts) || Date.now() - ts > TTL_MS) return false;
  return true;
}
