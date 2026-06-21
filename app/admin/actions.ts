"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  setEstado,
  getScheduling,
  crearTurnoManual,
  listServices,
  listStaff,
} from "@/lib/store";
import { SESSION_COOKIE, verifyToken } from "@/lib/auth";
import { arLocalToIso, endFromStart } from "@/lib/scheduling/slots";

// Defensa en profundidad: además del proxy que protege /admin, re-verificamos la
// sesión dentro de cada Server Action (las CVEs de bypass de middleware hacen que
// valga la pena no depender solo del proxy).
async function auth() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifyToken(token))) throw new Error("No autorizado");
}

export async function aceptarSolicitud(formData: FormData) {
  await auth();
  const id = String(formData.get("id") || "");
  if (!id) return;
  // "fecha" (datetime-local AR) es OPCIONAL: si la profesional la deja vacía,
  // se confirma el slot que el paciente ya eligió. Si la completa, reprograma.
  const fechaLocal = String(formData.get("fecha") || "").trim();
  let startsAt: string | undefined;
  let endsAt: string | undefined;
  if (fechaLocal) {
    startsAt = arLocalToIso(fechaLocal) || undefined;
    if (startsAt) {
      const { config } = await getScheduling();
      endsAt = endFromStart(startsAt, config.slotDurationMin);
    }
  }
  await setEstado(id, "confirmado", startsAt, endsAt);
  revalidatePath("/admin");
}

export async function reprogramarTurno(formData: FormData) {
  await auth();
  const id = String(formData.get("id") || "");
  const fechaLocal = String(formData.get("fecha") || "").trim();
  if (!id || !fechaLocal) return;
  const startsAt = arLocalToIso(fechaLocal);
  if (!startsAt) return;
  const { config } = await getScheduling();
  const endsAt = endFromStart(startsAt, config.slotDurationMin);
  await setEstado(id, "confirmado", startsAt, endsAt);
  revalidatePath("/admin");
}

export async function rechazarSolicitud(formData: FormData) {
  await auth();
  const id = String(formData.get("id") || "");
  if (id) await setEstado(id, "rechazado");
  revalidatePath("/admin");
}

export async function marcarRealizado(formData: FormData) {
  await auth();
  const id = String(formData.get("id") || "");
  if (id) await setEstado(id, "realizado");
  revalidatePath("/admin");
}

export async function marcarNoAsistio(formData: FormData) {
  await auth();
  const id = String(formData.get("id") || "");
  if (id) await setEstado(id, "no_asistio");
  revalidatePath("/admin");
}

export type ManualState = { ok: boolean; error?: string; nombre?: string };

// Agenda un turno a mano (paciente que escribió por WhatsApp / teléfono).
// Queda confirmado al instante y se registra al paciente automáticamente.
// Firma compatible con useActionState para mostrar feedback en línea.
export async function agendarTurnoManual(
  _prev: ManualState | null,
  formData: FormData
): Promise<ManualState> {
  try {
    await auth();
    const nombre = String(formData.get("nombre") || "").trim().slice(0, 120);
    const contacto = String(formData.get("contacto") || "").trim().slice(0, 160);
    const modalidad =
      String(formData.get("modalidad") || "online") === "presencial"
        ? "presencial"
        : "online";
    const serviceId = String(formData.get("serviceId") || "").trim();
    const staffId = String(formData.get("staffId") || "").trim();
    const fechaLocal = String(formData.get("fecha") || "").trim();
    if (!nombre || !contacto || !fechaLocal) {
      return { ok: false, error: "Completá nombre, contacto y fecha." };
    }
    const startsAt = arLocalToIso(fechaLocal);
    if (!startsAt) return { ok: false, error: "La fecha no es válida." };

    const [services, staffList, scheduling] = await Promise.all([
      listServices(),
      listStaff(),
      getScheduling(),
    ]);
    const svc = serviceId ? services.find((s) => s.id === serviceId) : undefined;
    const stf = staffId ? staffList.find((s) => s.id === staffId) : undefined;
    const dur = svc?.durationMin ?? scheduling.config.slotDurationMin;
    const endsAt = endFromStart(startsAt, dur);

    const turno = await crearTurnoManual({
      nombre,
      contacto,
      modalidad,
      serviceId: svc?.id,
      serviceName: svc?.nombre,
      staffId: stf?.id,
      staffName: stf?.nombre,
      precio: svc?.priceARS,
      startsAt,
      endsAt,
    });
    if (!turno) {
      return {
        ok: false,
        error: "Ese horario se superpone con otro turno. Elegí otro.",
      };
    }
    revalidatePath("/admin");
    return { ok: true, nombre };
  } catch (e) {
    console.error("[agendarTurnoManual]", e);
    return { ok: false, error: "No se pudo agendar. Reintentá." };
  }
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}
