import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPaciente,
  getPacienteTurnos,
  listNotas,
  esImpaga,
} from "@/lib/store";
import { fechaHoraAR } from "@/lib/scheduling/slots";
import { AdminShell } from "@/components/AdminShell";
import { ArrowLeft } from "@/components/Arrow";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { FechaNotaAuto } from "@/components/FechaNotaAuto";
import { agregarNota, borrarNota, guardarFicha, editarPaciente } from "../actions";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

function fmtFecha(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

const ESTADO_BADGE: Record<string, string> = {
  pendiente: "admin-chip",
  confirmado: "admin-chip",
  realizado: "bg-espresso/10 text-espresso",
  rechazado: "bg-[var(--a-danger-soft)] text-[var(--a-danger)]",
  no_asistio: "bg-[var(--a-danger-soft)] text-[var(--a-danger)]",
};
const ESTADO_LABEL: Record<string, string> = {
  no_asistio: "No asistió",
};

export default async function PacienteDetalle({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const paciente = await getPaciente(id);
  if (!paciente) notFound();

  const [turnos, notas] = await Promise.all([
    getPacienteTurnos(paciente.contacto),
    listNotas(id),
  ]);

  // Próximo turno (para la plantilla de recordatorio de WhatsApp).
  const ahoraMs = Date.now();
  const prox = turnos
    .filter(
      (t) =>
        t.startsAt &&
        (t.estado === "confirmado" || t.estado === "pendiente") &&
        new Date(t.startsAt).getTime() >= ahoraMs
    )
    .sort((a, b) => new Date(a.startsAt!).getTime() - new Date(b.startsAt!).getTime())[0];
  const proximo = prox?.startsAt
    ? { cuando: `${fechaHoraAR(prox.startsAt)} hs`, servicio: prox.serviceName }
    : null;

  // Estado de cuenta: misma definición canónica que toda la app (esImpaga).
  const impagos = turnos.filter(esImpaga);
  const deuda = impagos.reduce((n, t) => n + (t.precio ?? 0), 0);
  const money = (n: number) => "$" + (n || 0).toLocaleString("es-AR");

  return (
    <AdminShell>
      <div>
        <Link
          href="/admin/pacientes"
          className="admin-muted group inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors hover:text-[var(--a-text)]"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Pacientes
        </Link>

        {/* Cabecera del paciente */}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-4 border-b border-[var(--a-border)] pb-6">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--a-accent-soft)] font-serif text-2xl text-[var(--a-accent-ink)]">
            {(paciente.nombre.trim()[0] || "?").toUpperCase()}
          </span>
          <div className="min-w-0">
            <h1 className="font-serif text-[26px] leading-tight tracking-tight text-espresso md:text-[30px]">
              {paciente.nombre}
            </h1>
            <p className="admin-muted mt-1 text-[14px]">
              {paciente.contacto}
              {paciente.email && (
                <>
                  <span className="admin-faint mx-2">·</span>
                  {paciente.email}
                </>
              )}
              <span className="admin-faint mx-2">·</span>
              paciente desde {fmtFecha(paciente.creadoEn)}
            </p>
            {deuda > 0 && (
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--a-danger-soft)] px-3 py-1 text-[13px] font-semibold text-[var(--a-danger)]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="6" width="20" height="13" rx="2" /><path d="M2 10h20M6 15h2" />
                </svg>
                Debe {money(deuda)}
                <span className="font-medium opacity-80">· {impagos.length} {impagos.length === 1 ? "sesión" : "sesiones"} sin pagar</span>
              </span>
            )}
          </div>
          <div className="w-full sm:ml-auto sm:w-auto sm:flex sm:justify-end">
            <WhatsAppButton
              phone={paciente.contacto}
              nombre={paciente.nombre}
              proximo={proximo}
              align="right"
            />
          </div>
        </div>

        {/* Editar datos del paciente (nombre, contacto, modalidad) */}
        <details className="group mt-4">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-[13px] font-medium text-[var(--a-accent-ink)] transition-colors hover:text-[var(--a-accent)] [&::-webkit-details-marker]:hidden">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            Editar datos
            <svg className="h-3.5 w-3.5 transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </summary>
          <form action={editarPaciente} className="admin-card mt-3 grid gap-4 rounded-2xl p-5 sm:grid-cols-2">
            <input type="hidden" name="id" value={id} />
            <label className="block">
              <span className="admin-kicker mb-1.5 block text-[12px]">Nombre y apellido</span>
              <input name="nombre" defaultValue={paciente.nombre} required maxLength={120} className="admin-input w-full px-3 py-2 text-[14px]" />
            </label>
            <label className="block">
              <span className="admin-kicker mb-1.5 block text-[12px]">WhatsApp / teléfono</span>
              <input name="contacto" type="tel" defaultValue={paciente.contacto} required maxLength={160} className="admin-input w-full px-3 py-2 text-[14px]" placeholder="+54 9 …" />
            </label>
            <label className="block">
              <span className="admin-kicker mb-1.5 block text-[12px]">Email</span>
              <input name="email" type="email" defaultValue={paciente.email ?? ""} maxLength={160} className="admin-input w-full px-3 py-2 text-[14px]" placeholder="tucorreo@ejemplo.com" />
            </label>
            <label className="block">
              <span className="admin-kicker mb-1.5 block text-[12px]">Modalidad</span>
              <select name="modalidad" defaultValue={paciente.modalidad} className="admin-input w-full px-3 py-2 text-[14px]">
                <option value="online">Online</option>
                <option value="presencial">Presencial</option>
              </select>
            </label>
            <div className="flex items-center justify-end gap-3 sm:col-span-2">
              <span className="admin-faint mr-auto text-[12px]">El WhatsApp/teléfono se usa para escribirle y para vincular sus turnos.</span>
              <button className="admin-btn rounded-full px-5 py-2.5 text-[14px] font-medium">Guardar datos</button>
            </div>
          </form>
        </details>

        <div className="mt-8 grid gap-6 lg:grid-cols-3 lg:items-start">
          {/* Historia clínica */}
          <div className="lg:col-span-2">
            <div className="flex h-9 items-center justify-between gap-3 border-b border-[var(--a-border)] pb-3">
              <h2 className="text-[18px] font-semibold tracking-tight text-espresso">
                Historia clínica
              </h2>
              {notas.length > 0 && (
                <span className="admin-chip rounded-full px-2.5 py-0.5 text-[12px] font-semibold tabular-nums">
                  {notas.length}
                </span>
              )}
            </div>

            {/* Nueva nota */}
            <form action={agregarNota} className="admin-card mt-5 rounded-2xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="admin-kicker text-[12px]">Nueva nota</h3>
                <div className="flex items-center gap-2">
                  <label className="admin-muted text-[12px] font-medium" htmlFor="nota-fecha">
                    Fecha
                  </label>
                  <FechaNotaAuto name="fecha" />
                </div>
              </div>
              <input type="hidden" name="patientId" value={id} />
              <input
                name="titulo"
                maxLength={80}
                placeholder="Título — ej: Primera consulta, Sesión 3…"
                className="admin-input mt-3 w-full px-4 py-2.5 text-[15px] font-medium"
              />
              <textarea
                name="contenido"
                required
                rows={4}
                placeholder="Evolución de la sesión, observaciones, objetivos trabajados…"
                className="admin-input mt-2.5 w-full resize-y px-4 py-3 text-[15px] leading-relaxed"
              />
              <div className="mt-3 flex justify-end">
                <button className="admin-btn rounded-full px-5 py-2.5 text-[14px] font-medium">
                  Agregar nota
                </button>
              </div>
            </form>

            {/* Timeline */}
            {notas.length === 0 ? (
              <div className="admin-empty mt-5 rounded-2xl p-10 text-center">
                <p className="font-serif text-[17px] tracking-tight text-espresso">
                  Todavía no hay notas
                </p>
                <p className="admin-muted mx-auto mt-1.5 max-w-xs text-[14px] leading-relaxed">
                  La primera que cargues abre la historia clínica de {paciente.nombre.split(" ")[0]}.
                </p>
              </div>
            ) : (
              <ol className="mt-5 space-y-4">
                {notas.map((n) => (
                  <li key={n.id} className="admin-card rounded-2xl p-5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="admin-chip inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-medium">
                        {fechaHoraAR(n.fecha)} hs
                      </span>
                      <form action={borrarNota}>
                        <input type="hidden" name="id" value={n.id} />
                        <input type="hidden" name="patientId" value={id} />
                        <button className="admin-danger text-[12px] transition-colors">
                          Eliminar
                        </button>
                      </form>
                    </div>
                    {n.titulo && (
                      <p className="mt-3 text-[16px] font-semibold tracking-tight text-espresso">
                        {n.titulo}
                      </p>
                    )}
                    <p className={`${n.titulo ? "mt-1.5" : "mt-3"} whitespace-pre-wrap text-[15px] leading-relaxed text-espresso`}>
                      {n.contenido}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Lateral: ficha + turnos */}
          <aside className="space-y-5">
            <div className="flex h-9 items-center border-b border-[var(--a-border)] pb-3">
              <h2 className="text-[18px] font-semibold tracking-tight text-espresso">
                Resumen
              </h2>
            </div>
            {/* Ficha */}
            <div className="admin-card rounded-2xl p-5">
              <h3 className="admin-kicker text-[12px]">Ficha</h3>
              <form action={guardarFicha} className="mt-3">
                <input type="hidden" name="id" value={id} />
                <textarea
                  name="notas"
                  rows={5}
                  defaultValue={paciente.notas}
                  placeholder="Datos fijos: obra social, motivo de consulta, contacto de emergencia…"
                  className="admin-input w-full resize-y px-3 py-2.5 text-[14px] leading-relaxed"
                />
                <button className="admin-btn-ghost mt-3 rounded-full px-4 py-2 text-[13px] font-medium">
                  Guardar ficha
                </button>
              </form>
            </div>

            {/* Turnos */}
            <div className="admin-card rounded-2xl p-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="admin-kicker text-[12px]">Turnos</h3>
                <span className="admin-chip rounded-full px-2.5 py-0.5 text-[12px] font-medium">
                  {turnos.length}
                </span>
              </div>
              {deuda > 0 && (
                <p className="mt-2.5 flex items-center justify-between gap-2 rounded-xl bg-[var(--a-danger-soft)] px-3 py-2 text-[13px] font-semibold text-[var(--a-danger)]">
                  <span>Deuda</span>
                  <span className="tabular-nums">{money(deuda)}</span>
                </p>
              )}
              {turnos.length === 0 ? (
                <p className="admin-muted mt-3 text-[14px]">Sin turnos aún.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {turnos.map((t) => (
                    <li
                      key={t.id}
                      className="border-b border-[var(--a-border)] pb-3 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[14px] font-medium text-espresso">
                          {t.startsAt ? fechaHoraAR(t.startsAt) : "Sin fecha"}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${ESTADO_BADGE[t.estado] || "admin-chip"}`}
                        >
                          {ESTADO_LABEL[t.estado] || t.estado}
                        </span>
                      </div>
                      <span className="admin-muted mt-0.5 block text-[13px]">
                        {t.serviceName || "—"}
                        {t.staffName ? ` · ${t.staffName}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </div>
    </AdminShell>
  );
}
