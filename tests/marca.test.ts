// Tests de la MARCA del consultorio.
//
//   node --test --experimental-strip-types tests/marca.test.ts
//
// Dos cosas se prueban acá, y la segunda es la que importa de verdad.
//
// 1. Que los helpers hagan lo que dicen, en particular que devuelvan null en vez
//    de caer a un valor por defecto. La regla del sitio público es: campo vacío
//    = sección oculta. Un fallback silencioso es cómo el WhatsApp de una
//    psicóloga terminó siendo el CTA de todos los consultorios.
//
// 2. Que no quede identidad de nadie cableada en el código. Es un SaaS: cada
//    string con un nombre, una matrícula, una ciudad o un alias bancario es un
//    dato de una persona real que se le publica a otra.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import {
  MARCA_DEFECTO,
  emailUrl,
  iniciales,
  instagramUrl,
  normalizarMarca,
  nombreMostrable,
  partirNombre,
  whatsappUrl,
  type Marca,
} from "../lib/marca.ts";

const marcaCon = (p: Partial<Marca>): Marca => normalizarMarca({ ...MARCA_DEFECTO, ...p });

describe("whatsappUrl", () => {
  test("arma el link con los dígitos, descartando espacios y símbolos", () => {
    assert.equal(
      whatsappUrl(marcaCon({ whatsapp: "+54 9 11 5555-5555" }), false),
      "https://wa.me/5491155555555",
    );
  });

  test("null si no hay número: el botón no se muestra", () => {
    for (const v of ["", "   ", "sin teléfono", "+54"]) {
      assert.equal(whatsappUrl(marcaCon({ whatsapp: v })), null, `whatsapp="${v}"`);
    }
  });

  test("null si el número es demasiado corto para ser real", () => {
    assert.equal(whatsappUrl(marcaCon({ whatsapp: "1234567" })), null);
    assert.notEqual(whatsappUrl(marcaCon({ whatsapp: "12345678" })), null);
  });

  test("agrega el utm por defecto y lo omite si se pide", () => {
    const m = marcaCon({ whatsapp: "5491155555555" });
    assert.match(whatsappUrl(m)!, /utm_source=web/);
    assert.doesNotMatch(whatsappUrl(m, false)!, /utm/);
  });
});

describe("emailUrl e instagramUrl", () => {
  test("mailto sólo con un email plausible", () => {
    assert.equal(emailUrl(marcaCon({ email: "ana@gomez.com" })), "mailto:ana@gomez.com");
    for (const v of ["", "ana", "ana@", "@gomez.com", "ana gomez@x.com"]) {
      assert.equal(emailUrl(marcaCon({ email: v })), null, `email="${v}"`);
    }
  });

  test("instagram acepta usuario con o sin arroba", () => {
    assert.equal(instagramUrl(marcaCon({ instagram: "@anagomez" })), "https://www.instagram.com/anagomez/");
    assert.equal(instagramUrl(marcaCon({ instagram: "anagomez" })), "https://www.instagram.com/anagomez/");
  });

  test("instagram null si está vacío", () => {
    assert.equal(instagramUrl(marcaCon({ instagram: "" })), null);
  });
});

describe("linkPago: sólo http(s)", () => {
  test("acepta https", () => {
    assert.equal(
      marcaCon({ linkPago: "https://link.mercadopago.com.ar/ana" }).linkPago,
      "https://link.mercadopago.com.ar/ana",
    );
  });

  test("descarta esquemas peligrosos", () => {
    // El valor lo escribe el cliente y termina en un href del sitio público:
    // sin este filtro un javascript: sería XSS almacenado contra sus pacientes.
    for (const v of [
      "javascript:alert(1)",
      "JaVaScRiPt:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox",
      "file:///etc/passwd",
      "no-es-una-url",
    ]) {
      assert.equal(marcaCon({ linkPago: v }).linkPago, "", `linkPago="${v}"`);
    }
  });
});

describe("nombre para mostrar", () => {
  test("cae a un texto genérico, nunca al nombre de otra persona", () => {
    assert.equal(nombreMostrable(marcaCon({ nombre: "" })), "Tu consultorio");
    assert.equal(nombreMostrable(marcaCon({ nombre: "Ana Gómez" })), "Ana Gómez");
  });

  test("partirNombre separa pila y resto", () => {
    assert.deepEqual(partirNombre("Ana Gómez"), ["Ana", "Gómez"]);
    assert.deepEqual(partirNombre("Ana María Gómez Pérez"), ["Ana", "María Gómez Pérez"]);
    assert.deepEqual(partirNombre("Ana"), ["Ana", ""]);
    assert.deepEqual(partirNombre(""), ["", ""]);
  });

  test("iniciales: dos letras como mucho, y nunca vacío", () => {
    assert.equal(iniciales("Ana Gómez"), "AG");
    assert.equal(iniciales("Ana María Gómez Pérez"), "AM");
    assert.equal(iniciales("ana"), "A");
    assert.equal(iniciales(""), "·");
  });
});

describe("ninguna identidad ajena cableada en el código", () => {
  // Nombre, matrícula, ciudad, teléfono, alias bancario y dominio de la
  // psicóloga para la que nació el proyecto. Si alguno reaparece en el código de
  // la app, es un dato de una persona real publicado en el sitio de otra.
  const PROHIBIDOS = [
    "Pilotti",
    "paulinapilotti",
    "paulina.pilotti",
    "psicoterapia.pauli",
    "Viedma",
    "MP 7321",
    "2920612515",
    "542920612515",
  ];

  const CARPETAS = ["app", "components", "lib"];
  const EXT = [".ts", ".tsx"];

  function archivos(dir: string, acc: string[] = []): string[] {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      if (statSync(p).isDirectory()) {
        if (e === "node_modules" || e === ".next") continue;
        archivos(p, acc);
      } else if (EXT.some((x) => e.endsWith(x))) {
        acc.push(p);
      }
    }
    return acc;
  }

  test("ni el nombre, la matrícula, la ciudad, el teléfono o el alias", () => {
    const raiz = join(import.meta.dirname, "..");
    const hallazgos: string[] = [];

    for (const carpeta of CARPETAS) {
      for (const archivo of archivos(join(raiz, carpeta))) {
        const lineas = readFileSync(archivo, "utf-8").split(/\r?\n/);
        lineas.forEach((linea, i) => {
          // Los comentarios explican por qué se sacó cada cosa: no cuentan.
          const limpia = linea.trim();
          if (limpia.startsWith("//") || limpia.startsWith("*") || limpia.startsWith("/*")) return;
          for (const mal of PROHIBIDOS) {
            if (linea.includes(mal)) {
              hallazgos.push(`${archivo.slice(raiz.length + 1)}:${i + 1} → "${mal}"`);
            }
          }
        });
      }
    }

    assert.deepEqual(
      hallazgos,
      [],
      "Hay identidad de otra persona cableada en el código:\n  " + hallazgos.join("\n  "),
    );
  });
});
