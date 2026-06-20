import { getScheduling } from "@/lib/store";
import { AdminHeader } from "@/components/AdminHeader";
import { DisponibilidadEditor } from "@/components/DisponibilidadEditor";

export const dynamic = "force-dynamic";

export default async function DisponibilidadPage() {
  const { config, rules, exceptions } = await getScheduling();

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 md:px-8 md:py-14">
      <AdminHeader />

      <section className="mt-10">
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
    </main>
  );
}
