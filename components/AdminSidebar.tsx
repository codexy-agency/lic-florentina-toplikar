"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logout } from "@/app/admin/actions";

type Item = { href: string; label: string; icon: React.ReactNode };

const I = (d: string) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const NAV: Item[] = [
  { href: "/admin", label: "Agenda", icon: I("M3 4h18v18H3zM3 10h18M16 2v4M8 2v4") },
  {
    href: "/admin/pacientes",
    label: "Pacientes",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9" />
      </svg>
    ),
  },
  { href: "/admin/finanzas", label: "Finanzas", icon: I("M3 3v18h18M7 14l3-4 4 3 5-7") },
  { href: "/admin/servicios", label: "Servicios", icon: I("M4 4h7l9 9-7 7-9-9V4ZM7.5 7.5h.01") },
  {
    href: "/admin/profesionales",
    label: "Profesionales",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    ),
  },
  {
    href: "/admin/disponibilidad",
    label: "Disponibilidad",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
      </svg>
    ),
  },
];

function isActive(path: string, href: string) {
  return href === "/admin" ? path === "/admin" : path.startsWith(href);
}

function Brand() {
  return (
    <Link href="/admin" className="block">
      <p className="font-serif text-xl tracking-tight text-cream">
        Paulina<span className="italic text-[#EBC4D2]"> Pilotti</span>
      </p>
      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-cream/55">
        Panel de gestión
      </p>
    </Link>
  );
}

/** Capas de fondo: imagen del hero + filtro oscuro para que el texto se lea. */
function Fondo() {
  return (
    <>
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/hero/c1.jpg)" }}
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-[#2a1f26]/68 via-[#2c2026]/74 to-[#1b1418]/88"
      />
      {/* Refuerzo de legibilidad sólo detrás del texto (izquierda), dejando ver
          más la imagen sin perder contraste. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-[#1f161b]/55 via-[#1f161b]/15 to-transparent"
      />
    </>
  );
}

export function AdminSidebar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  // El topbar mobile se oculta al bajar y reaparece al subir (más lugar para el contenido).
  const [hideBar, setHideBar] = useState(false);
  useEffect(() => {
    setOpen(false);
    setHideBar(false);
  }, [path]);
  useEffect(() => {
    let last = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y > last && y > 72) setHideBar(true); // bajando: ocultar
        else if (y < last - 4) setHideBar(false); // subiendo: mostrar
        last = y;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  // Título de la sección actual (para el topbar mobile estilo panel).
  const current = NAV.find((t) => isActive(path, t.href))?.label ?? "Panel";

  const nav = (
    <nav className="flex-1 space-y-1">
      {NAV.map((t) => {
        const active = isActive(path, t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] font-medium transition-colors ${
              active
                ? "bg-white/[0.14] text-cream"
                : "text-cream/70 hover:bg-white/[0.08] hover:text-cream"
            }`}
          >
            {active && (
              <span aria-hidden className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#EBC4D2]" />
            )}
            <span className={active ? "text-[#EBC4D2]" : "text-cream/55"}>{t.icon}</span>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="space-y-1 border-t border-white/10 pt-4">
      <a
        href="/reservar"
        target="_blank"
        className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-cream/70 transition-colors hover:bg-white/[0.08] hover:text-cream"
      >
        <span className="text-cream/55">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
          </svg>
        </span>
        Ver el sitio
      </a>
      <form action={logout}>
        <button className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-cream/70 transition-colors hover:bg-[#A8473D]/40 hover:text-cream">
          <span className="text-cream/55">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </span>
          Salir
        </button>
      </form>
    </div>
  );

  return (
    <>
      {/* Topbar — solo mobile. Barra de panel de vidrio (no header de landing):
          botón de menú claro + sección actual + monograma. Se oculta al bajar. */}
      <header
        className={`sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--a-border)] bg-[var(--a-surface)]/72 px-4 py-2.5 backdrop-blur-xl backdrop-saturate-150 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] md:hidden ${
          hideBar ? "-translate-y-full" : "translate-y-0"
        }`}
      >
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menú de navegación"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--a-border-strong)] bg-[var(--a-surface)] text-[var(--a-text)] transition-colors hover:bg-[var(--a-surface-2)] active:scale-95"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <p className="admin-kicker text-[10px] leading-none">Panel de gestión</p>
          <p className="mt-0.5 truncate text-[15px] font-semibold leading-tight text-[var(--a-text)]">
            {current}
          </p>
        </div>
        <Link
          href="/admin"
          aria-label="Inicio del panel"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--a-accent-soft)] font-serif text-[15px] tracking-tight text-[var(--a-accent-ink)]"
        >
          PP
        </Link>
      </header>

      {/* Backdrop drawer (mobile) */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm md:hidden"
          aria-hidden
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[252px] flex-col overflow-hidden transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] md:translate-x-0 ${
          open ? "translate-x-0 shadow-2xl" : "-translate-x-full md:shadow-none"
        }`}
      >
        <Fondo />
        <div className="relative flex h-full flex-col gap-6 px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="px-1.5">
              <Brand />
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Cerrar menú"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-cream/70 hover:bg-white/10 md:hidden"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          {nav}
          {footer}
        </div>
      </aside>
    </>
  );
}
