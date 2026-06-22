import { getScheduling } from "@/lib/store";
import { AdminShell } from "@/components/AdminShell";
import { DisponibilidadEditor } from "@/components/DisponibilidadEditor";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DisponibilidadPage() {
  await requireAdmin();
  const { config, rules, exceptions } = await getScheduling();

  return (
    <AdminShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-[26px] tracking-tight text-espresso md:text-[30px]">
            Disponibilidad
          </h1>
          <p className="admin-muted mt-1 text-[14px]">
            Configurá tus horarios. El sitio muestra automáticamente los slots
            libres a tus pacientes.
          </p>
        </div>
      </div>

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
