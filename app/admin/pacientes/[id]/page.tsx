import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPaciente,
  getPacienteTurnos,
  listNotas,
} from "@/lib/store";
import { fechaHoraAR, isoToArLocal } from "@/lib/scheduling/slots";
import { AdminShell } from "@/components/AdminShell";
import { AdminHeader } from "@/components/AdminHeader";
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
      <AdminHeader />

      <div className="mt-8">
        <Link
          href="/admin/pacientes"
          className="admin-muted inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors hover:text-[var(--a-text)]"
        >
          ← Pacientes
        </Link>

        {/* Cabecera del paciente */}
        <div className="mt-3 flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--a-accent-soft)] font-serif text-xl text-[var(--a-accent-ink)]">
            {(paciente.nombre.trim()[0] || "?").toUpperCase()}
          </span>
          <div>
            <h2 className="font-serif text-2xl tracking-tight text-espresso">
              {paciente.nombre}
            </h2>
            <p className="admin-muted text-[14px]">
              {paciente.contacto} · paciente desde {fmtFecha(paciente.creadoEn)}
            </p>
          </div>
          <a
            href={`https://wa.me/${paciente.contacto.replace(/[^0-9]/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="admin-btn-ghost ml-auto hidden rounded-full px-4 py-2 text-[13px] font-medium sm:inline-block"
          >
            WhatsApp →
          </a>
        </div>

        <div className="mt-7 grid gap-5 lg:grid-cols-3">
          {/* Historia clínica */}
          <div className="lg:col-span-2">
            <h3 className="font-serif text-lg tracking-tight text-espresso">
              Historia clínica
            </h3>

            {/* Nueva nota */}
            <form action={agregarNota} className="admin-card mt-3 rounded-2xl p-4">
              <input type="hidden" name="patientId" value={id} />
              <div className="flex flex-wrap items-center gap-2">
                <label className="admin-kicker text-[12px]">
                  Fecha
                </label>
                <input
                  type="datetime-local"
                  name="fecha"
                  defaultValue={ahoraLocal}
                  className="admin-input px-3 py-2 text-[13px]"
                />
              </div>
              <textarea
                name="contenido"
                required
                rows={4}
                placeholder="Evolución de la sesión, observaciones, objetivos trabajados…"
                className="admin-input mt-3 w-full resize-y px-4 py-3 text-[15px]"
              />
              <div className="mt-3 flex justify-end">
                <button className="admin-btn rounded-full px-5 py-2.5 text-[14px] font-medium transition-transform hover:-translate-y-px">
                  Agregar nota
                </button>
              </div>
            </form>

            {/* Timeline */}
            {notas.length === 0 ? (
              <p className="admin-empty admin-muted mt-4 rounded-2xl p-8 text-center text-[14px]">
                Todavía no hay notas. La primera que cargues abre la historia.
              </p>
            ) : (
              <ol className="mt-4 space-y-3">
                {notas.map((n) => (
                  <li key={n.id} className="admin-card rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <span className="admin-chip inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-medium">
                        {fechaHoraAR(n.fecha)} hs
                      </span>
                      <form action={borrarNota}>
                        <input type="hidden" name="id" value={n.id} />
                        <input type="hidden" name="patientId" value={id} />
                        <button className="admin-danger text-[12px]">
                          Eliminar
                        </button>
                      </form>
                    </div>
                    <p className="mt-2.5 whitespace-pre-wrap text-[15px] leading-relaxed text-espresso">
                      {n.contenido}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Lateral: ficha + turnos */}
          <div className="space-y-5">
            {/* Ficha */}
            <div className="admin-card rounded-2xl p-4">
              <h3 className="admin-kicker text-[13px]">
                Ficha
              </h3>
              <form action={guardarFicha} className="mt-3">
                <input type="hidden" name="id" value={id} />
                <textarea
                  name="notas"
                  rows={4}
                  defaultValue={paciente.notas}
                  placeholder="Datos fijos: obra social, motivo de consulta, contacto de emergencia…"
                  className="admin-input w-full resize-y px-3 py-2.5 text-[14px]"
                />
                <button className="admin-btn-ghost mt-2 rounded-full px-4 py-2 text-[13px] font-medium">
                  Guardar ficha
                </button>
              </form>
            </div>

            {/* Turnos */}
            <div className="admin-card rounded-2xl p-4">
              <h3 className="admin-kicker text-[13px]">
                Turnos ({turnos.length})
              </h3>
              {turnos.length === 0 ? (
                <p className="admin-muted mt-3 text-[14px]">Sin turnos aún.</p>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {turnos.map((t) => (
                    <li key={t.id} className="border-b border-[var(--a-border)] pb-2.5 last:border-0 last:pb-0">
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
                      <span className="admin-muted text-[13px]">
                        {t.serviceName || "—"}
                        {t.staffName ? ` · ${t.staffName}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
