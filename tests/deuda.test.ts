// Tests de la regla de negocio más delicada de la app: qué es DEUDA (`esImpaga`)
// y quién es EL MISMO paciente (`contactoKey`). Ambas viven en `lib/store.ts`.
//
// CÓMO CORRERLO (Node 22+, sin dependencias ni build):
//   node --test --experimental-strip-types tests/deuda.test.ts
//
// Los imports apuntan al .ts con extensión explícita a propósito: Node no
// compila TypeScript solo, hace falta --experimental-strip-types (en Node 23.6+
// ya viene activado por defecto). Sin ese flag el import falla.
//
// ── POR QUÉ ESTE ARCHIVO TIENE UN LOADER (deuda técnica real) ────────────────
// `lib/store.ts` NO se puede importar tal cual desde el runner de Node por dos
// razones que no tienen nada que ver con la lógica de dominio que probamos:
//
//   1. importa `next/headers`, que solo existe dentro del runtime de Next;
//   2. usa imports relativos SIN extensión (`./scheduling/types`), que el
//      resolver ESM de Node no encuentra (ERR_MODULE_NOT_FOUND).
//
// Comprobado a mano: el import directo falla con
//   Error [ERR_MODULE_NOT_FOUND]: Cannot find module '...\lib\scheduling\types'
//
// Solución acá: registramos hooks de módulo (`node:module` register) que stubean
// `next/headers` y le agregan `.ts` a los specifiers relativos. Es una cáscara
// de infraestructura para poder testear DOS FUNCIONES PURAS. La solución de
// fondo es mover `esImpaga`/`contactoKey` a un módulo sin efectos (ej.
// `lib/dominio/deuda.ts`) que `store.ts` importe: hoy la regla de negocio más
// crítica del producto está acoplada a Next y a Supabase.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

import type { Solicitud } from "../lib/store.ts";

// Hooks de resolución, embebidos como data: URL para no tocar ningún otro
// archivo del repo. Corren en el thread de loaders, no en el del test.
const HOOKS = `
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Stub de next/headers: explota si alguien lo llama de verdad. Ninguna de las
// funciones bajo prueba lo usa; solo lo arrastra el import de lib/store.ts.
const STUB = "data:text/javascript," + encodeURIComponent(
  "const boom = () => { throw new Error('next/headers no existe fuera de Next'); };" +
  "export const headers = boom; export const cookies = boom; export const draftMode = boom;"
);

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next/headers") {
    return { url: STUB, shortCircuit: true, format: "module" };
  }
  // ./scheduling/types  ->  ./scheduling/types.ts
  if (specifier.startsWith(".") && !/\\.[cm]?[jt]s$/i.test(specifier)) {
    const base = new URL(specifier, context.parentURL);
    for (const cand of [base.href + ".ts", base.href + "/index.ts"]) {
      if (existsSync(fileURLToPath(cand))) return nextResolve(cand, context);
    }
  }
  return nextResolve(specifier, context);
}
`;

register("data:text/javascript," + encodeURIComponent(HOOKS));

// El import tiene que ser dinámico y posterior al register(): si fuera estático,
// se resolvería antes de que los hooks existan.
const { esImpaga, contactoKey } = (await import(
  new URL("../lib/store.ts", import.meta.url).href
)) as typeof import("../lib/store.ts");

// ── Helpers ─────────────────────────────────────────────────────────────────

const MINUTO = 60 * 1000;
const DIA = 24 * 60 * MINUTO;

/** ISO desplazado respecto de ahora (negativo = pasado). */
function desdeAhora(ms: number): string {
  return new Date(Date.now() + ms).toISOString();
}

/** Turno completo con valores por defecto inocuos; se pisa solo lo que importa. */
function turno(parcial: Partial<Solicitud> = {}): Solicitud {
  return {
    id: "t-1",
    nombre: "Paciente de prueba",
    contacto: "2920411122",
    modalidad: "online",
    precio: 25000,
    preferencia: "",
    motivo: "",
    estado: "realizado",
    creadoEn: desdeAhora(-30 * DIA),
    ...parcial,
  };
}

// ── esImpaga: la definición canónica de DEUDA ───────────────────────────────

describe("esImpaga() — definición canónica de deuda", () => {
  it("sin pagar + realizado ⇒ ES deuda", () => {
    assert.equal(esImpaga(turno({ estado: "realizado", pagado: false })), true);
  });

  it("sin pagar + realizado, con `pagado` undefined (turnos viejos) ⇒ ES deuda", () => {
    const t = turno({ estado: "realizado" });
    assert.equal(t.pagado, undefined, "el fixture tiene que dejar `pagado` sin definir");
    assert.equal(esImpaga(t), true);
  });

  it("sin pagar + confirmado con fecha PASADA ⇒ ES deuda (di la sesión y no la marqué)", () => {
    const t = turno({ estado: "confirmado", pagado: false, startsAt: desdeAhora(-2 * DIA) });
    assert.equal(esImpaga(t), true);
  });

  it("sin pagar + confirmado con fecha pasada por minutos ⇒ ES deuda", () => {
    const t = turno({ estado: "confirmado", pagado: false, startsAt: desdeAhora(-5 * MINUTO) });
    assert.equal(esImpaga(t), true);
  });

  it("sin pagar + confirmado a FUTURO ⇒ NO es deuda", () => {
    const t = turno({ estado: "confirmado", pagado: false, startsAt: desdeAhora(3 * DIA) });
    assert.equal(esImpaga(t), false);
  });

  it("sin pagar + confirmado dentro de un rato ⇒ todavía NO es deuda", () => {
    const t = turno({ estado: "confirmado", pagado: false, startsAt: desdeAhora(5 * MINUTO) });
    assert.equal(esImpaga(t), false);
  });

  it("pagado + realizado ⇒ NO es deuda", () => {
    assert.equal(esImpaga(turno({ estado: "realizado", pagado: true })), false);
  });

  it("pagado + confirmado vencido ⇒ NO es deuda (pagó por adelantado)", () => {
    const t = turno({ estado: "confirmado", pagado: true, startsAt: desdeAhora(-7 * DIA) });
    assert.equal(esImpaga(t), false);
  });

  it("pendiente ⇒ NO es deuda, ni siquiera con fecha vencida", () => {
    assert.equal(esImpaga(turno({ estado: "pendiente", pagado: false })), false);
    const vencido = turno({ estado: "pendiente", pagado: false, startsAt: desdeAhora(-10 * DIA) });
    assert.equal(esImpaga(vencido), false);
  });

  it("rechazado ⇒ NO es deuda, ni siquiera con fecha vencida", () => {
    assert.equal(esImpaga(turno({ estado: "rechazado", pagado: false })), false);
    const vencido = turno({ estado: "rechazado", pagado: false, startsAt: desdeAhora(-10 * DIA) });
    assert.equal(esImpaga(vencido), false);
  });

  it("no_asistio impago ⇒ NO es deuda (la ausencia no se cobra, HOY)", () => {
    // Documenta el comportamiento actual: `esImpaga` solo mira `realizado` y
    // `confirmado` vencido. Si el consultorio decide cobrar las ausencias, este
    // test tiene que fallar y hay que cambiar la regla a propósito, no de rebote.
    const t = turno({ estado: "no_asistio", pagado: false, startsAt: desdeAhora(-1 * DIA) });
    assert.equal(esImpaga(t), false);
  });

  it("confirmado SIN startsAt (solo preferencia horaria) ⇒ nunca es deuda", () => {
    // Sin fecha no hay forma de saber si la sesión ocurrió: la regla es fail-soft.
    const t = turno({ estado: "confirmado", pagado: false, startsAt: undefined });
    assert.equal(esImpaga(t), false);
  });

  it("confirmado con startsAt basura ⇒ NO es deuda (NaN < now es false)", () => {
    // Hallazgo: una fecha corrupta hace desaparecer la deuda en silencio.
    const t = turno({ estado: "confirmado", pagado: false, startsAt: "no-es-una-fecha" });
    assert.equal(Number.isNaN(new Date(t.startsAt!).getTime()), true);
    assert.equal(esImpaga(t), false);
  });

  it("realizado NO necesita startsAt para ser deuda", () => {
    // Turno cargado a mano sin slot: si se dio y no se pagó, se debe igual.
    assert.equal(esImpaga(turno({ estado: "realizado", pagado: false, startsAt: undefined })), true);
  });

  it("ciclo de vida completo: pendiente → confirmado futuro → vencido → realizado → pagado", () => {
    const t = turno({ estado: "pendiente", pagado: false, startsAt: desdeAhora(2 * DIA) });
    assert.equal(esImpaga(t), false, "pendiente a futuro no es deuda");

    t.estado = "confirmado";
    assert.equal(esImpaga(t), false, "confirmado a futuro tampoco");

    t.startsAt = desdeAhora(-1 * MINUTO);
    assert.equal(esImpaga(t), true, "al vencer la fecha, pasa a ser deuda");

    t.estado = "realizado";
    assert.equal(esImpaga(t), true, "marcado como realizado sigue siendo deuda");

    t.pagado = true;
    assert.equal(esImpaga(t), false, "cobrado deja de ser deuda");
  });

  it("no muta el turno que recibe", () => {
    const t = turno({ estado: "confirmado", pagado: false, startsAt: desdeAhora(-1 * DIA) });
    const copia = structuredClone(t);
    esImpaga(t);
    assert.deepEqual(t, copia);
  });
});

// ── contactoKey: quién es EL MISMO paciente ─────────────────────────────────

describe("contactoKey() — identidad del paciente", () => {
  it("email: pasa tal cual, en minúsculas y sin espacios sobrantes", () => {
    assert.equal(contactoKey("Ana.Perez@Ejemplo.COM"), "ana.perez@ejemplo.com");
    assert.equal(contactoKey("  ana.perez@ejemplo.com  "), "ana.perez@ejemplo.com");
  });

  it("email con dígitos: NO se lo trata como teléfono", () => {
    assert.equal(contactoKey("paciente2920411122@gmail.com"), "paciente2920411122@gmail.com");
  });

  it("el mismo celular argentino en 3 formatos da LA MISMA clave", () => {
    const esperado = "2920411122";
    assert.equal(contactoKey("+54 9 2920 41 1122"), esperado);
    assert.equal(contactoKey("2920411122"), esperado);
    assert.equal(contactoKey("02920-41-1122"), esperado);
  });

  it("tolera paréntesis, puntos, barras y el prefijo internacional 0054", () => {
    const esperado = "2920411122";
    assert.equal(contactoKey("(02920) 41-1122"), esperado);
    assert.equal(contactoKey("+54 (9) 2920/41.1122"), esperado);
    assert.equal(contactoKey("0054 9 2920 41 1122"), esperado);
    assert.equal(contactoKey("54 9 2920 411122"), esperado);
  });

  it("celular de CABA: internacional, con 0 y sin nada dan la misma clave", () => {
    const esperado = "1141234567";
    assert.equal(contactoKey("+54 9 11 4123 4567"), esperado);
    assert.equal(contactoKey("011 4123-4567"), esperado);
    assert.equal(contactoKey("11 4123 4567"), esperado);
  });

  it("vacío o solo espacios ⇒ clave vacía (contacto sin identidad)", () => {
    assert.equal(contactoKey(""), "");
    assert.equal(contactoKey("   "), "");
    assert.equal(contactoKey(undefined as unknown as string), "");
  });

  it("texto sin dígitos ⇒ cae al texto normalizado, no a vacío", () => {
    // Importa: dos fichas con el mismo texto libre siguen matcheando entre sí.
    assert.equal(contactoKey("  Instagram: @Flor  "), "instagram: @flor");
    assert.equal(contactoKey("SIN DATOS"), "sin datos");
  });

  it("menos de 8 dígitos ⇒ se usan todos los dígitos, sin recortar", () => {
    assert.equal(contactoKey("41-1122"), "411122");
    assert.equal(contactoKey("1234567"), "1234567");
  });

  it("exactamente 8 dígitos ⇒ entra al recorte pero queda igual", () => {
    assert.equal(contactoKey("4112-2334"), "41122334");
  });

  // ── Problemas conocidos (ADR-0005). Estos tests NO piden que se arregle:
  //    congelan el comportamiento actual para que un cambio de regla sea a
  //    propósito y con migración de datos, no un efecto colateral. ──────────

  it("PROBLEMA CONOCIDO: dos países distintos con los mismos últimos 10 dígitos COLISIONAN", () => {
    const argentino = "+54 9 2920 41 1122"; // Argentina
    const estadounidense = "+1 292 041 1122"; // EE.UU., persona distinta
    assert.notEqual(argentino.replace(/\D/g, ""), estadounidense.replace(/\D/g, ""));
    assert.equal(
      contactoKey(argentino),
      contactoKey(estadounidense),
      "hoy se fusionan en una sola ficha (= se mezclan dos historias clínicas)"
    );
  });

  it("PROBLEMA CONOCIDO: el prefijo local 15 parte al MISMO paciente en dos fichas", () => {
    // "15 4123-4567" es como un argentino escribe su celular localmente; el
    // internacional del mismo número es "+54 9 11 4123 4567".
    const internacional = contactoKey("+54 9 11 4123 4567");
    const local15 = contactoKey("15 4123-4567");
    assert.equal(internacional, "1141234567");
    assert.equal(local15, "1541234567");
    assert.notEqual(local15, internacional, "misma persona, dos claves ⇒ paciente duplicado");
  });

  it("PROBLEMA CONOCIDO: la misma persona por email y por teléfono son dos pacientes", () => {
    assert.notEqual(contactoKey("ana@ejemplo.com"), contactoKey("+54 9 2920 41 1122"));
  });
});
