import { NextResponse } from "next/server";
import { checkPassword, makeToken, SESSION_COOKIE } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/ratelimit";

// POST /api/admin  → login (body: { password })
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
    const rl = rateLimit(`login:${clientIp(req)}`, 6, 5 * 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { ok: false, error: "Demasiados intentos. Esperá unos minutos." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
      );
    }

    const { password } = await req.json().catch(() => ({ password: "" }));
    if (!checkPassword(String(password || ""))) {
      return NextResponse.json(
        { ok: false, error: "Contraseña incorrecta." },
        { status: 401 }
      );
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, await makeToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // HTTPS en Vercel; http en local
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12, // 12 h
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
