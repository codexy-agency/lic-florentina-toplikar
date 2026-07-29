import { AdminShell } from "@/components/AdminShell";
import { IconoChevron } from "@/components/iconos";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { requireAdmin } from "@/lib/session";
import { getMarca } from "@/lib/store";
import { EditorMarca } from "@/components/EditorMarca";
import { LinksDelSitio } from "@/components/LinksDelSitio";

export const dynamic = "force-dynamic";

export default async function MarcaPage() {
  await requireAdmin("configuracion");
  const marca = await getMarca();

  return (
    <AdminShell>
      <section>
        <AdminPageHeader
          title="Mi sitio"
          description="Personalizá cómo se ve tu página, y compartí tu link para que reserven solos."
        />

        {/* Links para compartir — lo primero que necesita al publicar */}
        <div className="mt-6">
          <LinksDelSitio dominio={marca.dominio || undefined} />
        </div>

        {/* Dominio propio */}
        <details className="admin-card group mt-4 rounded-2xl">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-[14px] font-medium text-espresso">
            <span className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--a-accent)]">
                <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7L12 19" />
              </svg>
              Usar mi propio dominio
              {marca.dominio && (
                <span className="admin-chip-accent rounded-full px-2 py-0.5 text-[11px] font-semibold">
                  {marca.dominio}
                </span>
              )}
            </span>
            <IconoChevron className="admin-faint transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-[var(--a-border)] p-4 text-[13.5px] leading-relaxed text-[var(--a-text-2)]">
            <p>
              Si ya tenés un dominio (por ejemplo <strong>anagomez.com</strong>), tu página puede
              vivir ahí en vez del link de la plataforma.
            </p>
            <ol className="mt-3 space-y-2">
              <li>
                <strong className="text-espresso">1.</strong> Escribilo abajo en{" "}
                <em>Dominio propio</em> y guardá.
              </li>
              <li>
                <strong className="text-espresso">2.</strong> Avisanos por WhatsApp: lo damos de alta
                y te pasamos los datos de DNS que hay que cargar donde compraste el dominio.
              </li>
              <li>
                <strong className="text-espresso">3.</strong> En unas horas tu página queda con tu
                dominio, con certificado de seguridad incluido.
              </li>
            </ol>
            <p className="admin-faint mt-3 text-[12.5px]">
              Mientras tanto tu sitio sigue funcionando con el link de arriba. No se pierde nada.
            </p>
          </div>
        </details>

        <EditorMarca inicial={marca} />
      </section>
    </AdminShell>
  );
}
