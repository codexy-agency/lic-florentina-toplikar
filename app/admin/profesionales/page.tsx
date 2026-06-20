import { listStaff, listServices } from "@/lib/store";
import { AdminHeader } from "@/components/AdminHeader";
import { ProfesionalesEditor } from "@/components/ProfesionalesEditor";

export const dynamic = "force-dynamic";

export default async function ProfesionalesPage() {
  const [staff, services] = await Promise.all([listStaff(), listServices()]);
  return (
    <main className="mx-auto max-w-5xl px-5 py-10 md:px-8 md:py-14">
      <AdminHeader />
      <section className="mt-10">
        <h2 className="font-serif text-xl tracking-tight text-espresso">Profesionales</h2>
        <p className="mt-1 text-[14px] text-espresso-soft">
          Quiénes atienden y qué servicios ofrece cada una. En la reserva, si un
          servicio lo da una sola profesional, se asigna automáticamente.
        </p>
        <div className="mt-6">
          <ProfesionalesEditor initial={staff} services={services} />
        </div>
      </section>
    </main>
  );
}
