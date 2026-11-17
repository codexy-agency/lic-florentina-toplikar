// RS Odontología (Instagram @odonto.rs, Paraná) — contenido del sitio público y
// semilla del consultorio.
//
// REGLA DE ESTE ARCHIVO: todo lo que está acá salió del perfil público de
// Instagram del consultorio (bio, publicaciones, historias destacadas) o de las
// bios de sus profesionales. Cada dato lleva al lado de dónde salió. Lo que no se
// pudo verificar NO está: queda anotado en supabase/alta-odonto-rs.sql y en el informe de entrega como "falta pedirle al
// cliente". No agregar cifras, testimonios ni credenciales que no estén publicados.

import type { AvailabilityRule, SchedulingConfig, Service, Staff } from "./scheduling/types";
import type { Marca } from "./marca";
import type { TratamientoId } from "@/components/rs/IconoTratamiento";

export const RS = {
  nombre: "RS Odontología",
  // Bio de @odonto.rs
  especialidad: "Odontología estética y rehabilitación oral",
  ciudad: "Paraná",
  provincia: "Entre Ríos",
  // Bio + publicación del 27/08/2025
  direccion: "Montevideo 49",
  referencia: "Entre San Martín y Pellegrini, en pleno centro",
  // Enlace de la bio (api.whatsapp.com/send?phone=543435149946)
  whatsapp: "543435149946",
  whatsappVisible: "343 514-9946",
  instagram: "odonto.rs",
  instagramProtectores: "protectoresbucalesrs",
  // Publicación del 27/08/2025: "lunes a viernes de 8:30 a 20hs y los sábados
  // de 9:30 a 12hs. Siempre con turno previo."
  horarios: [
    { dias: "Lunes a viernes", horas: "8:30 a 20:00" },
    { dias: "Sábados", horas: "9:30 a 12:00" },
  ],
  mapa: "https://www.google.com/maps/search/?api=1&query=Montevideo+49%2C+Paran%C3%A1%2C+Entre+R%C3%ADos",
} as const;

/** Tarjeta que aparece al compartir el enlace por WhatsApp o Instagram
 *  (1200x630, JPG liviano). La ruta es relativa: metadataBase la vuelve absoluta. */
export const IMAGEN_COMPARTIR = {
  url: "/rs/og.jpg",
  width: 1200,
  height: 630,
  type: "image/jpeg",
  alt: "RS Odontología: tu sonrisa, en pleno centro de Paraná. Sacá tu turno online.",
};

// ── Preguntas frecuentes ─────────────────────────────────────────────────────
// Solo lo que ellas mismas responden en sus publicaciones.
export const PREGUNTAS: { pregunta: string; respuesta: string }[] = [
  {
    pregunta: "¿Atienden sin turno?",
    respuesta: "No. Atendemos siempre con turno previo. Lo sacás online en dos minutos o nos escribís por WhatsApp.",
  },
  {
    pregunta: "¿Dónde queda el consultorio?",
    respuesta: "En Montevideo 49, entre San Martín y Pellegrini, en pleno centro de Paraná.",
  },
  {
    pregunta: "¿Cada cuánto conviene hacerse un control?",
    respuesta: "Cada seis meses, con limpieza. La higiene, la dieta y el control son lo que evita los arreglos grandes.",
  },
  {
    pregunta: "¿Puedo hacerme un blanqueamiento directamente?",
    respuesta: "Primero va la limpieza. Blanquear sobre una boca que la necesita no funciona: dejamos todo sano y después vamos por el color.",
  },
  {
    pregunta: "Se me rompió un diente o me duele, ¿qué hago?",
    respuesta: "Sacá un turno de “Dolor o urgencia” o escribinos por WhatsApp y coordinamos.",
  },
];

export function waLink(texto: string, numero: string = RS.whatsapp): string {
  return `https://wa.me/${numero.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(texto)}`;
}

// ── Casos antes / después ────────────────────────────────────────────────────
// Solo fotos publicadas por el consultorio. Cada una es un cuadro del reel
// indicado, recortado a la boca (sin rostros).
export interface Caso {
  id: string;
  icono: TratamientoId;
  tratamiento: string;
  detalle: string;
  antes: string;
  despues: string;
  origen: string; // de qué publicación salió
}

export const CASOS: Caso[] = [
  {
    id: "estetica",
    icono: "consulta",
    tratamiento: "Estética dental",
    detalle: "Sector anterior con una pieza fracturada y manchada.",
    antes: "/rs/caso-1-antes.webp",
    despues: "/rs/caso-1-despues.webp",
    origen: "Reel del 15/10/2026 (instagram.com/p/DeiGa_pxIHv)",
  },
  {
    id: "mancha",
    icono: "carillas",
    tratamiento: "Restauración estética",
    detalle: "Una mancha en un diente de adelante, sacada por completo.",
    antes: "/rs/caso-2-antes.webp",
    despues: "/rs/caso-2-despues.webp",
    origen: "Reel del 22/12/2025 (instagram.com/p/DSlb4a5j5Z2)",
  },
  {
    id: "blanqueamiento",
    icono: "blanqueamiento",
    tratamiento: "Blanqueamiento",
    detalle: "Blanqueamiento en consultorio, después de la limpieza.",
    antes: "/rs/caso-3-antes.webp",
    despues: "/rs/caso-3-despues.webp",
    origen: "Reel del 11/03/2026 (instagram.com/p/DVv3o3hjcP9)",
  },
];

// ── Tratamientos ─────────────────────────────────────────────────────────────
// Cada línea resume lo que ellas mismas publican sobre ese tratamiento.
export const TRATAMIENTOS: { icono: TratamientoId; nombre: string; texto: string }[] = [
  {
    icono: "carillas",
    nombre: "Carillas",
    texto: "Para cambiar la forma, el color o el tamaño de tus dientes, cerrar espacios o tapar fisuras.",
  },
  {
    icono: "blanqueamiento",
    nombre: "Blanqueamiento",
    texto: "Siempre después de una limpieza: primero la boca sana, después más blanca.",
  },
  {
    icono: "limpieza",
    nombre: "Limpieza y control",
    texto: "Cada seis meses. Encías sanas son encías que no sangran.",
  },
  {
    icono: "ortodoncia",
    nombre: "Ortodoncia y alineadores",
    texto: "Brackets o alineadores, con las contenciones al terminar para que el resultado se mantenga.",
  },
  {
    icono: "implantes",
    nombre: "Implantes",
    texto: "Perder un diente no es solo estética. Se planifica y se repone.",
  },
  {
    icono: "protesis",
    nombre: "Prótesis y rehabilitación oral",
    texto: "Para volver a masticar y sonreír con la boca completa.",
  },
  {
    icono: "cirugia",
    nombre: "Cirugía y muelas de juicio",
    texto: "No siempre hay que sacarlas. Se evalúa y se extraen cuando está indicado.",
  },
  {
    icono: "ninos",
    nombre: "Odontopediatría",
    texto: "Controles y flúor para prevenir caries desde chicos.",
  },
  {
    icono: "bruxismo",
    nombre: "Bruxismo",
    texto: "En grandes y en chicos. Si apretás o rechinás los dientes, consultanos.",
  },
  {
    icono: "sensibilidad",
    nombre: "Sensibilidad dental",
    texto: "Que te duela con lo frío no es normal. Buscamos la causa y la tratamos.",
  },
];

// ── Profesionales ────────────────────────────────────────────────────────────
// Nombre y área tal como figuran en sus perfiles públicos. Matrículas: no las
// publican (falta pedirlas).
export const EQUIPO = [
  {
    id: "rs-arantxa",
    nombre: "Arantxa Rodriguez Signes",
    apodo: "Aran",
    rol: "Odontóloga",
    // Bio de @arantxarsignes + publicación del 10/08/2026
    texto: "Atiende en RS y está detrás de Protectores Bucales RS. Lo suyo es la estética dental.",
  },
  {
    id: "rs-nadia",
    nombre: "Nadia Vivanco",
    apodo: "Nanu",
    rol: "Odontóloga",
    // Bio de @od.nadiavivanco
    texto: "Se dedica a cirugía, prótesis e implantes.",
  },
] as const;

// ── Semilla del consultorio (turnos y panel) ─────────────────────────────────
// Los ids son FIJOS a propósito. La semilla original generaba un UUID nuevo en
// cada lectura hasta la primera escritura: el paciente elegía un servicio con un
// id y al confirmar el servidor ya tenía otro ("Servicio no disponible").
//
// Las DURACIONES son un punto de partida para que la agenda funcione desde el
// primer día: el consultorio no las publica. Se ajustan en Panel > Servicios.
const svc = (id: string, nombre: string, durationMin: number, descripcion: string): Service => ({
  id,
  nombre,
  durationMin,
  priceARS: undefined, // no publican precios
  descripcion,
  activo: true,
});

export const SERVICIOS_SEMILLA: Service[] = [
  svc("rs-consulta", "Primera consulta", 30, "Revisión, diagnóstico y plan de tratamiento."),
  svc("rs-limpieza", "Limpieza y control", 40, "La de cada seis meses."),
  svc("rs-blanqueamiento", "Blanqueamiento", 60, "En consultorio. Requiere limpieza previa."),
  svc("rs-carillas", "Consulta por carillas", 30, "Evaluamos tu caso y te contamos las opciones."),
  svc("rs-ortodoncia", "Consulta de ortodoncia", 30, "Brackets o alineadores."),
  svc("rs-implantes", "Consulta por implantes o prótesis", 30, "Evaluación y planificación."),
  svc("rs-ninos", "Odontopediatría", 30, "Control y flúor para chicos."),
  svc("rs-urgencia", "Dolor o urgencia", 30, "Se te rompió un diente o te duele: te vemos."),
];

const GENERALES = ["rs-consulta", "rs-limpieza", "rs-blanqueamiento", "rs-carillas", "rs-ortodoncia", "rs-ninos", "rs-urgencia"];

export const STAFF_SEMILLA: Staff[] = [
  {
    id: EQUIPO[0].id,
    nombre: EQUIPO[0].nombre,
    titulo: "Odontóloga · Estética dental",
    serviceIds: GENERALES,
    color: "#1E3A3D",
    activo: true,
  },
  {
    id: EQUIPO[1].id,
    nombre: EQUIPO[1].nombre,
    titulo: "Odontóloga · Cirugía, prótesis e implantes",
    serviceIds: ["rs-consulta", "rs-limpieza", "rs-implantes", "rs-urgencia"],
    color: "#4F7F78",
    activo: true,
  },
];

// Lunes a viernes 8:30–20:00 y sábados 9:30–12:00, siempre presencial.
export const REGLAS_SEMILLA: AvailabilityRule[] = [
  ...[1, 2, 3, 4, 5].map((weekday) => ({
    id: `rs-regla-${weekday}`,
    weekday,
    startTime: "08:30",
    endTime: "20:00",
    modalidad: "presencial" as const,
  })),
  { id: "rs-regla-6", weekday: 6, startTime: "09:30", endTime: "12:00", modalidad: "presencial" as const },
];

export const CONFIG_SEMILLA: SchedulingConfig = {
  slotDurationMin: 30,
  slotIntervalMin: 30,
  bufferAfterMin: 0,
  minNoticeHours: 12,
  bookingWindowDays: 30,
};

export const MARCA_SEMILLA: Marca = {
  nombre: RS.nombre,
  titulo: "Consultorio odontológico",
  matricula: "",
  ciudad: RS.ciudad,
  heroTitulo: "",
  heroSubtitulo: "Odontología estética y rehabilitación oral en Montevideo 49, Paraná. Sacá tu turno online.",
  sobreMi: "",
  whatsapp: RS.whatsapp,
  email: "",
  instagram: RS.instagram,
  dominio: "",
  aliasPago: "",
  aliasPagoLabel: "Alias",
  linkPago: "",
  // Verde petróleo del logo (#1E3A3D) sobre papel claro. Estos tokens también
  // visten el panel interno.
  paleta: {
    acento: "#7FB0A8",
    acentoOscuro: "#1E3A3D",
    secundario: "#C9D8D2",
    fondo: "#F6F5F0",
    fondoSuave: "#E9ECE6",
    texto: "#14272A",
  },
};
