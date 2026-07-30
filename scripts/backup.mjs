#!/usr/bin/env node
/**
 * BACKUP de todos los consultorios a archivos JSON con timestamp.
 *
 * Por qué existe: sbWrite hace `update set data` sobre la fila completa, así que
 * la versión anterior desaparece. El único "backup" documentado era acordarse de
 * copiar un SELECT antes de tocar algo, que por definición no cubre el caso en
 * que algo se rompe sin que nadie estuviera tocando nada. Con historias clínicas
 * eso no es un incidente técnico.
 *
 * Uso:
 *   node scripts/backup.mjs                    → ./backups/<fecha>/
 *   node scripts/backup.mjs --salida D:/copias → otra carpeta
 *   node scripts/backup.mjs --verificar        → sólo cuenta, no escribe
 *
 * Variables: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (las mismas de la app).
 *
 * IMPORTANTE: el archivo que sale de acá tiene historias clínicas en claro.
 *  - Guardalo FUERA de Supabase (si se cae el proyecto, el backup se cae con él).
 *  - Guardalo FUERA de OneDrive/Drive sincronizado, o cifralo antes.
 *  - No lo mandes por mail ni por WhatsApp.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const flag = (n, def = null) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] ?? true : def;
};
const soloVerificar = args.includes("--verificar");

const URL_SB = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_SB || !KEY) {
  console.error(
    "Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Sacalas de Vercel (Settings → Environment Variables) y exportalas antes de correr esto."
  );
  process.exit(1);
}

/** Consulta la REST API de Supabase directamente: no hace falta el SDK. */
async function traer(tabla, columnas) {
  const url = `${URL_SB.replace(/\/$/, "")}/rest/v1/${tabla}?select=${columnas}`;
  const res = await fetch(url, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`${tabla}: HTTP ${res.status} ${await res.text().catch(() => "")}`);
  }
  return res.json();
}

function contar(blob) {
  if (!blob || typeof blob !== "object") return {};
  const n = (k) => (Array.isArray(blob[k]) ? blob[k].length : 0);
  return {
    pacientes: n("pacientes"),
    notas: n("notasClinicas"),
    solicitudes: n("solicitudes"),
    servicios: n("services"),
    movimientos: n("movimientosManuales"),
  };
}

const main = async () => {
  console.log("Leyendo de Supabase…\n");

  const [consultorios, identidad] = await Promise.all([
    traer("app_state", "professional_id,rev,data,updated_at"),
    traer("auth_state", "id,rev,data,updated_at"),
  ]);

  let totalPacientes = 0;
  let totalNotas = 0;
  console.log(`Consultorios: ${consultorios.length}`);
  for (const c of consultorios) {
    const n = contar(c.data);
    totalPacientes += n.pacientes || 0;
    totalNotas += n.notas || 0;
    console.log(
      `  ${c.professional_id}  rev ${String(c.rev).padStart(4)}  ` +
        `${String(n.pacientes ?? 0).padStart(4)} pacientes  ` +
        `${String(n.notas ?? 0).padStart(5)} notas`
    );
  }

  const usuarios = Array.isArray(identidad?.[0]?.data?.users) ? identidad[0].data.users.length : 0;
  console.log(`\nIdentidad: ${usuarios} usuarios`);
  console.log(`Total: ${totalPacientes} pacientes · ${totalNotas} notas clínicas`);

  // Guardas: un backup vacío es peor que ninguno, porque da falsa tranquilidad.
  if (consultorios.length === 0) {
    console.error("\nNo hay ningún consultorio. No se escribe nada (¿apuntás al proyecto correcto?).");
    process.exit(1);
  }
  if (identidad.length === 0) {
    console.error("\nauth_state está vacía: sin identidad el backup no sirve para restaurar. Abortando.");
    process.exit(1);
  }

  if (soloVerificar) {
    console.log("\n--verificar: no se escribió nada.");
    return;
  }

  const sello = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const base = path.resolve(String(flag("salida", "backups")), sello);
  await fs.mkdir(base, { recursive: true });

  for (const c of consultorios) {
    const nombre = String(c.professional_id).replace(/[^a-zA-Z0-9_-]/g, "_");
    await fs.writeFile(
      path.join(base, `consultorio-${nombre}.json`),
      JSON.stringify(c, null, 2),
      "utf-8"
    );
  }
  await fs.writeFile(path.join(base, "identidad.json"), JSON.stringify(identidad, null, 2), "utf-8");

  // Manifiesto: sirve para verificar que una restauración quedó completa sin
  // tener que abrir cada archivo.
  await fs.writeFile(
    path.join(base, "MANIFIESTO.json"),
    JSON.stringify(
      {
        hechoEn: new Date().toISOString(),
        origen: URL_SB.replace(/\/\/.*@/, "//"),
        consultorios: consultorios.map((c) => ({
          professional_id: c.professional_id,
          rev: c.rev,
          updated_at: c.updated_at,
          ...contar(c.data),
        })),
        usuarios,
        totales: { pacientes: totalPacientes, notas: totalNotas },
      },
      null,
      2
    ),
    "utf-8"
  );

  await fs.writeFile(
    path.join(base, "LEEME.txt"),
    "Este backup contiene HISTORIAS CLINICAS en claro.\n\n" +
      "- Guardalo fuera de Supabase: si se cae el proyecto, un backup adentro se cae con el.\n" +
      "- No lo dejes en una carpeta sincronizada sin cifrar.\n" +
      "- No lo mandes por mail ni por WhatsApp.\n" +
      "- Para restaurar: el JSON de cada consultorio va al campo `data` de su fila en\n" +
      "  app_state, y identidad.json al campo `data` de auth_state. Subi el `rev`.\n\n" +
      "Probá una restauracion en un proyecto de prueba ANTES de necesitarla.\n",
    "utf-8"
  );

  console.log(`\nGuardado en ${base}`);
  console.log(`  ${consultorios.length + 3} archivos`);
  console.log("\nRecordá: este backup tiene datos de salud. Leé el LEEME.txt.");
};

main().catch((e) => {
  console.error("\nFalló el backup:", e.message);
  process.exit(1);
});
