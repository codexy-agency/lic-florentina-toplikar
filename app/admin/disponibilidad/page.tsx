import { getScheduling } from "@/lib/store";
import { AdminShell } from "@/components/AdminShell";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { DisponibilidadEditor } from "@/components/DisponibilidadEditor";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DisponibilidadPage() {
  await requireAdmin();
  const { config, rules, exceptions } = await getScheduling();

  return (
    <AdminShell>
      <AdminPageHeader
        title="Disponibilidad"
        description="Configurá tus horarios. El sitio muestra automáticamente los slots libres a tus pacientes."
      />

      <div className="mt-8">
        <DisponibilidadEditor
          initialConfig={config}
          initialRules={rules}
          initialExceptions={exceptions}
        />
      </div>
    </AdminShell>
  );
}
