// Resolución de tenant (multi-tenant). Módulo EDGE-SAFE: lo usa el proxy
// (middleware). NO importar acá next/headers ni el cliente de Supabase.
//
// SEGURIDAD (datos clínicos, Ley 25.326): el tenant define QUÉ historia clínica
// se lee y se escribe. Reglas duras:
//  - FAIL-CLOSED en modo multi-tenant: host no mapeado ⇒ NO se sirve nada (nunca
//    se degrada al tenant por defecto, que sería servir datos de otra persona).
//  - Sin lookup "adivinado": el slug solo se acepta bajo el dominio de la
//    plataforma, así `ana.otrodominio.com` NO puede resolver al tenant `ana`.
//  - El id resuelto siempre es un UUID validado y presente en el mapa.

/** Header interno que el proxy setea con el professional_id del tenant resuelto.
 *  El proxy lo SOBREESCRIBE/BORRA siempre → el cliente no lo puede falsificar. */
export const TENANT_HEADER = "x-tenant-pid";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function esUuid(v: string | null | undefined): boolean {
  return !!v && UUID_RE.test(v);
}

/** Dominio de la plataforma (ej. "codexy.app"): habilita `slug.codexy.app`. */
function platformDomain(): string {
  return (process.env.PLATFORM_DOMAIN || "").trim().toLowerCase().replace(/^\.+|\.+$/g, "");
}

/** Mapa host/slug → professional_id (UUID) desde la env TENANTS (JSON).
 *  Claves normalizadas a minúsculas; valores validados como UUID (una entrada
 *  mal escrita se DESCARTA en vez de convertirse en un tenant fantasma). */
function tenantMap(): Record<string, string> {
  const out: Record<string, string> = Object.create(null); // sin Object.prototype
  const raw = process.env.TENANTS;
  if (!raw || !raw.trim()) return out;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // LANZAR, no devolver vacío.
    //
    // Devolver un mapa vacío parecía fail-closed y era exactamente lo contrario:
    // sin entradas, esMultiTenant() da false, y resolveTenantFromHost() cae al
    // comportamiento single-tenant y devuelve PROFESSIONAL_ID para CUALQUIER
    // host, con escritura incluida. Es decir: una coma mal puesta en la variable
    // de entorno hacía que todos los dominios sirvieran (y escribieran) el
    // mismo consultorio.
    //
    // Con TENANTS seteada, un JSON que no parsea es un error de configuración,
    // no un modo de operación. Preferimos que el despliegue falle a la vista.
    throw new Error(
      "TENANTS no es JSON válido. Con la variable seteada no se puede continuar: " +
        "un mapa vacío degradaría a single-tenant y serviría el mismo consultorio en todos los hosts."
    );
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("TENANTS tiene que ser un objeto JSON { host: professional_id }.");
  }
  for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
    const key = String(k).trim().toLowerCase().replace(/\.$/, "");
    const val = String(v ?? "").trim();
    if (key && esUuid(val)) out[key] = val.toLowerCase();
    else if (key) console.error(`[tenant] entrada inválida en TENANTS: '${key}' (el valor debe ser un UUID).`);
  }
  return out;
}

/** ¿Hay más de un psicólogo en este despliegue? Si TENANTS está vacío, el sistema
 *  corre en SINGLE-TENANT (comportamiento histórico: todo va a PROFESSIONAL_ID).
 *  Apenas se configura TENANTS, se activa el modo estricto (fail-closed). */
export function esMultiTenant(): boolean {
  return Object.keys(tenantMap()).length > 0;
}

/** professional_id por defecto: SOLO válido en modo single-tenant. */
export function tenantPorDefecto(): string | undefined {
  const pid = (process.env.PROFESSIONAL_ID || "").trim().toLowerCase();
  return pid || undefined;
}

/** Normaliza el host: saca puerto, punto final, espacios, mayúsculas, y pasa a
 *  punycode/IDNA (para que un host unicode no evada el mapa). "" si es inválido. */
export function normalizarHost(host: string | null | undefined): string {
  if (!host) return "";
  let h = String(host).split(",")[0].trim().toLowerCase();
  h = h.split(":")[0].replace(/\.$/, "");
  if (!h) return "";
  try {
    h = new URL(`http://${h}`).hostname; // IDNA → punycode
  } catch {
    return "";
  }
  // Solo caracteres de hostname válidos tras la normalización.
  return /^[a-z0-9.-]+$/.test(h) ? h : "";
}

/** Resuelve el professional_id del request a partir del host.
 *  - Match EXACTO por host (dominio propio o subdominio completo).
 *  - Match por slug SOLO si el host es exactamente `<slug>.<PLATFORM_DOMAIN>`.
 *  - Single-tenant (sin TENANTS): siempre el tenant por defecto.
 *  Devuelve null si no se puede resolver ⇒ el proxy corta el request. */
export function resolveTenantFromHost(host: string | null): string | null {
  const map = tenantMap();
  const multi = Object.keys(map).length > 0;
  if (!multi) return tenantPorDefecto() ?? null; // single-tenant: comportamiento histórico

  const h = normalizarHost(host);
  if (!h) return null;
  if (map[h]) return map[h];

  const dom = platformDomain();
  if (dom && h.endsWith(`.${dom}`)) {
    const resto = h.slice(0, -(dom.length + 1));
    // Un ÚNICO label extra: `ana.codexy.app` sí, `a.b.codexy.app` no.
    if (resto && !resto.includes(".") && map[resto]) return map[resto];
  }
  return null;
}

/** ¿Este host es el sitio de la PLATAFORMA (donde Codexy vende), y no el de un
 *  consultorio?
 *
 *  Sólo el dominio exacto y su `www`. Un subdominio NO: `ana.codexy.app` es un
 *  consultorio y tiene que resolverse por el mapa de tenants como siempre.
 *
 *  Existe para que el sitio comercial pueda vivir en el mismo despliegue sin
 *  aflojar el fail-closed: proxy.ts sigue devolviendo 404 a cualquier host que no
 *  sea ni un consultorio ni éste. Y como en el sitio de plataforma NO se setea el
 *  header de tenant, cualquier intento accidental de leer datos de un consultorio
 *  desde una página de marketing lanza en vez de servir los de otro. */
export function esHostDePlataforma(host: string | null | undefined): boolean {
  const dom = platformDomain();
  if (!dom) return false;
  const h = normalizarHost(host);
  if (!h) return false;
  return h === dom || h === `www.${dom}`;
}

/** ¿Este professional_id es un tenant conocido de este despliegue? */
export function esTenantConocido(pid: string | null | undefined): boolean {
  if (!esUuid(pid)) return false;
  const v = String(pid).toLowerCase();
  if (v === tenantPorDefecto()) return true;
  return Object.values(tenantMap()).includes(v);
}
