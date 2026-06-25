// Herramientas del asistente del panel. Las de LECTURA se ejecutan solas; las de
// ESCRITURA NO se ejecutan acá: el endpoint las devuelve como "propuesta" y el
// panel le pide confirmación a la usuaria antes de aplicarlas (ver execute/route).
// Privacidad: las lecturas NO exponen el motivo de consulta ni notas clínicas.
import {
  listSolicitudes,
  getPacientesResumen,
  getFinanzas,
  getScheduling,
  getBusy,
  listServices,
  listStaff,
  crearTurnoManual,
  setEstado,
  setPago,
  addMovimientoManual,
  addException,
  contactoKey,
  esImpaga,
} from "@/lib/store";
import {
  getAvailableSlots,
  fechaHoraAR,
  horaAR,
  arLocalToIso,
  endFromStart,
} from "@/lib/scheduling/slots";
import type { OAITool } from "@/lib/openai";

type In = Record<string, unknown>;
const str = (v: unknown) => String(v ?? "").trim();
const money = (n?: number) => "$" + (n ?? 0).toLocaleString("es-AR");
const AR = "America/Argentina/Buenos_Aires";
const todayAR = () => new Date().toLocaleDateString("en-CA", { timeZone: AR });
const dayAR = (iso?: string) => {
  try {
    return iso ? new Date(iso).toLocaleDateString("en-CA", { timeZone: AR }) : "";
  } catch {
    return "";
  }
};

export const WRITE_TOOLS = new Set([
  "agendar_turno",
  "confirmar_turno",
  "registrar_pago",
  "bloquear_dia",
  "cargar_movimiento",
]);

// ───────────────────────── Lectura ─────────────────────────

async function readAgendaHoy(): Promise<string> {
  const sols = await listSolicitudes();
  const hoy = todayAR();
  const items = sols
    .filter((s) => s.estado === "confirmado" && dayAR(s.startsAt) === hoy)
    .sort((a, b) => ((a.startsAt || "") < (b.startsAt || "") ? -1 : 1));
  if (!items.length) return "No hay turnos confirmados para hoy.";
  return items
    .map((s) => `- ${horaAR(s.startsAt!)} · ${s.nombre}${s.serviceName ? ` · ${s.serviceName}` : ""} (${s.modalidad}) [turnoId=${s.id}]`)
    .join("\n");
}

async function readProximos(cant = 8): Promise<string> {
  const sols = await listSolicitudes();
  const now = Date.now();
  const items = sols
    .filter((s) => s.estado === "confirmado" && s.startsAt && new Date(s.startsAt).getTime() >= now)
    .sort((a, b) => ((a.startsAt || "") < (b.startsAt || "") ? -1 : 1))
    .slice(0, Math.max(1, Math.min(cant, 20)));
  if (!items.length) return "No hay próximos turnos confirmados.";
  return items
    .map((s) => `- ${fechaHoraAR(s.startsAt!)} hs · ${s.nombre}${s.serviceName ? ` · ${s.serviceName}` : ""} (${s.modalidad}) [turnoId=${s.id}]`)
    .join("\n");
}

async function readPendientes(): Promise<string> {
  const sols = await listSolicitudes();
  const items = sols
    .filter((s) => s.estado === "pendiente")
    .sort((a, b) => ((a.startsAt || "") < (b.startsAt || "") ? -1 : 1));
  if (!items.length) return "No hay solicitudes pendientes.";
  return items
    .map((s) => `- ${s.startsAt ? `${fechaHoraAR(s.startsAt)} hs` : "a coordinar"} · ${s.nombre} (${s.contacto})${s.serviceName ? ` · ${s.serviceName}` : ""} [turnoId=${s.id}]`)
    .join("\n");
}

async function readFinanzas(periodo = "mes"): Promise<string> {
  const f = await getFinanzas(periodo);
  const deuda = f.cobranza.reduce((n, c) => n + c.total, 0);
  return [
    `Período: ${f.periodoLabel}`,
    `Cobrado: ${money(f.cobrado)}`,
    `Gastos: ${money(f.egresos)}`,
    `Neto: ${money(f.neto)}`,
    `Por cobrar: ${money(f.porCobrar)} (${f.cantTurnos - f.cantCobrados} turnos)`,
    `Facturado: ${money(f.facturado)} · ${f.cantTurnos} turnos`,
    f.cobranza.length ? `Cobranza pendiente: ${f.cobranza.length} paciente(s), ${money(deuda)}` : "Sin cobranza pendiente.",
  ].join("\n");
}

async function readBuscarPaciente(query: string): Promise<string> {
  const q = query.trim().toLowerCase();
  if (!q) return "Pasá un nombre o contacto para buscar.";
  const k = contactoKey(query);
  const pac = await getPacientesResumen();
  const hits = pac
    .filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        p.contacto.toLowerCase().includes(q) ||
        (!!k && contactoKey(p.contacto) === k)
    )
    .slice(0, 8);
  if (!hits.length) return `No encontré pacientes para "${query}".`;
  return hits
    .map((p) => `- ${p.nombre} · ${p.contacto}${p.email ? ` · ${p.email}` : ""} · deuda ${money(p.deuda)}${p.proximoTurno ? ` · próximo ${fechaHoraAR(p.proximoTurno)} hs` : ""}`)
    .join("\n");
}

// Pagos pendientes por paciente. MISMA fuente que sesiones_impagas y registrar_pago
// (todas las sesiones confirmadas/realizadas sin pagar), para que los montos cuadren
// entre "quién debe" y lo que después se cobra.
async function readDeuda(): Promise<string> {
  const sols = await listSolicitudes();
  const impagas = sols.filter(esImpaga);
  if (!impagas.length) return "Nadie tiene pagos pendientes al día de hoy.";
  const byPac = new Map<string, { nombre: string; contacto: string; total: number; n: number }>();
  for (const s of impagas) {
    const k = contactoKey(s.contacto) || s.id;
    const g = byPac.get(k) || { nombre: s.nombre, contacto: s.contacto, total: 0, n: 0 };
    g.total += s.precio ?? 0;
    g.n++;
    byPac.set(k, g);
  }
  return [...byPac.values()]
    .sort((a, b) => b.total - a.total)
    .map((g) => `- ${g.nombre} · ${g.contacto} · debe ${money(g.total)} (${g.n} sesión/es)`)
    .join("\n");
}

async function readDisponibilidad(fecha?: string, modalidadIn?: string): Promise<string> {
  const modalidad =
    modalidadIn === "presencial" ? "presencial" : modalidadIn === "online" ? "online" : undefined;
  const [{ config, rules, exceptions }, busy, services] = await Promise.all([
    getScheduling(),
    getBusy(),
    listServices(true),
  ]);
  const dias = getAvailableSlots({
    modalidad,
    durationMin: services[0]?.durationMin,
    rules,
    config,
    exceptions,
    busy,
  });
  if (!dias.length) return "No hay horarios disponibles en la ventana de reserva.";
  let lista = dias;
  if (fecha) lista = dias.filter((d) => d.date === fecha);
  if (!lista.length) return `No hay horarios libres para ${fecha}.`;
  return lista
    .slice(0, 7)
    .map((d) => `- ${d.date}: ${d.slots.map((sl) => horaAR(sl.startsAt)).join(", ") || "sin horarios"}`)
    .join("\n");
}

// Lista TODAS las sesiones sin pagar (turnos confirmados o realizados, !pagado),
// como las muestra Finanzas → Movimientos. Trae el turnoId REAL de cada una (el
// [turnoId=...] es lo que necesita registrar_pago; el teléfono NO es un id).
async function readImpagas(paciente?: string): Promise<string> {
  const sols = await listSolicitudes();
  const q = (paciente || "").trim().toLowerCase();
  const k = q ? contactoKey(paciente!) : "";
  const items = sols
    .filter(
      (s) => esImpaga(s) && (!q || s.nombre.toLowerCase().includes(q) || (!!k && contactoKey(s.contacto) === k))
    )
    .sort((a, b) => ((a.startsAt || "") < (b.startsAt || "") ? -1 : 1));
  if (!items.length) return paciente ? `${paciente} no tiene sesiones sin pagar.` : "No hay sesiones sin pagar.";
  const total = items.reduce((n, s) => n + (s.precio ?? 0), 0);
  return (
    `Sesiones sin pagar (${items.length}, total ${money(total)}):\n` +
    items
      .map(
        (s) =>
          `- ${s.nombre} (${s.contacto})${s.startsAt ? ` · ${fechaHoraAR(s.startsAt)} hs` : ""}${s.serviceName ? ` · ${s.serviceName}` : ""} — ${money(s.precio ?? 0)} [turnoId=${s.id}]`
      )
      .join("\n")
  );
}

export async function runReadTool(name: string, input: In): Promise<string> {
  try {
    switch (name) {
      case "agenda_hoy":
        return await readAgendaHoy();
      case "proximos_turnos":
        return await readProximos(Number(input.cantidad) || 8);
      case "pendientes":
        return await readPendientes();
      case "finanzas":
        return await readFinanzas(str(input.periodo) || "mes");
      case "buscar_paciente":
        return await readBuscarPaciente(str(input.query));
      case "pacientes_con_deuda":
        return await readDeuda();
      case "sesiones_impagas":
        return await readImpagas(str(input.paciente) || undefined);
      case "disponibilidad":
        return await readDisponibilidad(str(input.fecha) || undefined, str(input.modalidad) || undefined);
      default:
        return `Herramienta de lectura desconocida: ${name}`;
    }
  } catch (e) {
    return `Error al ejecutar ${name}: ${e instanceof Error ? e.message : "desconocido"}`;
  }
}

// ───────────────────────── Escritura (tras confirmación) ─────────────────────────

async function doAgendar(input: In): Promise<string> {
  const nombre = str(input.nombre);
  const contacto = str(input.contacto);
  const fecha = str(input.fecha);
  const modalidad = input.modalidad === "presencial" ? "presencial" : "online";
  if (!nombre || !contacto || !fecha) return "Faltan datos (nombre, contacto o fecha).";
  const startsAt = arLocalToIso(fecha);
  if (!startsAt) return "Fecha inválida. Usá formato YYYY-MM-DDTHH:MM.";
  const services = await listServices(true);
  const svc = input.serviceId ? services.find((s) => s.id === input.serviceId) : services[0];
  const staff = await listStaff(true);
  const st = staff.find((s) => (svc ? s.serviceIds.includes(svc.id) : true)) || staff[0];
  const endsAt = endFromStart(startsAt, svc?.durationMin ?? 50);
  const res = await crearTurnoManual({
    nombre,
    contacto,
    modalidad,
    serviceId: svc?.id,
    serviceName: svc?.nombre,
    staffId: st?.id,
    staffName: st?.nombre,
    precio: svc?.priceARS,
    startsAt,
    endsAt,
  });
  return res
    ? `✅ Turno agendado: ${nombre} · ${fechaHoraAR(startsAt)} hs${svc ? ` · ${svc.nombre}` : ""} (${modalidad}).`
    : "⚠️ No se pudo: ese horario se superpone con otro turno.";
}

async function doConfirmar(input: In): Promise<string> {
  const res = await setEstado(str(input.turnoId), "confirmado");
  return res ? `✅ Turno de ${res.nombre} confirmado.` : "No encontré ese turno.";
}

async function doPago(input: In): Promise<string> {
  const metodo = str(input.metodo) || "efectivo";
  const rawId = str(input.turnoId);
  // Un turnoId real es un UUID (tiene guiones y letras a-f). Si vino eso, usarlo.
  if (rawId && /-/.test(rawId) && /[a-f]/i.test(rawId)) {
    const res = await setPago(rawId, true, metodo);
    if (res) return `✅ Pago registrado (${metodo}) para ${res.nombre}.`;
    return "No encontré ese turno (revisá el turnoId con sesiones_impagas).";
  }
  // Si no, resolver por paciente (nombre o contacto) — tolera que pasen el teléfono.
  const quien = str(input.paciente) || rawId;
  if (!quien) return "Necesito el turnoId (de sesiones_impagas) o el nombre del paciente.";
  const q = quien.toLowerCase();
  const k = contactoKey(quien);
  const sols = await listSolicitudes();
  const impagas = sols.filter(
    (s) => esImpaga(s) && (s.nombre.toLowerCase().includes(q) || (!!k && contactoKey(s.contacto) === k))
  );
  if (!impagas.length) return `No encontré sesiones sin pagar de "${quien}".`;
  if (impagas.length > 1) {
    return (
      `${impagas[0].nombre} tiene ${impagas.length} sesiones sin pagar. Decime cuál (por fecha) o pasá el turnoId:\n` +
      impagas.map((s) => `- ${s.startsAt ? fechaHoraAR(s.startsAt) + " hs" : "sin fecha"} — ${money(s.precio ?? 0)} [turnoId=${s.id}]`).join("\n")
    );
  }
  const res = await setPago(impagas[0].id, true, metodo);
  return res ? `✅ Pago registrado (${metodo}) para ${res.nombre}.` : "No se pudo registrar el pago.";
}

async function doBloquear(input: In): Promise<string> {
  const date = str(input.fecha).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "Fecha inválida (YYYY-MM-DD).";
  await addException({ date, type: "block_day", reason: str(input.motivo) || undefined });
  return `✅ Día bloqueado: ${date}.`;
}

async function doMovimiento(input: In): Promise<string> {
  const concepto = str(input.concepto);
  const monto = Math.round(Number(input.monto));
  const tipo = input.tipo === "egreso" ? "egreso" : "ingreso";
  if (!concepto || !Number.isFinite(monto) || monto <= 0) return "Faltan concepto o un monto válido.";
  await addMovimientoManual({ concepto, monto, tipo, categoria: str(input.categoria) || undefined });
  return `✅ ${tipo === "egreso" ? "Gasto" : "Ingreso"} registrado: ${money(monto)} · ${concepto}.`;
}

export async function runWriteTool(name: string, input: In): Promise<string> {
  try {
    switch (name) {
      case "agendar_turno":
        return await doAgendar(input);
      case "confirmar_turno":
        return await doConfirmar(input);
      case "registrar_pago":
        return await doPago(input);
      case "bloquear_dia":
        return await doBloquear(input);
      case "cargar_movimiento":
        return await doMovimiento(input);
      default:
        return `Acción desconocida: ${name}`;
    }
  } catch (e) {
    return `Error al ejecutar ${name}: ${e instanceof Error ? e.message : "desconocido"}`;
  }
}

/** Resumen legible de una acción de escritura, para la tarjeta de confirmación. */
export function describeWriteTool(name: string, input: In): string {
  switch (name) {
    case "agendar_turno":
      return `Agendar turno — ${str(input.nombre)} · ${str(input.fecha)} · ${input.modalidad === "presencial" ? "presencial" : "online"}`;
    case "confirmar_turno":
      return `Confirmar turno [${str(input.turnoId)}]`;
    case "registrar_pago": {
      const quien = str(input.paciente) || str(input.turnoId);
      return `Registrar pago (${str(input.metodo) || "efectivo"})${quien ? ` — ${quien}` : ""}`;
    }
    case "bloquear_dia":
      return `Bloquear el día ${str(input.fecha)}${input.motivo ? ` — ${str(input.motivo)}` : ""}`;
    case "cargar_movimiento":
      return `Cargar ${input.tipo === "egreso" ? "gasto" : "ingreso"} de ${money(Number(input.monto))} — ${str(input.concepto)}`;
    default:
      return name;
  }
}

// ───────────────────────── Esquemas (para Claude) ─────────────────────────

const fn = (name: string, description: string, parameters: Record<string, unknown>): OAITool => ({
  type: "function",
  function: { name, description, parameters },
});

export const TOOLS: OAITool[] = [
  fn("agenda_hoy", "Turnos confirmados de hoy.", { type: "object", properties: {} }),
  fn("proximos_turnos", "Próximos turnos confirmados a futuro.", {
    type: "object",
    properties: { cantidad: { type: "number", description: "máx. a listar (default 8)" } },
  }),
  fn("pendientes", "Solicitudes de turno sin confirmar.", { type: "object", properties: {} }),
  fn("finanzas", "Resumen financiero de un período (cobrado, gastos, neto, por cobrar).", {
    type: "object",
    properties: { periodo: { type: "string", enum: ["mes", "mes-pasado", "anio", "todo"], description: "default mes" } },
  }),
  fn("buscar_paciente", "Busca un paciente por nombre o contacto; devuelve deuda y próximo turno.", {
    type: "object",
    properties: { query: { type: "string" } },
    required: ["query"],
  }),
  fn("pacientes_con_deuda", "Pagos pendientes resumidos por paciente (cuánto debe cada uno y cuántas sesiones). Mismo criterio que sesiones_impagas.", { type: "object", properties: {} }),
  fn(
    "sesiones_impagas",
    "Sesiones realizadas sin pagar (de acá sale la DEUDA, NO de 'pendientes'). Devuelve el turnoId de cada sesión para poder cobrarla con registrar_pago. Opcional: filtrar por paciente.",
    { type: "object", properties: { paciente: { type: "string", description: "nombre o contacto (opcional)" } } }
  ),
  fn("disponibilidad", "Horarios libres. Opcional: una fecha (YYYY-MM-DD) y modalidad.", {
    type: "object",
    properties: { fecha: { type: "string", description: "YYYY-MM-DD" }, modalidad: { type: "string", enum: ["online", "presencial"] } },
  }),
  // Escritura (requieren confirmación de la usuaria)
  fn("agendar_turno", "Agenda un turno confirmado. Requiere confirmación de la usuaria.", {
    type: "object",
    properties: {
      nombre: { type: "string" },
      contacto: { type: "string", description: "WhatsApp/teléfono o email" },
      fecha: { type: "string", description: "YYYY-MM-DDTHH:MM (hora AR)" },
      modalidad: { type: "string", enum: ["online", "presencial"] },
      serviceId: { type: "string", description: "opcional; si no, usa el primer servicio" },
    },
    required: ["nombre", "contacto", "fecha"],
  }),
  fn("confirmar_turno", "Confirma una solicitud pendiente. Pasá el turnoId (obtenelo de pendientes).", {
    type: "object",
    properties: { turnoId: { type: "string" } },
    required: ["turnoId"],
  }),
  fn(
    "registrar_pago",
    "Marca una sesión como pagada. Pasá el turnoId (de sesiones_impagas) O el nombre/contacto del paciente. El teléfono NO es un turnoId.",
    {
      type: "object",
      properties: {
        turnoId: { type: "string", description: "id del turno (de sesiones_impagas)" },
        paciente: { type: "string", description: "nombre o contacto, si no tenés el turnoId" },
        metodo: { type: "string", enum: ["efectivo", "transferencia", "mercadopago", "tarjeta"] },
      },
    }
  ),
  fn("bloquear_dia", "Bloquea un día entero (no se ofrecen turnos). Fecha YYYY-MM-DD.", {
    type: "object",
    properties: { fecha: { type: "string" }, motivo: { type: "string" } },
    required: ["fecha"],
  }),
  fn("cargar_movimiento", "Registra un ingreso o gasto del consultorio.", {
    type: "object",
    properties: {
      concepto: { type: "string" },
      monto: { type: "number" },
      tipo: { type: "string", enum: ["ingreso", "egreso"] },
      categoria: { type: "string", description: "opcional (ej. alquiler, supervisión)" },
    },
    required: ["concepto", "monto", "tipo"],
  }),
];

export function buildSystemPrompt(): string {
  const hoy = new Date().toLocaleDateString("es-AR", {
    timeZone: AR,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return [
    "Sos el asistente del panel de gestión de un consultorio de psicología. Hablás en español rioplatense, cálido pero conciso.",
    `Hoy es ${hoy} (hora de Argentina).`,
    "Podés CONSULTAR agenda, turnos, finanzas, pacientes y disponibilidad con las herramientas de lectura.",
    "Para ACCIONES que cambian datos (agendar, confirmar, registrar pago, bloquear día, cargar ingreso/gasto) usás las herramientas de escritura: NO se ejecutan solas — el panel le muestra a la usuaria una confirmación antes de aplicar. Proponé la acción cuando te la pidan.",
    "Reglas:",
    "- El nombre que devuelven las herramientas es el del PACIENTE (la profesional es siempre la misma). Al listar turnos, presentá claro al paciente: ej. 'Lun 29/6 9:00 — Martina Liberato · Primera consulta (online)'. NO digas 'con [nombre]' como si el paciente fuera quien atiende. NUNCA muestres el turnoId interno a la usuaria.",
    "- Una sesión cuenta como deuda solo si NO está pagada y YA ocurrió (realizada, o confirmada con fecha vencida); las sesiones a futuro NO son deuda. Para 'quién no abonó / pagos pendientes / cobranzas' usá `sesiones_impagas` (detalle por sesión, con turnoId) o `pacientes_con_deuda` (total por paciente): ambas dan lo mismo.",
    "- Para cobrar: llamá `registrar_pago` con el nombre del paciente en `paciente` (o el turnoId que te da `sesiones_impagas`). El teléfono/contacto NO es un turnoId; nunca lo pases como turnoId.",
    "- Cuando proponés una acción de escritura, NO preguntes '¿confirmás?' ni pidas confirmación en el texto: el panel ya le muestra a la usuaria un botón de Confirmar. Decí en UNA frase corta qué vas a hacer y nada más.",
    "- Nunca inventes IDs ni datos: si te falta un dato, buscalo con una herramienta de lectura.",
    "- Montos en pesos ($) y fechas/horas en formato argentino. Para agendar, la fecha va en formato YYYY-MM-DDTHH:MM (hora AR).",
    "- No manejás ni comentás el motivo de consulta ni notas clínicas (datos de salud sensibles).",
    "- Respuestas cortas y claras. Si falta un dato para una acción, preguntalo.",
  ].join("\n");
}
