// Identidad y contacto de CODEXY (la agencia que hace la plataforma).
//
// Va separado de lib/marca.ts a propósito: `marca` es la identidad del
// psicólogo, que él configura. Esto es la nuestra, que es igual para todos los
// consultorios y no se edita desde ningún panel.
//
// Todo sale de variables de entorno con un valor por defecto usable, así el
// número de soporte se puede cambiar sin desplegar código.

/** WhatsApp de soporte de Codexy, en dígitos. */
export function soporteWhatsapp(): string | null {
  const d = (process.env.CODEXY_SOPORTE_WHATSAPP || "").replace(/[^0-9]/g, "");
  return d.length >= 8 ? d : null;
}

/** Link de WhatsApp de soporte, con un mensaje previo si se le pasa contexto. */
export function soporteUrl(mensaje?: string): string | null {
  const d = soporteWhatsapp();
  if (!d) return null;
  const q = mensaje ? `?text=${encodeURIComponent(mensaje)}` : "";
  return `https://wa.me/${d}${q}`;
}

export function soporteEmail(): string {
  return process.env.CODEXY_SOPORTE_EMAIL || "hola@codexyoficial.com";
}

export const CODEXY = {
  nombre: "Codexy",
  /** Cómo nos presentamos ante un psicólogo, en una línea. */
  bajada: "Software para consultorios de psicología",
  sitio: process.env.CODEXY_SITIO || "https://codexyoficial.com",
} as const;

// ─────────────────────────── Paleta de Codexy ───────────────────────────
//
// Es DELIBERADAMENTE distinta de las paletas de los consultorios (rosas, verdes
// salvia, terracota…). Aquellas son cálidas y suaves porque hablan a un paciente
// que está por pedir ayuda. Esta habla a un profesional que evalúa una
// herramienta de trabajo: tiene que leerse seria, técnica y confiable.
//
// Índigo profundo como base, no azul corporativo: el azul saturado es el color
// de todos los SaaS de gestión y no distingue nada. El acento ámbar aparece muy
// poco, sólo en la acción principal.
export const PALETA_CODEXY = {
  /** Fondo oscuro de la marca. */
  tinta: "#161B2E",
  /** Un paso más claro, para superficies sobre la tinta. */
  tintaSuave: "#212843",
  /** Acento principal: índigo legible sobre claro y sobre oscuro. */
  indigo: "#4B5FCF",
  /** Índigo oscuro para texto sobre fondo claro (contraste AA). */
  indigoProfundo: "#33409B",
  /** Acento cálido, con cuentagotas: sólo la acción principal. */
  ambar: "#E0A24B",
  /** Fondo claro de la marca: gris muy leve con un punto de azul, no blanco puro. */
  papel: "#F7F8FB",
  /** Texto sobre papel. */
  grafito: "#1C2033",
} as const;
