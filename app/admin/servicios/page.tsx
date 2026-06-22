import { listServices } from "@/lib/store";
import { AdminShell } from "@/components/AdminShell";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { ServiciosEditor } from "@/components/ServiciosEditor";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ServiciosPage() {
  await requireAdmin();
  const services = await listServices();
  return (
    <AdminShell>
      <AdminPageHeader
        title="Servicios"
        description="Lo que el paciente puede reservar. La duración de cada servicio define la duración del turno."
      />
      <div className="mt-6">
        <ServiciosEditor initial={services} />
      </div>
    </AdminShell>
  );
}
