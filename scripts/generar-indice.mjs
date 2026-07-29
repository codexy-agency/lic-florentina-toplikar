// Genera docs/INDICE.md — el mapa navegable del proyecto.
//
//   npm run indice
//
// Se regenera solo: recorre el código, extrae de cada archivo su primer comentario
// de cabecera y sus exports, y arma el índice. Así el mapa nunca queda viejo.

import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";

const RAIZ = process.cwd();
const IGNORAR = new Set([
  "node_modules", ".next", ".git", "capturas", "data", "public", "cerebro", ".vercel",
]);
const EXT = new Set([".ts", ".tsx", ".mjs", ".sql"]);

async function listar(dir, acc = []) {
  let entradas;
  try {
    entradas = await readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entradas) {
    if (IGNORAR.has(e.name) || e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await listar(full, acc);
    else if (EXT.has(path.extname(e.name))) acc.push(full);
  }
  return acc;
}

/** Primera línea útil del comentario de cabecera (lo que el archivo dice de sí mismo). */
function resumen(src) {
  const lineas = src.split(/\r?\n/).slice(0, 12);
  for (const l of lineas) {
    const m =
      l.match(/^\s*\/\/\s?(.+)$/) ||
      l.match(/^\s*\/\*\*?\s?(.+?)(\*\/)?\s*$/) ||
      l.match(/^\s*\*\s?(.+?)(\*\/)?\s*$/) ||
      l.match(/^\s*--\s?(.+)$/);
    if (m) {
      const t = m[1].trim();
      if (t && !t.startsWith("eslint") && !t.startsWith("@ts-") && t.length > 12) {
        return t.replace(/\s*\*\/\s*$/, "").trim();
      }
    }
    if (l.trim() && !l.trim().startsWith("//") && !l.trim().startsWith("/*") && !l.trim().startsWith("*") && !l.trim().startsWith("--")) break;
  }
  return "";
}

function exports(src) {
  const out = [];
  const re = /export\s+(?:async\s+)?(?:function|const|class|interface|type)\s+([A-Za-z0-9_]+)/g;
  let m;
  while ((m = re.exec(src))) out.push(m[1]);
  return [...new Set(out)];
}

const GRUPOS = [
  { titulo: "Núcleo — lógica y datos", test: (r) => r.startsWith("lib/") && !r.startsWith("lib/assistant") && !r.startsWith("lib/scheduling") },
  { titulo: "Motor de turnos", test: (r) => r.startsWith("lib/scheduling/") },
  { titulo: "Asistente IA", test: (r) => r.startsWith("lib/assistant/") },
  { titulo: "Panel /admin (páginas y acciones)", test: (r) => r.startsWith("app/admin/") },
  { titulo: "API pública y webhooks", test: (r) => r.startsWith("app/api/") },
  { titulo: "Sitio público", test: (r) => r.startsWith("app/") && !r.startsWith("app/admin/") && !r.startsWith("app/api/") },
  { titulo: "Componentes", test: (r) => r.startsWith("components/") },
  { titulo: "Base de datos (migraciones)", test: (r) => r.startsWith("supabase/") },
  { titulo: "Tests", test: (r) => r.startsWith("tests/") },
  { titulo: "Scripts y herramientas", test: (r) => r.startsWith("scripts/") },
  { titulo: "Raíz", test: () => true },
];

const archivos = await listar(RAIZ);
const filas = [];
for (const f of archivos) {
  const rel = path.relative(RAIZ, f).replace(/\\/g, "/");
  if (/^(check|cf|capture|measure|herogif)/.test(path.basename(rel))) continue; // scripts de QA sueltos
  const src = await readFile(f, "utf8").catch(() => "");
  const st = await stat(f).catch(() => null);
  filas.push({
    rel,
    resumen: resumen(src),
    exports: exports(src).slice(0, 6),
    lineas: src ? src.split(/\r?\n/).length : 0,
    kb: st ? Math.round(st.size / 102.4) / 10 : 0,
  });
}

const usados = new Set();
let md = `# Índice del proyecto

> **Mapa navegable, generado automáticamente.** No lo edites a mano: corré \`npm run indice\`.
> Última generación: ${new Date().toISOString().slice(0, 10)} · ${filas.length} archivos.
>
> Para entender *cómo* funciona el sistema leé [ARQUITECTURA.md](ARQUITECTURA.md);
> para saber *por qué* está así, [decisiones/](decisiones/).

`;

for (const g of GRUPOS) {
  const items = filas.filter((f) => !usados.has(f.rel) && g.test(f.rel)).sort((a, b) => a.rel.localeCompare(b.rel));
  if (!items.length) continue;
  items.forEach((i) => usados.add(i.rel));
  md += `\n## ${g.titulo}\n\n| Archivo | Qué hace | Exporta |\n|---|---|---|\n`;
  for (const i of items) {
    const ex = i.exports.length ? "`" + i.exports.join("`, `") + "`" : "—";
    const res = i.resumen ? i.resumen.replace(/\|/g, "\\|") : "—";
    md += `| [\`${i.rel}\`](../${i.rel}) <br><sub>${i.lineas} líneas</sub> | ${res} | ${ex} |\n`;
  }
}

md += `\n---\n\n## Cómo está todo vinculado\n\n\`\`\`
Request
  └─ proxy.ts ─────────► lib/tenant.ts      (¿de qué consultorio es este host?)
       │                                     fail-closed: si no resuelve, 404
       ├─ /admin ──────► lib/session.ts     (¿hay sesión? ¿de ESTE consultorio?
       │                  └─ lib/auth.ts      ¿qué permisos tiene?)
       │                  └─ lib/accounts.ts (cuentas, roles, auditoría)
       │                       └─ lib/accounts-store.ts  → auth_state | data/auth.json
       │
       └─ páginas y acciones
            └─ lib/store.ts ────────────────► app_state | data/db.<tenant>.json
                 ├─ lib/scheduling/slots.ts   (horarios disponibles)
                 └─ esImpaga()                (única definición de deuda)
\`\`\`

**Reglas de oro del proyecto**

1. Todo dato se scopea por consultorio (\`professional_id\`). Sin tenant resuelto, no se sirve nada.
2. La sesión se valida **siempre** con \`sesionValida()\` / \`requirePermiso()\`, nunca con \`verifyToken\` suelto.
3. La historia clínica y el motivo de consulta **no salen** a terceros (ni a Telegram ni a la IA).
4. Antes de commitear lógica de negocio o seguridad: \`npm test\`.
`;

await writeFile(path.join(RAIZ, "docs", "INDICE.md"), md, "utf8");
console.log(`docs/INDICE.md generado — ${filas.length} archivos indexados.`);
