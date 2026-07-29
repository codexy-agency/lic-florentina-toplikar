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

const IS_PROD = process.env.NODE_ENV === "production";
// Valores de demo/placeholder que NUNCA deben llegar a producción: si quedan
// cargados en Vercel, la app falla-cerrado (mejor que /admin no abra a que la
// sesión sea forjable con un secreto conocido o se entre con una pass pública).
// En local (NODE_ENV != production) se permiten para no romper el desarrollo.
const WEAK_VALUES = new Set([
  "demo-secret-cambiar-en-produccion",
  "paulina2026",
  "changeme",
  "secret",
  "admin",
  "password",
]);

function requireSecret(): string {
  if (!SECRET || SECRET.length < 16) {
    throw new Error(
      "ADMIN_SECRET sin configurar o demasiado corto (mínimo 16 caracteres). " +
        "Definilo en .env.local y en las Variables de Entorno de Vercel."
    );
  }
  if (IS_PROD && WEAK_VALUES.has(SECRET.toLowerCase())) {
    throw new Error(
      "ADMIN_SECRET inseguro en producción (valor de demo conocido). " +
        "Generá uno aleatorio: `openssl rand -hex 32`."
    );
  }
  return SECRET;
}

export function safeEqual(a: string, b: string) {
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

/** Contraseña del TENANT. En multi-tenant cada psicólogo tiene la suya:
 *    ADMIN_PASSWORDS={"<professional_id>":"<passphrase>"}
 *  Si no hay entrada para ese tenant, se rechaza (NO cae a la global: una clave
 *  compartida sería una llave maestra de todas las historias clínicas). */
function passwordDeTenant(pid?: string): string | undefined {
  const raw = process.env.ADMIN_PASSWORDS;
  if (raw && raw.trim() && pid) {
    try {
      const map = JSON.parse(raw) as Record<string, unknown>;
      const v = map && typeof map === "object" ? map[pid] ?? map[pid.toLowerCase()] : undefined;
      const pass = typeof v === "string" ? v.trim() : "";
      return pass || undefined;
    } catch {
      console.error("[auth] ADMIN_PASSWORDS no es JSON válido.");
      return undefined;
    }
  }
  return PASSWORD; // single-tenant / despliegue histórico
}

/** Valida la contraseña CONTRA EL TENANT del request. */
export function checkPassword(input: string, pid?: string) {
  const pass = passwordDeTenant(pid);
  if (!pass || pass.length < 6) {
    throw new Error(
      "No hay contraseña configurada para este consultorio (ADMIN_PASSWORD / ADMIN_PASSWORDS)."
    );
  }
  if (IS_PROD && WEAK_VALUES.has(pass.toLowerCase())) {
    throw new Error(
      "Contraseña insegura en producción (valor de demo conocido). " +
        "Cambiala por una passphrase fuerte y única en Vercel."
    );
  }
  return safeEqual(input, pass);
}

// Token de sesión con vencimiento (TTL). payload = "ok.<version>.<tenant>.<emitido>".
// El TENANT va DENTRO de lo firmado: una cookie emitida para el consultorio A no
// puede reusarse en el panel de B (replay cross-tenant).
const TTL_MS = 1000 * 60 * 60 * 12; // 12 horas
const SIN_TENANT = "-";

export async function makeToken(pid?: string): Promise<string> {
  const payload = `ok.${SESSION_VERSION}.${pid || SIN_TENANT}.${Date.now()}`;
  return `${payload}.${await sign(payload)}`;
}

/** Verifica firma, versión, vencimiento y —si se pasa `expectedPid`— que la
 *  sesión pertenezca a ESE tenant. Tokens con formato viejo (sin tenant) se
 *  rechazan: obligan a re-loguear, que es el lado seguro. */
export async function verifyToken(
  token: string | undefined,
  expectedPid?: string
): Promise<boolean> {
  if (!token) return false;
  const i = token.lastIndexOf(".");
  if (i < 0) return false;
  const payload = token.slice(0, i);
  const sig = token.slice(i + 1);
  if (!safeEqual(sig, await sign(payload))) return false;
  // Formato esperado: ok.<version>.<tenant>.<timestamp>
  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== "ok") return false;
  // Versión rotada en Vercel ⇒ token viejo inválido (revocación global).
  if (parts[1] !== SESSION_VERSION) return false;
  const tokenPid = parts[2];
  if (expectedPid !== undefined) {
    if (!safeEqual(tokenPid, expectedPid || SIN_TENANT)) return false;
  }
  const ts = Number(parts[3]);
  if (!Number.isFinite(ts) || Date.now() - ts > TTL_MS) return false;
  return true;
}
