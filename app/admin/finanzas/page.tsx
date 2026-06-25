import Link from "next/link";
import { getFinanzas } from "@/lib/store";
import { fechaHoraAR, isoToArLocal } from "@/lib/scheduling/slots";
import { AdminShell } from "@/components/AdminShell";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { requireAdmin } from "@/lib/session";
import { registrarPago, quitarPago, agregarMovimiento, quitarMovimiento } from "./actions";

export const dynamic = "force-dynamic";

const money = (n?: number) => {
  const v = n ?? 0;
  return (v < 0 ? "−$" : "$") + Math.abs(v).toLocaleString("es-AR");
};
const METODOS = ["efectivo", "transferencia", "mercadopago", "tarjeta"];
const METODO_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  mercadopago: "Mercado Pago",
  tarjeta: "Tarjeta",
};
const PERIODOS = [
  { k: "mes", l: "Este mes" },
  { k: "mes-pasado", l: "Mes pasado" },
  { k: "anio", l: "Este año" },
  { k: "todo", l: "Histórico" },
];
const CATEGORIAS_GASTO = [
  "Alquiler",
  "Supervisión",
  "Impuestos / monotributo",
  "Matrícula",
  "Materiales",
  "Otros",
];

type Kpi = {
  l: string;
  v: string;
  sub: string;
  accent?: boolean;
  hero?: boolean;
  danger?: boolean;
  delta?: number | null;
};

/** Variación % respecto al mes anterior (▲ verde / ▼ rojo). */
function Delta({ d }: { d: number | null | undefined }) {
  if (d == null) return null;
  const up = d >= 0;
  return (
    <span
      className={`mt-1.5 flex items-center gap-1 text-[11px] font-semibold ${
        up ? "text-[#1c7a45]" : "text-[var(--a-danger)]"
      }`}
    >
      {up ? "▲" : "▼"} {Math.abs(d)}%
      <span className="admin-faint font-normal">vs mes pasado</span>
    </span>
  );
}

export default async function FinanzasPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const periodo = PERIODOS.some((p) => p.k === sp.periodo) ? sp.periodo! : "mes";
  const f = await getFinanzas(periodo);
  const maxMes = Math.max(1, ...f.porMes.map((m) => m.facturado));
  const maxMetodo = Math.max(1, ...f.porMetodo.map((m) => m.monto));
  const ahoraLocal = isoToArLocal(new Date().toISOString());

  const sinCobrar = f.cantTurnos - f.cantCobrados;
  const KPIS: Kpi[] = [
    { l: "Cobrado", v: money(f.cobrado), sub: "ingresos recibidos", accent: true, delta: f.deltaCobrado },
    { l: "Gastos", v: f.egresos ? "−" + money(f.egresos) : money(0), sub: "egresos del período", danger: f.egresos > 0 },
    { l: "Neto", v: money(f.neto), sub: "cobrado − gastos", hero: true, danger: f.neto < 0 },
    { l: "Por cobrar", v: money(f.porCobrar), sub: `${sinCobrar} ${sinCobrar === 1 ? "turno" : "turnos"} sin cobrar` },
  ];
  const KPIS2: Kpi[] = [
    { l: "Facturado", v: money(f.facturado), sub: `${f.cantTurnos} turnos`, delta: f.deltaFacturado },
    { l: "Ticket promedio", v: money(f.ticketProm), sub: "por turno" },
  ];

  return (
    <AdminShell>
      <section>
        <AdminPageHeader
          title="Finanzas"
          description="Ingresos por turnos y cargados a mano (consultorio). Se calculan sobre turnos confirmados y realizados."
        >
          {/* Acciones: cargar ingreso, cargar gasto y exportar para la contadora.
              Mobile: bloques estáticos full-width (evita overflow horizontal).
              sm+: dropdowns flotantes anclados a la derecha. */}
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            {/* Agregar ingreso (plata del consultorio) */}
            <details className="group relative w-full sm:w-auto">
              <summary className="admin-btn inline-flex w-full cursor-pointer list-none items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-medium [&::-webkit-details-marker]:hidden sm:w-auto">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Agregar ingreso
              </summary>
              <form
                action={agregarMovimiento}
                className="admin-card mt-3 w-full space-y-3 rounded-2xl p-4 text-left sm:absolute sm:right-0 sm:top-full sm:mt-2 sm:w-[min(92vw,420px)] sm:z-20"
              >
                <label className="block">
                  <span className="admin-label mb-1 block text-[12px] font-medium">Concepto</span>
                  <input name="concepto" required maxLength={120} placeholder="Ej: Sesión en consultorio — Ana" className="admin-input w-full px-3 py-2 text-[14px]" />
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

            {/* Agregar gasto (egreso del consultorio) */}
            <details className="group relative w-full sm:w-auto">
              <summary className="admin-btn-ghost inline-flex w-full cursor-pointer list-none items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-medium [&::-webkit-details-marker]:hidden sm:w-auto">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M5 12h14" />
                </svg>
                Agregar gasto
              </summary>
              <form
                action={agregarMovimiento}
                className="admin-card mt-3 w-full space-y-3 rounded-2xl p-4 text-left sm:absolute sm:right-0 sm:top-full sm:mt-2 sm:w-[min(92vw,420px)] sm:z-20"
              >
                <input type="hidden" name="tipo" value="egreso" />
                <label className="block">
                  <span className="admin-label mb-1 block text-[12px] font-medium">Concepto</span>
                  <input name="concepto" required maxLength={120} placeholder="Ej: Alquiler del consultorio" className="admin-input w-full px-3 py-2 text-[14px]" />
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="admin-label mb-1 block text-[12px] font-medium">Monto</span>
                    <span className="flex items-center gap-1.5">
                      <span className="admin-muted text-[14px]">$</span>
                      <input name="monto" type="number" required min={1} placeholder="0" className="admin-input w-full px-3 py-2 text-[14px]" />
                    </span>
                  </label>
                  <label className="block">
                    <span className="admin-label mb-1 block text-[12px] font-medium">Categoría</span>
                    <select name="categoria" defaultValue={CATEGORIAS_GASTO[0]} className="admin-input w-full px-2.5 py-2 text-[13px]">
                      {CATEGORIAS_GASTO.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="block">
                  <span className="admin-label mb-1 block text-[12px] font-medium">Fecha</span>
                  <input name="fecha" type="datetime-local" defaultValue={ahoraLocal} className="admin-input w-full px-2.5 py-2 text-[13px]" />
                </label>
                <button className="admin-btn-ghost w-full rounded-full px-5 py-2.5 text-[14px] font-medium">
                  Registrar gasto
                </button>
              </form>
            </details>

            {/* Exportar a CSV para la contadora (navegación normal → descarga) */}
            <a
              href={`/admin/finanzas/export?periodo=${periodo}`}
              className="admin-chip inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-medium hover:border-[var(--a-border-strong)] sm:w-auto"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Exportar
            </a>
          </div>
        </AdminPageHeader>

        {/* Selector de período */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {PERIODOS.map((p) => {
            const active = p.k === periodo;
            return (
              <Link
                key={p.k}
                href={`/admin/finanzas?periodo=${p.k}`}
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                  active
                    ? "bg-[var(--a-accent)] text-white shadow-[0_6px_16px_-8px_rgba(138,74,102,0.6)]"
                    : "admin-chip hover:border-[var(--a-border-strong)]"
                }`}
              >
                {p.l}
              </Link>
            );
          })}
        </div>

        {/* KPIs principales: cobrado / gastos / neto / por cobrar */}
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {KPIS.map((k) => (
            <div
              key={k.l}
              className={`admin-card rounded-2xl p-4 md:p-5 ${
                k.hero
                  ? "bg-[var(--a-accent)]/[0.05] ring-1 ring-[var(--a-accent)]/55"
                  : k.accent
                  ? "ring-1 ring-[var(--a-accent)]/40"
                  : ""
              }`}
            >
              <p className="admin-kicker text-[11px]">{k.l}</p>
              <p
                className={`mt-2 text-[1.55rem] font-bold tabular-nums leading-none md:text-[1.9rem] ${
                  k.danger ? "text-[var(--a-danger)]" : "text-[var(--a-text)]"
                }`}
              >
                {k.v}
              </p>
              {k.delta != null ? (
                <Delta d={k.delta} />
              ) : (
                <p className="admin-faint mt-1.5 text-[12px]">{k.sub}</p>
              )}
            </div>
          ))}
        </div>

        {/* KPIs de contexto: facturado / ticket */}
        <div className="mt-3 grid grid-cols-2 gap-3 sm:max-w-md md:gap-4">
          {KPIS2.map((k) => (
            <div key={k.l} className="admin-soft rounded-2xl p-4">
              <p className="admin-kicker text-[11px]">{k.l}</p>
              <p className="mt-1.5 text-[1.25rem] font-bold tabular-nums leading-none text-[var(--a-text)]">
                {k.v}
              </p>
              {k.delta != null ? (
                <Delta d={k.delta} />
              ) : (
                <p className="admin-faint mt-1 text-[12px]">{k.sub}</p>
              )}
            </div>
          ))}
        </div>

        {/* Cobranza pendiente — sesiones vencidas sin pagar, agrupadas por
            paciente (un solo total y un solo WhatsApp por persona). */}
        {f.cobranza.length > 0 && (
          <section className="mt-8">
            <div className="flex flex-wrap items-center gap-3 border-b border-[var(--a-border)] pb-3">
              <h3 className="text-[18px] font-semibold tracking-tight text-espresso">
                Cobranza pendiente
              </h3>
              <span className="rounded-full bg-[var(--a-danger-soft)] px-2.5 py-0.5 text-[12px] font-semibold tabular-nums text-[var(--a-danger)]">
                {f.cobranza.length} {f.cobranza.length === 1 ? "paciente" : "pacientes"}
              </span>
              <span className="admin-muted ml-auto text-[13px]">
                {money(f.cobranza.reduce((n, c) => n + c.total, 0))} sin cobrar
              </span>
            </div>
            <p className="admin-faint mt-2 text-[12.5px]">
              Sesiones ya dadas y sin pagar del período ({f.periodoLabel.toLowerCase()}). La deuda total de cada
              paciente —de todos los meses— está en su ficha.
            </p>
            <ul className="mt-4 space-y-2.5">
              {f.cobranza.map((c) => (
                <li key={c.contactoKey} className="admin-card rounded-2xl p-4">
                  {/* Cabecera del paciente: total + WhatsApp único */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-espresso">{c.nombre}</p>
                      <p className="admin-muted text-[13px]">
                        {c.sesiones.length}{" "}
                        {c.sesiones.length === 1 ? "sesión" : "sesiones"} sin pagar
                      </p>
                    </div>
                    <span className="text-[1.15rem] font-bold tabular-nums text-[var(--a-danger)]">
                      {money(c.total)}
                    </span>
                    <WhatsAppButton phone={c.contacto} nombre={c.nombre} align="right" />
                  </div>
                  {/* Detalle de cada sesión: marcar pagado con método */}
                  <ul className="mt-3 space-y-2 border-t border-[var(--a-border)] pt-3">
                    {c.sesiones.map((s) => (
                      <li
                        key={s.id}
                        className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px]"
                      >
                        <span className="min-w-0 flex-1 admin-muted">
                          {s.serviceName || "—"}
                          {s.fecha ? ` · ${fechaHoraAR(s.fecha)} hs` : ""}
                        </span>
                        <span className="font-semibold tabular-nums text-espresso">
                          {money(s.monto)}
                        </span>
                        <form
                          action={registrarPago}
                          className="flex w-full items-center gap-2 sm:w-auto"
                        >
                          <input type="hidden" name="id" value={s.id} />
                          <select
                            name="metodo"
                            aria-label="Método de pago"
                            defaultValue="efectivo"
                            className="admin-input flex-1 px-2.5 py-1.5 text-[12px] sm:flex-none"
                          >
                            {METODOS.map((x) => (
                              <option key={x} value={x}>
                                {METODO_LABEL[x]}
                              </option>
                            ))}
                          </select>
                          <button className="admin-btn-ghost rounded-full px-3.5 py-1.5 text-[12px] font-medium">
                            Pagado
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Evolución por mes + por servicio */}
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
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
                className="mt-5 flex items-end gap-1.5 md:gap-3"
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

        {/* Cobrado por método de pago */}
        {f.porMetodo.length > 0 && (
          <div className="admin-card mt-4 rounded-2xl p-5">
            <h3 className="admin-kicker text-[13px]">Cobrado por método</h3>
            <ul className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {f.porMetodo.map((m) => (
                <li key={m.metodo}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[14px] font-medium text-espresso">{m.label}</span>
                    <span className="admin-stat text-[14px] tabular-nums">{money(m.monto)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--a-border)]">
                    <div
                      className="h-full rounded-full bg-[var(--a-accent)]"
                      style={{ width: `${(m.monto / maxMetodo) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

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
                      m.tipo === "egreso"
                        ? "bg-[var(--a-danger-soft)] text-[var(--a-danger)]"
                        : m.manual || m.pagado
                        ? "bg-[#25D366]/12 text-[#1c7a45]"
                        : "bg-[var(--a-surface-2)] text-[var(--a-text-3)]"
                    }`}
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      {m.tipo === "egreso" ? (
                        <path d="M12 5v14M19 12l-7 7-7-7" />
                      ) : m.manual || m.pagado ? (
                        <path d="M20 6 9 17l-5-5" />
                      ) : (
                        <><circle cx="12" cy="12" r="9" /><path d="M12 8v4l2.5 1.5" /></>
                      )}
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-espresso">{m.nombre}</p>
                      {m.manual && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] ${
                            m.tipo === "egreso"
                              ? "bg-[var(--a-danger-soft)] text-[var(--a-danger)]"
                              : "admin-chip-accent"
                          }`}
                        >
                          {m.tipo === "egreso" ? "Gasto" : "Manual"}
                        </span>
                      )}
                    </div>
                    <p className="admin-muted text-[13px]">
                      {m.manual
                        ? m.tipo === "egreso"
                          ? `${m.categoria || "Gasto"}${m.fecha ? ` · ${fechaHoraAR(m.fecha)} hs` : ""}`
                          : `Ingreso del consultorio${m.fecha ? ` · ${fechaHoraAR(m.fecha)} hs` : ""}`
                        : `${m.serviceName || "—"}${m.staffName ? ` · ${m.staffName}` : ""}${m.fecha ? ` · ${fechaHoraAR(m.fecha)} hs` : ""}`}
                    </p>
                  </div>
                  <span
                    className={`ml-auto text-[1.05rem] font-bold tabular-nums ${
                      m.tipo === "egreso" ? "text-[var(--a-danger)]" : "text-[var(--a-text)]"
                    }`}
                  >
                    {m.tipo === "egreso" ? "−" : ""}
                    {money(m.monto)}
                  </span>
                  {m.manual ? (
                    <form action={quitarMovimiento} className="w-full sm:w-auto">
                      <input type="hidden" name="id" value={m.id} />
                      <button
                        aria-label={`Quitar ${m.tipo === "egreso" ? "gasto" : "ingreso"} ${m.nombre}`}
                        className="admin-btn-ghost w-full rounded-full px-3.5 py-2 text-[12px] font-medium sm:w-auto"
                      >
                        Quitar
                      </button>
                    </form>
                  ) : m.pagado ? (
                    <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366]/12 px-3 py-1.5 text-[12px] font-semibold text-[#1c7a45]">
                        {METODO_LABEL[m.metodoPago || ""] || "Cobrado"}
                      </span>
                      <form action={quitarPago}>
                        <input type="hidden" name="id" value={m.id} />
                        <button
                          aria-label={`Deshacer pago de ${m.nombre}`}
                          className="admin-faint inline-flex items-center rounded-full px-3 py-2.5 text-[12px] transition-colors hover:text-[var(--a-danger)]"
                        >
                          Deshacer
                        </button>
                      </form>
                    </div>
                  ) : (
                    <form
                      action={registrarPago}
                      className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center"
                    >
                      <input type="hidden" name="id" value={m.id} />
                      <select
                        name="metodo"
                        aria-label={`Método de pago para ${m.nombre}`}
                        className="admin-input w-full px-2.5 py-2.5 text-[13px] sm:w-auto sm:flex-none"
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
                        className="admin-btn w-full rounded-full px-4 py-2.5 text-[13px] font-medium sm:w-auto"
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
