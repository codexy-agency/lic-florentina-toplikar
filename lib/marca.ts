// Identidad del consultorio: lo que cada psicólogo personaliza de SU sitio.
//
// Es el corazón del SaaS: sin esto todos los consultorios se verían iguales (y
// dirían el nombre de otra persona). Todo lo que acá se define se refleja en la
// landing pública, en el título del navegador, en el panel y en los mensajes.

export interface PaletaMarca {
  /** Acento principal — botones, enlaces, detalles. */
  acento: string;
  /** Versión oscura del acento, para texto sobre fondo claro (contraste AA). */
  acentoOscuro: string;
  /** Acento secundario, para degradés y detalles. */
  secundario: string;
  /** Fondo base del sitio. */
  fondo: string;
  /** Fondo de tarjetas y secciones. */
  fondoSuave: string;
  /** Texto principal. */
  texto: string;
}

export interface Marca {
  /** "Paulina Pilotti" — se muestra en el sitio, el panel y los metadatos. */
  nombre: string;
  /** "Psicóloga clínica" */
  titulo: string;
  /** "MP 7321" */
  matricula: string;
  /** "Viedma" — se usa en los textos y en el SEO local. */
  ciudad: string;
  /** Titular del hero. Si está vacío se usa uno por defecto. */
  heroTitulo: string;
  /** Bajada del hero. */
  heroSubtitulo: string;
  /** Texto "sobre mí". */
  sobreMi: string;
  /** Contacto */
  whatsapp: string;
  email: string;
  instagram: string;
  /** Dominio propio (para SEO y links absolutos). Ej: "anagomez.com" */
  dominio: string;
  /** Cómo le pagan los PACIENTES a este profesional. Se muestra en el sitio.
   *  Alias/CBU en Argentina, CLABE en México, lo que sea en formato libre. */
  aliasPago: string;
  /** Etiqueta del dato de arriba: "Alias", "CBU", "CLABE"… */
  aliasPagoLabel: string;
  /** Link de pago propio (Mercado Pago, Stripe, PayPal). Opcional. */
  linkPago: string;
  paleta: PaletaMarca;
}

/** Paleta por defecto: la estética botánica/pastel original. */
export const PALETA_DEFECTO: PaletaMarca = {
  acento: "#D9A7B8",
  acentoOscuro: "#9C5475",
  secundario: "#C9B6D6",
  fondo: "#FBF7F7",
  fondoSuave: "#F4EBEC",
  texto: "#3A3137",
};

/** Paletas listas para elegir, pensadas para consultorios de psicología. */
export const PALETAS: { id: string; nombre: string; paleta: PaletaMarca }[] = [
  { id: "botanica", nombre: "Botánica (rosa empolvado)", paleta: PALETA_DEFECTO },
  {
    id: "salvia",
    nombre: "Salvia (verde sereno)",
    paleta: { acento: "#A8C3B0", acentoOscuro: "#4F7360", secundario: "#CBD9C6", fondo: "#F8FAF7", fondoSuave: "#EDF2EA", texto: "#2F3A33" },
  },
  {
    id: "oceano",
    nombre: "Océano (azul calmo)",
    paleta: { acento: "#9FBBD0", acentoOscuro: "#3F6785", secundario: "#BFD3E2", fondo: "#F7F9FB", fondoSuave: "#E9F0F5", texto: "#2B3742" },
  },
  {
    id: "terracota",
    nombre: "Terracota (cálido)",
    paleta: { acento: "#D8A98C", acentoOscuro: "#96552F", secundario: "#E5C4A8", fondo: "#FBF8F5", fondoSuave: "#F3E9E0", texto: "#3B302A" },
  },
  {
    id: "lavanda",
    nombre: "Lavanda (suave)",
    paleta: { acento: "#B9A7D0", acentoOscuro: "#5F4A85", secundario: "#D2C6E2", fondo: "#FAF8FC", fondoSuave: "#EFEAF6", texto: "#332C3D" },
  },
  {
    id: "carbon",
    nombre: "Carbón (sobrio)",
    paleta: { acento: "#A9A29B", acentoOscuro: "#5A534C", secundario: "#C7C1BA", fondo: "#FAFAF9", fondoSuave: "#EFEEEC", texto: "#2C2A28" },
  },
];

export const MARCA_DEFECTO: Marca = {
  nombre: "",
  titulo: "Psicóloga clínica",
  matricula: "",
  ciudad: "",
  heroTitulo: "",
  heroSubtitulo: "",
  sobreMi: "",
  whatsapp: "",
  email: "",
  instagram: "",
  dominio: "",
  aliasPago: "",
  aliasPagoLabel: "Alias",
  linkPago: "",
  paleta: PALETA_DEFECTO,
};

const HEX = /^#[0-9a-f]{6}$/i;

function color(v: unknown, porDefecto: string): string {
  const s = String(v ?? "").trim();
  return HEX.test(s) ? s : porDefecto;
}

const txt = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);

/** Sólo acepta http(s). El valor lo escribe el cliente y termina en un href del
 *  sitio público: sin este filtro un `javascript:` sería XSS almacenado. */
function soloHttps(v: unknown): string {
  const s = txt(v, 300);
  if (!s) return "";
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : "";
  } catch {
    return "";
  }
}

/** Normaliza lo que venga de la base o de un formulario. Nunca lanza. */
export function normalizarMarca(raw: unknown): Marca {
  const m = (raw && typeof raw === "object" ? raw : {}) as Partial<Marca>;
  const p = (m.paleta && typeof m.paleta === "object" ? m.paleta : {}) as Partial<PaletaMarca>;
  return {
    nombre: txt(m.nombre, 80),
    titulo: txt(m.titulo, 80) || MARCA_DEFECTO.titulo,
    matricula: txt(m.matricula, 40),
    ciudad: txt(m.ciudad, 60),
    heroTitulo: txt(m.heroTitulo, 120),
    heroSubtitulo: txt(m.heroSubtitulo, 400),
    sobreMi: txt(m.sobreMi, 1200),
    whatsapp: txt(m.whatsapp, 40),
    email: txt(m.email, 120),
    instagram: txt(m.instagram, 80).replace(/^@/, ""),
    dominio: txt(m.dominio, 120).replace(/^https?:\/\//, "").replace(/\/$/, ""),
    aliasPago: txt(m.aliasPago, 80),
    aliasPagoLabel: txt(m.aliasPagoLabel, 20) || MARCA_DEFECTO.aliasPagoLabel,
    linkPago: soloHttps(m.linkPago),
    paleta: {
      acento: color(p.acento, PALETA_DEFECTO.acento),
      acentoOscuro: color(p.acentoOscuro, PALETA_DEFECTO.acentoOscuro),
      secundario: color(p.secundario, PALETA_DEFECTO.secundario),
      fondo: color(p.fondo, PALETA_DEFECTO.fondo),
      fondoSuave: color(p.fondoSuave, PALETA_DEFECTO.fondoSuave),
      texto: color(p.texto, PALETA_DEFECTO.texto),
    },
  };
}

/** CSS con las variables de la marca, para inyectar en el <head> del sitio.
 *  Pisa los tokens por defecto de globals.css sin tocar el CSS del panel. */
export function cssDeMarca(m: Marca): string {
  const p = m.paleta;
  return `:root{--color-cream:${p.fondo};--color-cream-deep:${p.fondoSuave};--color-espresso:${p.texto};--color-sage:${p.acento};--color-sage-deep:${p.acentoOscuro};--color-clay:${p.secundario};}`;
}

/** Nombre para mostrar, con fallback para un consultorio recién creado. */
export function nombreMostrable(m: Marca): string {
  return m.nombre || "Tu consultorio";
}

/** Parte el nombre en dos para el wordmark (la segunda mitad va en itálica). */
export function partirNombre(nombre: string): [string, string] {
  const partes = (nombre || "").trim().split(/\s+/);
  if (partes.length < 2) return [partes[0] || "", ""];
  return [partes[0], partes.slice(1).join(" ")];
}

/** Link de WhatsApp del consultorio, o null si el profesional no lo cargó.
 *
 *  Devuelve null a propósito, en vez de caer a un número por defecto: antes
 *  había un wa.me fijo en el código y CADA consulta de CADA cliente iba al
 *  teléfono de otra persona. La regla del sitio público es: campo vacío =
 *  sección oculta, nunca un valor heredado. */
export function whatsappUrl(m: Marca, utm = true): string | null {
  const digitos = (m.whatsapp || "").replace(/[^0-9]/g, "");
  if (digitos.length < 8) return null; // ni un número de teléfono plausible
  return `https://wa.me/${digitos}${utm ? "?utm_source=web&utm_medium=cta" : ""}`;
}

/** mailto del consultorio, o null. Mismo criterio que whatsappUrl. */
export function emailUrl(m: Marca): string | null {
  const e = (m.email || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? `mailto:${e}` : null;
}

/** Perfil de Instagram, o null. */
export function instagramUrl(m: Marca): string | null {
  const u = (m.instagram || "").trim().replace(/^@/, "");
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return soloHttps(u) || null;
  return `https://www.instagram.com/${u}/`;
}

/** Monograma para el avatar del topbar: dos letras como mucho. */
export function iniciales(nombre: string): string {
  const letras = (nombre || "")
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");
  return letras.toUpperCase() || "·";
}
