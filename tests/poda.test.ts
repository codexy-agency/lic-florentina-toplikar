// Tests de la PODA del almacén de identidad.
//
//   node --test --experimental-strip-types tests/poda.test.ts
//
// Esto borra datos, así que se prueba con cuidado.
//
// El bug que motivó el archivo: los topes eran GLOBALES —500 sesiones y 5000
// entradas de auditoría para toda la plataforma—, así que con veinte clientes
// uno activo deslogueaba a otro y le borraba el rastro de auditoría. Lo segundo
// era peor: la pantalla de Equipo esconde "Actividad reciente" cuando la lista
// viene vacía, así que al cliente afectado le desaparecía la sección sin aviso,
// rompiendo la promesa que sostiene el acceso de soporte.

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  podar,
  SESIONES_POR_TENANT,
  AUDIT_POR_TENANT,
  type AlmacenPodable,
  type AuditPodable,
  type SesionPodable,
} from "../lib/poda.ts";

const TOPES = { sesiones: SESIONES_POR_TENANT, audit: AUDIT_POR_TENANT };

const DIA = 86_400_000;

function sesion(pid: string, i: number, extra: Partial<SesionPodable> = {}): SesionPodable & { id: string; userId: string } {
  return {
    id: `${pid}-s${i}`,
    userId: `u-${pid}`,
    professionalId: pid,
    // Más nuevas primero: i creciente = más vieja.
    creadoEn: new Date(Date.now() - i * 1000).toISOString(),
    ...extra,
  };
}

function entrada(pid: string, i: number): AuditPodable & { id: string; ts: string; accion: string } {
  return {
    id: `${pid}-a${i}`,
    ts: new Date(Date.now() - i * 1000).toISOString(),
    professionalId: pid,
    accion: "login",
  };
}

/** Almacén mínimo con la forma que espera podar(). */
function almacen(sesiones: ReturnType<typeof sesion>[], audit: ReturnType<typeof entrada>[] = [], throttle = {}) {
  return { sesiones, audit, throttle } as unknown as AlmacenPodable;
}

describe("un consultorio no puede desalojar a otro", () => {
  test("cada uno conserva su cupo completo", () => {
    // A genera el doble del tope; B genera diez sesiones tranquilas.
    const a = Array.from({ length: TOPES.sesiones * 2 }, (_, i) => sesion("A", i));
    const b = Array.from({ length: 10 }, (_, i) => sesion("B", i));
    // Intercaladas, como llegarían en la realidad.
    const db = almacen([...a.slice(0, 50), ...b, ...a.slice(50)]);

    podar(db);

    const quedanA = db.sesiones.filter((s) => s.professionalId === "A").length;
    const quedanB = db.sesiones.filter((s) => s.professionalId === "B").length;

    assert.equal(quedanA, TOPES.sesiones, "A tiene que quedar en su tope, no más");
    assert.equal(quedanB, 10, "B NO puede perder ninguna: el ruido de A no es su problema");
  });

  test("lo mismo con la auditoría, que es la que más duele", () => {
    const a = Array.from({ length: TOPES.audit + 500 }, (_, i) => entrada("A", i));
    const b = Array.from({ length: 5 }, (_, i) => entrada("B", i));
    const db = almacen([], [...a, ...b]);

    podar(db);

    const quedanB = db.audit.filter((e) => e.professionalId === "B").length;
    assert.equal(quedanB, 5, "a B no se le puede borrar el rastro por lo que haga A");
    assert.equal(db.audit.filter((e) => e.professionalId === "A").length, TOPES.audit);
  });

  test("se conservan las MÁS RECIENTES, no las primeras que aparecen", () => {
    const db = almacen(Array.from({ length: TOPES.sesiones + 5 }, (_, i) => sesion("A", i)));
    podar(db);
    // La lista viene de más nueva a más vieja: sobreviven las de índice bajo.
    assert.equal(db.sesiones[0].id, "A-s0");
    assert.ok(!db.sesiones.some((s) => s.id === `A-s${TOPES.sesiones + 4}`), "la más vieja se fue");
  });
});

describe("sesiones que ya no sirven", () => {
  test("una revocada no ocupa cupo", () => {
    const db = almacen([
      sesion("A", 1, { revocadaEn: new Date().toISOString() }),
      sesion("A", 2),
    ]);
    podar(db);
    assert.equal(db.sesiones.length, 1);
    assert.equal(db.sesiones[0].id, "A-s2");
  });

  test("una vieja de más de 30 días se va aunque haya lugar", () => {
    const db = almacen([
      sesion("A", 1, { creadoEn: new Date(Date.now() - 45 * DIA).toISOString() }),
      sesion("A", 2),
    ]);
    podar(db);
    assert.equal(db.sesiones.length, 1);
    assert.equal(db.sesiones[0].id, "A-s2");
  });

  test("una sesión de ayer se queda", () => {
    const db = almacen([sesion("A", 1, { creadoEn: new Date(Date.now() - DIA).toISOString() })]);
    podar(db);
    assert.equal(db.sesiones.length, 1);
  });

  test("una fecha ilegible no tumba la poda ni se conserva para siempre", () => {
    const db = almacen([sesion("A", 1, { creadoEn: "no soy una fecha" }), sesion("A", 2)]);
    assert.doesNotThrow(() => podar(db));
    assert.ok(db.sesiones.some((s) => s.id === "A-s2"), "la sana sobrevive");
  });
});

describe("throttle de login", () => {
  test("una entrada bloqueada AHORA se conserva", () => {
    const db = almacen([], [], {
      "pid:ana@x.com": {
        intentos: 8,
        bloqueadoHasta: new Date(Date.now() + 10 * 60_000).toISOString(),
        ultimoIntento: new Date(Date.now() - 60_000).toISOString(),
      },
    });
    podar(db);
    assert.ok(db.throttle["pid:ana@x.com"], "borrarla sería regalar los intentos");
  });

  test("una vencida y vieja se borra", () => {
    const db = almacen([], [], {
      "pid:vieja@x.com": {
        intentos: 3,
        bloqueadoHasta: new Date(Date.now() - 2 * DIA).toISOString(),
        ultimoIntento: new Date(Date.now() - 3 * DIA).toISOString(),
      },
    });
    podar(db);
    assert.equal(db.throttle["pid:vieja@x.com"], undefined);
  });

  test("una reciente sin bloqueo se conserva (todavía cuenta intentos)", () => {
    const db = almacen([], [], {
      "pid:hoy@x.com": { intentos: 2, ultimoIntento: new Date().toISOString() },
    });
    podar(db);
    assert.ok(db.throttle["pid:hoy@x.com"]);
  });
});

describe("casos borde", () => {
  test("un almacén vacío no explota", () => {
    const db = almacen([], []);
    assert.doesNotThrow(() => podar(db));
    assert.deepEqual(db.sesiones, []);
  });

  test("una entrada sin consultorio se conserva: mejor guardar de más que perderla", () => {
    const db = almacen([], [{ id: "x", ts: new Date().toISOString(), accion: "raro" }]);
    podar(db);
    assert.equal(db.audit.length, 1);
  });

  test("los topes por consultorio son holgados de verdad", () => {
    // Si alguien los baja a un número chico, este test lo frena: 200 sesiones y
    // 1000 entradas es lo que hace que un consultorio activo nunca los toque.
    assert.ok(TOPES.sesiones >= 100, "un consultorio con equipo pasa 100 sesiones fácil");
    assert.ok(TOPES.audit >= 500, "con menos, el cliente pierde historial de un mes");
  });
});
