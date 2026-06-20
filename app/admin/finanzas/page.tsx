import { getFinanzas } from "@/lib/store";
import { fechaHoraAR } from "@/lib/scheduling/slots";
import { AdminShell } from "@/components/AdminShell";
import { AdminHeader } from "@/components/AdminHeader";
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
        <p className="mt-1 text-[14px] text-espresso-soft">
          Cuentas por servicio y por profesional. Se calculan sobre los turnos
          confirmados y realizados.
        </p>

        {/* KPIs */}
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {KPIS.map((k) => (
            <div
              key={k.l}
              className={`admin-card rounded-2xl p-4 md:p-5 ${
                k.accent ? "ring-1 ring-sage-deep/30" : ""
              }`}
            >
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-espresso-soft">
                {k.l}
              </p>
              <p
                className={`mt-1.5 font-serif text-2xl font-light tabular-nums md:text-[28px] ${
                  k.accent ? "text-sage-deep" : "text-espresso"
                }`}
              >
                {k.v}
              </p>
              <p className="mt-0.5 text-[12px] text-espresso-soft/70">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Evolución por mes + por servicio */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {/* Por mes */}
          <div className="admin-card rounded-2xl p-5">
            <h3 className="text-[13px] font-medium uppercase tracking-[0.1em] text-espresso-soft">
              Evolución mensual
            </h3>
            {f.porMes.length === 0 ? (
              <p className="mt-6 text-[14px] text-espresso-soft/70">Todavía sin datos.</p>
            ) : (
              <div className="mt-5 flex items-end gap-3" style={{ height: "150px" }}>
                {f.porMes.map((m) => (
                  <div key={m.key} className="flex flex-1 flex-col items-center justify-end gap-2">
                    <div className="relative flex w-full max-w-[44px] flex-1 items-end">
                      <div
                        className="w-full rounded-t-md bg-[#EADCE2]"
                        style={{ height: `${(m.facturado / maxMes) * 100}%` }}
                        title={`Facturado ${money(m.facturado)}`}
                      />
                      <div
                        className="absolute bottom-0 w-full rounded-t-md bg-sage-deep"
                        style={{ height: `${(m.cobrado / maxMes) * 100}%` }}
                        title={`Cobrado ${money(m.cobrado)}`}
                      />
                    </div>
                    <span className="text-[11px] capitalize text-espresso-soft">{m.label}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 flex gap-4 text-[12px] text-espresso-soft">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-sage-deep" /> Cobrado
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#EADCE2]" /> Facturado
              </span>
            </div>
          </div>

          {/* Por servicio */}
          <div className="admin-card rounded-2xl p-5">
            <h3 className="text-[13px] font-medium uppercase tracking-[0.1em] text-espresso-soft">
              Por servicio
            </h3>
            {f.porServicio.length === 0 ? (
              <p className="mt-6 text-[14px] text-espresso-soft/70">Todavía sin datos.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {f.porServicio.map((s) => (
                  <li key={s.nombre}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[14px] font-medium text-espresso">{s.nombre}</span>
                      <span className="text-[14px] tabular-nums text-espresso">{money(s.monto)}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#EFE6E8]">
                        <div
                          className="h-full rounded-full bg-sage-deep"
                          style={{ width: `${s.monto ? (s.cobrado / s.monto) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-[12px] text-espresso-soft/70">
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
            <h3 className="text-[13px] font-medium uppercase tracking-[0.1em] text-espresso-soft">
              Por profesional
            </h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {f.porProfesional.map((p) => (
                <div key={p.nombre} className="admin-soft rounded-xl p-4">
                  <p className="font-medium text-espresso">{p.nombre}</p>
                  <p className="mt-1 font-serif text-xl text-espresso tabular-nums">{money(p.monto)}</p>
                  <p className="text-[12px] text-espresso-soft/70">
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
            <p className="admin-empty mt-3 rounded-2xl p-8 text-center text-[14px] text-espresso-soft">
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
                    <p className="text-[13px] text-espresso-soft">
                      {m.serviceName || "—"}
                      {m.staffName ? ` · ${m.staffName}` : ""}
                      {m.fecha ? ` · ${fechaHoraAR(m.fecha)} hs` : ""}
                    </p>
                  </div>
                  <span className="font-serif text-lg tabular-nums text-espresso">
                    {money(m.monto)}
                  </span>
                  {m.pagado ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-sage/15 px-3 py-1.5 text-[12px] font-medium text-sage-deep">
                        ✓ {METODO_LABEL[m.metodoPago || ""] || "Pagado"}
                      </span>
                      <form action={quitarPago}>
                        <input type="hidden" name="id" value={m.id} />
                        <button className="text-[12px] text-espresso-soft/70 underline-offset-2 hover:text-[#9C5475] hover:underline">
                          Deshacer
                        </button>
                      </form>
                    </div>
                  ) : (
                    <form action={registrarPago} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={m.id} />
                      <select
                        name="metodo"
                        className="admin-input px-2.5 py-1.5 text-[13px]"
                        defaultValue="efectivo"
                      >
                        {METODOS.map((x) => (
                          <option key={x} value={x}>
                            {METODO_LABEL[x]}
                          </option>
                        ))}
                      </select>
                      <button className="rounded-full bg-espresso px-3.5 py-1.5 text-[13px] font-medium text-cream transition-colors hover:bg-espresso/90">
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
