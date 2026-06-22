import { listServices } from "@/lib/store";
import { AdminShell } from "@/components/AdminShell";
import { ServiciosEditor } from "@/components/ServiciosEditor";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ServiciosPage() {
  await requireAdmin();
  const services = await listServices();
  return (
    <AdminShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-[26px] tracking-tight text-espresso md:text-[30px]">Servicios</h1>
          <p className="admin-muted mt-1 text-[14px]">
            Lo que el paciente puede reservar. La duración de cada servicio define
            la duración del turno.
          </p>
        </div>
      </div>
      <div className="mt-6">
        <ServiciosEditor initial={services} />
      </div>
    </AdminShell>
  );
}
