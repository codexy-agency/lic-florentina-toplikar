import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken, SESSION_COOKIE } from "@/lib/auth";
import { resolveTenantFromHost, TENANT_HEADER, esMultiTenant } from "@/lib/tenant";

// (1) Resuelve el TENANT (professional_id) por host y lo propaga en un header de
//     request para que el store lea/escriba los datos de ESE psicólogo.
// (2) Protege /admin (excepto login).
// En Next 16 el convention "middleware" se renombró a "proxy".
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Header de tenant: lo seteamos NOSOTROS a partir del host. Copiamos los headers
  // del request y SIEMPRE sobreescribimos/borramos el nuestro para que un cliente
  // no pueda falsificarlo y acceder a datos de otro tenant. Si el host no matchea,
  // no se setea → el store usa el tenant por defecto (env PROFESSIONAL_ID).
  const pid = resolveTenantFromHost(req.headers.get("host"));
  const headers = new Headers(req.headers);
  if (pid) headers.set(TENANT_HEADER, pid);
  else headers.delete(TENANT_HEADER);

  // FAIL-CLOSED: en modo multi-tenant, un host que no resuelve a NINGÚN
  // consultorio no se sirve. Nunca degradamos al tenant por defecto: eso sería
  // entregar (y dejar escribir) la historia clínica de otra persona por un simple
  // error de configuración, un alias de Vercel o un preview deployment.
  if (!pid && esMultiTenant()) {
    return new NextResponse("Consultorio no encontrado.", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    let ok = false;
    try {
      // La sesión debe pertenecer a ESTE consultorio: un token emitido en el host
      // de otro psicólogo no vale acá (replay cross-tenant).
      ok = await verifyToken(token, pid ?? undefined);
    } catch {
      // Falta ADMIN_SECRET u otro error: tratamos como NO autenticado (a login),
      // en vez de romper toda la zona /admin con un 500.
      ok = false;
    }
    if (!ok) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next({ request: { headers } });
}

// Corre en (casi) todo el sitio para poder resolver el tenant en paginas, APIs y
// server actions; excluye assets estaticos.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
