import { redirect } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { requireSesion } from "@/lib/session";
import { listarSuscripciones } from "@/lib/accounts";
import { leerAuth } from "@/lib/accounts-store";
import { esEmailDeSoporte } from "@/lib/soporte";
import {
  ESTADO_LABEL,
  MONEDAS_LABEL,
  PLANES,
  PLANES_ORDENADOS,
  diasRestantes,
  precioDe,
  type EstadoSuscripcion,
  type Moneda,
} from "@/lib/planes";
import { FilaSuscripcion } from "@/components/FilaSuscripcion";

export const dynamic = "force-dynamic";

const ESTADOS: EstadoSuscripcion[] = ["prueba", "activa", "vencida", "solo_lectura", "cancelada"];
const MONEDAS: Moneda[] = ["ARS", "MXN", "USD"];

export default async function CodexyPage() {
  // Puerta propia: esta pantalla ve la facturación de TODOS los clientes, así que
  // no alcanza con un permiso del consultorio. Sólo la lista SOPORTE_EMAILS.
  const sesion = await requireSesion();
  const db = await leerAuth();
  const yo = db.users.find((x) => x.id === sesion.userId && x.activo);
  if (!yo || !esEmailDeSoporte(yo.email)) redirect("/admin");

  const filas = await listarSuscripciones();

  // Números del negocio. Con el cobro manual esto es el tablero: no hay otro.
  const activos = filas.filter((f) => f.suscripcion.estado === "activa");
  const enPrueba = filas.filter((f) => f.suscripcion.estado === "prueba");
  const conProblema = filas.filter(
    (f) => f.suscripcion.estado === "vencida" || f.suscripcion.estado === "solo_lectura"
  );
  // MRR por moneda: NO se suma todo junto ni se convierte con un tipo de cambio
  // inventado. Tres mercados, tres números.
  const mrr = MONEDAS.map((m) => ({
    moneda: m,
    total: activos
      .filter((f) => f.suscripcion.moneda === m)
      .reduce((acc, f) => acc + PLANES[f.suscripcion.plan].precio[m], 0),
  })).filter((x) => x.total > 0);

  return (
    <AdminShell>
      <section>
        <AdminPageHeader
          title="Codexy · consultorios"
          description="Los clientes de la plataforma y el estado de su suscripción. Solo lo ve el equipo de Codexy."
        />

        {/* Tablero */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { l: "Al día", v: String(activos.length), sub: "pagando" },
            { l: "En prueba", v: String(enPrueba.length), sub: "por convertir" },
            { l: "Con deuda", v: String(conProblema.length), sub: "a seguir" },
            { l: "Consultorios", v: String(filas.length), sub: "en total" },
          ].map((k) => (
            <div key={k.l} className="admin-card rounded-2xl p-4">
              <p className="admin-kicker text-[11.5px]">{k.l}</p>
              <p className="mt-1 text-[26px] font-semibold tabular-nums text-espresso">{k.v}</p>
              <p className="admin-faint text-[12px]">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* MRR por moneda */}
        {mrr.length > 0 && (
          <div className="admin-card mt-3 rounded-2xl p-4">
            <p className="admin-kicker text-[11.5px]">Ingreso mensual recurrente</p>
            <div className="mt-2 flex flex-wrap gap-x-8 gap-y-2">
              {mrr.map((x) => (
                <p key={x.moneda} className="text-[20px] font-semibold tabular-nums text-espresso">
                  {new Intl.NumberFormat(
                    x.moneda === "ARS" ? "es-AR" : x.moneda === "MXN" ? "es-MX" : "en-US",
                    { style: "currency", currency: x.moneda, maximumFractionDigits: 0 }
                  ).format(x.total)}
                  <span className="admin-faint ml-1.5 text-[12px] font-normal">{x.moneda}</span>
                </p>
              ))}
            </div>
            <p className="admin-faint mt-2 text-[12px]">
              Sin convertir entre monedas: tres mercados, tres números.
            </p>
          </div>
        )}

        {/* Consultorios */}
        <div className="mt-8">
          <h2 className="text-[18px] font-semibold tracking-tight text-espresso">Consultorios</h2>
          <p className="admin-muted mt-1 text-[13px]">
            Cuando entra un pago: ponés <strong>Al día</strong>, apretás <em>+1 mes</em> y guardás.
          </p>

          {filas.length === 0 ? (
            <p className="admin-empty admin-muted mt-4 rounded-2xl p-8 text-center text-[14px]">
              Todavía no hay consultorios con cuentas.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {filas.map((f) => (
                <FilaSuscripcion
                  key={f.professionalId}
                  pid={f.professionalId}
                  miembros={f.miembros}
                  suscripcion={f.suscripcion}
                  estados={ESTADOS.map((e) => ({ v: e, l: ESTADO_LABEL[e] }))}
                  monedas={MONEDAS.map((m) => ({ v: m, l: MONEDAS_LABEL[m] }))}
                  planes={PLANES_ORDENADOS.map((p) => ({
                    v: p.id,
                    l: `${p.nombre} — ${precioDe(p.id, f.suscripcion.moneda)}`,
                  }))}
                  dias={diasRestantes(f.suscripcion)}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </AdminShell>
  );
}
