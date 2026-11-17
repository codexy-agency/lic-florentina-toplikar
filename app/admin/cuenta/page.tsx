import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

// RS Odontología: la pantalla de cuenta no forma parte de este panel. La ruta se conserva para
// no romper enlaces viejos, pero lleva al inicio. El código original sigue en
// el historial de git y en la rama master de la plataforma.
export default async function Page() {
  await requireAdmin();
  redirect("/admin");
}
