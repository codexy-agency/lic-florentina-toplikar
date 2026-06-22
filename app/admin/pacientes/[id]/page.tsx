import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPaciente,
  getPacienteTurnos,
  listNotas,
} from "@/lib/store";
import { fechaHoraAR, isoToArLocal } from "@/lib/scheduling/slots";
import { AdminShell } from "@/components/AdminShell";
import { agregarNota, borrarNota, guardarFicha } from "../actions";
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
  const ahoraLocal = isoToArLocal(new Date().toISOString());

  return (
    <AdminShell>
      <div>
        <Link
          href="/admin/pacientes"
          className="admin-muted inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors hover:text-[var(--a-text)]"
        >
          ← Pacientes
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
              <span className="admin-faint mx-2">·</span>
              paciente desde {fmtFecha(paciente.creadoEn)}
            </p>
          </div>
          <a
            href={`https://wa.me/${paciente.contacto.replace(/[^0-9]/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="admin-btn-ghost ml-auto hidden rounded-full px-4 py-2 text-[13px] font-medium sm:inline-flex sm:items-center"
          >
            WhatsApp →
          </a>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3 lg:items-start">
          {/* Historia clínica */}
          <div className="lg:col-span-2">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="admin-kicker text-[12px]">Historia</h2>
                <p className="font-serif text-[19px] tracking-tight text-espresso">
                  Historia clínica
                </p>
              </div>
              {notas.length > 0 ? (
                <span className="admin-muted text-[13px]">
                  {notas.length} {notas.length === 1 ? "nota" : "notas"}
                </span>
              ) : null}
            </div>

            {/* Nueva nota */}
            <form action={agregarNota} className="admin-card mt-4 rounded-2xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="admin-kicker text-[12px]">Nueva nota</h3>
                <div className="flex items-center gap-2">
                  <label className="admin-muted text-[12px] font-medium" htmlFor="nota-fecha">
                    Fecha
                  </label>
                  <input
                    id="nota-fecha"
                    type="datetime-local"
                    name="fecha"
                    defaultValue={ahoraLocal}
                    className="admin-input px-3 py-2 text-[13px]"
                  />
                </div>
              </div>
              <input type="hidden" name="patientId" value={id} />
              <textarea
                name="contenido"
                required
                rows={4}
                placeholder="Evolución de la sesión, observaciones, objetivos trabajados…"
                className="admin-input mt-3 w-full resize-y px-4 py-3 text-[15px] leading-relaxed"
              />
              <div className="mt-3 flex justify-end">
                <button className="admin-btn rounded-full px-5 py-2.5 text-[14px] font-medium transition-transform hover:-translate-y-px">
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
                    <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-espresso">
                      {n.contenido}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Lateral: ficha + turnos */}
          <aside className="space-y-6">
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
