import Link from "next/link";
import {
  listSolicitudes,
  listPacientes,
  listServices,
  listStaff,
  stats,
} from "@/lib/store";
import { fechaHoraAR, horaAR, isoToArLocal } from "@/lib/scheduling/slots";
import { AdminHeader } from "@/components/AdminHeader";
import { AdminShell } from "@/components/AdminShell";
import { SubmitButton } from "@/components/SubmitButton";
import { AgendarManualForm } from "@/components/AgendarManualForm";
import {
  aceptarSolicitud,
  reprogramarTurno,
  rechazarSolicitud,
  marcarRealizado,
  marcarNoAsistio,
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

// Clave de día (YYYY-MM-DD) en horario de Argentina, para agrupar la agenda.
function arDayKey(iso?: string): string {
  if (!iso) return "zzz-sin-fecha";
  try {
    return new Date(iso).toLocaleDateString("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
    });
  } catch {
    return "zzz-sin-fecha";
  }
}

function dayLabel(key: string, todayKey: string, tomorrowKey: string): string {
  if (key === "zzz-sin-fecha") return "Sin fecha asignada";
  if (key === todayKey) return "Hoy";
  if (key === tomorrowKey) return "Mañana";
  const d = new Date(key + "T12:00:00-03:00");
  const txt = d.toLocaleDateString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

// Link de WhatsApp con un recordatorio ya redactado para mandarle al paciente.
function waRecordatorio(x: {
  nombre: string;
  contacto: string;
  startsAt?: string;
  modalidad: string;
}): string {
  const tel = x.contacto.replace(/[^0-9]/g, "");
  const cuando = x.startsAt ? `${fechaHoraAR(x.startsAt)} hs` : "tu turno";
  const modo = x.modalidad === "presencial" ? "presencial" : "online";
  const msg = `¡Hola ${x.nombre}! Te recuerdo tu turno del ${cuando} (${modo}). Si necesitás reprogramar, avisame. ¡Saludos!`;
  return `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`;
}

import { requireAdmin } from "@/lib/session";

export default async function AdminPage() {
  await requireAdmin();
  const [solicitudes, pacientes, services, staff, s] = await Promise.all([
    listSolicitudes(),
    listPacientes(),
    listServices(true),
    listStaff(true),
    stats(),
  ]);
  const pendientes = solicitudes.filter((x) => x.estado === "pendiente");
  const agenda = solicitudes
    .filter((x) => x.estado === "confirmado")
    .sort((a, b) => (a.startsAt || "") < (b.startsAt || "") ? -1 : 1);

  // Agrupar los próximos turnos por día (Hoy / Mañana / fecha), respetando el
  // orden ya ordenado por horario.
  const todayKey = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
  const tomorrowKey = new Date(Date.now() + 86_400_000).toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
  const grupos: { key: string; items: typeof agenda }[] = [];
  for (const t of agenda) {
    const k = arDayKey(t.startsAt);
    let g = grupos.find((x) => x.key === k);
    if (!g) {
      g = { key: k, items: [] };
      grupos.push(g);
    }
    g.items.push(t);
  }
  // Orden cronológico por día; "zzz-sin-fecha" queda último por su prefijo.
  grupos.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

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
                    <SubmitButton
                      pendingText="Confirmando…"
                      className="rounded-full bg-espresso px-4 py-2.5 text-[13px] font-medium text-cream transition-colors hover:bg-espresso/90"
                    >
                      {x.startsAt ? "Confirmar" : "Confirmar con fecha"}
                    </SubmitButton>
                  </form>
                  <form action={rechazarSolicitud}>
                    <input type="hidden" name="id" value={x.id} />
                    <SubmitButton
                      pendingText="Guardando…"
                      className="rounded-full border border-[var(--color-line)] px-4 py-2.5 text-[13px] text-espresso-soft transition-colors hover:text-[#9C5475]"
                    >
                      Rechazar
                    </SubmitButton>
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

        <AgendarManualForm services={services} staff={staff} />

        <div className="mt-8" />
        {agenda.length === 0 ? (
          <p className="mt-4 rounded-2xl admin-empty p-8 text-center text-espresso-soft">
            Todavía no hay turnos confirmados.
          </p>
        ) : (
          <div className="mt-6 space-y-9">
            {grupos.map((g) => (
              <div key={g.key}>
                <div className="flex items-baseline gap-3">
                  <h3 className="font-serif text-[17px] tracking-tight text-espresso">
                    {dayLabel(g.key, todayKey, tomorrowKey)}
                  </h3>
                  <span className="text-[12px] uppercase tracking-[0.1em] text-espresso-soft">
                    {g.items.length} {g.items.length === 1 ? "turno" : "turnos"}
                  </span>
                  <span className="h-px flex-1 bg-[var(--color-line)]" />
                </div>
                <ul className="mt-3 space-y-3">
                  {g.items.map((x) => (
                    <li key={x.id} className="rounded-2xl admin-card p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-espresso">{x.nombre}</p>
                          <p className="text-[14px] text-espresso-soft">
                            {x.serviceName ? `${x.serviceName} · ` : ""}
                            {x.staffName ? `${x.staffName} · ` : ""}
                            {MOD_LABEL[x.modalidad] || x.modalidad} · {x.contacto}
                          </p>
                          <a
                            href={waRecordatorio(x)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-sage-deep underline-offset-4 hover:underline"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-2.8.7.8-2.7-.2-.3A8 8 0 1 1 12 20Zm4.6-5.9c-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.3-.6.8-.8 1-.1.1-.3.2-.5 0a6.5 6.5 0 0 1-3.2-2.8c-.2-.4.2-.4.6-1.2.1-.1 0-.3 0-.4l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.7.3a3 3 0 0 0-.9 2.2c0 1.3 1 2.6 1.1 2.8.1.2 1.9 2.9 4.6 4 .6.3 1.1.4 1.5.5.6.2 1.2.2 1.6.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2 0-.1-.2-.2-.5-.3Z" />
                            </svg>
                            Enviar recordatorio
                          </a>
                        </div>
                        <p className="whitespace-nowrap font-serif text-2xl italic text-sage-deep">
                          {x.startsAt ? `${horaAR(x.startsAt)}` : "Sin hora"}
                          <span className="ml-1 text-[13px] not-italic text-espresso-soft">hs</span>
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
                          <SubmitButton
                            pendingText="Reprogramando…"
                            className="rounded-full border border-[var(--color-line)] px-4 py-2.5 text-[13px] text-espresso-soft transition-colors hover:text-espresso"
                          >
                            Reprogramar
                          </SubmitButton>
                        </form>
                        <form action={marcarNoAsistio} className="ml-auto">
                          <input type="hidden" name="id" value={x.id} />
                          <SubmitButton
                            pendingText="Guardando…"
                            className="rounded-full border border-[var(--color-line)] px-4 py-2.5 text-[13px] text-espresso-soft transition-colors hover:text-[#9C5475]"
                          >
                            No asistió
                          </SubmitButton>
                        </form>
                        <form action={marcarRealizado}>
                          <input type="hidden" name="id" value={x.id} />
                          <SubmitButton
                            pendingText="Guardando…"
                            className="rounded-full bg-sage/15 px-4 py-2.5 text-[13px] font-medium text-sage-deep transition-colors hover:bg-sage/25"
                          >
                            Marcar realizado
                          </SubmitButton>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
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
