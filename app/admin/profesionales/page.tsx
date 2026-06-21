import { listStaff, listServices } from "@/lib/store";
import { AdminHeader } from "@/components/AdminHeader";
import { AdminShell } from "@/components/AdminShell";
import { ProfesionalesEditor } from "@/components/ProfesionalesEditor";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProfesionalesPage() {
  await requireAdmin();
  const [staff, services] = await Promise.all([listStaff(), listServices()]);
  return (
    <AdminShell>
      <AdminHeader />
      <section className="mt-8">
        <h2 className="font-serif text-xl tracking-tight text-espresso">Profesionales</h2>
        <p className="admin-muted mt-1 text-[14px]">
          Quiénes atienden y qué servicios ofrece cada una. En la reserva, si un
          servicio lo da una sola profesional, se asigna automáticamente.
        </p>
        <div className="mt-6">
          <ProfesionalesEditor initial={staff} services={services} />
        </div>
      </section>
    </AdminShell>
  );
}
