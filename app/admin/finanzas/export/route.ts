import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getFinanzas } from "@/lib/store";
import { verifyToken, SESSION_COOKIE } from "@/lib/auth";
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
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifyToken(token))) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const periodo = new URL(req.url).searchParams.get("periodo") || "mes";
  const f = await getFinanzas(periodo);

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
