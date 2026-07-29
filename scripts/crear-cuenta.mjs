// Crea la PRIMERA cuenta (dueño/a) de un consultorio, o suma un miembro.
//
//   node scripts/crear-cuenta.mjs --email ana@mail.com --nombre "Ana" --rol owner [--pid <uuid>]
//
// Pide la contraseña por stdin (no se pasa por argumento: quedaría en el historial).
// En modo archivo escribe data/auth.json. Si hay Supabase configurado, además
// imprime el SQL con el hash ya calculado para pegar en el SQL Editor.
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { randomUUID, webcrypto } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const ITERACIONES = 600_000;

function b64(bytes) {
  return Buffer.from(bytes).toString("base64");
}

async function hashPassword(password) {
  const pepper = process.env.AUTH_PEPPER || "";
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password + pepper),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERACIONES, hash: "SHA-256" },
    key,
    256
  );
  return `pbkdf2$sha256$${ITERACIONES}$${b64(salt)}$${b64(new Uint8Array(bits))}`;
}

const PERMISOS = ["agenda","pacientes","notas_clinicas","finanzas","servicios","disponibilidad","equipo","asistente_ia","configuracion"];
function permisosPorRol(rol) {
  const todo = (v) => Object.fromEntries(PERMISOS.map((p) => [p, v]));
  if (rol === "owner") return todo(true);
  if (rol === "admin") return { ...todo(true), notas_clinicas: false };
  if (rol === "profesional")
    return { ...todo(false), agenda: true, pacientes: true, notas_clinicas: true, disponibilidad: true, asistente_ia: true };
  return { ...todo(false), agenda: true, pacientes: true };
}

function arg(nombre, def) {
  const i = process.argv.indexOf(`--${nombre}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const email = String(arg("email", "")).trim().toLowerCase();
const nombre = String(arg("nombre", "")).trim();
const rol = String(arg("rol", "owner")).trim();
const pid = String(arg("pid", process.env.PROFESSIONAL_ID || "-")).trim().toLowerCase();

if (!email || !email.includes("@") || !nombre) {
  console.error('Uso: node scripts/crear-cuenta.mjs --email ana@mail.com --nombre "Ana Pérez" [--rol owner] [--pid <uuid>]');
  process.exit(1);
}
if (!["owner", "admin", "profesional", "asistente"].includes(rol)) {
  console.error("Rol inválido. Opciones: owner, admin, profesional, asistente");
  process.exit(1);
}

// Interactivo por defecto. Para scripts/CI: AUTH_PASSWORD=... (no queda en el
// historial del shell como sí quedaría un argumento).
let password = process.env.AUTH_PASSWORD || "";
if (!password) {
  const rl = createInterface({ input: stdin, output: stdout });
  password = await rl.question("Contraseña (mínimo 10 caracteres): ");
  const repetir = await rl.question("Repetir contraseña: ");
  rl.close();
  if (password !== repetir) {
    console.error("\nLas contraseñas no coinciden.");
    process.exit(1);
  }
}
if (password.length < 10) {
  console.error("\nLa contraseña debe tener al menos 10 caracteres.");
  process.exit(1);
}

const hash = await hashPassword(password);
const ahora = new Date().toISOString();

// ── Escribir en data/auth.json (modo archivo) ──
const AUTH = path.join(process.cwd(), "data", "auth.json");
let db = { users: [], credentials: {}, memberships: [], sesiones: [], throttle: {}, audit: [] };
try {
  db = { ...db, ...JSON.parse(await readFile(AUTH, "utf8")) };
} catch {
  /* no existe todavía */
}

let user = db.users.find((u) => u.email === email);
if (!user) {
  user = { id: randomUUID(), email, nombre, activo: true, creadoEn: ahora };
  db.users.unshift(user);
}
db.credentials[user.id] = { hash, actualizadoEn: ahora };

const yaEsta = db.memberships.find((m) => m.userId === user.id && m.professionalId === pid);
if (yaEsta) {
  yaEsta.activo = true;
  yaEsta.rol = rol;
  yaEsta.permisos = permisosPorRol(rol);
} else {
  db.memberships.unshift({
    id: randomUUID(),
    userId: user.id,
    professionalId: pid,
    rol,
    permisos: permisosPorRol(rol),
    activo: true,
    creadoEn: ahora,
  });
}

await mkdir(path.dirname(AUTH), { recursive: true });
await writeFile(AUTH, JSON.stringify(db, null, 2), "utf8");

console.log(`\n✅ Cuenta lista en data/auth.json`);
console.log(`   ${nombre} <${email}> — rol ${rol} — consultorio ${pid}`);
console.log(`\n⚠️  Al existir una cuenta, este consultorio DEJA de aceptar la contraseña vieja.`);
console.log(`   Entrá con el email y la contraseña que acabás de definir.\n`);
console.log(`── Para producción (Supabase), pegá esto en el SQL Editor: ──\n`);
console.log(`insert into auth_state (id, data, rev) values ('identidad', '${JSON.stringify(db).replace(/'/g, "''")}'::jsonb, 1)
  on conflict (id) do update set data = excluded.data, rev = auth_state.rev + 1;\n`);
