import { promises as fs } from "fs";
import path from "path";
import { AdminShell } from "@/components/AdminShell";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { requireAdmin } from "@/lib/session";
import { renderMarkdown } from "@/lib/markdown";
import { soporteEmail, soporteUrl } from "@/lib/codexy";
import { IconoChevron } from "@/components/iconos";

export const dynamic = "force-dynamic";

/** Las guías que se le muestran al cliente.
 *
 *  OPERACION.md queda AFUERA: es el runbook interno de Codexy (contiene el
 *  procedimiento de alta, las trampas conocidas y los incidentes). No es
 *  información del psicólogo. */
const GUIAS = [
  {
    archivo: "PRIMEROS-PASOS.md",
    titulo: "Primeros pasos",
    resumen: "Tu consultorio funcionando, de cero, en quince minutos.",
    abiertaPorDefecto: true,
  },
  {
    archivo: "GUIA-PANEL.md",
    titulo: "Manual del panel",
    resumen: "Qué hace cada sección, en detalle.",
    abiertaPorDefecto: false,
  },
];

async function leerGuia(archivo: string): Promise<string | null> {
  try {
    const ruta = path.join(process.cwd(), "docs", "guias", archivo);
    return await fs.readFile(ruta, "utf-8");
  } catch {
    // Si el archivo no viajó en el bundle (ver outputFileTracingIncludes en
    // next.config.ts), la página no se rompe: muestra el resto y el contacto.
    return null;
  }
}

export default async function AyudaPage() {
  await requireAdmin();
  const contenidos = await Promise.all(GUIAS.map((g) => leerGuia(g.archivo)));
  const wa = soporteUrl("Hola, tengo una duda con el panel.");

  return (
    <AdminShell>
      <section>
        <AdminPageHeader
          title="Ayuda"
          description="Las guías del panel, y cómo encontrarnos si algo no sale."
        />

        {/* Contacto arriba: si alguien entra acá es porque está trabado, y no
            queremos que tenga que leer un manual para encontrar cómo preguntar. */}
        <div className="admin-card mt-6 rounded-2xl p-5">
          <p className="font-medium text-espresso">¿Preferís preguntar?</p>
          <p className="admin-muted mt-1 text-[13.5px] leading-relaxed">
            Escribinos y te respondemos nosotros, no un formulario.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                className="admin-btn rounded-full px-5 py-2.5 text-[13.5px] font-medium"
              >
                WhatsApp
              </a>
            )}
            <a
              href={`mailto:${soporteEmail()}`}
              className="admin-btn-ghost rounded-full px-5 py-2.5 text-[13.5px] font-medium"
            >
              {soporteEmail()}
            </a>
          </div>
        </div>

        {/* Guías */}
        <div className="mt-4 space-y-3">
          {GUIAS.map((g, i) => {
            const md = contenidos[i];
            if (!md) return null;
            return (
              <details
                key={g.archivo}
                open={g.abiertaPorDefecto}
                className="admin-card group rounded-2xl"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0">
                    <span className="block text-[16px] font-semibold tracking-tight text-espresso">
                      {g.titulo}
                    </span>
                    <span className="admin-muted mt-0.5 block text-[13px]">{g.resumen}</span>
                  </span>
                  <IconoChevron size={16} className="admin-faint shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <div className="border-t border-[var(--a-border)] px-5 py-5 sm:px-7">
                  {/* El HTML lo genera lib/markdown.ts, que escapa TODA la
                      entrada antes de aplicar formato. Los archivos son nuestros
                      y están versionados, pero el renderizador no confía en eso. */}
                  <div
                    className="max-w-3xl text-[14.5px]"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(md) }}
                  />
                </div>
              </details>
            );
          })}

          {contenidos.every((c) => !c) && (
            <p className="admin-empty admin-muted rounded-2xl p-8 text-center text-[14px]">
              No pudimos cargar las guías. Escribinos y te ayudamos directo.
            </p>
          )}
        </div>
      </section>
    </AdminShell>
  );
}
