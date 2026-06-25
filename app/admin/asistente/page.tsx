import { AdminShell } from "@/components/AdminShell";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { Asistente } from "@/components/Asistente";
import { requireAdmin } from "@/lib/session";
import { aiConfigured } from "@/lib/openai";

export const dynamic = "force-dynamic";

export default async function AsistentePage() {
  await requireAdmin();
  const configurado = aiConfigured();
  return (
    <AdminShell>
      <section>
        <AdminPageHeader title="Asistente" description="Tu copiloto del consultorio, en lenguaje natural." />
        {!configurado && (
          <div className="mt-5 rounded-2xl border border-[var(--a-border-strong)] bg-[var(--a-danger-soft)] p-4 text-[13.5px] text-[var(--a-danger)]">
            <p className="font-semibold">Falta configurar el asistente.</p>
            <p className="mt-1">
              Agregá <code className="rounded bg-black/5 px-1">OPENAI_API_KEY</code> en las Variables de Entorno de Vercel
              (y opcionalmente <code className="rounded bg-black/5 px-1">OPENAI_MODEL</code>, default <code className="rounded bg-black/5 px-1">gpt-4o-mini</code>) para activarlo.
            </p>
          </div>
        )}
        <div className="mt-5">
          <Asistente />
        </div>
      </section>
    </AdminShell>
  );
}
