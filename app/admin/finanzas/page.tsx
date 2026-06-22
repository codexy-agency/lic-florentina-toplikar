import { getFinanzas } from "@/lib/store";
import { fechaHoraAR, isoToArLocal } from "@/lib/scheduling/slots";
import { AdminShell } from "@/components/AdminShell";
import { requireAdmin } from "@/lib/session";
import { registrarPago, quitarPago, agregarMovimiento, quitarMovimiento } from "./actions";

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
  const ahoraLocal = isoToArLocal(new Date().toISOString());

  const KPIS = [
    { l: "Cobrado", v: money(f.cobrado), sub: "ingresos recibidos", accent: true },
    { l: "Por cobrar", v: money(f.porCobrar), sub: `${f.cantTurnos - f.cantCobrados} turnos pendientes` },
    { l: "Facturado", v: money(f.facturado), sub: `${f.cantTurnos} turnos` },
    { l: "Ticket promedio", v: money(f.ticketProm), sub: "por turno" },
  ];

  return (
    <AdminShell>
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-[26px] tracking-tight text-espresso md:text-[30px]">Finanzas</h1>
            <p className="admin-muted mt-1 text-[14px]">
              Ingresos por turnos y cargados a mano (consultorio). Se calculan
              sobre turnos confirmados y realizados.
            </p>
          </div>
          {/* Cargar un ingreso a mano (plata del consultorio) */}
          <details className="group relative">
            <summary className="admin-btn inline-flex cursor-pointer list-none items-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-medium [&::-webkit-details-marker]:hidden">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Agregar ingreso
            </summary>
            <form
              action={agregarMovimiento}
              className="admin-card absolute right-0 top-full z-20 mt-2 w-[min(92vw,420px)] space-y-3 rounded-2xl p-4 text-left"
            >
              <label className="block">
                <span className="admin-label mb-1 block text-[12px] font-medium">Concepto</span>
                <input name="concepto" required maxLength={120} placeholder="Ej: Sesión en consultorio — Ana" className="admin-input w-full px-3 py-2 text-[14px]" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="admin-label mb-1 block text-[12px] font-medium">Monto</span>
                  <span className="flex items-center gap-1.5">
                    <span className="admin-muted text-[14px]">$</span>
                    <input name="monto" type="number" required min={1} placeholder="0" className="admin-input w-full px-3 py-2 text-[14px]" />
                  </span>
                </label>
                <label className="block">
                  <span className="admin-label mb-1 block text-[12px] font-medium">Fecha</span>
                  <input name="fecha" type="datetime-local" defaultValue={ahoraLocal} className="admin-input w-full px-2.5 py-2 text-[13px]" />
                </label>
              </div>
              <button className="admin-btn w-full rounded-full px-5 py-2.5 text-[14px] font-medium">
                Registrar ingreso
              </button>
            </form>
          </details>
        </div>

        {/* KPIs */}
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {KPIS.map((k) => (
            <div
              key={k.l}
              className={`admin-card rounded-2xl p-4 md:p-5 ${
                k.accent ? "ring-1 ring-[var(--a-accent)]/45" : ""
              }`}
            >
              <p className="admin-kicker text-[11px]">{k.l}</p>
              <p className="mt-2 text-[1.55rem] font-bold tabular-nums leading-none text-[var(--a-text)] md:text-[1.9rem]">
                {k.v}
              </p>
              <p className="admin-faint mt-1.5 text-[12px]">{k.sub}</p>
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
            <p className="admin-empty admin-muted mt-4 rounded-2xl p-8 text-center text-[14px]">
              Acá vas a ver cada turno con su cobro y los ingresos que cargues a
              mano. Aparecen al confirmar turnos o registrar un ingreso.
            </p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {f.movimientos.map((m) => (
                <li
                  key={m.id}
                  className="admin-card flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl p-4"
                >
                  <span
                    aria-hidden
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      m.manual || m.pagado
                        ? "bg-[#25D366]/12 text-[#1c7a45]"
                        : "bg-[var(--a-surface-2)] text-[var(--a-text-3)]"
                    }`}
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      {m.manual || m.pagado ? <path d="M20 6 9 17l-5-5" /> : <><circle cx="12" cy="12" r="9" /><path d="M12 8v4l2.5 1.5" /></>}
                    </svg>
                  </span>
                  <div className="min-w-[150px] flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-espresso">{m.nombre}</p>
                      {m.manual && (
                        <span className="admin-chip-accent rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em]">
                          Manual
                        </span>
                      )}
                    </div>
                    <p className="admin-muted text-[13px]">
                      {m.manual
                        ? `Ingreso del consultorio${m.fecha ? ` · ${fechaHoraAR(m.fecha)} hs` : ""}`
                        : `${m.serviceName || "—"}${m.staffName ? ` · ${m.staffName}` : ""}${m.fecha ? ` · ${fechaHoraAR(m.fecha)} hs` : ""}`}
                    </p>
                  </div>
                  <span className="text-[1.05rem] font-bold tabular-nums text-[var(--a-text)]">
                    {money(m.monto)}
                  </span>
                  {m.manual ? (
                    <form action={quitarMovimiento}>
                      <input type="hidden" name="id" value={m.id} />
                      <button
                        aria-label={`Quitar ingreso ${m.nombre}`}
                        className="admin-btn-ghost rounded-full px-3.5 py-2 text-[12px] font-medium"
                      >
                        Quitar
                      </button>
                    </form>
                  ) : m.pagado ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366]/12 px-3 py-1.5 text-[12px] font-semibold text-[#1c7a45]">
                        {METODO_LABEL[m.metodoPago || ""] || "Cobrado"}
                      </span>
                      <form action={quitarPago}>
                        <input type="hidden" name="id" value={m.id} />
                        <button
                          aria-label={`Deshacer pago de ${m.nombre}`}
                          className="admin-faint rounded-full px-2.5 py-2 text-[12px] transition-colors hover:text-[var(--a-danger)]"
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
                        className="admin-btn rounded-full px-4 py-2.5 text-[13px] font-medium"
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
