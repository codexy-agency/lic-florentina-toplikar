import { logout } from "@/app/admin/actions";
import { AdminNav } from "./AdminNav";

export function AdminHeader() {
  return (
    <header>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-serif text-2xl tracking-tight text-espresso">
            Paulina<span className="italic text-sage-deep"> Pilotti</span>
          </p>
          <p className="mt-0.5 text-[12px] uppercase tracking-[0.18em] text-sage-deep">
            Panel de gestión
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/reservar"
            target="_blank"
            className="rounded-full border border-[var(--color-line)] px-4 py-2 text-[13px] text-espresso-soft transition-colors hover:text-espresso"
          >
            Ver reservas del sitio
          </a>
          <form action={logout}>
            <button className="rounded-full border border-[var(--color-line)] px-4 py-2 text-[13px] text-espresso-soft transition-colors hover:text-espresso">
              Salir
            </button>
          </form>
        </div>
      </div>
      <AdminNav />
    </header>
  );
}
