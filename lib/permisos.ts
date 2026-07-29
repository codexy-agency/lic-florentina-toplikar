// Roles y permisos por consultorio.
//
// El ROL es el preset grueso y sostiene los invariantes duros (quién puede tocar
// facturación o dar de alta a otro dueño). Los PERMISOS son los toggles finos que
// se pueden configurar por persona.
//
// Regla de datos de salud (Ley 25.326): `notas_clinicas` arranca APAGADO para
// quien no es profesional. Una secretaria no necesita leer la historia clínica.
//
// IMPORTANTE: esto tiene que coincidir con public.permisos_por_rol() del SQL.

export const ROLES = ["owner", "admin", "profesional", "asistente"] as const;
export type Rol = (typeof ROLES)[number];

export const PERMISOS = [
  "agenda",
  "pacientes",
  "notas_clinicas",
  "finanzas",
  "servicios",
  "disponibilidad",
  "equipo",
  "asistente_ia",
  "configuracion",
] as const;
export type Permiso = (typeof PERMISOS)[number];

export type Permisos = Partial<Record<Permiso, boolean>>;

export const ROL_LABEL: Record<Rol, string> = {
  owner: "Dueño/a",
  admin: "Administrador/a",
  profesional: "Profesional",
  asistente: "Asistente",
};

export const PERMISO_LABEL: Record<Permiso, string> = {
  agenda: "Agenda y turnos",
  pacientes: "Pacientes",
  notas_clinicas: "Historia clínica",
  finanzas: "Finanzas",
  servicios: "Servicios",
  disponibilidad: "Disponibilidad",
  equipo: "Equipo y accesos",
  asistente_ia: "Asistente IA",
  configuracion: "Configuración",
};

/** Permisos por defecto de cada rol. */
export function permisosPorRol(rol: Rol): Record<Permiso, boolean> {
  const todo = (v: boolean) =>
    Object.fromEntries(PERMISOS.map((p) => [p, v])) as Record<Permiso, boolean>;

  switch (rol) {
    case "owner":
      return todo(true);
    case "admin":
      return { ...todo(true), notas_clinicas: false, equipo: true, configuracion: true };
    case "profesional":
      return {
        ...todo(false),
        agenda: true,
        pacientes: true,
        notas_clinicas: true,
        disponibilidad: true,
        asistente_ia: true,
      };
    case "asistente":
      return {
        ...todo(false),
        agenda: true,
        pacientes: true, // datos de contacto, NO la historia clínica
      };
  }
}

/** ¿Esta membresía tiene el permiso? El owner siempre puede todo (no se puede
 *  auto-limitar y quedar afuera de su propio consultorio). */
export function tienePermiso(rol: Rol, permisos: Permisos | null | undefined, p: Permiso): boolean {
  if (rol === "owner") return true;
  if (permisos && typeof permisos[p] === "boolean") return permisos[p] as boolean;
  return permisosPorRol(rol)[p];
}

/** Normaliza permisos crudos (de la base o de un form) a un objeto válido. */
export function normalizarPermisos(raw: unknown): Permisos {
  const out: Permisos = {};
  if (!raw || typeof raw !== "object") return out;
  for (const p of PERMISOS) {
    const v = (raw as Record<string, unknown>)[p];
    if (typeof v === "boolean") out[p] = v;
  }
  return out;
}

export function esRolValido(v: unknown): v is Rol {
  return typeof v === "string" && (ROLES as readonly string[]).includes(v);
}
