import { NextResponse } from "next/server";
import { checkPassword, makeToken, readToken, SESSION_COOKIE } from "@/lib/auth";
import { tenantDelRequest } from "@/lib/session";
import { esMultiTenant } from "@/lib/tenant";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { login, tieneCuentas, revocarSesion } from "@/lib/accounts";
import { TTL_SOPORTE_SEG } from "@/lib/soporte";
import { cookies } from "next/headers";

// POST /api/admin  → login (body: { email, password })
// DELETE /api/admin → logout
export async function POST(req: Request) {
  try {
    // El login lleva solo una contraseña corta: rechazamos bodies grandes ANTES
    // de parsear y antes de tocar checkPassword.
    const len = Number(req.headers.get("content-length") || 0);
    if (Number.isFinite(len) && len > 4_000) {
      return NextResponse.json({ ok: false, error: "Solicitud inválida." }, { status: 413 });
    }
    // Anti-fuerza-bruta: la contraseña es la única puerta a los datos de
    // pacientes. Máx. 6 intentos cada 5 min por IP.
    // Por consultorio: el anti-fuerza-bruta de un panel no puede bloquear el
    // login de otro cliente que comparta salida a internet (oficina, coworking).
    const rl = rateLimit(`login:${(await tenantDelRequest()) ?? "-"}:${clientIp(req)}`, 6, 5 * 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { ok: false, error: "Demasiados intentos. Esperá unos minutos." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
      );
    }

    // No confiar solo en content-length: cortar por tamaño real antes de parsear.
    const raw = await req.text();
    if (raw.length > 4_000) {
      return NextResponse.json({ ok: false, error: "Solicitud inválida." }, { status: 413 });
    }
    let password = "";
    let email = "";
    try {
      const body = JSON.parse(raw) || {};
      password = String(body.password || "");
      email = String(body.email || "");
    } catch {
      password = "";
    }
    // El login es POR CONSULTORIO: se valida contra el tenant de este host y el
    // token queda atado a él (no sirve en el panel de otro).
    const pid = await tenantDelRequest();
    if (esMultiTenant() && !pid) {
      return NextResponse.json({ ok: false, error: "Consultorio no encontrado." }, { status: 404 });
    }

    let claims: { pid?: string; uid?: string; sid?: string };
    let maxAge = 60 * 60 * 12; // 12 h para una sesión normal

    // ¿Este consultorio ya tiene cuentas individuales?
    const conCuentas = pid ? await tieneCuentas(pid) : false;

    if (conCuentas) {
      // Camino normal: email + contraseña, con bloqueo por intentos POR CUENTA.
      const r = await login(email, password, pid!, { userAgent: req.headers.get("user-agent") || undefined });
      if (!r.ok) {
        return NextResponse.json(
          { ok: false, error: r.error },
          r.retryAfter
            ? { status: 429, headers: { "Retry-After": String(r.retryAfter) } }
            : { status: 401 }
        );
      }
      claims = { pid: pid!, uid: r.user.id, sid: r.sessionId };
      // Una sesión de soporte de Codexy dura 1 h, no 12: es acceso a la cuenta
      // de otra persona y no tiene por qué quedar abierta todo el día.
      if (r.soporte) maxAge = TTL_SOPORTE_SEG;
    } else {
      // VENTANA DE TRANSICIÓN: mientras el consultorio no tenga ninguna cuenta,
      // se acepta la contraseña del consultorio (ADMIN_PASSWORDS/ADMIN_PASSWORD)
      // para no dejar a nadie afuera. Se apaga sola al crear la primera cuenta.
      if (!checkPassword(password, pid ?? undefined)) {
        return NextResponse.json({ ok: false, error: "Contraseña incorrecta." }, { status: 401 });
      }
      claims = { pid: pid ?? undefined };
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, await makeToken(claims), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // HTTPS en Vercel; http en local
      sameSite: "lax",
      path: "/",
      maxAge,
    });
    return res;
  } catch (e) {
    // checkPassword/makeToken lanzan si faltan ADMIN_PASSWORD/ADMIN_SECRET.
    console.error("[api/admin] login:", e);
    return NextResponse.json(
      { ok: false, error: "El panel no está configurado (faltan variables de entorno)." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  // Revocar la sesión del lado servidor (no alcanza con borrar la cookie: si
  // alguien la copió, seguiría siendo válida hasta el TTL).
  try {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    const claims = await readToken(token);
    if (claims && claims.sid !== "-") await revocarSesion(claims.sid);
  } catch {
    /* logout best-effort */
  }
  const res = NextResponse.json({ ok: true });
  // Flags simétricos al login para que el borrado sea consistente.
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
