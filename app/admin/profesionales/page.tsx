import { listStaff, listServices } from "@/lib/store";
import { AdminShell } from "@/components/AdminShell";
import { ProfesionalesEditor } from "@/components/ProfesionalesEditor";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProfesionalesPage() {
  await requireAdmin();
  const [staff, services] = await Promise.all([listStaff(), listServices()]);
  return (
    <AdminShell>
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-[26px] tracking-tight text-espresso md:text-[30px]">Profesionales</h1>
            <p className="admin-muted mt-1 text-[14px]">
              Quiénes atienden y qué servicios ofrece cada una. En la reserva, si un
              servicio lo da una sola profesional, se asigna automáticamente.
            </p>
          </div>
        </div>
        <div className="mt-6">
          <ProfesionalesEditor initial={staff} services={services} />
        </div>
      </section>
    </AdminShell>
  );
}
