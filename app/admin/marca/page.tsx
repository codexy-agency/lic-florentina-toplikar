import { AdminShell } from "@/components/AdminShell";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { requireAdmin } from "@/lib/session";
import { getMarca } from "@/lib/store";
import { LinksDelSitio } from "@/components/LinksDelSitio";

export const dynamic = "force-dynamic";

export const metadata = { title: "Enlaces del sitio" };

// RS Odontología: esta pantalla muestra solamente los dos enlaces para copiar y
// abrir. La marca, los textos y los colores del sitio no se editan desde acá.
export default async function EnlacesPage() {
  await requireAdmin("configuracion");
  const marca = await getMarca();

  return (
    <AdminShell>
      <section>
        <AdminPageHeader
          title="Enlaces del sitio"
          description="Los dos enlaces para compartir: el sitio y la reserva de turnos."
        />
        <div className="mt-6">
          <LinksDelSitio dominio={marca.dominio || undefined} />
        </div>
      </section>
    </AdminShell>
  );
}
