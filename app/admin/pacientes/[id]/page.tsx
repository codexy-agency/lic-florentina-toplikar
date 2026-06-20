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
  pendiente: "bg-clay/25 text-[#7a5a86]",
  confirmado: "bg-sage/15 text-sage-deep",
  realizado: "bg-espresso/10 text-espresso",
  rechazado: "bg-[#9C5475]/10 text-[#9C5475]",
};

export default async function PacienteDetalle({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-espresso-soft transition-colors hover:text-espresso"
        >
          ← Pacientes
        </Link>

        {/* Cabecera del paciente */}
        <div className="mt-3 flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-sage/15 font-serif text-xl text-sage-deep">
            {(paciente.nombre.trim()[0] || "?").toUpperCase()}
          </span>
          <div>
            <h2 className="font-serif text-2xl tracking-tight text-espresso">
              {paciente.nombre}
            </h2>
            <p className="text-[14px] text-espresso-soft">
              {paciente.contacto} · paciente desde {fmtFecha(paciente.creadoEn)}
            </p>
          </div>
          <a
            href={`https://wa.me/${paciente.contacto.replace(/[^0-9]/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto hidden rounded-full border border-[rgba(58,49,55,0.14)] px-4 py-2 text-[13px] font-medium text-sage-deep transition-colors hover:text-espresso sm:inline-block"
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
                <label className="text-[12px] uppercase tracking-[0.1em] text-sage-deep">
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
                <button className="rounded-full bg-espresso px-5 py-2.5 text-[14px] font-medium text-cream transition-all hover:-translate-y-px">
                  Agregar nota
                </button>
              </div>
            </form>

            {/* Timeline */}
            {notas.length === 0 ? (
              <p className="admin-empty mt-4 rounded-2xl p-8 text-center text-[14px] text-espresso-soft">
                Todavía no hay notas. La primera que cargues abre la historia.
              </p>
            ) : (
              <ol className="mt-4 space-y-3">
                {notas.map((n) => (
                  <li key={n.id} className="admin-card rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <span className="inline-flex items-center gap-2 rounded-full bg-sage/10 px-3 py-1 text-[12px] font-medium text-sage-deep">
                        {fechaHoraAR(n.fecha)} hs
                      </span>
                      <form action={borrarNota}>
                        <input type="hidden" name="id" value={n.id} />
                        <input type="hidden" name="patientId" value={id} />
                        <button className="text-[12px] text-espresso-soft/60 transition-colors hover:text-[#9C5475]">
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
              <h3 className="text-[13px] font-medium uppercase tracking-[0.1em] text-espresso-soft">
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
                <button className="mt-2 rounded-full border border-[rgba(58,49,55,0.14)] px-4 py-2 text-[13px] font-medium text-espresso-soft transition-colors hover:text-espresso">
                  Guardar ficha
                </button>
              </form>
            </div>

            {/* Turnos */}
            <div className="admin-card rounded-2xl p-4">
              <h3 className="text-[13px] font-medium uppercase tracking-[0.1em] text-espresso-soft">
                Turnos ({turnos.length})
              </h3>
              {turnos.length === 0 ? (
                <p className="mt-3 text-[14px] text-espresso-soft/70">Sin turnos aún.</p>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {turnos.map((t) => (
                    <li key={t.id} className="border-b border-[rgba(58,49,55,0.06)] pb-2.5 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[14px] font-medium text-espresso">
                          {t.startsAt ? fechaHoraAR(t.startsAt) : "Sin fecha"}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${ESTADO_BADGE[t.estado] || "bg-cream-deep text-espresso-soft"}`}
                        >
                          {t.estado}
                        </span>
                      </div>
                      <span className="text-[13px] text-espresso-soft">
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
