"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Agenda" },
  { href: "/admin/finanzas", label: "Finanzas" },
  { href: "/admin/servicios", label: "Servicios" },
  { href: "/admin/profesionales", label: "Profesionales" },
  { href: "/admin/disponibilidad", label: "Disponibilidad" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="admin-card mt-6 flex gap-1 overflow-x-auto rounded-full p-1">
      {TABS.map((t) => {
        const active = t.href === "/admin" ? path === "/admin" : path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`shrink-0 rounded-full px-4 py-2 text-[13.5px] font-medium transition-colors ${
              active
                ? "bg-espresso text-cream shadow-[0_8px_20px_-12px_rgba(58,49,55,0.6)]"
                : "text-espresso-soft hover:bg-[#F4EEEF] hover:text-espresso"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
