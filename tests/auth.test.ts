// Tests de autenticación: hashing de contraseñas y permisos por rol.
//
// Corren con el runner nativo de Node, sin dependencias extra:
//
//   node --test --experimental-strip-types tests/auth.test.ts
//
// IMPORTANTE: los imports apuntan a los .ts con extensión explícita a propósito.
// Node no compila TypeScript solo: hace falta --experimental-strip-types (Node 22+)
// para que pueda cargar `../lib/passwords.ts` sin build previo. Sin ese flag el
// import falla. En Node 23.6+ el flag ya viene activado por defecto.
//
// Nota sobre velocidad: PBKDF2 está configurado en 600.000 iteraciones (OWASP),
// así que CADA hash/verify tarda ~1s. Por eso los hashes caros se calculan una
// sola vez en el `before` y se reutilizan.

import { before, describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  DUMMY_HASH,
  ITERACIONES,
  hashPassword,
  necesitaRehash,
  validarPassword,
  verifyPassword,
} from "../lib/passwords.ts";

import {
  PERMISOS,
  type Permiso,
  type Permisos,
  esRolValido,
  normalizarPermisos,
  permisosPorRol,
  tienePermiso,
} from "../lib/permisos.ts";

const CLAVE = "TordilloVerde42!";
const CLAVE_PARECIDA = "TordilloVerde42"; // sin el "!"

describe("passwords: hashPassword / verifyPassword", () => {
  let hash = "";
  let hashBis = "";

  before(async () => {
    // Dos hashes de LA MISMA clave, para chequear que el salt sea aleatorio.
    hash = await hashPassword(CLAVE);
    hashBis = await hashPassword(CLAVE);
  });

  test("el hash tiene el formato autodescriptivo pbkdf2$sha256$<iters>$<salt>$<hash>", () => {
    const partes = hash.split("$");
    assert.equal(partes.length, 5, `formato inesperado: ${hash}`);
    assert.equal(partes[0], "pbkdf2");
    assert.equal(partes[1], "sha256");
    assert.equal(Number(partes[2]), ITERACIONES);
    // salt de 16 bytes y clave derivada de 32 bytes, en base64.
    assert.equal(Buffer.from(partes[3], "base64").length, 16);
    assert.equal(Buffer.from(partes[4], "base64").length, 32);
    // La contraseña en claro NO puede quedar en el string almacenado.
    assert.ok(!hash.includes(CLAVE));
  });

  test("la clave correcta verifica contra su propio hash", async () => {
    assert.equal(await verifyPassword(CLAVE, hash), true);
  });

  test("una clave distinta NO verifica (ni siquiera una que difiere en un caracter)", async () => {
    assert.equal(await verifyPassword(CLAVE_PARECIDA, hash), false);
    assert.equal(await verifyPassword("", hash), false);
  });

  test("dos hashes de la misma clave son DISTINTOS (salt aleatorio) pero ambos verifican", async () => {
    assert.notEqual(hash, hashBis, "salt repetido: el hash sería determinístico");
    const saltA = hash.split("$")[3];
    const saltB = hashBis.split("$")[3];
    assert.notEqual(saltA, saltB, "el salt tiene que ser aleatorio por hash");
    assert.equal(await verifyPassword(CLAVE, hashBis), true);
  });

  test("un hash corrupto, vacío o con formato raro devuelve false y NO lanza", async () => {
    const basura = [
      "",
      "     ",
      "no-es-un-hash",
      "pbkdf2$sha256$600000", // faltan campos
      "pbkdf2$sha256$600000$abc$def$extra", // sobra un campo
      "bcrypt$sha256$600000$YWJj$ZGVm", // algoritmo que no manejamos
      "pbkdf2$sha512$600000$YWJj$ZGVm", // hash que no manejamos
      "pbkdf2$sha256$cero$YWJj$ZGVm", // iteraciones no numéricas
      "pbkdf2$sha256$10$YWJj$ZGVm", // iteraciones por debajo del piso (1000)
      "pbkdf2$sha256$99000000$YWJj$ZGVm", // iteraciones absurdas (DoS)
      "pbkdf2$sha256$600000$!!!no-base64!!!$ZGVm", // base64 inválido → atob lanza
    ];
    for (const malo of basura) {
      // Si verifyPassword lanzara, el test explota acá: eso es justamente lo que queremos detectar.
      const r = await verifyPassword(CLAVE, malo);
      assert.equal(r, false, `debería rechazar sin lanzar: ${JSON.stringify(malo)}`);
    }
    // @ts-expect-error: la firma dice string, pero la base puede devolver null.
    assert.equal(await verifyPassword(CLAVE, null), false);
  });

  test("si le tocan el salt o el hash guardado, deja de verificar", async () => {
    const [algo, h, iters, salt, digest] = hash.split("$");

    // Salt cambiado (mismo largo, otro contenido).
    const otroSalt = Buffer.from(Buffer.from(salt, "base64").map((b) => b ^ 0xff)).toString("base64");
    assert.equal(await verifyPassword(CLAVE, [algo, h, iters, otroSalt, digest].join("$")), false);

    // Digest truncado.
    const cortado = Buffer.from(Buffer.from(digest, "base64").subarray(0, 31)).toString("base64");
    assert.equal(await verifyPassword(CLAVE, [algo, h, iters, salt, cortado].join("$")), false);
  });

  test("el DUMMY_HASH (señuelo anti-enumeración) nunca valida una clave real", async () => {
    assert.equal(DUMMY_HASH.split("$").length, 5);
    assert.equal(await verifyPassword(CLAVE, DUMMY_HASH), false);
  });

  test("el AUTH_PEPPER entra en la derivación: cambiarlo invalida los hashes viejos", async () => {
    const previo = process.env.AUTH_PEPPER;
    try {
      process.env.AUTH_PEPPER = "pimienta-uno";
      const conPimienta = await hashPassword(CLAVE);
      assert.equal(await verifyPassword(CLAVE, conPimienta), true);

      process.env.AUTH_PEPPER = "pimienta-dos";
      assert.equal(
        await verifyPassword(CLAVE, conPimienta),
        false,
        "el pepper no está entrando en la derivación: un dump de la base alcanzaría"
      );
    } finally {
      if (previo === undefined) delete process.env.AUTH_PEPPER;
      else process.env.AUTH_PEPPER = previo;
    }
  });
});

describe("passwords: necesitaRehash", () => {
  test("un hash con las iteraciones actuales NO necesita rehash", () => {
    assert.equal(necesitaRehash(`pbkdf2$sha256$${ITERACIONES}$YWJj$ZGVm`), false);
    assert.equal(necesitaRehash(DUMMY_HASH), false);
  });

  test("un hash con MENOS iteraciones que las actuales SÍ necesita rehash", () => {
    assert.equal(necesitaRehash(`pbkdf2$sha256$${ITERACIONES - 1}$YWJj$ZGVm`), true);
    assert.equal(necesitaRehash("pbkdf2$sha256$100000$YWJj$ZGVm"), true);
    assert.equal(necesitaRehash("pbkdf2$sha256$1000$YWJj$ZGVm"), true);
  });

  test("un hash con MÁS iteraciones (subieron el costo y volvimos atrás) no se degrada", () => {
    assert.equal(necesitaRehash(`pbkdf2$sha256$${ITERACIONES + 100_000}$YWJj$ZGVm`), false);
  });

  test("un hash roto o vacío necesita rehash (no lo damos por bueno)", () => {
    assert.equal(necesitaRehash(""), true);
    assert.equal(necesitaRehash("cualquier-cosa"), true);
    assert.equal(necesitaRehash("pbkdf2$sha256$abc$YWJj$ZGVm"), true);
    // @ts-expect-error: la base puede devolver null en la columna.
    assert.equal(necesitaRehash(null), true);
  });

  test("un hash recién generado no pide rehash", async () => {
    assert.equal(necesitaRehash(await hashPassword(CLAVE)), false);
  });
});

describe("passwords: validarPassword", () => {
  test("rechaza las cortas (menos de 10 caracteres)", () => {
    for (const corta of ["", "a", "abc123", "Ab1!x", "123456789"]) {
      const motivo = validarPassword(corta);
      assert.ok(motivo, `debería rechazar ${JSON.stringify(corta)}`);
      assert.match(motivo as string, /al menos 10/i);
    }
    // 10 justo NO es corta (el corte es < 10).
    assert.equal(validarPassword("abcdefghij"), null);
  });

  test("rechaza las absurdamente largas (más de 200)", () => {
    assert.equal(validarPassword("x".repeat(200)), null);
    const motivo = validarPassword("x".repeat(201));
    assert.ok(motivo);
    assert.match(motivo as string, /demasiado larga/i);
  });

  test("rechaza las previsibles de la lista, tal cual y embebidas", () => {
    const previsibles = [
      "contraseña",
      "password12",
      "1234567890",
      "qwertyuiop",
      "admin123456",
      "paulina2026",
      "Psicologia2026",
      "Consultorio-2026!",
      "bienvenido!!",
      "MiPasswordSegura", // contiene "password"
      "QWERTY-arriba", // el chequeo es case-insensitive
    ];
    for (const p of previsibles) {
      const motivo = validarPassword(p);
      assert.ok(motivo, `debería rechazar ${JSON.stringify(p)}`);
      assert.match(motivo as string, /previsible/i);
    }
  });

  test("acepta una contraseña buena (devuelve null)", () => {
    for (const buena of [CLAVE, "mate-amargo-en-la-terraza", "Xilofono#Trueno77"]) {
      assert.equal(validarPassword(buena), null, `debería aceptar ${JSON.stringify(buena)}`);
    }
  });

  test("una contraseña que valida se puede hashear y verificar (el flujo completo cierra)", async () => {
    const nueva = "Bandoneon-Gris-91";
    assert.equal(validarPassword(nueva), null);
    const h = await hashPassword(nueva);
    assert.equal(await verifyPassword(nueva, h), true);
    assert.equal(await verifyPassword(nueva.toLowerCase(), h), false);
  });
});

describe("permisos: permisosPorRol", () => {
  test("owner tiene TODO en true", () => {
    const p = permisosPorRol("owner");
    for (const permiso of PERMISOS) {
      assert.equal(p[permiso], true, `owner debería tener ${permiso}`);
    }
    assert.equal(Object.keys(p).length, PERMISOS.length);
  });

  test("asistente NO tiene notas_clinicas ni finanzas (datos de salud, Ley 25.326)", () => {
    const p = permisosPorRol("asistente");
    assert.equal(p.notas_clinicas, false, "una secretaria no lee la historia clínica");
    assert.equal(p.finanzas, false);
    // Lo que sí necesita para trabajar:
    assert.equal(p.agenda, true);
    assert.equal(p.pacientes, true, "necesita los datos de contacto para agendar");
    // Y nada de administración:
    assert.equal(p.equipo, false);
    assert.equal(p.configuracion, false);
    assert.equal(p.servicios, false);
  });

  test("profesional SÍ tiene notas_clinicas, pero no finanzas ni equipo", () => {
    const p = permisosPorRol("profesional");
    assert.equal(p.notas_clinicas, true);
    assert.equal(p.agenda, true);
    assert.equal(p.pacientes, true);
    assert.equal(p.disponibilidad, true);
    assert.equal(p.asistente_ia, true);
    assert.equal(p.finanzas, false);
    assert.equal(p.equipo, false);
    assert.equal(p.configuracion, false);
  });

  test("admin administra todo menos la historia clínica", () => {
    const p = permisosPorRol("admin");
    assert.equal(p.notas_clinicas, false, "el admin no es clínico: no lee notas");
    assert.equal(p.finanzas, true);
    assert.equal(p.equipo, true);
    assert.equal(p.configuracion, true);
  });

  test("todos los roles devuelven booleanos para todos los permisos (nada undefined)", () => {
    for (const rol of ["owner", "admin", "profesional", "asistente"] as const) {
      const p = permisosPorRol(rol);
      for (const permiso of PERMISOS) {
        assert.equal(typeof p[permiso], "boolean", `${rol}.${permiso} no es booleano`);
      }
    }
  });
});

describe("permisos: tienePermiso", () => {
  const todosEnFalse = Object.fromEntries(PERMISOS.map((p) => [p, false])) as Permisos;

  test("el owner puede TODO aunque le pasen los permisos en false (no se puede auto-limitar)", () => {
    for (const permiso of PERMISOS) {
      assert.equal(
        tienePermiso("owner", todosEnFalse, permiso),
        true,
        `el owner quedaría afuera de su propio consultorio en ${permiso}`
      );
    }
    assert.equal(tienePermiso("owner", null, "finanzas"), true);
    assert.equal(tienePermiso("owner", undefined, "equipo"), true);
    assert.equal(tienePermiso("owner", {}, "configuracion"), true);
  });

  test("un permiso explícito en false le gana al default del rol", () => {
    // Por defecto el profesional lee notas clínicas...
    assert.equal(tienePermiso("profesional", null, "notas_clinicas"), true);
    // ...pero si se lo apagan explícitamente, no.
    assert.equal(tienePermiso("profesional", { notas_clinicas: false }, "notas_clinicas"), false);
    // Y apagar uno no toca los demás.
    assert.equal(tienePermiso("profesional", { notas_clinicas: false }, "agenda"), true);

    assert.equal(tienePermiso("admin", { finanzas: false }, "finanzas"), false);
    assert.equal(tienePermiso("asistente", { agenda: false }, "agenda"), false);
  });

  test("un permiso explícito en true le gana al default del rol", () => {
    assert.equal(tienePermiso("asistente", null, "finanzas"), false);
    assert.equal(tienePermiso("asistente", { finanzas: true }, "finanzas"), true);
  });

  // INVARIANTE DURO (Ley 25.326 / need-to-know): la historia clínica NO se puede
  // otorgar con un toggle. Ni desde la UI de equipo ni con un update en la base.
  // Si este test falla, alguien abrió el acceso a datos de salud sin querer.
  test("notas_clinicas está blindada por rol: un toggle NO se la da a un rol administrativo", () => {
    assert.equal(tienePermiso("asistente", { notas_clinicas: true }, "notas_clinicas"), false);
    assert.equal(tienePermiso("admin", { notas_clinicas: true }, "notas_clinicas"), false);
    // Los roles clínicos sí la tienen.
    assert.equal(tienePermiso("profesional", null, "notas_clinicas"), true);
    assert.equal(tienePermiso("owner", null, "notas_clinicas"), true);
    // Y a un rol clínico se le puede QUITAR explícitamente.
    assert.equal(tienePermiso("profesional", { notas_clinicas: false }, "notas_clinicas"), false);
  });

  test("sin permisos (o con valores que no son booleanos) cae al default del rol", () => {
    assert.equal(tienePermiso("asistente", null, "notas_clinicas"), false);
    assert.equal(tienePermiso("asistente", undefined, "agenda"), true);
    assert.equal(tienePermiso("asistente", {}, "pacientes"), true);
    // Basura desde la base: no puede colarse como "true".
    const basura = { notas_clinicas: "si", finanzas: 1, agenda: null } as unknown as Permisos;
    assert.equal(tienePermiso("asistente", basura, "notas_clinicas"), false);
    assert.equal(tienePermiso("asistente", basura, "finanzas"), false);
    assert.equal(tienePermiso("asistente", basura, "agenda"), true, "null debe caer al default del rol");
  });
});

describe("permisos: normalizarPermisos / esRolValido", () => {
  test("normalizarPermisos se queda solo con las claves conocidas y booleanas", () => {
    const raw = {
      agenda: true,
      finanzas: false,
      notas_clinicas: "true", // string: se descarta
      pacientes: 1, // número: se descarta
      inventada: true, // clave que no existe: se descarta
    };
    const out = normalizarPermisos(raw);
    assert.deepEqual(out, { agenda: true, finanzas: false });
    assert.equal("notas_clinicas" in out, false, "un string no puede convertirse en permiso");
    assert.equal("inventada" in out, false);
  });

  test("normalizarPermisos tolera null, arrays y primitivos", () => {
    for (const raw of [null, undefined, "texto", 42, true]) {
      assert.deepEqual(normalizarPermisos(raw), {});
    }
    assert.deepEqual(normalizarPermisos([]), {});
  });

  test("lo normalizado sirve directo para tienePermiso", () => {
    const p = normalizarPermisos({ notas_clinicas: "true" });
    // El string se descartó, así que manda el default del rol.
    assert.equal(tienePermiso("asistente", p, "notas_clinicas"), false);
  });

  test("esRolValido acepta los cuatro roles y rechaza cualquier otra cosa", () => {
    for (const rol of ["owner", "admin", "profesional", "asistente"]) {
      assert.equal(esRolValido(rol), true, `${rol} debería ser válido`);
    }
    for (const malo of ["Owner", "superadmin", "", null, undefined, 1, {}, ["owner"]]) {
      assert.equal(esRolValido(malo), false, `${JSON.stringify(malo)} no debería ser un rol`);
    }
  });

  test("PERMISOS no perdió ninguna clave (si se agrega una, hay que revisar los roles)", () => {
    const esperados: Permiso[] = [
      "agenda",
      "pacientes",
      "notas_clinicas",
      "finanzas",
      "servicios",
      "disponibilidad",
      "equipo",
      "asistente_ia",
      "configuracion",
    ];
    assert.deepEqual([...PERMISOS], esperados);
  });
});
