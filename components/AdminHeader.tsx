import { logout } from "@/app/admin/actions";
import { AdminNav } from "./AdminNav";

export function AdminHeader() {
  return (
    <header>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-serif text-2xl tracking-tight text-espresso">
            Paulina<span className="italic text-[var(--a-accent-ink)]"> Pilotti</span>
          </p>
          <p className="admin-kicker mt-0.5 text-[12px]">
            Panel de gestión
          </p>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="/reservar"
            target="_blank"
            className="admin-btn-ghost rounded-full px-4 py-2 text-[13px]"
          >
            Ver reservas del sitio
          </a>
          <form action={logout}>
            <button className="admin-muted text-[13px] underline-offset-4 transition-colors hover:text-[var(--a-danger)] hover:underline">
              Salir
            </button>
          </form>
        </div>
      </div>
      <AdminNav />
    </header>
  );
}
