import Link from "next/link";
import {
  listSolicitudes,
  getPacientesResumen,
  listServices,
  listStaff,
  stats,
} from "@/lib/store";
import { fechaHoraAR, horaAR, isoToArLocal } from "@/lib/scheduling/slots";
import { AdminShell } from "@/components/AdminShell";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { WhatsAppButton } from "@/components/WhatsAppButton";
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

const money = (n: number) => "$" + (n || 0).toLocaleString("es-AR");
function fechaCorta(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return "";
  }
}

const MOD_LABEL: Record<string, string> = {
  online: "Online",
  presencial: "Presencial",
};
const MOD_BADGE: Record<string, string> = {
  online: "admin-chip",
  presencial: "admin-chip",
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
    getPacientesResumen(),
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

  // Para poner al día: solo pacientes con deuda o turno pendiente (lo accionable).
  // Deudores primero (por monto), después el resto de pendientes por fecha de turno.
  const alDia = pacientes
    .filter((p) => p.deuda > 0 || p.tienePendiente)
    .sort((a, b) =>
      b.deuda - a.deuda || (a.proximoTurno || "z").localeCompare(b.proximoTurno || "z")
    );
  const deudaTotal = alDia.reduce((n, p) => n + p.deuda, 0);

  return (
    <AdminShell>
      <AdminPageHeader
        title="Agenda"
        description="Tu día a día: solicitudes, próximos turnos y pacientes."
      />

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {[
          {
            n: s.pendientes,
            l: "Solicitudes pendientes",
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16v12H7l-3 3V4Z" /><path d="M8 9h8M8 12h5" />
              </svg>
            ),
          },
          {
            n: s.confirmados,
            l: "Turnos confirmados",
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4" />
              </svg>
            ),
          },
          {
            n: s.turnosHoy,
            l: "Turnos hoy",
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 1.5M9 2h6M5 5l1.5-1.5" />
              </svg>
            ),
          },
          {
            n: s.pacientes,
            l: "Pacientes",
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9" />
              </svg>
            ),
          },
        ].map((x) => (
          <div key={x.l} className="admin-card rounded-2xl p-4 md:p-5">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--a-accent-soft)] text-[var(--a-accent-ink)]">
              {x.icon}
            </span>
            <p className="mt-4 text-[1.8rem] font-bold leading-none tabular-nums text-[var(--a-text)] md:text-[2.6rem]">
              {x.n}
            </p>
            <p className="admin-kicker mt-2 text-[11px] md:text-[12px]">
              {x.l}
            </p>
          </div>
        ))}
      </div>

      {/* Bandeja de solicitudes */}
      <section className="mt-14">
        <div className="flex items-center gap-3 border-b border-[var(--a-border)] pb-3">
          <h2 className="text-[18px] font-semibold tracking-tight text-espresso">
            Bandeja de solicitudes
          </h2>
          {pendientes.length > 0 && (
            <span className="admin-chip-accent rounded-full px-2.5 py-0.5 text-[12px] font-semibold tabular-nums">
              {pendientes.length}
            </span>
          )}
        </div>
        {pendientes.length === 0 ? (
          <p className="mt-5 rounded-2xl admin-empty p-8 text-center">
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
                    <p className="admin-muted text-[14px]">{x.contacto}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.1em] ${MOD_BADGE[x.modalidad] || "admin-chip"}`}
                  >
                    {MOD_LABEL[x.modalidad] || x.modalidad}
                  </span>
                </div>

                {(x.serviceName || x.staffName) && (
                  <p className="mt-3 text-[14px] text-espresso">
                    {x.serviceName && <span className="font-medium">{x.serviceName}</span>}
                    {x.serviceName && x.staffName ? " · " : ""}
                    {x.staffName && (
                      <span className="admin-muted">con {x.staffName}</span>
                    )}
                  </p>
                )}

                {/* Slot elegido por el paciente */}
                {x.startsAt ? (
                  <p className="admin-chip-accent mt-3 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[14px] font-medium">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                    Eligió: {fechaHoraAR(x.startsAt)} hs
                  </p>
                ) : (
                  x.preferencia && (
                    <p className="admin-muted mt-3 text-[14px]">
                      <span className="text-[var(--a-accent-ink)]">Disponibilidad:</span>{" "}
                      {x.preferencia}
                    </p>
                  )
                )}

                {x.motivo && (
                  <p className="admin-muted mt-2 text-[14px]">
                    <span className="text-[var(--a-accent-ink)]">Motivo:</span> {x.motivo}
                  </p>
                )}
                <p className="admin-faint mt-1 text-[13px]">
                  Recibido {fmt(x.creadoEn)}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <form action={aceptarSolicitud} className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                    <input type="hidden" name="id" value={x.id} />
                    <input
                      type="datetime-local"
                      name="fecha"
                      defaultValue={x.startsAt ? isoToArLocal(x.startsAt) : ""}
                      className="admin-input w-full rounded-full px-3 py-2.5 text-[13px] sm:w-auto"
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
                      className="admin-danger rounded-full border border-[var(--a-border-strong)] px-4 py-2.5 text-[13px] font-medium transition-colors"
                    >
                      Rechazar
                    </SubmitButton>
                  </form>
                  <a
                    href={`https://wa.me/${x.contacto.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366]/12 px-4 py-2.5 text-[13px] font-semibold text-[#1c7a45] transition-colors hover:bg-[#25D366]/22 sm:ml-auto sm:w-auto"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm5.8 14.18c-.24.68-1.42 1.31-1.95 1.35-.5.05-.99.22-3.4-.71-2.87-1.13-4.7-4.06-4.84-4.25-.14-.19-1.16-1.54-1.16-2.94s.73-2.08 1-2.37c.26-.29.57-.36.76-.36h.55c.18 0 .42-.07.64.49.24.57.81 1.97.88 2.11.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.17-.29.37-.42.5-.14.14-.28.29-.12.57.16.28.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.21 1.37.28.14.44.12.6-.07.17-.19.69-.81.88-1.09.18-.28.37-.23.62-.14.25.09 1.6.76 1.87.9.28.14.46.21.53.33.07.12.07.69-.17 1.37Z" />
                    </svg>
                    Responder
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Agenda */}
      <section className="mt-14">
        <div className="flex items-center gap-3 border-b border-[var(--a-border)] pb-3">
          <h2 className="text-[18px] font-semibold tracking-tight text-espresso">
            Próximos turnos
          </h2>
          {agenda.length > 0 && (
            <span className="admin-chip rounded-full px-2.5 py-0.5 text-[12px] font-semibold tabular-nums">
              {agenda.length}
            </span>
          )}
        </div>

        <AgendarManualForm services={services} staff={staff} />

        <div className="mt-8" />
        {agenda.length === 0 ? (
          <p className="mt-4 rounded-2xl admin-empty p-8 text-center">
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
                  <span className="admin-kicker text-[12px]">
                    {g.items.length} {g.items.length === 1 ? "turno" : "turnos"}
                  </span>
                  <span className="h-px flex-1 bg-[var(--a-border)]" />
                </div>
                <ul className="mt-3 space-y-3">
                  {g.items.map((x) => (
                    <li key={x.id} className="rounded-2xl admin-card p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-espresso">{x.nombre}</p>
                          <p className="admin-muted break-words text-[14px]">
                            {x.serviceName ? `${x.serviceName} · ` : ""}
                            {x.staffName ? `${x.staffName} · ` : ""}
                            {MOD_LABEL[x.modalidad] || x.modalidad} · {x.contacto}
                          </p>
                          <a
                            href={waRecordatorio(x)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--a-accent-ink)] underline-offset-4 hover:underline"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-2.8.7.8-2.7-.2-.3A8 8 0 1 1 12 20Zm4.6-5.9c-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.3-.6.8-.8 1-.1.1-.3.2-.5 0a6.5 6.5 0 0 1-3.2-2.8c-.2-.4.2-.4.6-1.2.1-.1 0-.3 0-.4l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.7.3a3 3 0 0 0-.9 2.2c0 1.3 1 2.6 1.1 2.8.1.2 1.9 2.9 4.6 4 .6.3 1.1.4 1.5.5.6.2 1.2.2 1.6.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2 0-.1-.2-.2-.5-.3Z" />
                            </svg>
                            Enviar recordatorio
                          </a>
                        </div>
                        <p className="admin-stat shrink-0 whitespace-nowrap font-serif text-2xl italic">
                          {x.startsAt ? `${horaAR(x.startsAt)}` : "Sin hora"}
                          <span className="admin-muted ml-1 text-[13px] not-italic">hs</span>
                        </p>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <form action={reprogramarTurno} className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                          <input type="hidden" name="id" value={x.id} />
                          <input
                            type="datetime-local"
                            name="fecha"
                            defaultValue={x.startsAt ? isoToArLocal(x.startsAt) : ""}
                            className="admin-input w-full rounded-full px-3 py-2.5 text-[13px] sm:w-auto"
                          />
                          <SubmitButton
                            pendingText="Reprogramando…"
                            className="admin-btn-ghost rounded-full px-4 py-2.5 text-[13px] font-medium"
                          >
                            Reprogramar
                          </SubmitButton>
                        </form>
                        <form action={marcarNoAsistio} className="sm:ml-auto">
                          <input type="hidden" name="id" value={x.id} />
                          <SubmitButton
                            pendingText="Guardando…"
                            className="admin-danger rounded-full border border-[var(--a-border-strong)] px-4 py-2.5 text-[13px] font-medium transition-colors"
                          >
                            No asistió
                          </SubmitButton>
                        </form>
                        <form action={marcarRealizado}>
                          <input type="hidden" name="id" value={x.id} />
                          <SubmitButton
                            pendingText="Guardando…"
                            className="rounded-full border border-[var(--a-accent)] px-4 py-2.5 text-[13px] font-medium text-[var(--a-accent-ink)] transition-colors hover:bg-[var(--a-accent-soft)]"
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

      {/* Para poner al día — deudas y turnos pendientes (la lista completa de
          pacientes vive en su propia sección; acá solo lo accionable). */}
      <section className="mt-14">
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--a-border)] pb-3">
          <h2 className="text-[18px] font-semibold tracking-tight text-espresso">
            Para poner al día
          </h2>
          {alDia.length > 0 && (
            <span className="admin-chip-accent rounded-full px-2.5 py-0.5 text-[12px] font-semibold tabular-nums">
              {alDia.length}
            </span>
          )}
          {deudaTotal > 0 && (
            <span className="rounded-full bg-[var(--a-danger-soft)] px-2.5 py-0.5 text-[12px] font-semibold text-[var(--a-danger)]">
              {money(deudaTotal)} a cobrar
            </span>
          )}
          <Link
            href="/admin/pacientes"
            className="admin-muted ml-auto inline-flex items-center gap-1 text-[13px] font-medium transition-colors hover:text-[var(--a-text)]"
          >
            Ver todos los pacientes
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </Link>
        </div>
        {alDia.length === 0 ? (
          <div className="admin-empty mt-5 rounded-2xl p-8 text-center">
            <p className="inline-flex items-center gap-2 font-serif text-[17px] tracking-tight text-espresso">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sage/20 text-sage-deep">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              </span>
              Todo al día
            </p>
            <p className="admin-muted mx-auto mt-1.5 max-w-sm text-[14px] leading-relaxed">
              No hay deudas pendientes ni turnos sin gestionar. Cuando aparezcan, los vas a ver acá.
            </p>
          </div>
        ) : (
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {alDia.map((p) => (
              <li
                key={p.id}
                className="admin-card admin-card-link group flex min-w-0 items-center gap-2 rounded-2xl p-3 pl-4"
              >
                <Link
                  href={`/admin/pacientes/${p.id}`}
                  aria-label={`Abrir ficha de ${p.nombre}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--a-border)] bg-[var(--a-accent-soft)] font-medium text-[var(--a-accent-ink)]">
                    {(p.nombre.trim()[0] || "?").toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-espresso">{p.nombre}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                      {p.deuda > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--a-danger-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--a-danger)]">
                          Debe {money(p.deuda)}
                        </span>
                      )}
                      {p.proximoTurno && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--a-accent-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--a-accent-ink)]">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                          </svg>
                          {fechaCorta(p.proximoTurno)}
                        </span>
                      )}
                    </span>
                  </span>
                </Link>

                <WhatsAppButton
                  phone={p.contacto}
                  nombre={p.nombre}
                  proximo={p.proximoTurno ? { cuando: `${fechaHoraAR(p.proximoTurno)} hs` } : null}
                  variant="icon"
                  align="right"
                />
                <span aria-hidden className="hidden h-7 w-px shrink-0 bg-[var(--a-border)] sm:block" />
                <Link
                  href={`/admin/pacientes/${p.id}`}
                  aria-label={`Ver ficha de ${p.nombre}`}
                  className="flex shrink-0 items-center gap-0.5 rounded-full px-2 py-2 text-[12.5px] font-medium text-[var(--a-accent-ink)] transition-colors hover:bg-[var(--a-accent-soft)]"
                >
                  <span>Ficha</span>
                  <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="admin-faint mt-14 text-center text-[12px]">
        MVP · datos en archivo local. En producción: Supabase + facturación AFIP
        + recordatorios automáticos.
      </p>
    </AdminShell>
  );
}
