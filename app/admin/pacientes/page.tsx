import { getPacientesResumen } from "@/lib/store";
import { AdminShell } from "@/components/AdminShell";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { PacientesList } from "@/components/PacientesList";
import { crearPaciente } from "./actions";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PacientesPage() {
  await requireAdmin();
  const pacientes = await getPacientesResumen();
  const field =
    "admin-input w-full px-3 py-2.5 text-[14px] text-espresso";
  return (
    <AdminShell>
      <section>
        <AdminPageHeader
          title="Pacientes"
          description={`${pacientes.length} ${pacientes.length === 1 ? "paciente" : "pacientes"}. Tocá "Ficha" para abrir la historia clínica; el ícono de WhatsApp es para escribirle.`}
        />

        {/* Nuevo paciente (a mano) */}
        <details className="admin-card group mt-5 rounded-2xl">
          <summary className="flex cursor-pointer list-none items-center justify-between p-4 text-[14px] font-medium text-espresso">
            <span>+ Nuevo paciente</span>
            <span className="admin-faint transition-transform group-open:rotate-180">⌄</span>
          </summary>
          <form action={crearPaciente} className="border-t border-[var(--color-line)] p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="admin-kicker mb-1 block text-[12px]">Nombre</span>
                <input name="nombre" required placeholder="Nombre y apellido" className={field} />
              </label>
              <label className="block">
                <span className="admin-kicker mb-1 block text-[12px]">WhatsApp / teléfono</span>
                <input name="contacto" type="tel" required placeholder="+54 9 …" className={field} />
              </label>
              <label className="block">
                <span className="admin-kicker mb-1 block text-[12px]">Email <span className="admin-faint normal-case">(opcional)</span></span>
                <input name="email" type="email" placeholder="tucorreo@ejemplo.com" className={field} />
              </label>
              <label className="block">
                <span className="admin-kicker mb-1 block text-[12px]">Modalidad</span>
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
