import { listPacientes } from "@/lib/store";
import { AdminShell } from "@/components/AdminShell";
import { AdminHeader } from "@/components/AdminHeader";
import { PacientesList } from "@/components/PacientesList";

export const dynamic = "force-dynamic";

export default async function PacientesPage() {
  const pacientes = await listPacientes();
  return (
    <AdminShell>
      <AdminHeader />
      <section className="mt-8">
        <h2 className="font-serif text-2xl tracking-tight text-espresso">Pacientes</h2>
        <p className="mt-1 text-[14px] text-espresso-soft">
          {pacientes.length} {pacientes.length === 1 ? "paciente" : "pacientes"}.
          Entrá a cada uno para ver su historia y cargar notas.
        </p>
        <div className="mt-6">
          <PacientesList pacientes={pacientes} />
        </div>
      </section>
    </AdminShell>
  );
}
