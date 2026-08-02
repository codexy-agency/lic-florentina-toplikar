import { NextResponse } from "next/server";
import { sesionValida } from "@/lib/session";
import { logAudit } from "@/lib/accounts-store";
import { bloquearExportDeSoporte } from "@/lib/soporte";
import { getFinanzas } from "@/lib/store";

import { isoToArLocal } from "@/lib/scheduling/slots";

export const dynamic = "force-dynamic";

const METODO_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  mercadopago: "Mercado Pago",
  tarjeta: "Tarjeta",
  manual: "Manual / consultorio",
};

/** Escapa un campo para CSV con separador ';' (formato Excel-AR) y neutraliza
 *  inyeccion de formulas: un valor de TEXTO que arranca con = + - @ (o tab/CR)
 *  podria ejecutarse como formula al abrir el CSV en Excel/Sheets. Se le antepone
 *  un apostrofo. No aplica a numeros (los montos negativos siguen siendo numeros). */
function cell(v: string | number): string {
  let s = String(v ?? "");
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Exporta los movimientos del período a CSV (para pasarle a la contadora).
 *  Una fila por movimiento: turnos + ingresos/egresos cargados a mano. */
export async function GET(req: Request) {
  const sesion = await sesionValida();
  if (!sesion || !sesion.puede("finanzas")) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  // El soporte de Codexy puede VER finanzas para ayudar, pero no bajarse el
  // archivo: lleva el nombre de cada paciente junto a lo que pagó.
  const veto = bloquearExportDeSoporte(sesion);
  if (veto) return new NextResponse(veto, { status: 403 });

  const periodo = new URL(req.url).searchParams.get("periodo") || "mes";
  const f = await getFinanzas(periodo);

  // AUDITORÍA. Este CSV lleva el nombre de cada paciente junto a lo que pagó:
  // es una extracción masiva de datos personales, no un reporte de números. Que
  // quede registro de quién se lo llevó y cuándo es lo mínimo (Ley 25.326 art. 9,
  // y lo que pide el audit trail de HIPAA). No se guarda el contenido, sólo el
  // hecho y el volumen.
  await logAudit({
    userId: sesion.userId ?? undefined,
    professionalId: sesion.pid ?? undefined,
    accion: "export_finanzas",
    meta: { periodo, filas: f.movimientos.length },
  });

  const filas = f.movimientos.map((m) => {
    const fecha = m.fecha ? isoToArLocal(m.fecha).replace("T", " ") : "";
    const egreso = m.tipo === "egreso";
    return [
      cell(fecha),
      cell(m.nombre),
      cell(egreso ? m.categoria || "Gasto" : m.serviceName || ""),
      cell(m.staffName || ""),
      cell(egreso ? "Egreso" : "Ingreso"),
      cell(m.metodoPago ? METODO_LABEL[m.metodoPago] || m.metodoPago : ""),
      cell(egreso ? -m.monto : m.monto),
      cell(m.pagado ? "Sí" : "No"),
    ].join(";");
  });

  const header = [
    "Fecha",
    "Concepto/Paciente",
    "Servicio/Categoría",
    "Profesional",
    "Tipo",
    "Método",
    "Monto",
    "Cobrado",
  ].join(";");

  // BOM para que Excel reconozca UTF-8 y los acentos.
  const csv = "﻿" + [header, ...filas].join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="finanzas-${periodo}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
