import Link from "next/link";
import { IconoCheck } from "@/components/iconos";
import type { Marca } from "@/lib/marca";
import type { Service, Staff } from "@/lib/scheduling/types";

/** Checklist de arranque.
 *
 *  Desaparece sola cuando está todo hecho: un checklist que queda para siempre
 *  se vuelve ruido y el usuario aprende a ignorar esa zona de la pantalla.
 *
 *  No hace ni una consulta nueva: usa lo que la página de Agenda ya cargó.
 */
export function PrimerosPasos({
  marca,
  services,
  staff,
  reglas,
  huboReserva,
}: {
  marca: Marca;
  services: Service[];
  staff: Staff[];
  reglas: number;
  huboReserva: boolean;
}) {
  const activos = services.filter((s) => s.activo && s.nombre.trim());
  const conPrecio = activos.filter((s) => typeof s.priceARS === "number" && s.priceARS > 0);

  const pasos = [
    {
      hecho: !!marca.nombre,
      titulo: "Poné tu nombre y tus datos",
      detalle: "Tu sitio y tu panel muestran tu nombre, tu título y tu matrícula.",
      href: "/admin/marca",
      accion: "Completar mis datos",
    },
    {
      hecho: staff.filter((p) => p.activo && p.nombre.trim()).length > 0,
      titulo: "Cargate como profesional",
      detalle: "Es quien aparece cuando alguien elige con quién quiere el turno.",
      href: "/admin/profesionales",
      accion: "Agregarme",
    },
    {
      hecho: conPrecio.length > 0,
      titulo: "Ponele precio a tus servicios",
      detalle: activos.length
        ? `Ya tenés ${activos.length} ${activos.length === 1 ? "servicio" : "servicios"} cargados; falta el arancel.`
        : "Definí qué ofrecés y cuánto sale.",
      href: "/admin/servicios",
      accion: "Poner precios",
    },
    {
      hecho: reglas > 0,
      titulo: "Revisá tus horarios",
      detalle: "Te dejamos lunes a viernes de 9 a 13 y de 15 a 19. Ajustalo a los tuyos.",
      href: "/admin/disponibilidad",
      accion: "Ver horarios",
    },
    {
      hecho: !!marca.whatsapp,
      titulo: "Sumá tu WhatsApp",
      detalle: "Sin esto, tu sitio no muestra el botón para que te escriban.",
      href: "/admin/marca",
      accion: "Agregar WhatsApp",
    },
    {
      hecho: huboReserva,
      titulo: "Probá una reserva",
      detalle: "Reservá un turno como si fueras un paciente, para ver cómo se siente.",
      href: "/reservar",
      accion: "Probar mi reservador",
      externo: true,
    },
  ];

  const listos = pasos.filter((p) => p.hecho).length;
  if (listos === pasos.length) return null;

  // Aviso duro: cuándo el sitio NO puede recibir reservas.
  //
  // La condición replica exactamente la de getBookingConfig(), que sólo ofrece un
  // servicio si hay al menos un profesional activo que lo dé (para no llevar al
  // paciente a un callejón sin salida). Si acá pusiéramos una regla más laxa, el
  // checklist diría que todo está bien mientras el reservador muestra la nada.
  const profesionales = staff.filter((p) => p.activo && p.nombre.trim());
  const reservables = activos.filter((s) => profesionales.some((p) => p.serviceIds.includes(s.id)));
  const falta =
    reservables.length === 0
      ? profesionales.length === 0
        ? "cargarte como profesional"
        : "asignarle un profesional a algún servicio"
      : reglas === 0
      ? "definir tus horarios"
      : null;

  return (
    <div className="admin-card mb-6 rounded-2xl p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div>
          <h2 className="text-[18px] font-semibold tracking-tight text-espresso">
            Primeros pasos
          </h2>
          <p className="admin-muted mt-1 text-[13px]">
            Cinco minutos y tu sitio queda listo para recibir pacientes.
          </p>
        </div>
        <span className="admin-chip rounded-full px-3 py-1 text-[12.5px] font-semibold tabular-nums">
          {listos} de {pasos.length}
        </span>
      </div>

      {/* Progreso */}
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--a-surface-2)]">
        <div
          className="h-full rounded-full bg-[var(--a-ok)] transition-all duration-500"
          style={{ width: `${Math.round((listos / pasos.length) * 100)}%` }}
        />
      </div>

      {falta && (
        <p className="mt-4 rounded-xl bg-[var(--a-danger-soft)] px-3.5 py-2.5 text-[13px] font-medium text-[var(--a-danger)]">
          Tu sitio todavía no puede recibir reservas: falta {falta}.
        </p>
      )}

      <ul className="mt-4 divide-y divide-[var(--a-border)]">
        {pasos.map((p) => (
          <li key={p.titulo} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                p.hecho
                  ? "bg-[var(--a-ok-soft)] text-[var(--a-ok)]"
                  : "border border-dashed border-[var(--a-border-strong)]"
              }`}
            >
              {p.hecho && <IconoCheck size={13} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-[14px] font-medium ${p.hecho ? "admin-muted line-through" : "text-espresso"}`}>
                {p.titulo}
              </p>
              {!p.hecho && (
                <p className="admin-muted mt-0.5 text-[12.5px] leading-relaxed">{p.detalle}</p>
              )}
            </div>
            {!p.hecho &&
              (p.externo ? (
                <a
                  href={p.href}
                  target="_blank"
                  rel="noreferrer"
                  className="admin-btn-ghost rounded-full px-3.5 py-1.5 text-[12.5px] font-medium"
                >
                  {p.accion}
                </a>
              ) : (
                <Link
                  href={p.href}
                  className="admin-btn-ghost rounded-full px-3.5 py-1.5 text-[12.5px] font-medium"
                >
                  {p.accion}
                </Link>
              ))}
          </li>
        ))}
      </ul>
    </div>
  );
}
