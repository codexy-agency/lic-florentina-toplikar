import { AdminShell } from "@/components/AdminShell";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { requireAdmin } from "@/lib/session";
import { ROL_LABEL } from "@/lib/permisos";
import { leerAuth } from "@/lib/accounts-store";
import { CambiarPassword } from "@/components/CambiarPassword";
import { soporteUrl } from "@/lib/codexy";

export const dynamic = "force-dynamic";

export default async function CuentaPage() {
  const sesion = await requireAdmin();
  const db = await leerAuth();
  const yo = sesion.userId ? db.users.find((u) => u.id === sesion.userId) : undefined;

  const wa = soporteUrl("Hola, necesito ayuda con mi cuenta de Codexy.");

  return (
    <AdminShell>
      <section className="max-w-2xl">
        <AdminPageHeader title="Mi cuenta" description="Tus datos de acceso a este consultorio." />

        <div className="admin-card mt-6 rounded-2xl p-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--a-accent-soft)] text-[16px] font-semibold text-[var(--a-accent-ink)]">
              {(yo?.nombre?.trim()[0] || "?").toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-espresso">{yo?.nombre ?? "Tu cuenta"}</p>
              <p className="admin-muted text-[13.5px]">{yo?.email ?? "—"}</p>
            </div>
            <span className="admin-chip-accent rounded-full px-3 py-1 text-[12px] font-semibold">
              {ROL_LABEL[sesion.rol]}
            </span>
          </div>
        </div>

        {sesion.userId ? (
          <div className="admin-card mt-4 rounded-2xl p-5">
            <h2 className="text-[17px] font-semibold tracking-tight text-espresso">
              Cambiar mi contraseña
            </h2>
            <p className="admin-muted mt-1 text-[13.5px] leading-relaxed">
              Al cambiarla se cierran las sesiones abiertas en otros equipos. En éste seguís
              adentro.
            </p>
            <CambiarPassword />
          </div>
        ) : (
          <div className="admin-empty mt-4 rounded-2xl p-5">
            <p className="text-[14px] font-medium text-espresso">
              Estás con una sesión sin cuenta propia
            </p>
            <p className="admin-muted mt-1.5 text-[13.5px] leading-relaxed">
              Este consultorio todavía entra con la contraseña vieja, compartida. Creá tu acceso
              personal desde <strong className="text-espresso">Equipo</strong> y volvé a entrar: a
              partir de ahí cada persona tiene su usuario y queda registrado quién hace qué.
            </p>
          </div>
        )}

        {wa && (
          <p className="admin-faint mt-6 text-[13px]">
            ¿Perdiste el acceso o necesitás algo que no está acá?{" "}
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[var(--a-accent-ink)] underline underline-offset-2"
            >
              Escribinos
            </a>
            .
          </p>
        )}
      </section>
    </AdminShell>
  );
}
