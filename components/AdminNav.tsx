"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Agenda" },
  { href: "/admin/servicios", label: "Servicios" },
  { href: "/admin/profesionales", label: "Profesionales" },
  { href: "/admin/disponibilidad", label: "Disponibilidad" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="mt-6 flex gap-1 overflow-x-auto rounded-full border border-[var(--color-line)] bg-white/50 p-1">
      {TABS.map((t) => {
        const active = t.href === "/admin" ? path === "/admin" : path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
              active
                ? "bg-espresso text-cream"
                : "text-espresso-soft hover:text-espresso"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
