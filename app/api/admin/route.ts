import { NextResponse } from "next/server";
import { checkPassword, makeToken, SESSION_COOKIE } from "@/lib/auth";

// POST /api/admin  → login (body: { password })
// DELETE /api/admin → logout
export async function POST(req: Request) {
  try {
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
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
