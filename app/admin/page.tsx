import Link from "next/link";
import { listSolicitudes, listPacientes, stats } from "@/lib/store";
import { fechaHoraAR, isoToArLocal } from "@/lib/scheduling/slots";
import { AdminHeader } from "@/components/AdminHeader";
import { AdminShell } from "@/components/AdminShell";
import {
  aceptarSolicitud,
  reprogramarTurno,
  rechazarSolicitud,
  marcarRealizado,
} from "./actions";

export const dynamic = "force-dynamic";

function fmt(iso?: string) {
  if (!iso) return "—";
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

const MOD_LABEL: Record<string, string> = {
  online: "Online",
  presencial: "Presencial",
};
const MOD_BADGE: Record<string, string> = {
  online: "bg-sage/15 text-sage-deep",
  presencial: "bg-clay/25 text-[#7a5a86]",
};

export default async function AdminPage() {
  const [solicitudes, pacientes, s] = await Promise.all([
    listSolicitudes(),
    listPacientes(),
    stats(),
  ]);
  const pendientes = solicitudes.filter((x) => x.estado === "pendiente");
  const agenda = solicitudes
    .filter((x) => x.estado === "confirmado")
    .sort((a, b) => (a.startsAt || "") < (b.startsAt || "") ? -1 : 1);

  return (
    <AdminShell>
      <AdminHeader />

      <div className="mt-8">
        <h2 className="font-serif text-2xl tracking-tight text-espresso">Agenda</h2>
        <p className="mt-1 text-[14px] text-espresso-soft">
          Tu día a día: solicitudes, próximos turnos y pacientes.
        </p>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-3 gap-3 md:gap-4">
        {[
          { n: s.pendientes, l: "Solicitudes pendientes" },
          { n: s.confirmados, l: "Turnos confirmados" },
          { n: s.pacientes, l: "Pacientes" },
        ].map((x) => (
          <div
            key={x.l}
            className="rounded-2xl admin-card p-5"
          >
            <p className="font-serif text-3xl font-light text-espresso md:text-4xl">
              {x.n}
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-espresso-soft md:text-[12px]">
              {x.l}
            </p>
          </div>
        ))}
      </div>

      {/* Bandeja de solicitudes */}
      <section className="mt-12">
        <h2 className="font-serif text-xl tracking-tight text-espresso">
          Bandeja de solicitudes
        </h2>
        {pendientes.length === 0 ? (
          <p className="mt-4 rounded-2xl admin-empty p-8 text-center text-espresso-soft">
            No hay solicitudes pendientes. Las nuevas aparecen acá apenas alguien
            reserva un horario desde el sitio.
          </p>
        ) : (
          <ul className="mt-5 space-y-4">
            {pendientes.map((x) => (
              <li
                key={x.id}
                className="rounded-2xl admin-card p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-espresso">{x.nombre}</p>
                    <p className="text-[14px] text-espresso-soft">{x.contacto}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.1em] ${MOD_BADGE[x.modalidad] || "bg-cream-deep text-espresso-soft"}`}
                  >
                    {MOD_LABEL[x.modalidad] || x.modalidad}
                  </span>
                </div>

                {(x.serviceName || x.staffName) && (
                  <p className="mt-3 text-[14px] text-espresso">
                    {x.serviceName && <span className="font-medium">{x.serviceName}</span>}
                    {x.serviceName && x.staffName ? " · " : ""}
                    {x.staffName && (
                      <span className="text-espresso-soft">con {x.staffName}</span>
                    )}
                  </p>
                )}

                {/* Slot elegido por el paciente */}
                {x.startsAt ? (
                  <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-sage/10 px-3 py-2 text-[14px] font-medium text-sage-deep">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                    Eligió: {fechaHoraAR(x.startsAt)} hs
                  </p>
                ) : (
                  x.preferencia && (
                    <p className="mt-3 text-[14px] text-espresso-soft">
                      <span className="text-sage-deep">Disponibilidad:</span>{" "}
                      {x.preferencia}
                    </p>
                  )
                )}

                {x.motivo && (
                  <p className="mt-2 text-[14px] text-espresso-soft">
                    <span className="text-sage-deep">Motivo:</span> {x.motivo}
                  </p>
                )}
                <p className="mt-1 text-[13px] text-espresso-soft/70">
                  Recibido {fmt(x.creadoEn)}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <form action={aceptarSolicitud} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={x.id} />
                    <input
                      type="datetime-local"
                      name="fecha"
                      defaultValue={x.startsAt ? isoToArLocal(x.startsAt) : ""}
                      className="admin-input rounded-full px-3 py-2 text-[13px]"
                    />
                    <button className="rounded-full bg-espresso px-4 py-2.5 text-[13px] font-medium text-cream transition-colors hover:bg-espresso/90">
                      {x.startsAt ? "Confirmar" : "Confirmar con fecha"}
                    </button>
                  </form>
                  <form action={rechazarSolicitud}>
                    <input type="hidden" name="id" value={x.id} />
                    <button className="rounded-full border border-[var(--color-line)] px-4 py-2.5 text-[13px] text-espresso-soft transition-colors hover:text-[#9C5475]">
                      Rechazar
                    </button>
                  </form>
                  <a
                    href={`https://wa.me/${x.contacto.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-[13px] font-medium text-sage-deep underline-offset-4 hover:underline"
                  >
                    Responder por WhatsApp →
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Agenda */}
      <section className="mt-12">
        <h2 className="font-serif text-xl tracking-tight text-espresso">
          Próximos turnos
        </h2>
        {agenda.length === 0 ? (
          <p className="mt-4 rounded-2xl admin-empty p-8 text-center text-espresso-soft">
            Todavía no hay turnos confirmados.
          </p>
        ) : (
          <ul className="mt-5 space-y-3">
            {agenda.map((x) => (
              <li
                key={x.id}
                className="rounded-2xl admin-card p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-espresso">{x.nombre}</p>
                    <p className="text-[14px] text-espresso-soft">
                      {x.serviceName ? `${x.serviceName} · ` : ""}
                      {x.staffName ? `${x.staffName} · ` : ""}
                      {MOD_LABEL[x.modalidad] || x.modalidad} · {x.contacto}
                    </p>
                  </div>
                  <p className="font-serif text-lg italic text-sage-deep">
                    {x.startsAt ? `${fechaHoraAR(x.startsAt)} hs` : "Sin fecha"}
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <form action={reprogramarTurno} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={x.id} />
                    <input
                      type="datetime-local"
                      name="fecha"
                      defaultValue={x.startsAt ? isoToArLocal(x.startsAt) : ""}
                      className="admin-input rounded-full px-3 py-2 text-[13px]"
                    />
                    <button className="rounded-full border border-[var(--color-line)] px-4 py-2.5 text-[13px] text-espresso-soft transition-colors hover:text-espresso">
                      Reprogramar
                    </button>
                  </form>
                  <form action={marcarRealizado} className="ml-auto">
                    <input type="hidden" name="id" value={x.id} />
                    <button className="rounded-full border border-[var(--color-line)] px-4 py-2.5 text-[13px] text-espresso-soft transition-colors hover:text-espresso">
                      Marcar realizado
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Pacientes */}
      <section className="mt-12">
        <h2 className="font-serif text-xl tracking-tight text-espresso">
          Pacientes
        </h2>
        {pacientes.length === 0 ? (
          <p className="mt-4 rounded-2xl admin-empty p-8 text-center text-espresso-soft">
            Los pacientes se crean automáticamente al confirmar un turno.
          </p>
        ) : (
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pacientes.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/pacientes/${p.id}`}
                  className="admin-card block rounded-2xl p-5 transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <p className="font-medium text-espresso">{p.nombre}</p>
                  <p className="mt-0.5 text-[14px] text-espresso-soft">{p.contacto}</p>
                  <p className="mt-2 text-[12px] uppercase tracking-[0.1em] text-sage-deep">
                    {MOD_LABEL[p.modalidad] || p.modalidad}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-14 text-center text-[12px] text-espresso-soft/60">
        MVP · datos en archivo local. En producción: Supabase + facturación AFIP
        + recordatorios automáticos.
      </p>
    </AdminShell>
  );
}
