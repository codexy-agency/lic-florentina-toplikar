// Tests de aislamiento entre consultorios (multi-tenant).
//
// Si algo de acá se rompe, se filtran historias clínicas: el tenant resuelto
// define QUÉ paciente se lee y se escribe. Por eso los casos negativos
// (fail-closed) son tan importantes como los positivos.
//
// CÓMO CORRERLO (Node 22+, sin dependencias ni build):
//   node --test --experimental-strip-types tests/tenant.test.ts
//
// El import trae el .ts con extensión explícita a propósito: el runner nativo
// necesita --experimental-strip-types para sacarle los tipos al vuelo.

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import {
  TENANT_HEADER,
  esUuid,
  esMultiTenant,
  tenantPorDefecto,
  normalizarHost,
  resolveTenantFromHost,
  esTenantConocido,
} from "../lib/tenant.ts";

// UUIDs de juguete, pero con forma real (el código valida el formato).
const ANA = "11111111-1111-4111-8111-111111111111";
const BETO = "22222222-2222-4222-8222-222222222222";
const LEGACY = "33333333-3333-4333-8333-333333333333";
const AJENO = "44444444-4444-4444-4444-444444444444";

const VARS_ENV = ["TENANTS", "PLATFORM_DOMAIN", "PROFESSIONAL_ID"] as const;

let envOriginal: Record<string, string | undefined> = {};

/** Deja el env en un estado conocido antes de cada test (las funciones del
 *  módulo leen process.env en cada llamada, así que no alcanza con setearlo
 *  una sola vez: hay que limpiarlo o un test contamina al siguiente). */
beforeEach(() => {
  envOriginal = {};
  for (const k of VARS_ENV) {
    envOriginal[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of VARS_ENV) {
    const v = envOriginal[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

/** Corre `fn` tragándose los console.error del módulo y devuelve lo que se
 *  logueó, para poder afirmar que una entrada mala se descarta con aviso. */
function capturandoErrores<T>(fn: () => T): { valor: T; errores: string[] } {
  const original = console.error;
  const errores: string[] = [];
  console.error = (...args: unknown[]) => {
    errores.push(args.map(String).join(" "));
  };
  try {
    return { valor: fn(), errores };
  } finally {
    console.error = original;
  }
}

describe("TENANT_HEADER", () => {
  it("no cambia de nombre (el proxy lo pisa/borra en cada request)", () => {
    // Si alguien renombra la constante y se olvida del proxy, el header viejo
    // deja de sanitizarse y el cliente lo puede falsificar.
    assert.equal(TENANT_HEADER, "x-tenant-pid");
  });
});

describe("esUuid", () => {
  it("acepta un UUID bien formado, en mayúsculas o minúsculas", () => {
    assert.equal(esUuid(ANA), true);
    assert.equal(esUuid(ANA.toUpperCase()), true);
  });

  it("rechaza nulo, vacío, texto suelto y UUID mal formado", () => {
    assert.equal(esUuid(null), false);
    assert.equal(esUuid(undefined), false);
    assert.equal(esUuid(""), false);
    assert.equal(esUuid("ana"), false);
    assert.equal(esUuid("11111111-1111-4111-8111-11111111111"), false); // un dígito de menos
    assert.equal(esUuid("11111111-1111-4111-8111-111111111111x"), false); // basura al final
    assert.equal(esUuid("gggggggg-1111-4111-8111-111111111111"), false); // no es hex
    assert.equal(esUuid(" " + ANA), false); // no trimea
  });
});

describe("normalizarHost", () => {
  it("pasa a minúsculas y saca el puerto", () => {
    assert.equal(normalizarHost("Consultorio.Ana.COM:3000"), "consultorio.ana.com");
    assert.equal(normalizarHost("ANA.COM:443"), "ana.com");
  });

  it("saca el punto final (FQDN absoluto) y los espacios", () => {
    assert.equal(normalizarHost("ana.com."), "ana.com");
    assert.equal(normalizarHost("  ana.com  "), "ana.com");
    assert.equal(normalizarHost("  ANA.com.:8080  "), "ana.com");
  });

  it("si viene una lista (X-Forwarded-Host), se queda con el primero", () => {
    assert.equal(normalizarHost("ana.com, evil.com"), "ana.com");
  });

  it("normaliza unicode a punycode así no evade el mapa", () => {
    assert.equal(normalizarHost("ñandu.com"), "xn--andu-fqa.com");
    assert.equal(normalizarHost("ÑANDU.com"), "xn--andu-fqa.com");
  });

  it("devuelve vacío con basura o falta de host", () => {
    assert.equal(normalizarHost(null), "");
    assert.equal(normalizarHost(undefined), "");
    assert.equal(normalizarHost(""), "");
    assert.equal(normalizarHost("   "), "");
    assert.equal(normalizarHost("no es un host"), ""); // espacios en el medio
    assert.equal(normalizarHost("a_b.com"), ""); // guión bajo no es hostname válido
    assert.equal(normalizarHost("[::1]:3000"), ""); // IPv6 literal: fuera
  });

  it("no se deja engañar por un path o un esquema pegado al host", () => {
    // Lo importante es que nunca devuelva algo que contenga el path.
    assert.equal(normalizarHost("ana.com/../beto.com"), "ana.com");
    assert.equal(normalizarHost("ana.com/admin/pacientes"), "ana.com");
    assert.notEqual(normalizarHost("http://ana.com"), "ana.com");
  });

  it("decodifica el percent-encoding así no se cuela un host disfrazado", () => {
    // Si esto se rompiera, "ana%2ecom" podría no matchear el mapa (o peor,
    // matchear algo distinto de lo que el usuario ve en la barra).
    assert.equal(normalizarHost("ana%2ecom"), "ana.com");
  });
});

describe("modo SINGLE-tenant (sin TENANTS)", () => {
  it("esMultiTenant es false y devuelve el tenant por defecto", () => {
    process.env.PROFESSIONAL_ID = LEGACY;
    assert.equal(esMultiTenant(), false);
    assert.equal(tenantPorDefecto(), LEGACY);
  });

  it("cualquier host cae en el tenant por defecto (comportamiento histórico)", () => {
    process.env.PROFESSIONAL_ID = LEGACY;
    for (const host of ["ana.com", "localhost:3000", "lo-que-sea.vercel.app", "no  es host", "", null]) {
      assert.equal(resolveTenantFromHost(host), LEGACY, `falló con host ${JSON.stringify(host)}`);
    }
  });

  it("TENANTS vacío o solo espacios sigue siendo single-tenant", () => {
    process.env.PROFESSIONAL_ID = LEGACY;
    process.env.TENANTS = "   ";
    assert.equal(esMultiTenant(), false);
    assert.equal(resolveTenantFromHost("ana.com"), LEGACY);
  });

  it("sin PROFESSIONAL_ID no resuelve nada (null, no undefined ni vacío)", () => {
    assert.equal(tenantPorDefecto(), undefined);
    assert.equal(resolveTenantFromHost("ana.com"), null);
  });

  it("normaliza el PROFESSIONAL_ID (espacios y mayúsculas)", () => {
    process.env.PROFESSIONAL_ID = `  ${ANA.toUpperCase()}  `;
    assert.equal(tenantPorDefecto(), ANA);
    assert.equal(resolveTenantFromHost("ana.com"), ANA);
  });
});

describe("modo MULTI-tenant: match exacto por host", () => {
  beforeEach(() => {
    process.env.TENANTS = JSON.stringify({ "ana.com": ANA, "beto.com.ar": BETO });
    // Ojo: hay un PROFESSIONAL_ID seteado a propósito. Un host desconocido
    // NUNCA debe degradar a este valor: eso sería servir la historia clínica
    // de otra persona.
    process.env.PROFESSIONAL_ID = LEGACY;
  });

  it("esMultiTenant se activa apenas hay una entrada válida", () => {
    assert.equal(esMultiTenant(), true);
  });

  it("resuelve el host mapeado y no confunde un consultorio con el otro", () => {
    assert.equal(resolveTenantFromHost("ana.com"), ANA);
    assert.equal(resolveTenantFromHost("beto.com.ar"), BETO);
    assert.notEqual(resolveTenantFromHost("ana.com"), resolveTenantFromHost("beto.com.ar"));
  });

  it("matchea igual con mayúsculas, puerto y punto final", () => {
    assert.equal(resolveTenantFromHost("ANA.com:3000"), ANA);
    assert.equal(resolveTenantFromHost("ana.com."), ANA);
    assert.equal(resolveTenantFromHost(" Ana.Com. "), ANA);
  });

  it("FAIL-CLOSED: host no mapeado devuelve null, jamás el tenant por defecto", () => {
    for (const host of [
      "otro.com",
      "ana.com.evil.com", // sufijo pegado
      "evilana.com", // no es subdominio, es otro dominio
      "www.ana.com", // subdominio no declarado
      "localhost",
      "",
      "   ",
      null,
    ]) {
      const r = resolveTenantFromHost(host);
      assert.equal(r, null, `host ${JSON.stringify(host)} debería ser null y dio ${JSON.stringify(r)}`);
      assert.notEqual(r, LEGACY);
    }
  });

  it("un host que es una propiedad de Object no resuelve (nada de prototype pollution)", () => {
    // Si el mapa se construyera con {} en vez de Object.create(null),
    // map["constructor"] sería truthy y el proxy dejaría pasar el request.
    for (const host of ["constructor", "tostring", "valueof", "hasownproperty"]) {
      assert.equal(resolveTenantFromHost(host), null, `'${host}' no debería resolver`);
    }
  });
});

describe("modo MULTI-tenant: slug bajo el dominio de la plataforma", () => {
  beforeEach(() => {
    process.env.TENANTS = JSON.stringify({ ana: ANA, "beto.com.ar": BETO });
    process.env.PLATFORM_DOMAIN = "codexy.app";
    process.env.PROFESSIONAL_ID = LEGACY;
  });

  it("<slug>.<PLATFORM_DOMAIN> resuelve al tenant del slug", () => {
    assert.equal(resolveTenantFromHost("ana.codexy.app"), ANA);
    assert.equal(resolveTenantFromHost("ANA.Codexy.App.:443"), ANA);
  });

  it("LA COLISIÓN: 'ana.otrodominio.com' NO resuelve al tenant 'ana'", () => {
    // Este es el bug que casi filtra datos: si el slug se buscara sin atarlo al
    // dominio de la plataforma, cualquiera que apunte un dominio propio a este
    // deploy se llevaría la historia clínica de Ana.
    const r = resolveTenantFromHost("ana.otrodominio.com");
    assert.equal(r, null);
    assert.notEqual(r, ANA);
  });

  it("dos labels ('a.b.codexy.app') NO resuelve", () => {
    process.env.TENANTS = JSON.stringify({ ana: ANA, "b.codexy.app": BETO });
    assert.equal(resolveTenantFromHost("a.b.codexy.app"), null);
    assert.equal(resolveTenantFromHost("x.ana.codexy.app"), null);
  });

  it("el dominio de la plataforma pelado no resuelve (no hay slug)", () => {
    assert.equal(resolveTenantFromHost("codexy.app"), null);
  });

  it("un slug inexistente bajo la plataforma devuelve null", () => {
    assert.equal(resolveTenantFromHost("nadie.codexy.app"), null);
  });

  it("sin PLATFORM_DOMAIN el slug no se acepta en ningún lado", () => {
    delete process.env.PLATFORM_DOMAIN;
    assert.equal(resolveTenantFromHost("ana.codexy.app"), null);
    assert.equal(resolveTenantFromHost("ana"), ANA); // solo como host exacto del mapa
  });

  it("PLATFORM_DOMAIN se normaliza (mayúsculas, punto suelto)", () => {
    process.env.PLATFORM_DOMAIN = "  .Codexy.App.  ";
    assert.equal(resolveTenantFromHost("ana.codexy.app"), ANA);
  });

  it("el host exacto le gana al slug cuando ambos están mapeados", () => {
    process.env.TENANTS = JSON.stringify({ ana: ANA, "ana.codexy.app": BETO });
    assert.equal(resolveTenantFromHost("ana.codexy.app"), BETO);
  });
});

describe("TENANTS inválido: se descarta, no se inventan tenants fantasma", () => {
  it("JSON roto se ignora entero (y avisa por consola)", () => {
    process.env.TENANTS = "{ esto no es json";
    process.env.PROFESSIONAL_ID = LEGACY;
    const { errores } = capturandoErrores(() => {
      assert.equal(esMultiTenant(), false);
      // OJO (comportamiento real, ver hallazgos): con TENANTS roto el sistema
      // degrada a single-tenant y sirve PROFESSIONAL_ID, no hace fail-closed.
      assert.equal(resolveTenantFromHost("ana.com"), LEGACY);
    });
    assert.ok(
      errores.some((e) => e.includes("TENANTS")),
      "debería avisar que TENANTS no es JSON válido",
    );
  });

  it("valores que no son UUID se descartan entrada por entrada", () => {
    process.env.TENANTS = JSON.stringify({
      "ana.com": ANA,
      "trucho.com": "no-soy-un-uuid",
      "vacio.com": "",
      "nulo.com": null,
      "numero.com": 42,
      "objeto.com": { pid: ANA },
      "casi.com": "11111111-1111-4111-8111-11111111111",
    });
    const { errores } = capturandoErrores(() => {
      assert.equal(resolveTenantFromHost("ana.com"), ANA); // la buena sobrevive
      for (const host of ["trucho.com", "vacio.com", "nulo.com", "numero.com", "objeto.com", "casi.com"]) {
        assert.equal(resolveTenantFromHost(host), null, `${host} no debería existir como tenant`);
      }
    });
    assert.ok(errores.length >= 6, `esperaba un aviso por cada entrada mala, hubo ${errores.length}`);
  });

  it("si TODAS las entradas son inválidas no hay modo multi (mapa vacío)", () => {
    process.env.TENANTS = JSON.stringify({ "ana.com": "cualquier-cosa" });
    process.env.PROFESSIONAL_ID = LEGACY;
    capturandoErrores(() => {
      assert.equal(esMultiTenant(), false);
    });
  });

  it("un JSON que no es objeto (array, string, número, null) se ignora", () => {
    process.env.PROFESSIONAL_ID = LEGACY;
    // El array de strings parsea como objeto, pero sus valores no son UUID: se
    // descartan igual. Los escalares ni siquiera llegan a recorrerse.
    for (const raw of ['["ana.com"]', '"ana.com"', "42", "null", "true"]) {
      process.env.TENANTS = raw;
      capturandoErrores(() => {
        assert.equal(esMultiTenant(), false, `TENANTS=${raw} no debería activar multi`);
        assert.equal(resolveTenantFromHost("ana.com"), LEGACY, `TENANTS=${raw} debería degradar a single`);
      });
    }
  });

  it("HALLAZGO: un array de UUIDs prende el modo multi y deja el deploy muerto", () => {
    // Escribir TENANTS como array (error de tipeo razonable) NO se rechaza:
    // Object.entries del array da claves "0","1"… con valores UUID válidos, así
    // que esMultiTenant() se prende. No filtra datos (queda todo fail-closed),
    // pero ningún host real resuelve nunca: 404 en todos lados.
    // Este test fija el comportamiento actual: si se agrega Array.isArray, hay
    // que actualizarlo (pasaría a degradar a single-tenant).
    process.env.TENANTS = JSON.stringify([ANA, BETO]);
    process.env.PROFESSIONAL_ID = LEGACY;
    assert.equal(esMultiTenant(), true);
    assert.equal(resolveTenantFromHost("ana.com"), null);
    // Ni siquiera las claves numéricas son alcanzables: "0" se normaliza a
    // "0.0.0.0" (la URL lo lee como IPv4), así que nada matchea.
    assert.equal(normalizarHost("0"), "0.0.0.0");
    assert.equal(resolveTenantFromHost("0"), null);
  });

  it("las claves del mapa se normalizan y los UUID quedan en minúscula", () => {
    process.env.TENANTS = JSON.stringify({ "  ANA.COM.  ": ANA.toUpperCase() });
    assert.equal(resolveTenantFromHost("ana.com"), ANA);
    assert.equal(resolveTenantFromHost("ANA.com:3000"), ANA);
  });
});

describe("esTenantConocido", () => {
  beforeEach(() => {
    process.env.TENANTS = JSON.stringify({ "ana.com": ANA, "beto.com.ar": BETO });
    process.env.PROFESSIONAL_ID = LEGACY;
  });

  it("acepta un pid presente en el mapa (sin importar mayúsculas)", () => {
    assert.equal(esTenantConocido(ANA), true);
    assert.equal(esTenantConocido(BETO), true);
    assert.equal(esTenantConocido(ANA.toUpperCase()), true);
  });

  it("rechaza un UUID válido que no pertenece a este deploy", () => {
    // Un atacante que adivine/robe un UUID de otro deploy no entra.
    assert.equal(esTenantConocido(AJENO), false);
  });

  it("rechaza todo lo que no sea UUID", () => {
    for (const v of [null, undefined, "", "   ", "ana", "ana.com", LEGACY.slice(0, 10), "'; drop table--"]) {
      assert.equal(esTenantConocido(v), false, `${JSON.stringify(v)} no debería ser un tenant conocido`);
    }
  });

  it("en single-tenant, el PROFESSIONAL_ID por defecto sí es conocido", () => {
    delete process.env.TENANTS;
    assert.equal(esTenantConocido(LEGACY), true);
    assert.equal(esTenantConocido(AJENO), false);
  });

  it("sin PROFESSIONAL_ID ni TENANTS no hay tenant conocido alguno", () => {
    delete process.env.TENANTS;
    delete process.env.PROFESSIONAL_ID;
    assert.equal(esTenantConocido(LEGACY), false);
    assert.equal(esTenantConocido(ANA), false);
  });
});
