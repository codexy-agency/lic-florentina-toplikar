// Renderizador de Markdown mínimo, para las guías del panel.
//
// Por qué a mano y no una librería: las guías son DOS archivos nuestros,
// versionados en el repo, con un subconjunto acotado de Markdown. Sumar una
// dependencia (y su árbol) para eso no se paga, y el proyecto viene sin deps
// nuevas a propósito.
//
// SEGURIDAD: se escapa TODO el HTML de entrada antes de aplicar cualquier regla.
// Los archivos son nuestros, pero el renderizador no confía en eso: si algún día
// se usa para texto de un usuario, no se convierte en un XSS.

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
const escapar = (s: string) => s.replace(/[&<>"']/g, (c) => ESCAPES[c]);

/** Sólo enlaces internos o https. Un `javascript:` en un link no se renderiza. */
function hrefSeguro(url: string): string | null {
  const u = url.trim();
  if (!u) return null;
  if (u.startsWith("#") || u.startsWith("/")) return u;
  if (/^https?:\/\//i.test(u)) return u;
  return null; // enlaces relativos a otros .md y cualquier otro esquema: se descartan
}

// Centinela para reservar los tramos de `código` mientras se aplica el resto del
// formato.
//
// Tiene que ser algo que NO pueda aparecer en el texto ya escapado. Un carácter
// de control sirve; un dígito entre espacios NO, porque matchearía "hasta 15
// pacientes" y lo convertiría en código (era el bug).
//
// Se construye con fromCharCode para no dejar un byte de control crudo en el
// fuente: es invisible al leer el archivo y frágil ante cualquier editor.
const SEP = String.fromCharCode(0);

// Los controles se sacan de la ENTRADA para que el centinela no se pueda inyectar.
const CONTROLES = new RegExp("[" + String.fromCharCode(0) + "-" + String.fromCharCode(8) + String.fromCharCode(11) + String.fromCharCode(12) + String.fromCharCode(14) + "-" + String.fromCharCode(31) + "]", "g");

/** Formato dentro de una línea: código, negrita, itálica, enlaces. */
function inline(texto: string): string {
  // Se quitan los caracteres de control ANTES de nada, para que el centinela no
  // se pueda inyectar desde el texto de entrada.
  let s = escapar(texto.replace(CONTROLES, ""));

  // `código` primero, para que lo de adentro no se interprete como formato.
  const codigos: string[] = [];
  s = s.replace(/`([^`]+)`/g, (_, c) => {
    codigos.push(c);
    return `${SEP}${codigos.length - 1}${SEP}`;
  });

  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-espresso">$1</strong>');
  s = s.replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>");

  // [texto](destino)
  //
  // El destino admite un nivel de paréntesis anidados. Con `[^)]+` la expresión
  // cortaba en el primer `)`, así que un destino como `alert(1)` dejaba un `)`
  // suelto en el texto renderizado. No era un agujero (el enlace se descartaba
  // igual), pero se veía mal y el síntoma tapaba el diagnóstico.
  s = s.replace(/\[([^\]]+)\]\(((?:[^()]|\([^()]*\))*)\)/g, (m, txt, url) => {
    const href = hrefSeguro(url);
    if (!href) return txt; // se queda el texto, sin enlace
    const externo = /^https?:/i.test(href);
    return `<a href="${href}"${externo ? ' target="_blank" rel="noreferrer"' : ""} class="text-[var(--a-accent-ink)] underline underline-offset-2 hover:text-[var(--a-accent)]">${txt}</a>`;
  });

  s = s.replace(
    new RegExp(SEP + "(\\d+)" + SEP, "g"),
    (_, i) =>
      `<code class="rounded bg-[var(--a-surface-2)] px-1.5 py-0.5 font-mono text-[0.9em]">${codigos[Number(i)]}</code>`
  );
  return s;
}

/**
 * Markdown → HTML. Soporta: h1-h4, párrafos, listas (con y sin número),
 * citas, separadores, bloques de código y tablas. Alcanza para las guías.
 */
export function renderMarkdown(md: string): string {
  const lineas = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];

  let enLista: "ul" | "ol" | null = null;
  let enCodigo = false;
  let enCita = false;
  let parrafo: string[] = [];
  let tabla: string[][] | null = null;

  const cerrarParrafo = () => {
    if (parrafo.length) {
      out.push(`<p class="mt-3 leading-relaxed text-[var(--a-text-2)]">${inline(parrafo.join(" "))}</p>`);
      parrafo = [];
    }
  };
  const cerrarLista = () => {
    if (enLista) {
      out.push(`</${enLista}>`);
      enLista = null;
    }
  };
  const cerrarCita = () => {
    if (enCita) {
      out.push("</blockquote>");
      enCita = false;
    }
  };
  const cerrarTabla = () => {
    if (!tabla || tabla.length === 0) {
      tabla = null;
      return;
    }
    const [cab, ...filas] = tabla;
    out.push('<div class="mt-4 overflow-x-auto"><table class="w-full border-collapse text-[14px]">');
    out.push(
      `<thead><tr>${cab
        .map(
          (c) =>
            `<th class="border-b border-[var(--a-border-strong)] px-3 py-2 text-left font-semibold text-espresso">${inline(c)}</th>`
        )
        .join("")}</tr></thead><tbody>`
    );
    for (const f of filas) {
      out.push(
        `<tr>${f
          .map(
            (c) =>
              `<td class="border-b border-[var(--a-border)] px-3 py-2 align-top text-[var(--a-text-2)]">${inline(c)}</td>`
          )
          .join("")}</tr>`
      );
    }
    out.push("</tbody></table></div>");
    tabla = null;
  };
  const cerrarTodo = () => {
    cerrarParrafo();
    cerrarLista();
    cerrarCita();
    cerrarTabla();
  };

  for (const linea of lineas) {
    // Bloque de código: se copia literal, sin interpretar nada.
    if (/^\s*```/.test(linea)) {
      if (enCodigo) {
        out.push("</code></pre>");
        enCodigo = false;
      } else {
        cerrarTodo();
        out.push(
          '<pre class="mt-4 overflow-x-auto rounded-xl bg-[var(--a-surface-2)] p-4 text-[13px] leading-relaxed"><code class="font-mono">'
        );
        enCodigo = true;
      }
      continue;
    }
    if (enCodigo) {
      out.push(escapar(linea));
      continue;
    }

    // Tabla: | a | b |
    if (/^\s*\|/.test(linea)) {
      const celdas = linea.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      // La fila de guiones (|---|---|) sólo separa: no se renderiza.
      if (celdas.every((c) => /^:?-{2,}:?$/.test(c))) continue;
      cerrarParrafo();
      cerrarLista();
      cerrarCita();
      tabla = tabla ?? [];
      tabla.push(celdas);
      continue;
    }
    if (tabla) cerrarTabla();

    if (!linea.trim()) {
      cerrarParrafo();
      cerrarLista();
      cerrarCita();
      continue;
    }

    // Títulos
    const h = linea.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      cerrarTodo();
      const n = h[1].length;
      const tam = ["text-[26px]", "text-[20px]", "text-[17px]", "text-[15px]"][n - 1];
      const margen = n === 1 ? "mt-0" : n === 2 ? "mt-9" : "mt-6";
      out.push(
        `<h${n} class="${margen} ${tam} font-semibold tracking-tight text-espresso">${inline(h[2])}</h${n}>`
      );
      continue;
    }

    // Separador
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(linea)) {
      cerrarTodo();
      out.push('<hr class="my-7 border-[var(--a-border)]" />');
      continue;
    }

    // Cita
    const cita = linea.match(/^>\s?(.*)$/);
    if (cita) {
      cerrarParrafo();
      cerrarLista();
      if (!enCita) {
        out.push(
          '<blockquote class="mt-4 border-l-2 border-[var(--a-accent)] bg-[var(--a-accent-soft)]/40 py-2 pl-4 pr-3 text-[14px] leading-relaxed text-[var(--a-text-2)]">'
        );
        enCita = true;
      }
      out.push(inline(cita[1]));
      continue;
    }
    cerrarCita();

    // Listas
    const ul = linea.match(/^\s*[-*+]\s+(.*)$/);
    const ol = linea.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ul || ol) {
      cerrarParrafo();
      const tipo = ul ? "ul" : "ol";
      if (enLista !== tipo) {
        cerrarLista();
        out.push(
          tipo === "ul"
            ? '<ul class="mt-3 list-disc space-y-1.5 pl-5 leading-relaxed text-[var(--a-text-2)]">'
            : '<ol class="mt-3 list-decimal space-y-1.5 pl-5 leading-relaxed text-[var(--a-text-2)]">'
        );
        enLista = tipo;
      }
      out.push(`<li>${inline((ul ?? ol)![1])}</li>`);
      continue;
    }
    cerrarLista();

    parrafo.push(linea.trim());
  }

  if (enCodigo) out.push("</code></pre>");
  cerrarTodo();
  return out.join("\n");
}
