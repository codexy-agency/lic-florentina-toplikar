// PODA del almacén de identidad: qué se conserva y qué se tira.
//
// Vive aparte de accounts-store.ts por dos razones:
//
//  1. Es lógica pura, sin E/S. Meterla en el módulo que importa el cliente de
//     Supabase la volvía imposible de testear sin levantar medio proyecto — el
//     mismo acoplamiento que ya está documentado en tests/deuda.test.ts.
//  2. Borra datos. Lo que borra datos merece estar a la vista y con tests.
//
// LOS TOPES SON POR CONSULTORIO, y eso es el punto.
//
// Antes eran globales: 500 sesiones y 5000 entradas de auditoría para TODA la
// plataforma. Con veinte clientes, uno activo expulsaba las sesiones de otro (lo
// deslogueaba sin motivo) y le borraba el rastro de auditoría.
//
// Lo segundo era peor que un problema de capacidad: la pantalla de Equipo
// envuelve "Actividad reciente" en `{audit.length > 0 && …}`, así que al cliente
// al que le evictaron todo simplemente le DESAPARECÍA la sección, sin aviso. Y
// eso rompe una promesa explícita del producto —"cada ingreso queda registrado y
// el cliente lo ve"— que además es lo que sostiene el acceso de soporte.

/** Sesiones vivas que se guardan por consultorio. */
export const SESIONES_POR_TENANT = 200;
/** Entradas de auditoría que se guardan por consultorio. */
export const AUDIT_POR_TENANT = 1000;
/** Tope duro global, muy por encima del anterior: sólo evita que el blob crezca
 *  sin fin el día que haya miles de consultorios. */
export const AUDIT_TOTAL = 200_000;
/** Ninguna sesión sobrevive más que esto, pase lo que pase. La cookie dura 12 h;
 *  damos margen largo y podamos a los 30 días. */
export const MAX_VIDA_SESION_MS = 30 * 24 * 60 * 60 * 1000;

/** Lo mínimo que la poda necesita saber de una sesión. */
export interface SesionPodable {
  professionalId?: string;
  creadoEn: string;
  revocadaEn?: string;
}
/** Lo mínimo que necesita de una entrada de auditoría. */
export interface AuditPodable {
  professionalId?: string;
}
export interface ThrottlePodable {
  bloqueadoHasta?: string;
  ultimoIntento: string;
}

export interface AlmacenPodable {
  sesiones: SesionPodable[];
  audit: AuditPodable[];
  throttle: Record<string, ThrottlePodable>;
}

/** Deja las `max` entradas más recientes de CADA consultorio.
 *
 *  `lista` viene ordenada de más nueva a más vieja (todo entra con unshift), así
 *  que alcanza con recorrer una vez contando por tenant. */
export function podarPorTenant<T extends { professionalId?: string }>(lista: T[], max: number): T[] {
  const vistos = new Map<string, number>();
  const out: T[] = [];
  for (const item of lista) {
    const pid = item.professionalId ?? "";
    // Sin professionalId (no debería pasar) se conserva: preferimos guardar de
    // más antes que perder un registro por un dato faltante.
    if (!pid) {
      out.push(item);
      continue;
    }
    const n = (vistos.get(pid) ?? 0) + 1;
    vistos.set(pid, n);
    if (n <= max) out.push(item);
  }
  return out;
}

/** Saca las sesiones que ya no sirven ANTES de contar el cupo: una revocada o
 *  vencida no tiene por qué ocupar el lugar de una viva. */
export function limpiarSesiones<T extends SesionPodable>(sesiones: T[], ahora = Date.now()): T[] {
  const corte = ahora - MAX_VIDA_SESION_MS;
  return sesiones.filter((s) => {
    if (s.revocadaEn) return false;
    const t = Date.parse(s.creadoEn);
    // Una fecha ilegible no se conserva para siempre ni tumba la poda: se trata
    // como sospechosa y se descarta.
    return Number.isFinite(t) && t > corte;
  });
}

/** Poda el almacén completo. Se llama en cada mutación: es O(n) sobre listas
 *  que justamente esta función mantiene acotadas. */
export function podar(db: AlmacenPodable, ahora = Date.now()): void {
  db.sesiones = podarPorTenant(limpiarSesiones(db.sesiones, ahora), SESIONES_POR_TENANT);
  db.audit = podarPorTenant(db.audit, AUDIT_POR_TENANT);
  if (db.audit.length > AUDIT_TOTAL) db.audit.length = AUDIT_TOTAL;

  // El throttle de login no tiene professionalId propio (su clave es
  // "<pid>:<email>"), pero sí caduca: se borran las entradas ya vencidas.
  for (const [k, t] of Object.entries(db.throttle)) {
    const bloqueado = t.bloqueadoHasta ? Date.parse(t.bloqueadoHasta) > ahora : false;
    const reciente = Date.parse(t.ultimoIntento) > ahora - 24 * 60 * 60 * 1000;
    if (!bloqueado && !reciente) delete db.throttle[k];
  }
}
