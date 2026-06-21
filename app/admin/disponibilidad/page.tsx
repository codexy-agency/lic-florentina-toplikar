import { getScheduling } from "@/lib/store";
import { AdminHeader } from "@/components/AdminHeader";
import { AdminShell } from "@/components/AdminShell";
import { DisponibilidadEditor } from "@/components/DisponibilidadEditor";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DisponibilidadPage() {
  await requireAdmin();
  const { config, rules, exceptions } = await getScheduling();

  return (
    <AdminShell>
      <AdminHeader />

      <section className="mt-8">
        <h2 className="font-serif text-xl tracking-tight text-espresso">
          Disponibilidad
        </h2>
        <p className="mt-1 text-[14px] text-espresso-soft">
          Configurá tus horarios. El sitio muestra automáticamente los slots
          libres a tus pacientes.
        </p>
      </section>

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
