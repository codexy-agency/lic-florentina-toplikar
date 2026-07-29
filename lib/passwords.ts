// Hashing de contraseñas — PBKDF2-HMAC-SHA256 con Web Crypto.
//
// Por qué PBKDF2 y no bcrypt/argon2: esto tiene que poder correr en el runtime
// EDGE (el proxy) y sin dependencias nativas. Web Crypto está en todos lados.
//
// Formato almacenado (autodescriptivo, permite subir el costo sin migración):
//   pbkdf2$sha256$<iteraciones>$<salt_b64>$<hash_b64>
//
// AUTH_PEPPER (env, opcional pero MUY recomendado): se concatena a la contraseña
// antes de hashear. Vive fuera de la base, así un dump de la base no alcanza para
// atacar los hashes offline.

const ALGO = "pbkdf2";
const HASH = "sha256";
/** OWASP 2023 recomienda ≥600k para PBKDF2-HMAC-SHA256. */
export const ITERACIONES = 600_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

function b64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function desdeB64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function derivar(password: string, salt: Uint8Array, iteraciones: number): Promise<Uint8Array> {
  const pepper = process.env.AUTH_PEPPER || "";
  const material = new TextEncoder().encode(password + pepper);
  const key = await crypto.subtle.importKey("raw", material, { name: "PBKDF2" }, false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: iteraciones, hash: "SHA-256" },
    key,
    KEY_BITS
  );
  return new Uint8Array(bits);
}

/** Genera el hash almacenable de una contraseña. */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derivar(password, salt, ITERACIONES);
  return `${ALGO}$${HASH}$${ITERACIONES}$${b64(salt)}$${b64(hash)}`;
}

/** Comparación en tiempo constante sobre bytes (no corta al primer byte distinto). */
function igualesEnTiempoConstante(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a[i] ^ b[i];
  return r === 0;
}

/** Verifica una contraseña contra su hash almacenado. Nunca lanza por formato. */
export async function verifyPassword(password: string, almacenado: string): Promise<boolean> {
  try {
    const partes = (almacenado || "").split("$");
    if (partes.length !== 5) return false;
    const [algo, hashName, itersRaw, saltB64, hashB64] = partes;
    if (algo !== ALGO || hashName !== HASH) return false;
    const iteraciones = Number(itersRaw);
    if (!Number.isFinite(iteraciones) || iteraciones < 1000 || iteraciones > 5_000_000) return false;
    const salt = desdeB64(saltB64);
    const esperado = desdeB64(hashB64);
    const calculado = await derivar(password, salt, iteraciones);
    return igualesEnTiempoConstante(calculado, esperado);
  } catch {
    return false;
  }
}

/** ¿Este hash quedó viejo (menos iteraciones de las actuales)? → rehashear al loguear. */
export function necesitaRehash(almacenado: string): boolean {
  const partes = (almacenado || "").split("$");
  if (partes.length !== 5) return true;
  const iters = Number(partes[2]);
  return !Number.isFinite(iters) || iters < ITERACIONES;
}

/** Hash señuelo: se verifica contra esto cuando el email NO existe, para que el
 *  login tarde lo mismo y no se pueda enumerar quién tiene cuenta (timing). */
export const DUMMY_HASH =
  `${ALGO}$${HASH}$${ITERACIONES}$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=`;

/** Política mínima de contraseña. Devuelve null si está OK, o el motivo del rechazo.
 *  Criterio NIST SP 800-63B: largo por sobre complejidad arbitraria. */
export function validarPassword(password: string): string | null {
  const p = password || "";
  if (p.length < 10) return "La contraseña debe tener al menos 10 caracteres.";
  if (p.length > 200) return "La contraseña es demasiado larga.";
  const comunes = [
    "contraseña", "password", "12345678", "qwerty", "admin123",
    "paulina2026", "psicologia", "consultorio", "123456789", "bienvenido",
  ];
  const low = p.toLowerCase();
  if (comunes.some((c) => low === c || low.includes(c))) {
    return "Esa contraseña es demasiado previsible. Elegí otra.";
  }
  return null;
}
