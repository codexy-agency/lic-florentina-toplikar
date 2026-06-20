import { listServices } from "@/lib/store";
import { AdminHeader } from "@/components/AdminHeader";
import { AdminShell } from "@/components/AdminShell";
import { ServiciosEditor } from "@/components/ServiciosEditor";

export const dynamic = "force-dynamic";

export default async function ServiciosPage() {
  const services = await listServices();
  return (
    <AdminShell>
      <AdminHeader />
      <section className="mt-8">
        <h2 className="font-serif text-xl tracking-tight text-espresso">Servicios</h2>
        <p className="mt-1 text-[14px] text-espresso-soft">
          Lo que el paciente puede reservar. La duración de cada servicio define
          la duración del turno.
        </p>
        <div className="mt-6">
          <ServiciosEditor initial={services} />
        </div>
      </section>
    </AdminShell>
  );
}
