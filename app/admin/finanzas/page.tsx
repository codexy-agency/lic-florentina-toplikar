import { getFinanzas } from "@/lib/store";
import { fechaHoraAR } from "@/lib/scheduling/slots";
import { AdminShell } from "@/components/AdminShell";
import { AdminHeader } from "@/components/AdminHeader";
import { requireAdmin } from "@/lib/session";
import { registrarPago, quitarPago } from "./actions";

export const dynamic = "force-dynamic";

const money = (n?: number) => "$" + (n ?? 0).toLocaleString("es-AR");
const METODOS = ["efectivo", "transferencia", "mercadopago", "tarjeta"];
const METODO_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  mercadopago: "Mercado Pago",
  tarjeta: "Tarjeta",
};

export default async function FinanzasPage() {
  await requireAdmin();
  const f = await getFinanzas();
  const maxMes = Math.max(1, ...f.porMes.map((m) => m.facturado));

  const KPIS = [
    { l: "Cobrado", v: money(f.cobrado), sub: `${f.cantCobrados} turnos`, accent: true },
    { l: "Por cobrar", v: money(f.porCobrar), sub: `${f.cantTurnos - f.cantCobrados} pendientes` },
    { l: "Facturado", v: money(f.facturado), sub: `${f.cantTurnos} turnos` },
    { l: "Ticket promedio", v: money(f.ticketProm), sub: "por turno" },
  ];

  return (
    <AdminShell>
      <AdminHeader />

      <section className="mt-8">
        <h2 className="font-serif text-2xl tracking-tight text-espresso">Finanzas</h2>
        <p className="admin-muted mt-1 text-[14px]">
          Cuentas por servicio y por profesional. Se calculan sobre los turnos
          confirmados y realizados.
        </p>

        {/* KPIs */}
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {KPIS.map((k) => (
            <div
              key={k.l}
              className={`admin-card rounded-2xl p-4 md:p-5 ${
                k.accent ? "border-[var(--a-accent)]" : ""
              }`}
            >
              <p className="admin-kicker text-[11px]">{k.l}</p>
              <p className="admin-stat mt-1.5 font-serif text-2xl font-light tabular-nums md:text-[28px]">
                {k.v}
              </p>
              <p className="admin-faint mt-0.5 text-[12px]">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Evolución por mes + por servicio */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {/* Por mes */}
          <div className="admin-card rounded-2xl p-5">
            <h3 className="admin-kicker text-[13px]">
              Evolución mensual
            </h3>
            {f.porMes.length === 0 ? (
              <p className="admin-muted mt-6 text-[14px]">Todavía sin datos.</p>
            ) : (
              <div
                role="img"
                aria-label={`Evolución mensual. ${f.porMes
                  .map((m) => `${m.label}: facturado ${money(m.facturado)}, cobrado ${money(m.cobrado)}`)
                  .join("; ")}`}
                className="mt-5 flex items-end gap-3"
                style={{ height: "150px" }}
              >
                {f.porMes.map((m) => (
                  <div key={m.key} className="flex flex-1 flex-col items-center justify-end gap-2">
                    <div className="relative flex w-full max-w-[44px] flex-1 items-end">
                      <div
                        className="w-full rounded-t-md border border-[var(--a-border-strong)] bg-[var(--a-border)]"
                        style={{ height: `${(m.facturado / maxMes) * 100}%` }}
                      />
                      <div
                        className="absolute bottom-0 w-full rounded-t-md bg-[var(--a-accent)]"
                        style={{ height: `${(m.cobrado / maxMes) * 100}%` }}
                      />
                    </div>
                    <span className="admin-muted text-center text-[11px] capitalize leading-tight">
                      {m.label}
                      <span className="admin-faint block text-[10px] tabular-nums">
                        {money(m.cobrado)}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="admin-muted mt-4 flex gap-4 text-[12px]">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--a-accent)]" /> Cobrado
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full border border-[var(--a-border-strong)] bg-[var(--a-border)]" /> Facturado
              </span>
            </div>
          </div>

          {/* Por servicio */}
          <div className="admin-card rounded-2xl p-5">
            <h3 className="admin-kicker text-[13px]">
              Por servicio
            </h3>
            {f.porServicio.length === 0 ? (
              <p className="admin-muted mt-6 text-[14px]">Todavía sin datos.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {f.porServicio.map((s) => (
                  <li key={s.nombre}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[14px] font-medium text-espresso">{s.nombre}</span>
                      <span className="admin-stat text-[14px] tabular-nums">{money(s.monto)}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--a-border)]">
                        <div
                          className="h-full rounded-full bg-[var(--a-accent)]"
                          style={{ width: `${s.monto ? (s.cobrado / s.monto) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="admin-muted text-[12px]">
                        {s.cantidad} · {money(s.cobrado)} cobrado
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Por profesional */}
        {f.porProfesional.length > 0 && (
          <div className="admin-card mt-4 rounded-2xl p-5">
            <h3 className="admin-kicker text-[13px]">
              Por profesional
            </h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {f.porProfesional.map((p) => (
                <div key={p.nombre} className="admin-soft rounded-xl p-4">
                  <p className="font-medium text-espresso">{p.nombre}</p>
                  <p className="admin-stat mt-1 font-serif text-xl tabular-nums">{money(p.monto)}</p>
                  <p className="admin-muted text-[12px]">
                    {p.cantidad} turnos · {money(p.cobrado)} cobrado
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Movimientos */}
        <div className="mt-4">
          <h3 className="font-serif text-lg tracking-tight text-espresso">Movimientos</h3>
          {f.movimientos.length === 0 ? (
            <p className="admin-empty admin-muted mt-3 rounded-2xl p-8 text-center text-[14px]">
              Acá vas a ver cada turno con su cobro. Aparecen al confirmar turnos.
            </p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {f.movimientos.map((m) => (
                <li
                  key={m.id}
                  className="admin-card flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl p-4"
                >
                  <div className="min-w-[160px] flex-1">
                    <p className="font-medium text-espresso">{m.nombre}</p>
                    <p className="admin-muted text-[13px]">
                      {m.serviceName || "—"}
                      {m.staffName ? ` · ${m.staffName}` : ""}
                      {m.fecha ? ` · ${fechaHoraAR(m.fecha)} hs` : ""}
                    </p>
                  </div>
                  <span className="admin-stat font-serif text-lg tabular-nums">
                    {money(m.monto)}
                  </span>
                  {m.pagado ? (
                    <div className="flex items-center gap-2">
                      <span className="admin-chip inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium">
                        ✓ {METODO_LABEL[m.metodoPago || ""] || "Pagado"}
                      </span>
                      <form action={quitarPago}>
                        <input type="hidden" name="id" value={m.id} />
                        <button
                          aria-label={`Deshacer pago de ${m.nombre}`}
                          className="admin-danger rounded-full px-2.5 py-2 text-[12px]"
                        >
                          Deshacer
                        </button>
                      </form>
                    </div>
                  ) : (
                    <form
                      action={registrarPago}
                      className="flex w-full flex-wrap items-center gap-2 sm:w-auto"
                    >
                      <input type="hidden" name="id" value={m.id} />
                      <select
                        name="metodo"
                        aria-label={`Método de pago para ${m.nombre}`}
                        className="admin-input flex-1 px-2.5 py-2 text-[13px] sm:flex-none"
                        defaultValue="efectivo"
                      >
                        {METODOS.map((x) => (
                          <option key={x} value={x}>
                            {METODO_LABEL[x]}
                          </option>
                        ))}
                      </select>
                      <button
                        aria-label={`Registrar pago de ${m.nombre}`}
                        className="rounded-full bg-espresso px-4 py-2.5 text-[13px] font-medium text-cream transition-colors hover:bg-espresso/90"
                      >
                        Registrar pago
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </AdminShell>
  );
}
