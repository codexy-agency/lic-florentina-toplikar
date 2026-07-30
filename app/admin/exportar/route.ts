import { NextResponse } from "next/server";
import { sesionValida } from "@/lib/session";
import { logAudit } from "@/lib/accounts-store";
import { exportarConsultorio } from "@/lib/store";

export const dynamic = "force-dynamic";

/** GET /admin/exportar → todo el consultorio en un JSON.
 *
 *  Existe por tres razones, y las tres importan:
 *
 *  1. DERECHO DEL PROFESIONAL. Los datos son suyos. Si un día se quiere ir de
 *     Codexy, tiene que poder llevárselos sin pedirle permiso a nadie ni esperar
 *     que alguien le corra una consulta a mano.
 *  2. DERECHO DEL PACIENTE. Acceso, rectificación y supresión (Ley 25.326 art.
 *     14 y 16, con plazos de 10 y 5 días hábiles; ARCO en México). El
 *     profesional es el responsable del tratamiento y necesita poder responder;
 *     sin exportación, la única salida era abrir el SQL Editor.
 *  3. QUE LA MOROSIDAD NO SEA UN REHÉN. Un cliente en solo lectura sigue
 *     pudiendo exportar. Es deliberado: retener historias clínicas de pacientes
 *     en tratamiento como palanca de cobro es inaceptable.
 *
 *  Va detrás de `notas_clinicas`, no de `pacientes`: el archivo trae la historia
 *  clínica completa. Un asistente con permiso de pacientes NO se lo lleva.
 *
 *  NO pasa por el gate de suscripción, a propósito (ver punto 3).
 */
export async function GET() {
  const sesion = await sesionValida();
  if (!sesion || !sesion.puede("notas_clinicas")) {
    return new NextResponse("No autorizado", { status: 401 });
  }
  // Una sesión de soporte de Codexy nunca llega acá (puedeSoporte niega
  // notas_clinicas), pero se deja explícito por si el invariante cambia.
  if (sesion.soporte) {
    return new NextResponse("El soporte de Codexy no exporta datos de pacientes.", { status: 403 });
  }

  const datos = await exportarConsultorio();

  await logAudit({
    userId: sesion.userId ?? undefined,
    professionalId: sesion.pid ?? undefined,
    accion: "export_consultorio",
    meta: {
      pacientes: datos.pacientes.length,
      notas: datos.notasClinicas.length,
      solicitudes: datos.solicitudes.length,
    },
  });

  const fecha = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(datos, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="consultorio-${fecha}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
