import { listServices, listStaff } from "@/lib/store";
import { AdminShell } from "@/components/AdminShell";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { ServiciosEditor } from "@/components/ServiciosEditor";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ServiciosPage() {
  await requireAdmin("servicios");
  const [services, staff] = await Promise.all([listServices(), listStaff(true)]);
  // Un servicio que nadie ofrece NO aparece en el reservador (getBookingConfig lo
  // filtra para no dejar al paciente en un callejón sin salida). Pasa seguido: el
  // editor de Profesionales asigna los servicios que existían cuando se creó al
  // profesional, así que todo servicio creado DESPUÉS nace huérfano y en silencio.
  const conProfesional = new Set(
    services.filter((s) => staff.some((st) => st.serviceIds.includes(s.id))).map((s) => s.id)
  );
  return (
    <AdminShell>
      <AdminPageHeader
        title="Servicios"
        description="Lo que el paciente puede reservar. La duración de cada servicio define la duración del turno."
      />
      <div className="mt-6">
        <ServiciosEditor initial={services} conProfesional={[...conProfesional]} />
      </div>
    </AdminShell>
  );
}
