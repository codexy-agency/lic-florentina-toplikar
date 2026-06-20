"use client";

import { useState, type FormEvent } from "react";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const password = new FormData(e.currentTarget).get("password");
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      window.location.href = "/admin";
    } else {
      setError("Contraseña incorrecta. Probá de nuevo.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-5">
      <div className="w-full max-w-sm rounded-[2rem] border border-[var(--color-line)] bg-white/50 p-2 shadow-card backdrop-blur-sm">
        <div className="rounded-[calc(2rem-0.5rem)] bg-cream-deep/40 p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]">
          <p className="font-serif text-2xl tracking-tight text-espresso">
            Paulina<span className="italic text-sage-deep"> Pilotti</span>
          </p>
          <p className="mt-1 text-[12px] uppercase tracking-[0.18em] text-sage-deep">
            Panel de gestión
          </p>
          <form onSubmit={onSubmit} className="mt-7">
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-medium uppercase tracking-[0.14em] text-sage-deep">
                Contraseña
              </span>
              <input
                type="password"
                name="password"
                required
                autoFocus
                placeholder="••••••••"
                className="w-full rounded-2xl border border-[var(--color-line)] bg-cream px-4 py-3 text-[15px] text-espresso focus:border-sage/60 focus:outline-none focus:ring-2 focus:ring-sage/30"
              />
            </label>
            {error && (
              <p className="mt-3 text-[13px] text-[#9C5475]">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-full bg-espresso px-6 py-3.5 text-[15px] font-medium text-cream transition-all duration-300 hover:-translate-y-px hover:shadow-card-hover disabled:opacity-60"
            >
              {loading ? "Ingresando…" : "Ingresar"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
