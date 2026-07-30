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
// GRAFITO Y COBRE. Es DELIBERADAMENTE distinta de las paletas de los
// consultorios (rosa empolvado, salvia, terracota…). Aquellas son cálidas y
// suaves porque le hablan a un paciente que está por pedir ayuda. Ésta le habla
// a un profesional que evalúa una herramienta de trabajo: precisión de taller,
// no de startup.
//
// Por qué cobre y no el índigo que había antes:
//
//  1. El panel de Codexy ENVUELVE la marca del cliente. Un psicólogo lo abre con
//     su rosa o su verde al lado, y el índigo peleaba con la paleta Océano.
//     El cobre convive con las seis sin discutir.
//  2. No colisiona con ningún color que el producto ya tenga significando algo:
//     el vino es "acento del panel", el verde es "hecho", el rojo es "cuidado".
//     El cobre queda libre para significar "Codexy".
//  3. Ninguna agencia de IA lo usa. Están todas en azul.
//
// Cambiar la identidad es cambiar este objeto: la landing lee de acá.
export const PALETA_CODEXY = {
  /** Casi negro cálido: el fondo oscuro de la marca. */
  grafito: "#1B1A18",
  /** Un paso más claro: la acción principal y los fondos de sección oscura. */
  tinta: "#2B2A28",
  /** Superficie sobre la tinta. */
  tintaSuave: "#3A3835",
  /** Acento. Con cuentagotas: sólo lo que hay que mirar. */
  cobre: "#B8672F",
  /** Cobre oscurecido, para texto sobre fondo claro (contraste AA). */
  cobreProfundo: "#96502A",
  /** Fondo claro: neutro CÁLIDO, no gris azulado. */
  cal: "#F4F3F1",
  calSuave: "#EAE8E4",
  linea: "#E0DED9",
  lineaFuerte: "#C5C2BB",
  /** Texto secundario. */
  apagado: "#6E6A63",
} as const;
