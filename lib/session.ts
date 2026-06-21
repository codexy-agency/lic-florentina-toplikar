import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken, SESSION_COOKIE } from "./auth";

/** Defensa en profundidad para las páginas del panel (lectura de datos
 *  sensibles). El proxy ya protege /admin, pero los bypass de middleware son un
 *  vector real (CVE-2025-29927), así que re-verificamos la sesión en el árbol de
 *  Server Components. Si no hay sesión válida, manda al login en vez de servir
 *  datos clínicos. Usar al tope de un layout/page de /admin. */
export async function requireAdmin(): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  let ok = false;
  try {
    ok = await verifyToken(token);
  } catch {
    ok = false; // falta ADMIN_SECRET u otro error → no autenticado
  }
  if (!ok) redirect("/admin/login");
}
