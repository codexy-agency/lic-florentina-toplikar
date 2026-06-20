// Auth mínima para el panel: cookie de sesión firmada con HMAC (Web Crypto,
// compatible con Edge Runtime del middleware). Configurá ADMIN_PASSWORD y
// ADMIN_SECRET en .env.local.
const COOKIE = "pp_admin";
const PASSWORD = process.env.ADMIN_PASSWORD || "paulina2026";
const SECRET = process.env.ADMIN_SECRET || "cambia-este-secreto-en-produccion";

export const SESSION_COOKIE = COOKIE;

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
    enc.encode(SECRET),
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
  return safeEqual(input, PASSWORD);
}

export async function makeToken(): Promise<string> {
  const payload = `ok.${Date.now()}`;
  return `${payload}.${await sign(payload)}`;
}

export async function verifyToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const i = token.lastIndexOf(".");
  if (i < 0) return false;
  const payload = token.slice(0, i);
  const sig = token.slice(i + 1);
  return safeEqual(sig, await sign(payload));
}
