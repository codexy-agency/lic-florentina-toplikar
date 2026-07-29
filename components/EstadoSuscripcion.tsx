import Link from "next/link";
import {
  DIAS_DE_PRUEBA,
  ESTADO_LABEL,
  PLANES,
  diasRestantes,
  precioDe,
  type Suscripcion,
} from "@/lib/planes";

/** Aviso del estado de la cuenta, arriba del panel.
 *
 *  Sólo aparece cuando hay algo que decir: en prueba (con la cuenta de días), o
 *  cuando hay un pago pendiente. Si está al día no molesta a nadie. */
export function AvisoSuscripcion({ s, soporte }: { s: Suscripcion | null; soporte?: string }) {
  if (!s) return null;
  const dias = diasRestantes(s);
  const plan = PLANES[s.plan];

  // Al día y sin nada por vencer: no se muestra nada.
  if (s.estado === "activa" && (dias === null || dias > 7)) return null;

  const tono =
    s.estado === "solo_lectura" || s.estado === "cancelada"
      ? "danger"
      : s.estado === "vencida" || (dias !== null && dias <= 3)
      ? "atencion"
      : "info";

  const clases =
    tono === "danger"
      ? "border-[var(--a-danger)]/30 bg-[var(--a-danger-soft)]"
      : tono === "atencion"
      ? "border-[var(--a-accent)]/30 bg-[var(--a-accent-soft)]"
      : "border-[var(--a-border)] bg-[var(--a-surface-2)]";

  const titulo =
    s.estado === "prueba"
      ? dias === null
        ? `Estás probando Codexy — ${DIAS_DE_PRUEBA} días`
        : dias > 0
        ? `Te quedan ${dias} ${dias === 1 ? "día" : "días"} de prueba`
        : "Terminó tu prueba"
      : s.estado === "vencida"
      ? "Hay un pago pendiente"
      : s.estado === "solo_lectura"
      ? "Tu cuenta está en modo solo lectura"
      : s.estado === "cancelada"
      ? "Tu cuenta está dada de baja"
      : dias !== null && dias <= 7
      ? `Tu plan se renueva en ${dias} ${dias === 1 ? "día" : "días"}`
      : ESTADO_LABEL[s.estado];

  const detalle =
    s.estado === "solo_lectura"
      ? "Podés entrar, consultar y exportar todo: nunca te bloqueamos el acceso a tus historias clínicas. Para volver a cargar datos, escribinos."
      : s.estado === "cancelada"
      ? "Tus datos siguen acá y te los podés llevar cuando quieras. Si querés volver, escribinos."
      : s.estado === "vencida"
      ? "Podés seguir trabajando normalmente. Cuando puedas, avisanos que ya pagaste y lo ponemos al día."
      : s.estado === "prueba"
      ? `Plan ${plan.nombre} · ${plan.para}`
      : `Plan ${plan.nombre} · ${precioDe(s.plan, s.moneda)} por mes`;

  return (
    <div className={`mb-6 rounded-2xl border p-4 sm:p-5 ${clases}`}>
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-espresso">{titulo}</p>
          <p className="admin-muted mt-1 max-w-2xl text-[13.5px] leading-relaxed">{detalle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/plan"
            className="admin-btn-ghost rounded-full px-4 py-2 text-[13px] font-medium"
          >
            Ver mi plan
          </Link>
          {soporte && (s.estado === "vencida" || s.estado === "solo_lectura" || s.estado === "prueba") && (
            <a
              href={soporte}
              target="_blank"
              rel="noopener noreferrer"
              className="admin-btn rounded-full px-4 py-2 text-[13px] font-medium"
            >
              {s.estado === "prueba" ? "Quiero seguir" : "Escribirnos"}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
