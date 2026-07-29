// Diagnóstico de identidad de pacientes — ANTES de tocar contactoKey().
//
//   node scripts/diagnostico-pacientes.mjs [archivo.json]
//
// Hoy los pacientes se identifican por `contactoKey()`: el email tal cual, o los
// ÚLTIMOS 10 DÍGITOS del teléfono. Esa heurística tiene dos problemas conocidos:
//
//   1. COLISIÓN entre países: AR, MX y USA usan 10 dígitos locales. Dos pacientes
//      de países distintos con los mismos últimos 10 dígitos se fusionan → se
//      mezclan dos historias clínicas. Es el riesgo más grave al expandir.
//   2. SEPARACIÓN indebida: la misma persona cargada una vez por email y otra por
//      teléfono cuenta como dos pacientes.
//
// Este script NO modifica nada: solo reporta, para poder resolver a mano antes de
// cambiar la regla (un cambio a ciegas rompe el vínculo turno↔paciente existente).

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

function contactoKey(c) {
  const t = (c || "").trim().toLowerCase();
  if (!t) return "";
  if (t.includes("@")) return t;
  const d = t.replace(/\D/g, "");
  return d.length >= 8 ? d.slice(-10) : d || t;
}

/** Dígitos completos (con código de país si lo trae). */
function digitos(c) {
  return (c || "").replace(/\D/g, "").replace(/^00/, "");
}

const archivos = process.argv[2]
  ? [process.argv[2]]
  : (await readdir(path.join(process.cwd(), "data")).catch(() => []))
      .filter((f) => f.startsWith("db") && f.endsWith(".json"))
      .map((f) => path.join("data", f));

if (!archivos.length) {
  console.log("No encontré bases en data/. Pasá el archivo como argumento.");
  process.exit(0);
}

let problemasTotales = 0;

for (const archivo of archivos) {
  let db;
  try {
    db = JSON.parse(await readFile(archivo, "utf8"));
  } catch {
    continue;
  }
  const pacientes = db.pacientes || [];
  const solicitudes = db.solicitudes || [];
  if (!pacientes.length && !solicitudes.length) continue;

  console.log(`\n══ ${archivo} ══`);
  console.log(`   ${pacientes.length} pacientes · ${solicitudes.length} turnos`);

  // 1) Dos pacientes distintos que colapsan a la MISMA clave → se fusionarían.
  const porClave = new Map();
  for (const p of pacientes) {
    const k = contactoKey(p.contacto);
    if (!k) continue;
    if (!porClave.has(k)) porClave.set(k, []);
    porClave.get(k).push(p);
  }
  const fusiones = [...porClave.entries()].filter(([, arr]) => arr.length > 1);
  if (fusiones.length) {
    problemasTotales += fusiones.length;
    console.log(`\n   ⚠️  ${fusiones.length} clave(s) compartidas por VARIOS pacientes:`);
    for (const [k, arr] of fusiones) {
      console.log(`      clave "${k}"`);
      for (const p of arr) {
        const full = digitos(p.contacto);
        console.log(`        · ${p.nombre} — ${p.contacto}  (dígitos completos: ${full})`);
      }
      // ¿Son realmente la misma persona? Si los dígitos completos difieren, NO.
      const distintos = new Set(arr.map((p) => digitos(p.contacto)));
      if (distintos.size > 1) {
        console.log(`        ❌ Los números completos DIFIEREN → son personas distintas que hoy se fusionan.`);
      } else {
        console.log(`        ℹ️  Mismo número escrito distinto → es la misma persona (duplicado real).`);
      }
    }
  } else {
    console.log("   ✅ Sin colisiones de clave entre pacientes.");
  }

  // 2) Pacientes con email Y teléfono: hoy la clave usa SOLO el email, así que un
  //    turno cargado con el teléfono no se vincula a esa ficha.
  const conAmbos = pacientes.filter((p) => p.email && p.contacto && !p.contacto.includes("@"));
  if (conAmbos.length) {
    console.log(`\n   ⚠️  ${conAmbos.length} paciente(s) con email y teléfono separados:`);
    for (const p of conAmbos.slice(0, 10)) {
      console.log(`      · ${p.nombre} — tel ${p.contacto} · mail ${p.email}`);
    }
    console.log(`      (si un turno entra con el email y la ficha usa el teléfono, no se vinculan)`);
  }

  // 3) Turnos que no matchean con ninguna ficha de paciente.
  const claves = new Set(pacientes.map((p) => contactoKey(p.contacto)).filter(Boolean));
  const huerfanos = solicitudes.filter((s) => s.contacto && !claves.has(contactoKey(s.contacto)));
  if (huerfanos.length) {
    problemasTotales += huerfanos.length;
    console.log(`\n   ⚠️  ${huerfanos.length} turno(s) sin ficha de paciente que los matchee:`);
    for (const s of huerfanos.slice(0, 10)) {
      console.log(`      · ${s.nombre} — ${s.contacto}`);
    }
  } else {
    console.log("   ✅ Todos los turnos matchean con una ficha.");
  }

  // 4) Números que NO son argentinos → la heurística de 10 dígitos es riesgosa.
  const noAR = pacientes.filter((p) => {
    const d = digitos(p.contacto);
    return d.length > 8 && !d.startsWith("54") && !p.contacto.includes("@");
  });
  if (noAR.length) {
    console.log(`\n   ⚠️  ${noAR.length} contacto(s) que no parecen argentinos (riesgo de colisión entre países):`);
    for (const p of noAR.slice(0, 10)) console.log(`      · ${p.nombre} — ${p.contacto}`);
  }
}

console.log(
  problemasTotales === 0
    ? "\n✅ Sin problemas de identidad detectados: se puede cambiar la regla de contacto con bajo riesgo.\n"
    : `\n❌ ${problemasTotales} problema(s) a resolver A MANO antes de cambiar la regla de contacto.\n`
);
