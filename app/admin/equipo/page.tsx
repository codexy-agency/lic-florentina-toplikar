import { AdminShell } from "@/components/AdminShell";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { requireAdmin } from "@/lib/session";
import { listarEquipo } from "@/lib/accounts";
import { PERMISOS, PERMISO_LABEL, ROL_LABEL, ROLES, tienePermiso, type Rol } from "@/lib/permisos";
import { InvitarMiembro } from "@/components/InvitarMiembro";
import { quitarAcceso, actualizarMiembro, resetearPassword, ultimosAccesos } from "./actions";

export const dynamic = "force-dynamic";

const ACCION_LABEL: Record<string, string> = {
  login: "Ingresó",
  login_fallido: "Intento fallido",
  miembro_creado: "Creó un acceso",
  miembro_actualizado: "Cambió permisos",
  acceso_revocado: "Quitó un acceso",
  password_cambiada: "Cambió una contraseña",
};

function cuando(iso: string) {
  try {
    return new Date(iso).toLocaleString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default async function EquipoPage() {
  const sesion = await requireAdmin("equipo");
  const equipo = sesion.pid ? await listarEquipo(sesion.pid) : [];
  const audit = sesion.pid ? await ultimosAccesos(sesion.pid) : [];
  const activos = equipo.filter((m) => m.membership.activo);

  return (
    <AdminShell>
      <section>
        <AdminPageHeader
          title="Equipo"
          description="Quién entra a este consultorio y qué puede ver. La historia clínica solo la ven los profesionales."
        >
          <InvitarMiembro puedeCrearOwner={sesion.rol === "owner"} />
        </AdminPageHeader>

        {/* Miembros */}
        <div className="mt-6 space-y-3">
          {activos.length === 0 && (
            <p className="admin-empty admin-muted rounded-2xl p-8 text-center text-[14px]">
              Todavía no hay nadie más en el equipo.
            </p>
          )}

          {activos.map(({ user, membership }) => {
            const esYo = user.id === sesion.userId;
            const temporal = (user as { passwordTemporal?: string }).passwordTemporal;
            return (
              <div key={membership.id} className="admin-card rounded-2xl p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--a-accent-soft)] text-[15px] font-semibold text-[var(--a-accent-ink)]">
                    {(user.nombre.trim()[0] || "?").toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-medium text-espresso">
                      {user.nombre}
                      {esYo && <span className="admin-chip rounded-full px-2 py-0.5 text-[11px] font-semibold">vos</span>}
                    </p>
                    <p className="admin-muted text-[13px]">{user.email}</p>
                  </div>
                  <span className="admin-chip-accent rounded-full px-3 py-1 text-[12px] font-semibold">
                    {ROL_LABEL[membership.rol]}
                  </span>
                </div>

                {/* Permisos efectivos */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {PERMISOS.map((p) => {
                    const ok = tienePermiso(membership.rol, membership.permisos, p);
                    return (
                      <span
                        key={p}
                        className={`rounded-full px-2.5 py-1 text-[11.5px] font-medium ${
                          ok
                            ? "bg-[#25D366]/12 text-[#1c7a45]"
                            : "admin-chip opacity-60"
                        }`}
                      >
                        {ok ? "✓" : "✕"} {PERMISO_LABEL[p]}
                      </span>
                    );
                  })}
                </div>

                {temporal && (
                  <p className="mt-3 rounded-xl bg-[var(--a-accent-soft)] px-3 py-2 text-[13px] text-[var(--a-accent-ink)]">
                    Contraseña temporal: <strong className="font-mono">{temporal}</strong> — pasásela por un canal
                    seguro y pedile que la cambie al entrar.
                  </p>
                )}

                {/* Editar */}
                <details className="group mt-3">
                  <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-[13px] font-medium text-[var(--a-accent-ink)] hover:text-[var(--a-accent)] [&::-webkit-details-marker]:hidden">
                    Cambiar rol y permisos
                    <svg className="h-3.5 w-3.5 transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </summary>
                  <form action={actualizarMiembro} className="admin-soft mt-3 rounded-xl p-4">
                    <input type="hidden" name="userId" value={user.id} />
                    <label className="block max-w-xs">
                      <span className="admin-kicker mb-1.5 block text-[12px]">Rol</span>
                      <select name="rol" defaultValue={membership.rol} className="admin-input w-full px-3 py-2 text-[14px]">
                        {ROLES.filter((r) => r !== "owner" || sesion.rol === "owner").map((r: Rol) => (
                          <option key={r} value={r}>{ROL_LABEL[r]}</option>
                        ))}
                      </select>
                    </label>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {PERMISOS.map((p) => (
                        <label key={p} className="flex items-center gap-2 text-[13.5px] text-espresso">
                          <input
                            type="checkbox"
                            name={`permiso_${p}`}
                            defaultChecked={tienePermiso(membership.rol, membership.permisos, p)}
                            className="h-4 w-4 accent-[var(--a-accent)]"
                          />
                          {PERMISO_LABEL[p]}
                        </label>
                      ))}
                    </div>
                    <p className="admin-faint mt-3 text-[12px]">
                      La <strong>historia clínica</strong> es un permiso especial: solo la ven el dueño y los
                      profesionales, aunque acá se tilde.
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button className="admin-btn rounded-full px-5 py-2 text-[13px] font-medium">Guardar</button>
                    </div>
                  </form>
                </details>

                {!esYo && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--a-border)] pt-3">
                    <form action={resetearPassword}>
                      <input type="hidden" name="userId" value={user.id} />
                      <button className="admin-btn-ghost rounded-full px-4 py-1.5 text-[12.5px] font-medium">
                        Generar contraseña temporal
                      </button>
                    </form>
                    <form action={quitarAcceso}>
                      <input type="hidden" name="userId" value={user.id} />
                      <button className="admin-faint rounded-full px-4 py-1.5 text-[12.5px] font-medium transition-colors hover:text-[var(--a-danger)]">
                        Quitar acceso
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Actividad — trazabilidad */}
        {audit.length > 0 && (
          <div className="mt-8">
            <h3 className="text-[18px] font-semibold tracking-tight text-espresso">Actividad reciente</h3>
            <p className="admin-muted mt-1 text-[13px]">Quién entró y qué cambió en los accesos.</p>
            <ul className="admin-card mt-4 divide-y divide-[var(--a-border)] rounded-2xl">
              {audit.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-[13.5px]">
                  <span className="admin-faint w-24 shrink-0 tabular-nums">{cuando(a.ts)}</span>
                  <span className="font-medium text-espresso">{ACCION_LABEL[a.accion] || a.accion}</span>
                  {typeof a.meta?.email === "string" && (
                    <span className="admin-muted">{a.meta.email}</span>
                  )}
                  {a.accion === "login_fallido" && (
                    <span className="ml-auto rounded-full bg-[var(--a-danger-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--a-danger)]">
                      fallido
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </AdminShell>
  );
}
