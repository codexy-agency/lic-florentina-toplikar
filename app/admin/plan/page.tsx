import { AdminShell } from "@/components/AdminShell";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { requireAdmin, suscripcionActual } from "@/lib/session";
import { usoAsistenteDelMes } from "@/lib/assistant/tope";
import { listPacientes } from "@/lib/store";
import { listarEquipo } from "@/lib/accounts";
import { soporteEmail, soporteUrl } from "@/lib/codexy";
import {
  DIAS_DE_PRUEBA,
  ESTADO_LABEL,
  LIMITE_LABEL,
  PLANES,
  PLANES_ORDENADOS,
  diasRestantes,
  precioDe,
  suscripcionPorDefecto,
  type Limites,
  type Moneda,
} from "@/lib/planes";
import { IconoCheck } from "@/components/iconos";

export const dynamic = "force-dynamic";

/** Barra de uso contra el tope del plan. `tope` null = sin límite. */
function Uso({ etiqueta, usados, tope }: { etiqueta: string; usados: number; tope: number | null }) {
  const pct = tope === null ? 0 : Math.min(100, Math.round((usados / tope) * 100));
  const apretado = tope !== null && pct >= 80;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13.5px] text-espresso">{etiqueta}</span>
        <span className={`text-[13px] tabular-nums ${apretado ? "font-semibold text-[var(--a-accent-ink)]" : "admin-muted"}`}>
          {usados}
          {tope === null ? " · sin límite" : ` / ${tope}`}
        </span>
      </div>
      {tope !== null && (
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--a-surface-2)]">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.max(pct, usados > 0 ? 4 : 0)}%`,
              background: apretado ? "var(--a-accent)" : "var(--a-ok)",
            }}
          />
        </div>
      )}
    </div>
  );
}

export default async function PlanPage() {
  const sesion = await requireAdmin();
  const s = (await suscripcionActual()) ?? suscripcionPorDefecto();
  const plan = PLANES[s.plan];
  const dias = diasRestantes(s);

  const [pacientes, equipo, asistente] = await Promise.all([
    listPacientes().catch(() => []),
    sesion.pid ? listarEquipo(sesion.pid).catch(() => []) : Promise.resolve([]),
    sesion.pid ? usoAsistenteDelMes(sesion.pid).catch(() => ({ usados: 0, tope: null })) : Promise.resolve({ usados: 0, tope: null }),
  ]);

  const wa = soporteUrl(
    `Hola, soy de ${sesion.pid ? "un consultorio en Codexy" : "Codexy"} y quiero hablar de mi plan.`
  );

  const usos: { clave: keyof Limites; usados: number }[] = [
    { clave: "pacientes", usados: pacientes.length },
    { clave: "miembros", usados: equipo.filter((m) => m.membership.activo).length },
    { clave: "asistenteMes", usados: asistente.usados },
  ];

  return (
    <AdminShell>
      <section>
        <AdminPageHeader
          title="Mi plan"
          description="Qué incluye tu cuenta y cómo vas de uso este mes."
        />

        {/* Estado actual */}
        <div className="admin-card mt-6 rounded-2xl p-5 sm:p-6">
          <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
            <div className="min-w-0 flex-1">
              <p className="admin-kicker text-[12px]">Tu plan</p>
              <p className="mt-1 text-[24px] font-semibold tracking-tight text-espresso">
                {plan.nombre}
              </p>
              <p className="admin-muted mt-1 text-[13.5px]">{plan.para}</p>
            </div>
            <div className="text-right">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-[12.5px] font-semibold ${
                  s.estado === "activa" || s.estado === "prueba"
                    ? "admin-chip-ok"
                    : s.estado === "vencida"
                    ? "admin-chip-accent"
                    : "bg-[var(--a-danger-soft)] text-[var(--a-danger)]"
                }`}
              >
                {ESTADO_LABEL[s.estado]}
              </span>
              {s.estado !== "prueba" && (
                <p className="mt-2 text-[15px] font-semibold tabular-nums text-espresso">
                  {precioDe(s.plan, s.moneda)}
                  <span className="admin-faint ml-1 text-[12px] font-normal">por mes</span>
                </p>
              )}
              {dias !== null && (
                <p className="admin-muted mt-1 text-[12.5px] tabular-nums">
                  {dias >= 0
                    ? `${s.estado === "prueba" ? "Prueba hasta" : "Pago hasta"} el ${new Date(s.periodoHasta!).toLocaleDateString("es-AR")}`
                    : `Venció el ${new Date(s.periodoHasta!).toLocaleDateString("es-AR")}`}
                </p>
              )}
            </div>
          </div>

          {/* Promesa explícita: no le cortamos el acceso a sus datos */}
          <p className="admin-soft mt-5 rounded-xl p-3.5 text-[13px] leading-relaxed text-[var(--a-text-2)]">
            <strong className="text-espresso">Tus datos son tuyos.</strong> Pase lo que pase con el
            pago, siempre podés entrar, consultar tus historias clínicas y exportar todo. Nunca te
            bloqueamos el acceso a la información de tus pacientes.
          </p>
        </div>

        {/* Uso del mes */}
        <div className="admin-card mt-4 rounded-2xl p-5 sm:p-6">
          <h2 className="text-[18px] font-semibold tracking-tight text-espresso">Tu uso</h2>
          <p className="admin-muted mt-1 text-[13px]">
            Si te queda chico, escribinos: lo ampliamos en el momento.
          </p>
          <div className="mt-5 space-y-4">
            {usos.map((u) => (
              <Uso
                key={u.clave}
                etiqueta={LIMITE_LABEL[u.clave][0].toUpperCase() + LIMITE_LABEL[u.clave].slice(1)}
                usados={u.usados}
                tope={plan.limites[u.clave]}
              />
            ))}
          </div>
        </div>

        {/* Planes */}
        <div className="mt-8">
          <h2 className="text-[18px] font-semibold tracking-tight text-espresso">Los planes</h2>
          <p className="admin-muted mt-1 text-[13px]">
            Se paga por mes y se puede cambiar o dar de baja cuando quieras.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {PLANES_ORDENADOS.map((p) => {
              const actual = p.id === s.plan;
              return (
                <div
                  key={p.id}
                  className={`rounded-2xl border p-5 ${
                    actual
                      ? "border-[var(--a-accent)]/40 bg-[var(--a-accent-soft)]/40"
                      : "border-[var(--a-border)] bg-[var(--a-surface)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-espresso">{p.nombre}</p>
                    {actual && (
                      <span className="admin-chip-accent rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
                        tu plan
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-[20px] font-semibold tabular-nums text-espresso">
                    {p.id === "prueba" ? `${DIAS_DE_PRUEBA} días` : precioDe(p.id, s.moneda as Moneda)}
                    {p.id !== "prueba" && (
                      <span className="admin-faint ml-1 text-[12px] font-normal">/ mes</span>
                    )}
                  </p>
                  <p className="admin-muted mt-1.5 text-[13px] leading-relaxed">{p.para}</p>
                  <ul className="mt-4 space-y-1.5">
                    {(Object.keys(p.limites) as (keyof Limites)[]).map((k) => (
                      <li key={k} className="flex items-start gap-2 text-[13px] text-[var(--a-text-2)]">
                        <IconoCheck size={13} className="mt-1 text-[var(--a-ok)]" />
                        <span>
                          {p.limites[k] === null ? "Sin límite de " : `Hasta ${p.limites[k]} `}
                          {LIMITE_LABEL[k]}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cómo se paga — mientras el cobro es manual, se dice con todas las letras */}
        <div className="admin-card mt-8 rounded-2xl p-5 sm:p-6">
          <h2 className="text-[18px] font-semibold tracking-tight text-espresso">
            Cambiar de plan o pagar
          </h2>
          <p className="admin-muted mt-2 max-w-2xl text-[13.5px] leading-relaxed">
            Todavía no tenemos el cobro automático: nos escribís, te pasamos el link de pago o los
            datos para transferir, y en el momento te dejamos la cuenta al día. Es más trabajo para
            nosotros y menos vueltas para vos.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="admin-btn rounded-full px-5 py-2.5 text-[14px] font-medium"
              >
                Escribirnos por WhatsApp
              </a>
            )}
            <a
              href={`mailto:${soporteEmail()}`}
              className="admin-btn-ghost rounded-full px-5 py-2.5 text-[14px] font-medium"
            >
              {soporteEmail()}
            </a>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}
