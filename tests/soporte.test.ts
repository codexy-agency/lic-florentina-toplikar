// Tests del ACCESO DE SOPORTE de Codexy.
//
//   node --test --experimental-strip-types tests/soporte.test.ts
//
// Es la función más peligrosa del sistema: deja entrar a alguien de Codexy al
// consultorio de otra persona, donde hay historias clínicas. Estos tests fijan
// por escrito los cuatro topes que la hacen aceptable, para que ninguno se
// pueda aflojar sin que un test se ponga rojo.
//
// El caso que motivó el archivo: `puedeSoporte` negaba sólo `notas_clinicas`,
// así que una sesión de soporte pasaba el gate de la sección Equipo, se creaba
// un miembro con rol `profesional` y contraseña propia, y entraba con esa cuenta
// a leer la historia clínica. Dos pasos. El invariante que el producto le
// promete al cliente era falso hacia adentro.

import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  ROL_SOPORTE,
  TTL_SOPORTE_SEG,
  esEmailDeSoporte,
  puedeSoporte,
  soporteConfigurado,
} from "../lib/soporte.ts";

import { PERMISOS, permisosPorRol, tienePermiso, type Permiso } from "../lib/permisos.ts";

const ENV_ORIGINAL = process.env.SOPORTE_EMAILS;

beforeEach(() => {
  process.env.SOPORTE_EMAILS = "ana@codexy.com, Juan@Codexy.com ,";
});
afterEach(() => {
  if (ENV_ORIGINAL === undefined) delete process.env.SOPORTE_EMAILS;
  else process.env.SOPORTE_EMAILS = ENV_ORIGINAL;
});

describe("quién es soporte", () => {
  test("reconoce los emails de la lista, sin importar mayúsculas ni espacios", () => {
    assert.equal(esEmailDeSoporte("ana@codexy.com"), true);
    assert.equal(esEmailDeSoporte("  ANA@CODEXY.COM  "), true);
    assert.equal(esEmailDeSoporte("juan@codexy.com"), true);
  });

  test("cualquier otro email no es soporte", () => {
    for (const e of [
      "ana@codexy.com.ar", // dominio parecido
      "xana@codexy.com", // prefijo
      "ana@codexy.co", // sufijo recortado
      "ana@otracosa.com",
      "",
      "   ",
    ]) {
      assert.equal(esEmailDeSoporte(e), false, `no debería ser soporte: "${e}"`);
    }
  });

  test("sin la variable de entorno, NADIE es soporte (fail-closed)", () => {
    delete process.env.SOPORTE_EMAILS;
    assert.equal(soporteConfigurado(), false);
    assert.equal(esEmailDeSoporte("ana@codexy.com"), false);
  });

  test("la variable vacía tampoco habilita a nadie", () => {
    process.env.SOPORTE_EMAILS = "  , ,  ";
    assert.equal(soporteConfigurado(), false);
    assert.equal(esEmailDeSoporte("ana@codexy.com"), false);
  });
});

describe("qué puede hacer una sesión de soporte", () => {
  test("NUNCA la historia clínica", () => {
    assert.equal(puedeSoporte("notas_clinicas"), false);
  });

  test("NUNCA administrar accesos: es el camino de escalada", () => {
    // Con `equipo` podría crear un miembro con rol profesional y contraseña
    // propia, y entrar con esa cuenta a la historia clínica.
    assert.equal(puedeSoporte("equipo"), false);
  });

  test("sí puede lo operativo, que es para lo que existe", () => {
    for (const p of ["agenda", "pacientes", "finanzas", "servicios", "disponibilidad", "configuracion"] as Permiso[]) {
      assert.equal(puedeSoporte(p), true, `soporte debería poder: ${p}`);
    }
  });

  test("todo permiso conocido tiene una respuesta explícita", () => {
    // Si mañana se agrega un permiso nuevo, este test obliga a decidir de qué
    // lado cae en vez de que quede permitido por descuido.
    const decididos = PERMISOS.map((p) => ({ p, ok: puedeSoporte(p) }));
    assert.equal(decididos.length, PERMISOS.length);
    const negados = decididos.filter((d) => !d.ok).map((d) => d.p).sort();
    assert.deepEqual(
      negados,
      ["equipo", "notas_clinicas"],
      "cambió la lista de permisos negados a soporte: revisar que sea a propósito",
    );
  });
});

describe("el rol efectivo de soporte no alcanza la historia clínica por otra vía", () => {
  test("ROL_SOPORTE no es owner ni profesional", () => {
    assert.notEqual(ROL_SOPORTE, "owner");
    assert.notEqual(ROL_SOPORTE, "profesional");
  });

  test("aun con el permiso tildado a mano, el rol de soporte no ve notas", () => {
    // Doble red: `tienePermiso` ciega notas_clinicas por ROL, así que incluso si
    // una membresía guardara `notas_clinicas: true` no alcanzaría.
    assert.equal(tienePermiso(ROL_SOPORTE, { notas_clinicas: true }, "notas_clinicas"), false);
  });

  test("el rol que soporte NO puede crear (profesional) sí ve notas: por eso está negado equipo", () => {
    // Este test documenta POR QUÉ hay que negar `equipo`. Si algún día
    // `profesional` deja de ver notas, revisar si el tope sigue teniendo sentido.
    assert.equal(permisosPorRol("profesional").notas_clinicas, true);
  });
});

describe("duración de la sesión de soporte", () => {
  test("es de una hora, más corta que las 12 h de una sesión normal", () => {
    assert.equal(TTL_SOPORTE_SEG, 3600);
    assert.ok(TTL_SOPORTE_SEG < 60 * 60 * 12);
  });

  test("está expresada en segundos (unidad del maxAge de la cookie)", () => {
    // Se llamaba TTL_SOPORTE_MS y estaba en milisegundos, sin usarse en ningún
    // lado. El nombre ahora dice la unidad para que no se mezcle.
    assert.ok(TTL_SOPORTE_SEG > 0 && TTL_SOPORTE_SEG < 100_000);
  });
});
