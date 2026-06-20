"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Agenda" },
  { href: "/admin/pacientes", label: "Pacientes" },
  { href: "/admin/finanzas", label: "Finanzas" },
  { href: "/admin/servicios", label: "Servicios" },
  { href: "/admin/profesionales", label: "Profesionales" },
  { href: "/admin/disponibilidad", label: "Disponibilidad" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <div className="relative mt-6">
      <nav className="admin-card flex snap-x gap-1 overflow-x-auto rounded-full p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => {
          const active = t.href === "/admin" ? path === "/admin" : path.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`shrink-0 snap-start rounded-full px-3.5 py-2.5 text-[13px] font-medium transition-colors sm:px-4 sm:text-[13.5px] ${
                active
                  ? "bg-espresso text-cream shadow-[0_8px_20px_-12px_rgba(58,49,55,0.6)]"
                  : "text-espresso-soft hover:bg-[#F0EEED] hover:text-espresso"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
      {/* pista visual de que hay más pestañas hacia la derecha */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-1 right-0 w-10 rounded-r-full bg-gradient-to-l from-white to-transparent"
      />
    </div>
  );
}
