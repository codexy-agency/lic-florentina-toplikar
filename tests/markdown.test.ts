// Tests del renderizador de Markdown que sirve las guías en /admin/ayuda.
//
//   node --test --experimental-strip-types tests/markdown.test.ts
//
// Es código chico pero está en el camino de HTML que se inyecta con
// dangerouslySetInnerHTML, así que las garantías de escapado se prueban.
//
// Los dos bugs que motivaron estos tests, los dos encontrados escribiéndolos:
//  - el centinela de los tramos de `código` eran dígitos entre espacios, así que
//    "hasta 15 pacientes" se renderizaba como código;
//  - el centinela terminó como byte NUL crudo dentro del .ts, invisible al leer.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { renderMarkdown } from "../lib/markdown.ts";

const RAIZ = join(import.meta.dirname, "..");

describe("escapado: nada de lo que entra se ejecuta", () => {
  test("una etiqueta script sale escapada", () => {
    const h = renderMarkdown("Hola <script>alert(1)</script> chau");
    assert.ok(!h.includes("<script"), "no puede quedar una etiqueta script real");
    assert.match(h, /&lt;script&gt;/);
  });

  test("una etiqueta con atributo de evento queda inerte", () => {
    const h = renderMarkdown('Un "texto" con \'comillas\' y <b onclick="x">negrita</b>');
    // Lo que importa no es que el texto "onclick" desaparezca —queda como texto
    // visible, y está bien— sino que no haya una ETIQUETA viva que lo use.
    assert.ok(!/<b[\s>]/.test(h), "no puede quedar una etiqueta <b> real");
    assert.match(h, /&lt;b onclick=&quot;x&quot;&gt;/);
    assert.match(h, /&quot;texto&quot;/);
  });

  test("HTML dentro de un bloque de código queda inerte", () => {
    const h = renderMarkdown("```\n<img src=x onerror=alert(1)>\n```");
    assert.ok(!/<img[\s>]/.test(h), "no puede quedar una etiqueta <img> real");
    assert.match(h, /&lt;img src=x onerror=alert\(1\)&gt;/);
  });
});

describe("enlaces: sólo internos o http(s)", () => {
  test("un enlace interno queda como enlace", () => {
    const h = renderMarkdown("Mirá [la agenda](/admin) ahora.");
    assert.match(h, /<a href="\/admin"/);
    assert.ok(!h.includes("target="), "un enlace interno no abre en otra pestaña");
  });

  test("un enlace externo abre aparte y con rel", () => {
    const h = renderMarkdown("Entrá a [ejemplo](https://ejemplo.com).");
    assert.match(h, /<a href="https:\/\/ejemplo\.com"[^>]*target="_blank"/);
    assert.match(h, /rel="noreferrer"/);
  });

  test("javascript: y data: se descartan, queda sólo el texto", () => {
    for (const url of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,x", "vbscript:x"]) {
      const h = renderMarkdown(`Cuidado [click](${url}) acá.`);
      assert.ok(!h.includes("<a "), `no debería haber enlace para ${url}`);
      assert.ok(!/javascript|vbscript|data:/i.test(h), `el esquema no puede aparecer: ${url}`);
      // El texto tiene que quedar limpio: un destino con paréntesis dejaba un
      // ")" suelto porque la expresión cortaba en el primer cierre.
      assert.match(h, /Cuidado click acá\./, `texto mal armado con ${url}`);
    }
  });

  test("un enlace relativo a otro .md se degrada a texto (esos archivos no se sirven)", () => {
    const h = renderMarkdown("Ver [la guía](GUIA-PANEL.md) completa.");
    assert.ok(!h.includes("<a "));
    assert.match(h, /Ver la guía completa/);
  });
});

describe("el bug del centinela", () => {
  test("`código` se renderiza como código", () => {
    const h = renderMarkdown("Corré `npm test` antes de subir.");
    assert.match(h, /<code[^>]*>npm test<\/code>/);
  });

  test("un número entre espacios NO es código", () => {
    // Este es el caso que se rompía: el placeholder eran dígitos entre espacios.
    const h = renderMarkdown("Tu plan incluye hasta 15 pacientes y 2 personas.");
    assert.ok(!h.includes("<code"), "un número suelto no puede volverse código");
    assert.match(h, /hasta 15 pacientes y 2 personas/);
  });

  test("varios tramos de código en una línea salen en orden", () => {
    const h = renderMarkdown("Usá `uno`, después `dos` y al final `tres`.");
    const encontrados = [...h.matchAll(/<code[^>]*>([^<]+)<\/code>/g)].map((m) => m[1]);
    assert.deepEqual(encontrados, ["uno", "dos", "tres"]);
  });

  test("un carácter de control en la entrada no puede inyectar el centinela", () => {
    const conNul = "texto" + String.fromCharCode(0) + "0" + String.fromCharCode(0) + " normal `real`";
    const h = renderMarkdown(conNul);
    assert.ok(!/[\x00-\x08]/.test(h), "no puede quedar un control en la salida");
    assert.match(h, /<code[^>]*>real<\/code>/);
  });

  test("el formato dentro de `código` no se interpreta", () => {
    const h = renderMarkdown("El valor es `**no negrita**`.");
    assert.ok(!h.includes("<strong"), "lo de adentro del código es literal");
  });
});

describe("bloques", () => {
  test("títulos de los cuatro niveles", () => {
    for (let n = 1; n <= 4; n++) {
      const h = renderMarkdown("#".repeat(n) + " Título");
      assert.match(h, new RegExp(`<h${n}[^>]*>Título</h${n}>`));
    }
  });

  test("lista con viñetas y lista numerada", () => {
    assert.match(renderMarkdown("- uno\n- dos"), /<ul[^>]*>[\s\S]*<li>uno<\/li>[\s\S]*<\/ul>/);
    assert.match(renderMarkdown("1. uno\n2. dos"), /<ol[^>]*>[\s\S]*<li>uno<\/li>[\s\S]*<\/ol>/);
  });

  test("cita", () => {
    assert.match(renderMarkdown("> ojo con esto"), /<blockquote[\s\S]*ojo con esto[\s\S]*<\/blockquote>/);
  });

  test("separador", () => {
    assert.match(renderMarkdown("---"), /<hr/);
  });

  test("tabla, salteando la fila de guiones", () => {
    const h = renderMarkdown("| a | b |\n|---|---|\n| 1 | 2 |");
    assert.match(h, /<th[^>]*>a<\/th>/);
    assert.match(h, /<td[^>]*>1<\/td>/);
    assert.ok(!h.includes("---"), "la fila separadora no se renderiza");
  });

  test("negrita e itálica", () => {
    assert.match(renderMarkdown("es **fuerte**"), /<strong[^>]*>fuerte<\/strong>/);
    assert.match(renderMarkdown("es *suave*"), /<em>suave<\/em>/);
  });

  test("todas las etiquetas abiertas se cierran", () => {
    const h = renderMarkdown("- uno\n\n> cita\n\n```\ncod\n```\n\n| a |\n|---|\n| 1 |");
    for (const t of ["ul", "blockquote", "pre", "code", "table"]) {
      const abre = (h.match(new RegExp(`<${t}[ >]`, "g")) || []).length;
      const cierra = (h.match(new RegExp(`</${t}>`, "g")) || []).length;
      assert.equal(abre, cierra, `<${t}> quedó sin cerrar`);
    }
  });
});

describe("las guías reales del producto se renderizan enteras", () => {
  for (const guia of ["PRIMEROS-PASOS", "GUIA-PANEL"]) {
    test(guia, () => {
      const md = readFileSync(join(RAIZ, "docs", "guias", `${guia}.md`), "utf-8");
      const h = renderMarkdown(md);
      assert.ok(h.length > md.length / 2, "salió sospechosamente corto");
      assert.ok(!h.includes("<script"), "no puede haber script en la salida");
      assert.ok(!/[\x00-\x08]/.test(h), "quedó un carácter de control en la salida");
      // Un centinela sin reponer se vería como el número del índice suelto.
      assert.ok(!h.includes("undefined"), "quedó un tramo de código sin reponer");
    });
  }
});
