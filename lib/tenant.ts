// Resolución de tenant (multi-tenant Fase 0). Módulo EDGE-SAFE: lo usa el proxy
// (middleware). NO importar acá next/headers ni el cliente de Supabase (pesados /
// no válidos en el edge). currentTenantId() (que sí lee el header) vive en el store.

/** Header interno que el proxy setea con el professional_id del tenant resuelto.
 *  El proxy lo SOBREESCRIBE/BORRA siempre → el cliente no lo puede falsificar. */
export const TENANT_HEADER = "x-tenant-pid";

/** Mapa de tenants para la Fase 0: host o slug → professional_id (UUID).
 *  Se configura con la env var TENANTS (JSON). Ej:
 *    TENANTS={"otro.codexy.app":"uuid-otro","otro":"uuid-otro"}
 *  Vacío / ausente = solo existe el tenant por defecto (env PROFESSIONAL_ID). */
function tenantMap(): Record<string, string> {
  try {
    const raw = process.env.TENANTS;
    if (!raw) return {};
    const m = JSON.parse(raw);
    return m && typeof m === "object" ? (m as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/** Resuelve el professional_id a partir del host. Prueba primero el host completo
 *  (dominio propio) y después el primer label (subdominio slug.codexy.app).
 *  Devuelve null si el host no matchea ningún tenant → se usa el tenant por defecto. */
export function resolveTenantFromHost(host: string | null): string | null {
  if (!host) return null;
  const h = host.split(":")[0].trim().toLowerCase();
  if (!h) return null;
  const map = tenantMap();
  if (map[h]) return map[h];
  const slug = h.split(".")[0];
  if (slug && map[slug]) return map[slug];
  return null;
}
