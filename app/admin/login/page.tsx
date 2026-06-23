"use client";

import { useState, type FormEvent } from "react";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

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
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-5 py-10">
      {/* Fondo: imagen del hero + filtro cálido (mismo lenguaje visual que el panel) */}
      <div aria-hidden className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url(/hero/c1.jpg)" }} />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-[#2a1f26]/88 via-[#3a2730]/82 to-[#17110f]/92" />
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_-10%,rgba(235,196,210,0.14),transparent_55%)]" />

      <div className="relative w-full max-w-[26rem]">
        <div className="overflow-hidden rounded-[2rem] border border-white/15 bg-[#FBF8F2]/95 shadow-[0_44px_100px_-34px_rgba(0,0,0,0.65)] backdrop-blur-xl">
          {/* Acento superior */}
          <div aria-hidden className="h-1.5 bg-gradient-to-r from-[#9C5475] via-[#B5708B] to-[#7E5A75]" />
          <div className="p-8 sm:p-10">
            {/* Marca */}
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#9C5475]/12 font-serif text-[19px] tracking-tight text-[#7E5A75] ring-1 ring-[#9C5475]/15">
                PP
              </span>
              <div className="min-w-0">
                <p className="font-serif text-[19px] leading-tight tracking-tight text-espresso">
                  Paulina<span className="italic text-sage-deep"> Pilotti</span>
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sage-deep">
                  Panel de gestión
                </p>
              </div>
            </div>

            <h1 className="mt-7 font-serif text-[26px] tracking-tight text-espresso">
              Hola de nuevo
            </h1>
            <p className="mt-1 text-[14px] leading-relaxed text-espresso-soft">
              Ingresá tu contraseña para entrar al panel.
            </p>

            <form onSubmit={onSubmit} className="mt-6">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium uppercase tracking-[0.14em] text-sage-deep">
                  Contraseña
                </span>
                <div className="relative">
                  <span aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-espresso-soft/55">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
                    </svg>
                  </span>
                  <input
                    type={show ? "text" : "password"}
                    name="password"
                    required
                    autoFocus
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3.5 pl-11 pr-12 text-[15px] text-espresso placeholder:text-espresso-soft/40 transition-colors focus:border-sage/60 focus:outline-none focus:ring-2 focus:ring-sage/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-espresso-soft/70 transition-colors hover:bg-cream-deep/50 hover:text-espresso"
                  >
                    {show ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c7 0 10 8 10 8a18 18 0 0 1-2.16 3.19M6.6 6.6A18 18 0 0 0 2 12s3 8 10 8a9.1 9.1 0 0 0 5.4-1.6M1 1l22 22M9.9 9.9a3 3 0 1 0 4.2 4.2" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8Z" /><circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </label>

              {error && (
                <p className="mt-3 flex items-center gap-2 rounded-xl bg-[#9C5475]/10 px-3.5 py-2.5 text-[13px] font-medium text-[#9C5475]">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" />
                  </svg>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-espresso px-6 py-4 text-[15px] font-medium text-cream transition-all duration-300 hover:-translate-y-px hover:shadow-card-hover disabled:opacity-60"
              >
                {loading ? "Ingresando…" : "Ingresar"}
                {!loading && (
                  <svg className="h-[18px] w-[18px] transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12h15M13 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            </form>

            <p className="mt-7 flex items-center justify-center gap-1.5 border-t border-[var(--color-line)] pt-5 text-center text-[12px] text-espresso-soft/70">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
              Acceso privado · Lic. Paulina Pilotti · MP 7321
            </p>
          </div>
        </div>

        <p className="mt-4 text-center text-[12px] tracking-wide text-cream/55">
          Desarrollado por <span className="font-medium text-cream/75">Codexy</span>
        </p>
      </div>
    </main>
  );
}
