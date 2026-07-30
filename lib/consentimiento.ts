// CONSENTIMIENTO del paciente en el formulario de reserva.
//
// Qué es esto y qué NO es:
//
//  ES el mecanismo técnico: la casilla, el registro de que se aceptó, cuándo,
//  qué versión de texto y desde qué IP. Eso hace falta para poder demostrar el
//  consentimiento si un paciente reclama, y hoy no existía en ninguna parte.
//
//  NO es el texto legal definitivo. El de abajo es un borrador honesto, escrito
//  para que el circuito funcione y para que quede claro qué tiene que cubrir el
//  documento real. Lo tiene que revisar un abogado, por país, ANTES de vender a
//  alguien que no sea de confianza. Ver docs/planes/QUE-FALTA-PARA-SER-SAAS.md.
//
// Por qué hace falta:
//  - Argentina: Ley 25.326 art. 5 y 7 — el tratamiento de datos SENSIBLES (la
//    salud lo es) exige consentimiento libre, expreso e informado, por escrito.
//  - México: LFPDPPP art. 9 — datos sensibles, consentimiento expreso y escrito;
//    art. 15-17 — aviso de privacidad obligatorio con contenido tasado.
//  - USA: si el profesional es covered entity bajo HIPAA, esto no alcanza: hace
//    falta un BAA firmado entre él y Codexy. Mientras no exista, no habilitar
//    altas en Estados Unidos.

/** Versión del texto. SUBIRLA cada vez que el texto cambie: lo que se guarda en
 *  cada solicitud es esta cadena, y es lo que permite reconstruir después qué
 *  fue exactamente lo que esta persona aceptó. */
export const CONSENTIMIENTO_VERSION = "2026-07-borrador-1";

/** Texto que ve el paciente al lado de la casilla.
 *
 *  Se arma con los datos del consultorio porque el RESPONSABLE del tratamiento
 *  es el profesional, no Codexy: la ley pide identificar a quién le está dando
 *  los datos, y decir "Codexy" ahí sería incorrecto además de confuso. */
export function textoConsentimiento(m: {
  nombre?: string;
  titulo?: string;
  email?: string;
}): { casilla: string; detalle: string[] } {
  const quien = [m.titulo, m.nombre].filter(Boolean).join(" ") || "el profesional";

  return {
    casilla: `Entiendo y acepto que ${quien} guarde estos datos para atenderme.`,
    detalle: [
      `Quién los recibe: ${quien}, que es responsable de tu información. Codexy sólo provee el sistema donde se guarda.`,
      "Para qué: coordinar tu turno, llevar tu historia clínica y contactarte por temas de la atención. Nada más.",
      "Datos de salud: si escribís el motivo de la consulta, ese dato es información de salud y por eso te pedimos el consentimiento por escrito.",
      "Quién los ve: sólo el profesional y las personas de su consultorio que él autorice. La historia clínica la ven únicamente los profesionales.",
      "Tus derechos: podés pedir ver, corregir o borrar tus datos cuando quieras" +
        (m.email ? `, escribiendo a ${m.email}.` : ", pidiéndoselo al profesional."),
      "No usamos tus datos para publicidad, no los vendemos y no hay rastreadores en este sitio.",
    ],
  };
}

/** Valida lo que llega del formulario. Devuelve el registro a guardar, o null si
 *  no aceptó (el llamador tiene que rechazar la reserva en ese caso). */
export function registrarConsentimiento(
  aceptado: unknown,
  ip?: string
): { aceptadoEn: string; version: string; ip?: string } | null {
  // Se acepta true, "true", "on" y "1": el checkbox nativo manda "on" y el JSON
  // manda true, y esta ruta recibe las dos formas.
  const ok = aceptado === true || aceptado === "true" || aceptado === "on" || aceptado === "1";
  if (!ok) return null;
  return {
    aceptadoEn: new Date().toISOString(),
    version: CONSENTIMIENTO_VERSION,
    ...(ip ? { ip } : {}),
  };
}

export const ERROR_SIN_CONSENTIMIENTO =
  "Para reservar necesitamos que aceptes el uso de tus datos para la atención.";
