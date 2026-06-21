import { listPacientes } from "@/lib/store";
import { AdminShell } from "@/components/AdminShell";
import { AdminHeader } from "@/components/AdminHeader";
import { PacientesList } from "@/components/PacientesList";
import { crearPaciente } from "./actions";

export const dynamic = "force-dynamic";

export default async function PacientesPage() {
  const pacientes = await listPacientes();
  const field =
    "admin-input w-full px-3 py-2.5 text-[14px] text-espresso";
  return (
    <AdminShell>
      <AdminHeader />
      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl tracking-tight text-espresso">Pacientes</h2>
            <p className="mt-1 text-[14px] text-espresso-soft">
              {pacientes.length} {pacientes.length === 1 ? "paciente" : "pacientes"}.
              Se crean solos al confirmar un turno, o agregalos a mano.
            </p>
          </div>
        </div>

        {/* Nuevo paciente (a mano) */}
        <details className="admin-card group mt-5 rounded-2xl">
          <summary className="flex cursor-pointer list-none items-center justify-between p-4 text-[14px] font-medium text-espresso">
            <span>+ Nuevo paciente</span>
            <span className="text-espresso-soft transition-transform group-open:rotate-180">⌄</span>
          </summary>
          <form action={crearPaciente} className="border-t border-[var(--color-line)] p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-[12px] uppercase tracking-[0.1em] text-sage-deep">Nombre</span>
                <input name="nombre" required placeholder="Nombre y apellido" className={field} />
              </label>
              <label className="block">
                <span className="mb-1 block text-[12px] uppercase tracking-[0.1em] text-sage-deep">Contacto</span>
                <input name="contacto" required placeholder="Email o WhatsApp" className={field} />
              </label>
              <label className="block">
                <span className="mb-1 block text-[12px] uppercase tracking-[0.1em] text-sage-deep">Modalidad</span>
                <select name="modalidad" defaultValue="online" className={field}>
                  <option value="online">Online</option>
                  <option value="presencial">Presencial</option>
                </select>
              </label>
            </div>
            <div className="mt-3 flex justify-end">
              <button className="rounded-full bg-espresso px-5 py-2.5 text-[14px] font-medium text-cream transition-all hover:-translate-y-px">
                Crear y abrir historia
              </button>
            </div>
          </form>
        </details>

        <div className="mt-6">
          <PacientesList pacientes={pacientes} />
        </div>
      </section>
    </AdminShell>
  );
}
