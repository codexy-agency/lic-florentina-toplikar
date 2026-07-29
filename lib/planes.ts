// PLANES Y SUSCRIPCIÓN: lo que Codexy le cobra al psicólogo.
//
// No confundir con Finanzas, que es la plata que el psicólogo le cobra a sus
// pacientes. Son dos cosas distintas y no se tocan.
//
// Este archivo existe ANTES que la pasarela de pago, a propósito. Los primeros
// clientes se cobran a mano (link de Mercado Pago o Stripe, factura aparte) y el
// estado se pone desde el panel de Codexy. Pero el campo tiene que existir
// igual: sin un plan y un estado por consultorio, en tres meses no hay forma de
// saber cuántos clientes activos hay, ni quién está en prueba, ni quién debe.
//
// Cuando se enchufe la pasarela, el webhook va a escribir estos mismos campos y
// nada más del sistema tiene que cambiar.

export type PlanId = "prueba" | "esencial" | "consultorio";

/** Estado de la suscripción. El orden importa: es de mejor a peor. */
export type EstadoSuscripcion =
  | "prueba" // periodo gratuito, todo habilitado
  | "activa" // paga y al día
  | "vencida" // no pagó: aviso en el panel, todavía escribe
  | "solo_lectura" // gracia agotada: puede leer y exportar, no crear
  | "cancelada"; // se dio de baja

export type Moneda = "ARS" | "MXN" | "USD";

/** Topes por plan. `null` = sin límite.
 *
 *  Los números son deliberadamente holgados: el objetivo no es apretar al
 *  cliente chico, es que un consultorio grande pague lo que corresponde y que
 *  el costo variable del asistente IA no quede abierto. */
export interface Limites {
  /** Pacientes activos. */
  pacientes: number | null;
  /** Personas con acceso al panel, incluido el dueño. */
  miembros: number | null;
  /** Profesionales que atienden (staff del reservador). */
  profesionales: number | null;
  /** Mensajes al asistente IA por mes. Es el único costo variable real. */
  asistenteMes: number | null;
}

export interface Plan {
  id: PlanId;
  nombre: string;
  /** Para quién es, en una línea, en el idioma del cliente. */
  para: string;
  limites: Limites;
  /** Precio por mes en cada mercado. 0 = sin cargo. */
  precio: Record<Moneda, number>;
}

/** Días del periodo de prueba. */
export const DIAS_DE_PRUEBA = 14;

export const PLANES: Record<PlanId, Plan> = {
  prueba: {
    id: "prueba",
    nombre: "Prueba",
    para: `${DIAS_DE_PRUEBA} días para probarlo con pacientes reales.`,
    limites: { pacientes: 15, miembros: 2, profesionales: 2, asistenteMes: 50 },
    precio: { ARS: 0, MXN: 0, USD: 0 },
  },
  esencial: {
    id: "esencial",
    nombre: "Esencial",
    para: "Para quien atiende solo.",
    limites: { pacientes: 80, miembros: 2, profesionales: 2, asistenteMes: 300 },
    // Los precios se ajustan por mercado, no por tipo de cambio: el poder de
    // compra de un psicólogo en Argentina no es el de uno en Estados Unidos.
    precio: { ARS: 18_000, MXN: 349, USD: 19 },
  },
  consultorio: {
    id: "consultorio",
    nombre: "Consultorio",
    para: "Para un equipo que comparte agenda y secretaría.",
    limites: { pacientes: null, miembros: 10, profesionales: 10, asistenteMes: 1500 },
    precio: { ARS: 34_000, MXN: 649, USD: 39 },
  },
};

export const PLANES_ORDENADOS: Plan[] = [PLANES.prueba, PLANES.esencial, PLANES.consultorio];

export interface Suscripcion {
  plan: PlanId;
  estado: EstadoSuscripcion;
  moneda: Moneda;
  /** ISO. Hasta cuándo está pago (o cuándo termina la prueba). */
  periodoHasta: string | null;
  /** Notas internas de Codexy: cómo pagó, número de factura, lo que sea.
   *  NUNCA datos de tarjeta. */
  nota?: string;
  actualizadoEn: string;
}

export function esPlanValido(v: unknown): v is PlanId {
  return typeof v === "string" && v in PLANES;
}

const ESTADOS: EstadoSuscripcion[] = ["prueba", "activa", "vencida", "solo_lectura", "cancelada"];
export function esEstadoValido(v: unknown): v is EstadoSuscripcion {
  return typeof v === "string" && (ESTADOS as string[]).includes(v);
}

const MONEDAS: Moneda[] = ["ARS", "MXN", "USD"];
export function esMonedaValida(v: unknown): v is Moneda {
  return typeof v === "string" && (MONEDAS as string[]).includes(v);
}

/** Suscripción por defecto para un consultorio del que no sabemos nada.
 *
 *  Arranca en prueba, NO en cancelada: un consultorio que existe y no tiene
 *  registro de suscripción es casi siempre uno recién creado o migrado a mano.
 *  Preferimos dejarlo trabajar y que Codexy lo ponga al día, antes que dejar a
 *  un psicólogo sin acceso a su agenda por un dato administrativo faltante. */
export function suscripcionPorDefecto(): Suscripcion {
  return {
    plan: "prueba",
    estado: "prueba",
    moneda: "ARS",
    periodoHasta: null,
    actualizadoEn: new Date().toISOString(),
  };
}

export function normalizarSuscripcion(raw: unknown): Suscripcion {
  const s = (raw && typeof raw === "object" ? raw : {}) as Partial<Suscripcion>;
  return {
    plan: esPlanValido(s.plan) ? s.plan : "prueba",
    estado: esEstadoValido(s.estado) ? s.estado : "prueba",
    moneda: esMonedaValida(s.moneda) ? s.moneda : "ARS",
    periodoHasta: typeof s.periodoHasta === "string" ? s.periodoHasta : null,
    nota: typeof s.nota === "string" ? s.nota.slice(0, 500) : undefined,
    actualizadoEn:
      typeof s.actualizadoEn === "string" ? s.actualizadoEn : new Date().toISOString(),
  };
}

/** ¿Puede ESCRIBIR? (crear turnos, pacientes, notas…)
 *
 *  Regla que se escribe también en el contrato: la morosidad nunca corta el
 *  acceso del profesional a lo que ya cargó. Puede quedar en solo lectura, pero
 *  siempre puede entrar, consultar y exportar. Son historias clínicas de
 *  pacientes en tratamiento: cortarlas por una factura es inaceptable. */
export function puedeEscribir(s: Suscripcion): boolean {
  return s.estado === "prueba" || s.estado === "activa" || s.estado === "vencida";
}

/** ¿El sitio público del consultorio sigue recibiendo reservas? */
export function sitioPublicoActivo(s: Suscripcion): boolean {
  return s.estado !== "cancelada";
}

/** Días que faltan para que se venza el periodo. Negativo = ya venció. */
export function diasRestantes(s: Suscripcion, ahora = Date.now()): number | null {
  if (!s.periodoHasta) return null;
  const t = Date.parse(s.periodoHasta);
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - ahora) / 86_400_000);
}

export const LIMITE_LABEL: Record<keyof Limites, string> = {
  pacientes: "pacientes",
  miembros: "personas con acceso",
  profesionales: "profesionales",
  asistenteMes: "mensajes al asistente por mes",
};

/** ¿Este consultorio puede agregar UNO más de `recurso`?
 *
 *  Devuelve el motivo cuando no puede, para poder mostrarlo tal cual. */
export function dentroDelLimite(
  s: Suscripcion,
  recurso: keyof Limites,
  usoActual: number
): { ok: true } | { ok: false; motivo: string; tope: number } {
  const tope = PLANES[s.plan].limites[recurso];
  if (tope === null) return { ok: true };
  if (usoActual < tope) return { ok: true };
  return {
    ok: false,
    tope,
    motivo: `Tu plan ${PLANES[s.plan].nombre} incluye hasta ${tope} ${LIMITE_LABEL[recurso]}.`,
  };
}

/** Precio formateado en la moneda de la suscripción. */
export function precioDe(plan: PlanId, moneda: Moneda): string {
  const v = PLANES[plan].precio[moneda];
  if (v === 0) return "Sin cargo";
  const locale = moneda === "ARS" ? "es-AR" : moneda === "MXN" ? "es-MX" : "en-US";
  return new Intl.NumberFormat(locale, { style: "currency", currency: moneda, maximumFractionDigits: 0 }).format(v);
}

export const MONEDAS_LABEL: Record<Moneda, string> = {
  ARS: "ARS · Argentina",
  MXN: "MXN · México",
  USD: "USD · internacional",
};

export const ESTADO_LABEL: Record<EstadoSuscripcion, string> = {
  prueba: "En prueba",
  activa: "Al día",
  vencida: "Pago pendiente",
  solo_lectura: "Solo lectura",
  cancelada: "Cancelada",
};
