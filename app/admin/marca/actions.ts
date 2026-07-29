"use server";

import { revalidatePath } from "next/cache";
import { requirePermiso } from "@/lib/session";
import { saveMarca, getMarca } from "@/lib/store";
import { PALETAS, PALETA_DEFECTO } from "@/lib/marca";

export type MarcaState = { ok: boolean; error?: string; mensaje?: string };

export async function guardarMarca(
  _prev: MarcaState | null,
  formData: FormData
): Promise<MarcaState> {
  try {
    await requirePermiso("configuracion");
    const s = (k: string) => String(formData.get(k) || "");

    // Si eligió una paleta predefinida, usamos esa; si no, los colores sueltos.
    const paletaId = s("paletaId");
    const preset = PALETAS.find((p) => p.id === paletaId);
    const paleta = preset
      ? preset.paleta
      : {
          acento: s("acento") || PALETA_DEFECTO.acento,
          acentoOscuro: s("acentoOscuro") || PALETA_DEFECTO.acentoOscuro,
          secundario: s("secundario") || PALETA_DEFECTO.secundario,
          fondo: s("fondo") || PALETA_DEFECTO.fondo,
          fondoSuave: s("fondoSuave") || PALETA_DEFECTO.fondoSuave,
          texto: s("texto") || PALETA_DEFECTO.texto,
        };

    await saveMarca({
      nombre: s("nombre"),
      titulo: s("titulo"),
      matricula: s("matricula"),
      ciudad: s("ciudad"),
      heroTitulo: s("heroTitulo"),
      heroSubtitulo: s("heroSubtitulo"),
      sobreMi: s("sobreMi"),
      whatsapp: s("whatsapp"),
      email: s("email"),
      instagram: s("instagram"),
      dominio: s("dominio"),
      paleta,
    });

    // El sitio público y el panel muestran la marca: hay que refrescar ambos.
    revalidatePath("/", "layout");
    revalidatePath("/admin/marca");
    return { ok: true, mensaje: "Listo, tu sitio ya se ve con estos datos." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo guardar." };
  }
}

export async function marcaActual() {
  await requirePermiso("configuracion");
  return getMarca();
}
