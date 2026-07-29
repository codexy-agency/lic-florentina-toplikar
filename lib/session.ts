import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken, SESSION_COOKIE } from "./auth";
import { TENANT_HEADER, esMultiTenant, esTenantConocido } from "./tenant";

/** Tenant (professional_id) del request actual, según el header que puso el proxy.
 *  En multi-tenant, si no se resolvió o es desconocido devuelve null ⇒ no hay
 *  sesión válida posible (fail-closed). */
export async function tenantDelRequest(): Promise<string | null> {
  let pid: string | null = null;
  try {
    pid = (await headers()).get(TENANT_HEADER);
  } catch {
    pid = null;
  }
  if (pid) return esTenantConocido(pid) ? pid : null;
  if (esMultiTenant()) return null;
  return (process.env.PROFESSIONAL_ID || "").trim().toLowerCase() || null;
}

/** ÚNICA verificación de sesión del lado servidor: valida la cookie firmada Y
 *  que esa sesión pertenezca al consultorio de este request. Usarla en TODAS las
 *  server actions y route handlers del panel (no llamar verifyToken suelto: sin
 *  el tenant, la cookie de un psicólogo valdría en el panel de otro). */
export async function sesionValida(): Promise<boolean> {
  const pid = await tenantDelRequest();
  if (esMultiTenant() && !pid) return false;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  try {
    return await verifyToken(token, pid ?? undefined);
  } catch {
    return false; // falta ADMIN_SECRET u otro error → no autenticado
  }
}

/** Igual que sesionValida() pero lanza: atajo para server actions. */
export async function requireSesion(): Promise<void> {
  if (!(await sesionValida())) throw new Error("No autorizado");
}

/** Defensa en profundidad para las páginas del panel (lectura de datos
 *  sensibles). El proxy ya protege /admin, pero los bypass de middleware son un
 *  vector real (CVE-2025-29927), así que re-verificamos la sesión en el árbol de
 *  Server Components. Si no hay sesión válida, manda al login en vez de servir
 *  datos clínicos. Usar al tope de un layout/page de /admin. */
export async function requireAdmin(): Promise<void> {
  if (!(await sesionValida())) redirect("/admin/login");
}
