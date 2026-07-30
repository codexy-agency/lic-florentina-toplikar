// Auth mínima para el panel: cookie de sesión firmada con HMAC (Web Crypto,
// compatible con Edge Runtime del proxy). REQUIERE ADMIN_PASSWORD y ADMIN_SECRET
// definidos (en .env.local local, en Variables de Entorno en Vercel).
// Fail-closed: sin secreto configurado, NO se firma ni se valida nada
// (antes había un fallback conocido que permitía forjar la sesión).
const COOKIE = "pp_admin";
/** Contraseña global del despliegue. Se lee en cada llamada, no al importar el
 *  módulo: una constante capturada al arranque hace que el valor dependa del
 *  orden de carga, que es difícil de razonar y de testear. */
const passwordGlobal = () => process.env.ADMIN_PASSWORD;
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

/** ¿Este despliegue atiende a más de un consultorio?
 *
 *  Se mira `TENANTS` directamente en vez de importar `esMultiTenant()` de
 *  lib/tenant.ts, y es a propósito: acá la pregunta se responde MÁS ESTRICTO.
 *  `esMultiTenant()` exige que haya al menos una entrada *válida*; esto alcanza
 *  con que la variable esté seteada.
 *
 *  La diferencia importa justo en el caso feo: si TENANTS está pero su contenido
 *  no sirve, `esMultiTenant()` diría "no" y habilitaría la contraseña global en
 *  un despliegue que claramente quiso ser multi-tenant. Para decidir si entregar
 *  una llave que abre historias clínicas, el criterio conservador es el correcto. */
function despliegueMultiTenant(): boolean {
  const t = process.env.TENANTS;
  return !!t && !!t.trim();
}

/** Contraseña del TENANT (sólo para la ventana de transición: un consultorio
 *  que todavía no creó su primera cuenta individual).
 *
 *    ADMIN_PASSWORDS={"<professional_id>":"<passphrase>"}
 *
 *  EN MULTI-TENANT NUNCA CAE A LA GLOBAL. El comentario decía eso y el código
 *  hacía lo contrario: bastaba con no tener seteada ADMIN_PASSWORDS —o tenerla
 *  sin entrada para ese consultorio, o con el JSON roto— para que ADMIN_PASSWORD
 *  volviera a funcionar en TODOS los consultorios a la vez. Y esa sesión entra
 *  por la ventana legacy, que da rol `owner` con `puede: () => true`: una sola
 *  cadena abría todas las historias clínicas del despliegue.
 *
 *  Ahora en multi-tenant se devuelve undefined si no hay entrada propia, y
 *  checkPassword lanza. Fail-closed: preferimos que un consultorio no pueda
 *  entrar (y nos llame) antes que abrirlos todos. */
function passwordDeTenant(pid?: string): string | undefined {
  const multi = despliegueMultiTenant();
  const raw = process.env.ADMIN_PASSWORDS;

  if (raw && raw.trim()) {
    if (!pid) return multi ? undefined : passwordGlobal();
    try {
      const map = JSON.parse(raw) as Record<string, unknown>;
      const v = map && typeof map === "object" ? map[pid] ?? map[pid.toLowerCase()] : undefined;
      const pass = typeof v === "string" ? v.trim() : "";
      if (pass) return pass;
      // Hay mapa pero este consultorio no está: en multi-tenant se rechaza.
      return multi ? undefined : passwordGlobal();
    } catch {
      console.error("[auth] ADMIN_PASSWORDS no es JSON válido.");
      // JSON roto en multi-tenant: NO se degrada a la global.
      return multi ? undefined : passwordGlobal();
    }
  }

  // Sin ADMIN_PASSWORDS. En single-tenant es el despliegue histórico y está
  // bien; en multi-tenant sería la llave maestra, así que no se entrega.
  return multi ? undefined : passwordGlobal();
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

// Token de sesión v2. payload = "v2.<version>.<tenant>.<userId>.<sessionId>.<emitido>"
//
// Van DENTRO de la firma:
//  - el TENANT  → una cookie del consultorio A no sirve en el panel de B.
//  - el USUARIO → se sabe QUIÉN hizo cada cosa (trazabilidad).
//  - la SESIÓN  → se puede revocar UNA sesión sin echar a todos.
//
// Los tokens de formato viejo se rechazan: obligan a re-loguear (lado seguro).
const TTL_MS = 1000 * 60 * 60 * 12; // 12 horas
const VACIO = "-";
const V2 = "v2";

export interface TokenClaims {
  /** professional_id del consultorio */
  pid: string;
  /** id del usuario; "-" si es una sesión de la ventana legacy (sin cuentas aún) */
  uid: string;
  /** id de sesión (para revocación individual); "-" en legacy */
  sid: string;
  emitido: number;
}

export async function makeToken(claims: { pid?: string; uid?: string; sid?: string }): Promise<string> {
  const payload = [
    V2,
    SESSION_VERSION,
    claims.pid || VACIO,
    claims.uid || VACIO,
    claims.sid || VACIO,
    Date.now(),
  ].join(".");
  return `${payload}.${await sign(payload)}`;
}

/** Verifica firma, versión y vencimiento y devuelve los claims. null = inválido.
 *  Solo criptografía: sin I/O, para poder correr en el edge (proxy). */
export async function readToken(
  token: string | undefined,
  expectedPid?: string
): Promise<TokenClaims | null> {
  if (!token) return null;
  const i = token.lastIndexOf(".");
  if (i < 0) return null;
  const payload = token.slice(0, i);
  const sig = token.slice(i + 1);
  if (!safeEqual(sig, await sign(payload))) return null;

  const p = payload.split(".");
  if (p.length !== 6 || p[0] !== V2) return null;
  if (p[1] !== SESSION_VERSION) return null; // versión rotada = revocación global
  const pid = p[2];
  if (expectedPid !== undefined && !safeEqual(pid, expectedPid || VACIO)) return null;
  const emitido = Number(p[5]);
  if (!Number.isFinite(emitido) || Date.now() - emitido > TTL_MS) return null;
  return { pid, uid: p[3], sid: p[4], emitido };
}

/** Atajo booleano (lo usa el proxy en el edge). */
export async function verifyToken(token: string | undefined, expectedPid?: string): Promise<boolean> {
  return (await readToken(token, expectedPid)) !== null;
}
