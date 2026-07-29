import { AdminShell } from "@/components/AdminShell";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { requireAdmin } from "@/lib/session";
import { getMarca } from "@/lib/store";
import { EditorMarca } from "@/components/EditorMarca";

export const dynamic = "force-dynamic";

export default async function MarcaPage() {
  await requireAdmin("configuracion");
  const marca = await getMarca();

  return (
    <AdminShell>
      <section>
        <AdminPageHeader
          title="Mi sitio"
          description="Personalizá cómo se ve tu página: tus datos, tus textos y tus colores."
        />
        <EditorMarca inicial={marca} />
      </section>
    </AdminShell>
  );
}
