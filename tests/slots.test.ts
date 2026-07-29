// Tests del motor de turnos (`lib/scheduling/slots.ts`).
//
// Corren con el runner nativo de Node, sin dependencias extra:
//
//   node --test --experimental-strip-types tests/slots.test.ts
//
// IMPORTANTE: los imports apuntan a los .ts con extensión explícita a propósito.
// Node no compila TypeScript solo: hace falta --experimental-strip-types (Node 22+)
// para que pueda cargar `../lib/scheduling/slots.ts` sin build previo. Sin ese flag
// el import falla. En Node 23.6+ el flag ya viene activado por defecto.
//
// El módulo asume Argentina en UTC-3 FIJO (hoy el país no tiene horario de verano),
// así que todos los esperados de acá están escritos a mano en hora de pared AR.
// Nada depende de la TZ de la máquina que corre los tests: los instantes se
// construyen siempre con offset explícito ("-03:00" o "Z").

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  arLocalToIso,
  endFromStart,
  fechaHoraAR,
  getAvailableSlots,
  horaAR,
  isoToArLocal,
  nowIsoAR,
} from "../lib/scheduling/slots.ts";

import type {
  AvailabilityRule,
  BusyRange,
  DateException,
  SchedulingConfig,
} from "../lib/scheduling/types.ts";

// ---------------------------------------------------------------------------
// Andamiaje compartido para getAvailableSlots
// ---------------------------------------------------------------------------

// Lunes 10/08/2026, 08:00 AR. Elegido a mano: el miércoles siguiente (12/08)
// es el ÚNICO miércoles que entra en una ventana de 7 días.
const AHORA = new Date("2026-08-10T08:00:00-03:00");
const MIERCOLES = 3; // 0=domingo … 6=sábado, según lib/scheduling/types.ts

const CONFIG_BASE: SchedulingConfig = {
  slotDurationMin: 50,
  slotIntervalMin: 60, // la grilla arranca en hora redonda
  bufferAfterMin: 0,
  minNoticeHours: 0,
  bookingWindowDays: 7,
};

// Regla semanal simple: miércoles de 09:00 a 12:00, online.
const REGLA_MIERCOLES: AvailabilityRule = {
  id: "r1",
  weekday: MIERCOLES,
  startTime: "09:00",
  endTime: "12:00",
  modalidad: "online",
};

/** Corre el motor con los defaults de arriba, pisando lo que haga falta. */
function correr(over: {
  now?: Date;
  daysAhead?: number;
  modalidad?: "online" | "presencial";
  durationMin?: number;
  rules?: AvailabilityRule[];
  config?: Partial<SchedulingConfig>;
  exceptions?: DateException[];
  busy?: BusyRange[];
} = {}) {
  return getAvailableSlots({
    now: over.now ?? AHORA,
    daysAhead: over.daysAhead,
    modalidad: over.modalidad,
    durationMin: over.durationMin,
    rules: over.rules ?? [REGLA_MIERCOLES],
    config: { ...CONFIG_BASE, ...over.config },
    exceptions: over.exceptions ?? [],
    busy: over.busy ?? [],
  });
}

/** Atajo: los horarios "HH:MM" de un día devuelto por el motor. */
function horarios(dia: { slots: { startsAt: string }[] }) {
  return dia.slots.map((s) => horaAR(s.startsAt));
}

// ---------------------------------------------------------------------------
// arLocalToIso
// ---------------------------------------------------------------------------

describe("arLocalToIso", () => {
  test("convierte un datetime-local AR a ISO con offset -03:00", () => {
    assert.equal(arLocalToIso("2026-08-15T14:00"), "2026-08-15T14:00:00-03:00");
  });

  test("el ISO resultante apunta al instante correcto (14:00 AR = 17:00 UTC)", () => {
    const t = new Date(arLocalToIso("2026-08-15T14:00"));
    assert.equal(t.toISOString(), "2026-08-15T17:00:00.000Z");
  });

  test("devuelve '' para entradas basura", () => {
    for (const basura of [
      "",
      "   ",
      "cualquier cosa",
      "2026-08-15", // falta la hora
      "2026-08-15T14", // falta el minuto
      "15/08/2026 14:00", // formato AR con barras
      "26-08-15T14:00", // año de dos dígitos
      "2026-8-15T14:00", // mes sin cero a la izquierda
      "T14:00",
    ]) {
      assert.equal(arLocalToIso(basura), "", `debería rechazar ${JSON.stringify(basura)}`);
    }
  });

  test("ignora la cola del string (segundos, milisegundos, 'Z') y se queda con HH:MM", () => {
    // El regex sólo ancla el principio, así que lo que venga después se descarta.
    assert.equal(arLocalToIso("2026-08-15T14:00:59.999Z"), "2026-08-15T14:00:00-03:00");
  });

  test("LIMITACIÓN CONOCIDA: acepta fechas imposibles porque sólo valida la FORMA", () => {
    // Hoy arLocalToIso es un chequeo de formato con regex, no una validación de
    // calendario: "2026-13-45T99:99" tiene la pinta correcta (4-2-2 T 2:2), así
    // que pasa y sale un ISO sintácticamente armado pero semánticamente inválido.
    const salida = arLocalToIso("2026-13-45T99:99");
    assert.equal(salida, "2026-13-45T99:99:00-03:00");

    // Y el resultado NO es una fecha usable: recién revienta río abajo.
    assert.ok(Number.isNaN(new Date(salida).getTime()), "debería ser Invalid Date");

    // Mismo problema con un 31 de febrero o un mes 00.
    assert.equal(arLocalToIso("2026-02-31T10:00"), "2026-02-31T10:00:00-03:00");
    assert.equal(arLocalToIso("2026-00-00T00:00"), "2026-00-00T00:00:00-03:00");

    // Si algún día se agrega validación real, este test tiene que fallar y
    // hay que actualizarlo (es el recordatorio de que la deuda sigue ahí).
  });
});

// ---------------------------------------------------------------------------
// isoToArLocal / nowIsoAR
// ---------------------------------------------------------------------------

describe("isoToArLocal y nowIsoAR", () => {
  test("isoToArLocal pasa un ISO AR al formato del input datetime-local", () => {
    assert.equal(isoToArLocal("2026-08-15T14:00:00-03:00"), "2026-08-15T14:00");
  });

  test("isoToArLocal traduce un ISO en UTC a hora de pared AR", () => {
    // 02:30 UTC del 16 es 23:30 AR del 15: cambia el día, no sólo la hora.
    assert.equal(isoToArLocal("2026-08-16T02:30:00Z"), "2026-08-15T23:30");
  });

  test("ida y vuelta: arLocalToIso(isoToArLocal(x)) devuelve el mismo ISO", () => {
    for (const iso of [
      "2026-08-15T14:00:00-03:00",
      "2026-01-01T00:00:00-03:00",
      "2026-12-31T23:59:00-03:00",
      "2026-03-08T09:05:00-03:00",
    ]) {
      assert.equal(arLocalToIso(isoToArLocal(iso)), iso);
    }
  });

  test("ida y vuelta: isoToArLocal(arLocalToIso(x)) devuelve el mismo local", () => {
    for (const local of ["2026-08-15T14:00", "2026-01-01T00:00", "2026-12-31T23:59"]) {
      assert.equal(isoToArLocal(arLocalToIso(local)), local);
    }
  });

  test("nowIsoAR devuelve un ISO de pared AR bien formado y coherente con ahora", () => {
    const antes = Date.now();
    const iso = nowIsoAR();
    const despues = Date.now();

    assert.match(iso, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00-03:00$/);

    // El instante representado tiene que caer en la ventana de la llamada,
    // con hasta 60s de tolerancia porque nowIsoAR trunca los segundos a :00.
    const t = new Date(iso).getTime();
    assert.ok(Number.isFinite(t), "nowIsoAR debería producir una fecha válida");
    assert.ok(t <= despues, `${iso} no debería estar en el futuro`);
    assert.ok(t > antes - 60_000, `${iso} está demasiado atrás en el tiempo`);
  });

  test("nowIsoAR es compatible con isoToArLocal (mismo prefijo de pared)", () => {
    const iso = nowIsoAR();
    assert.equal(isoToArLocal(iso), iso.slice(0, 16));
  });
});

// ---------------------------------------------------------------------------
// endFromStart
// ---------------------------------------------------------------------------

describe("endFromStart", () => {
  test("suma la duración dentro del mismo día", () => {
    assert.equal(
      endFromStart("2026-08-15T14:00:00-03:00", 50),
      "2026-08-15T14:50:00-03:00"
    );
  });

  test("suma duraciones que pasan de una hora a la siguiente", () => {
    assert.equal(
      endFromStart("2026-08-15T14:40:00-03:00", 45),
      "2026-08-15T15:25:00-03:00"
    );
  });

  test("cruza la medianoche AR y avanza el día", () => {
    assert.equal(
      endFromStart("2026-08-15T23:30:00-03:00", 60),
      "2026-08-16T00:30:00-03:00"
    );
  });

  test("cruza fin de mes y fin de año", () => {
    assert.equal(
      endFromStart("2026-08-31T23:50:00-03:00", 30),
      "2026-09-01T00:20:00-03:00"
    );
    assert.equal(
      endFromStart("2026-12-31T23:00:00-03:00", 120),
      "2027-01-01T01:00:00-03:00"
    );
  });

  test("acepta un inicio en UTC y devuelve el fin en pared AR", () => {
    // 02:30Z del 16 = 23:30 AR del 15; +60min = 00:30 AR del 16.
    assert.equal(endFromStart("2026-08-16T02:30:00Z", 60), "2026-08-16T00:30:00-03:00");
  });

  test("duración 0 devuelve el mismo instante normalizado a pared AR", () => {
    assert.equal(endFromStart("2026-08-15T14:00:00-03:00", 0), "2026-08-15T14:00:00-03:00");
  });
});

// ---------------------------------------------------------------------------
// horaAR / fechaHoraAR
// ---------------------------------------------------------------------------

describe("horaAR y fechaHoraAR", () => {
  test("horaAR formatea HH:MM en hora argentina", () => {
    assert.equal(horaAR("2026-08-15T14:00:00-03:00"), "14:00");
    assert.equal(horaAR("2026-08-15T09:05:00-03:00"), "09:05");
  });

  test("horaAR convierte desde UTC (no usa la TZ de la máquina)", () => {
    assert.equal(horaAR("2026-08-15T17:00:00Z"), "14:00");
    assert.equal(horaAR("2026-08-16T02:30:00Z"), "23:30");
  });

  test("fechaHoraAR arma 'Día D mes · HH:MM'", () => {
    // 15/08/2026 cae sábado.
    assert.equal(fechaHoraAR("2026-08-15T14:00:00-03:00"), "Sáb 15 ago · 14:00");
    // 12/08/2026 cae miércoles.
    assert.equal(fechaHoraAR("2026-08-12T09:00:00-03:00"), "Mié 12 ago · 09:00");
  });

  test("fechaHoraAR usa el DÍA argentino, no el UTC", () => {
    // 01:00Z del 16 todavía es el 15 a las 22:00 en Argentina.
    assert.equal(fechaHoraAR("2026-08-16T01:00:00Z"), "Sáb 15 ago · 22:00");
  });

  test("fechaHoraAR nombra bien los meses de los extremos del año", () => {
    assert.equal(fechaHoraAR("2026-01-05T08:00:00-03:00"), "Lun 5 ene · 08:00");
    assert.equal(fechaHoraAR("2026-12-25T20:30:00-03:00"), "Vie 25 dic · 20:30");
  });
});

// ---------------------------------------------------------------------------
// getAvailableSlots
// ---------------------------------------------------------------------------

describe("getAvailableSlots", () => {
  test("con una regla semanal simple genera los slots del día correspondiente", () => {
    const dias = correr();

    assert.equal(dias.length, 1, "sólo hay un miércoles en la ventana de 7 días");
    const [dia] = dias;
    assert.equal(dia.date, "2026-08-12");
    assert.equal(dia.label, "Mié 12 ago");

    // Duración 50 con grilla de 60: 09:00, 10:00 y 11:00. Las 12:00 no entra
    // porque terminaría 12:50, fuera de la franja.
    assert.deepEqual(horarios(dia), ["09:00", "10:00", "11:00"]);
    assert.deepEqual(dia.slots[0], {
      startsAt: "2026-08-12T09:00:00-03:00",
      endsAt: "2026-08-12T09:50:00-03:00",
      modalidad: "online",
    });
    assert.equal(dia.slots[2].endsAt, "2026-08-12T11:50:00-03:00");
  });

  test("sin reglas para ese weekday no devuelve nada", () => {
    const dias = correr({ rules: [{ ...REGLA_MIERCOLES, weekday: 0 /* domingo */ }] });
    // El domingo dentro de la ventana (16/08) sí aparece: verificamos que el
    // motor mira el weekday y no arma slots en cualquier día.
    assert.equal(dias.length, 1);
    assert.equal(dias[0].date, "2026-08-16");

    assert.deepEqual(correr({ rules: [] }), []);
  });

  test("un rango busy que solapa saca el slot pisado y deja los demás", () => {
    const dias = correr({
      busy: [
        { startsAt: "2026-08-12T10:00:00-03:00", endsAt: "2026-08-12T10:50:00-03:00" },
      ],
    });

    assert.equal(dias.length, 1);
    assert.deepEqual(horarios(dias[0]), ["09:00", "11:00"]);
  });

  test("un busy parcial voltea todos los slots que toca", () => {
    const dias = correr({
      // 10:30–11:30 pisa el turno de las 10:00 (termina 10:50) y el de las 11:00.
      busy: [
        { startsAt: "2026-08-12T10:30:00-03:00", endsAt: "2026-08-12T11:30:00-03:00" },
      ],
    });

    assert.deepEqual(horarios(dias[0]), ["09:00"]);
  });

  test("los rangos son semiabiertos: un busy pegado no saca ningún slot", () => {
    const dias = correr({
      // 09:50–10:00 es exactamente el hueco entre dos turnos: no solapa con ninguno.
      busy: [
        { startsAt: "2026-08-12T09:50:00-03:00", endsAt: "2026-08-12T10:00:00-03:00" },
      ],
    });

    assert.deepEqual(horarios(dias[0]), ["09:00", "10:00", "11:00"]);
  });

  test("un busy que cubre toda la franja borra el día entero", () => {
    const dias = correr({
      busy: [
        { startsAt: "2026-08-12T08:00:00-03:00", endsAt: "2026-08-12T13:00:00-03:00" },
      ],
    });

    assert.deepEqual(dias, []);
  });

  test("un busy de otro día no afecta", () => {
    const dias = correr({
      busy: [
        { startsAt: "2026-08-19T09:00:00-03:00", endsAt: "2026-08-19T12:00:00-03:00" },
      ],
    });

    assert.deepEqual(horarios(dias[0]), ["09:00", "10:00", "11:00"]);
  });

  test("respeta minNoticeHours y recorta los slots demasiado cercanos", () => {
    // Ahora: lunes 10/08 08:00. Con 50h de anticipación, el corte queda en
    // miércoles 12/08 10:00 → se cae el turno de las 09:00.
    const dias = correr({ config: { minNoticeHours: 50 } });

    assert.equal(dias.length, 1);
    assert.deepEqual(horarios(dias[0]), ["10:00", "11:00"]);
  });

  test("minNoticeHours grande deja el día sin slots (y el día desaparece)", () => {
    // 76h desde el lunes 08:00 → corte el miércoles a las 12:00: no queda nada.
    assert.deepEqual(correr({ config: { minNoticeHours: 76 } }), []);
  });

  test("minNoticeHours 0 igual descarta lo que ya pasó", () => {
    // Si "ahora" es el propio miércoles a las 10:30, de HOY sólo sobrevive las 11:00.
    // (Al mover "ahora" al 12/08, la ventana de 7 días alcanza el miércoles 19,
    // que aparece completo porque está enteramente en el futuro.)
    const dias = correr({
      now: new Date("2026-08-12T10:30:00-03:00"),
      config: { minNoticeHours: 0 },
    });

    assert.deepEqual(
      dias.map((d) => d.date),
      ["2026-08-12", "2026-08-19"]
    );
    assert.deepEqual(horarios(dias[0]), ["11:00"]);
    assert.deepEqual(horarios(dias[1]), ["09:00", "10:00", "11:00"]);
  });

  test("una excepción block_day borra el día", () => {
    const excepcion: DateException = {
      id: "e1",
      date: "2026-08-12",
      type: "block_day",
      reason: "feriado",
    };

    assert.deepEqual(correr({ exceptions: [excepcion] }), []);

    // Y un block_day de OTRA fecha no toca el miércoles.
    assert.deepEqual(
      horarios(correr({ exceptions: [{ ...excepcion, date: "2026-08-13" }] })[0]),
      ["09:00", "10:00", "11:00"]
    );
  });

  test("un 'extra' sobrevive al block_day del mismo día (precedencia)", () => {
    const dias = correr({
      exceptions: [
        { id: "e1", date: "2026-08-12", type: "block_day" },
        {
          id: "e2",
          date: "2026-08-12",
          type: "extra",
          startTime: "15:00",
          endTime: "16:00",
          modalidad: "presencial",
        },
      ],
    });

    assert.equal(dias.length, 1);
    assert.deepEqual(horarios(dias[0]), ["15:00"]);
    assert.equal(dias[0].slots[0].modalidad, "presencial");
    assert.equal(dias[0].slots[0].endsAt, "2026-08-12T15:50:00-03:00");
  });

  test("filtra por modalidad cuando se pide una", () => {
    assert.deepEqual(horarios(correr({ modalidad: "online" })[0]), [
      "09:00",
      "10:00",
      "11:00",
    ]);
    assert.deepEqual(correr({ modalidad: "presencial" }), []);
  });

  test("durationMin del servicio pisa slotDurationMin de la config", () => {
    const dias = correr({ durationMin: 30 });

    assert.deepEqual(horarios(dias[0]), ["09:00", "10:00", "11:00"]);
    // Lo que cambia es el FIN: la grilla la sigue marcando slotIntervalMin.
    assert.equal(dias[0].slots[0].endsAt, "2026-08-12T09:30:00-03:00");
  });

  test("slotIntervalMin define la grilla, no la duración", () => {
    // Grilla de 30' con sesiones de 50': arranques cada media hora.
    const dias = correr({ config: { slotIntervalMin: 30 } });

    assert.deepEqual(horarios(dias[0]), [
      "09:00",
      "09:30",
      "10:00",
      "10:30",
      "11:00",
    ]);
    assert.equal(dias[0].slots[1].endsAt, "2026-08-12T10:20:00-03:00");
  });

  test("deduplica cuando dos franjas generan el mismo horario", () => {
    const dias = correr({
      rules: [
        REGLA_MIERCOLES, // 09:00–12:00
        { ...REGLA_MIERCOLES, id: "r2", startTime: "10:00", endTime: "13:00" },
      ],
    });

    // Unión sin repetidos y ordenada: 10:00 y 11:00 salen de las dos reglas.
    assert.deepEqual(horarios(dias[0]), ["09:00", "10:00", "11:00", "12:00"]);
  });

  test("daysAhead recorta la ventana pero nunca la agranda más allá de bookingWindowDays", () => {
    // daysAhead corto: el miércoles 12 queda afuera.
    assert.deepEqual(correr({ daysAhead: 1 }), []);

    // daysAhead enorme: igual se topea en bookingWindowDays (7), así que el
    // miércoles 19 NO aparece.
    const dias = correr({ daysAhead: 60 });
    assert.deepEqual(
      dias.map((d) => d.date),
      ["2026-08-12"]
    );
  });

  test("con una ventana más larga devuelve los días en orden cronológico", () => {
    const dias = correr({ config: { bookingWindowDays: 30 } });

    assert.deepEqual(
      dias.map((d) => d.date),
      ["2026-08-12", "2026-08-19", "2026-08-26", "2026-09-02", "2026-09-09"]
    );
    assert.deepEqual(dias.map((d) => d.label)[3], "Mié 2 sep");
  });
});
