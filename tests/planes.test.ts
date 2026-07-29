// Tests de PLANES Y SUSCRIPCIÓN: lo que Codexy le cobra al psicólogo.
//
//   node --test --experimental-strip-types tests/planes.test.ts
//
// Lo importante que se fija acá es una decisión de producto, no un detalle
// técnico: la morosidad NUNCA corta el acceso del profesional a lo que ya
// cargó. Son historias clínicas de pacientes en tratamiento. Puede quedar en
// solo lectura, pero siempre puede entrar, consultar y exportar.

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  DIAS_DE_PRUEBA,
  ESTADO_LABEL,
  PLANES,
  PLANES_ORDENADOS,
  dentroDelLimite,
  diasRestantes,
  esEstadoValido,
  esMonedaValida,
  esPlanValido,
  normalizarSuscripcion,
  precioDe,
  puedeEscribir,
  sitioPublicoActivo,
  suscripcionPorDefecto,
  type EstadoSuscripcion,
  type Suscripcion,
} from "../lib/planes.ts";

const sus = (p: Partial<Suscripcion>): Suscripcion =>
  normalizarSuscripcion({ ...suscripcionPorDefecto(), ...p });

describe("acceso según el estado de la suscripción", () => {
  test("en prueba, activa y vencida se puede escribir", () => {
    for (const estado of ["prueba", "activa", "vencida"] as EstadoSuscripcion[]) {
      assert.equal(puedeEscribir(sus({ estado })), true, `estado=${estado}`);
    }
  });

  test("en solo_lectura y cancelada NO se puede escribir", () => {
    for (const estado of ["solo_lectura", "cancelada"] as EstadoSuscripcion[]) {
      assert.equal(puedeEscribir(sus({ estado })), false, `estado=${estado}`);
    }
  });

  test("vencida todavía escribe: hay un escalón antes de cortar", () => {
    // Es deliberado. Cuando vence, primero se avisa en el panel; recién si no
    // hay respuesta se pasa a solo lectura. Cortar la escritura el mismo día del
    // vencimiento deja a un psicólogo sin poder registrar la sesión que acaba de
    // dar, y eso genera un problema clínico, no comercial.
    assert.equal(puedeEscribir(sus({ estado: "vencida" })), true);
    assert.equal(puedeEscribir(sus({ estado: "solo_lectura" })), false);
  });

  test("el sitio público sigue vivo salvo que se dé de baja", () => {
    for (const estado of ["prueba", "activa", "vencida", "solo_lectura"] as EstadoSuscripcion[]) {
      assert.equal(sitioPublicoActivo(sus({ estado })), true, `estado=${estado}`);
    }
    assert.equal(sitioPublicoActivo(sus({ estado: "cancelada" })), false);
  });
});

describe("límites por plan", () => {
  test("deja agregar mientras haya cupo", () => {
    const s = sus({ plan: "esencial" });
    const tope = PLANES.esencial.limites.pacientes!;
    assert.equal(dentroDelLimite(s, "pacientes", 0).ok, true);
    assert.equal(dentroDelLimite(s, "pacientes", tope - 1).ok, true);
  });

  test("corta justo en el tope, no uno después", () => {
    const s = sus({ plan: "esencial" });
    const tope = PLANES.esencial.limites.pacientes!;
    const r = dentroDelLimite(s, "pacientes", tope);
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.tope, tope);
      assert.match(r.motivo, /Esencial/);
      assert.match(r.motivo, new RegExp(String(tope)));
    }
  });

  test("un límite en null es sin tope", () => {
    // El plan Consultorio no limita pacientes: un consultorio con equipo puede
    // tener cientos y no tiene sentido frenarlo.
    assert.equal(PLANES.consultorio.limites.pacientes, null);
    assert.equal(dentroDelLimite(sus({ plan: "consultorio" }), "pacientes", 100_000).ok, true);
  });

  test("el asistente IA tiene tope en TODOS los planes", () => {
    // Es el único costo variable: si algún plan lo deja en null, el gasto de
    // OpenAI queda abierto. Este test existe para que esa decisión sea explícita.
    for (const p of PLANES_ORDENADOS) {
      assert.notEqual(p.limites.asistenteMes, null, `el plan ${p.id} dejó el asistente sin tope`);
    }
  });

  test("los planes de pago no son más chicos que la prueba", () => {
    const cmp = (a: number | null, b: number | null) => (a === null ? Infinity : a) >= (b === null ? Infinity : b);
    for (const clave of ["pacientes", "miembros", "profesionales", "asistenteMes"] as const) {
      assert.ok(
        cmp(PLANES.esencial.limites[clave], PLANES.prueba.limites[clave]),
        `esencial.${clave} es menor que prueba.${clave}`,
      );
      assert.ok(
        cmp(PLANES.consultorio.limites[clave], PLANES.esencial.limites[clave]),
        `consultorio.${clave} es menor que esencial.${clave}`,
      );
    }
  });
});

describe("normalización: nunca lanza y nunca deja a nadie afuera", () => {
  test("basura entra y sale una suscripción de prueba usable", () => {
    for (const raw of [null, undefined, 42, "hola", [], {}, { plan: "premium", estado: "raro" }]) {
      const s = normalizarSuscripcion(raw);
      assert.equal(s.plan, "prueba");
      assert.equal(s.estado, "prueba");
      assert.equal(s.moneda, "ARS");
      assert.equal(puedeEscribir(s), true, "una suscripción ilegible no puede dejar a nadie sin escribir");
    }
  });

  test("por defecto arranca en prueba, NO cancelada", () => {
    // Un consultorio sin registro de suscripción casi siempre es uno recién
    // creado o migrado a mano. Se lo deja trabajar; Codexy lo pone al día.
    const s = suscripcionPorDefecto();
    assert.equal(s.estado, "prueba");
    assert.equal(puedeEscribir(s), true);
  });

  test("la nota interna se recorta y nunca es undefined por accidente", () => {
    assert.equal(normalizarSuscripcion({ nota: "x".repeat(900) }).nota!.length, 500);
    assert.equal(normalizarSuscripcion({ nota: 42 }).nota, undefined);
  });

  test("validadores de tipo", () => {
    assert.ok(esPlanValido("esencial"));
    assert.ok(!esPlanValido("premium"));
    assert.ok(esEstadoValido("solo_lectura"));
    assert.ok(!esEstadoValido("suspendida"));
    assert.ok(esMonedaValida("MXN"));
    assert.ok(!esMonedaValida("EUR"));
  });
});

describe("periodo", () => {
  const AHORA = Date.parse("2026-07-29T12:00:00Z");

  test("null si no hay fecha", () => {
    assert.equal(diasRestantes(sus({ periodoHasta: null }), AHORA), null);
  });

  test("cuenta los días que faltan", () => {
    assert.equal(diasRestantes(sus({ periodoHasta: "2026-08-05T12:00:00Z" }), AHORA), 7);
  });

  test("negativo si ya venció", () => {
    assert.ok(diasRestantes(sus({ periodoHasta: "2026-07-20T12:00:00Z" }), AHORA)! < 0);
  });

  test("null si la fecha es basura (no explota)", () => {
    assert.equal(diasRestantes(sus({ periodoHasta: "cualquier cosa" }), AHORA), null);
  });
});

describe("precios", () => {
  test("la prueba no tiene cargo en ninguna moneda", () => {
    for (const m of ["ARS", "MXN", "USD"] as const) {
      assert.equal(precioDe("prueba", m), "Sin cargo");
    }
  });

  test("cada plan de pago tiene precio en los tres mercados", () => {
    for (const p of [PLANES.esencial, PLANES.consultorio]) {
      for (const m of ["ARS", "MXN", "USD"] as const) {
        assert.ok(p.precio[m] > 0, `${p.id} no tiene precio en ${m}`);
      }
    }
  });

  test("el precio sale formateado con su moneda", () => {
    assert.match(precioDe("esencial", "USD"), /19/);
    assert.match(precioDe("esencial", "ARS"), /18/);
  });
});

describe("presentación", () => {
  test("todos los estados tienen etiqueta en castellano", () => {
    for (const e of ["prueba", "activa", "vencida", "solo_lectura", "cancelada"] as EstadoSuscripcion[]) {
      assert.ok(ESTADO_LABEL[e]?.length > 0, `falta la etiqueta de ${e}`);
    }
  });

  test("la prueba dura un número razonable de días", () => {
    assert.ok(DIAS_DE_PRUEBA >= 7 && DIAS_DE_PRUEBA <= 30);
  });
});
