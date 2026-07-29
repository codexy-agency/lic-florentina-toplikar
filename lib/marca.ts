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
  paleta: PALETA_DEFECTO,
};

const HEX = /^#[0-9a-f]{6}$/i;

function color(v: unknown, porDefecto: string): string {
  const s = String(v ?? "").trim();
  return HEX.test(s) ? s : porDefecto;
}

const txt = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);

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
