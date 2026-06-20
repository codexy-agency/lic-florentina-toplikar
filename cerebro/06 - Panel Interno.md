---
tags: [proyecto, producto]
updated: 2026-06-19
---

# 06 - Panel Interno

El panel interno vive bajo `/admin` y es la herramienta de trabajo de la profesional. Desde ahí ve las solicitudes que entran por el sitio público, las confirma/reprograma/rechaza, lleva la agenda de turnos confirmados, la lista de pacientes y configura su disponibilidad. Es la contracara del [[05 - Sitio Publico]]: lo que la profesional define acá se expande automáticamente al sitio (ver [[03 - Motor de Turnos]]).

En clave SaaS (ver [[09 - SaaS Multi-tenant]]), este panel es el que cada profesional contratante va a tener para sí. Hoy es single-tenant en archivo JSON; el camino multi-tenant está descrito en [[10 - Roadmap]].

## Rutas y archivos

| Pieza | Archivo | Tipo |
| --- | --- | --- |
| Login (UI) | `app/admin/login/page.tsx` | Client Component |
| Login/logout (API) | `app/api/admin/route.ts` | Route Handler (POST/DELETE) |
| Auth (firma HMAC) | `lib/auth.ts` | Lib (Web Crypto, Edge-compatible) |
| Protección de rutas | `proxy.ts` | Proxy (ex-"middleware" en Next 16) |
| Dashboard | `app/admin/page.tsx` | Server Component |
| Acciones del dashboard | `app/admin/actions.ts` | Server Actions |
| Editor de disponibilidad (página) | `app/admin/disponibilidad/page.tsx` | Server Component |
| Editor de disponibilidad (UI) | `components/DisponibilidadEditor.tsx` | Client Component |
| Guardar disponibilidad | `app/admin/disponibilidad/actions.ts` | Server Action |
| Notificación de turno | `lib/telegram.ts` | Lib |

## Autenticación

> [!warning] Auth custom, NO Supabase Auth
> Hoy la autenticación es una contraseña única por instancia + cookie de sesión firmada con HMAC. No hay usuarios, ni roles, ni Supabase Auth todavía. Eso queda PENDIENTE y se documenta en [[07 - Supabase]] y [[10 - Roadmap]].

### `lib/auth.ts` — el corazón

La librería usa **Web Crypto** (`crypto.subtle`) en vez de `node:crypto`, precisamente para que la misma función pueda correr en el **Edge Runtime** del proxy. Por eso `makeToken` y `verifyToken` son **async** (las operaciones de Web Crypto devuelven promesas).

- `SESSION_COOKIE` = `"pp_admin"` — nombre exportado de la cookie, único punto de verdad para que API, proxy y server actions coincidan.
- `PASSWORD` viene de `process.env.ADMIN_PASSWORD` (fallback de demo `"paulina2026"`).
- `SECRET` viene de `process.env.ADMIN_SECRET` (fallback `"cambia-este-secreto-en-produccion"`).
- `checkPassword(input)` compara la contraseña con `safeEqual`, una comparación **de tiempo constante** (XOR acumulativo) para no filtrar info por timing.
- `sign(value)` importa el `SECRET` como clave HMAC-SHA256 y devuelve la firma en hex.
- `makeToken()` arma un payload `ok.<timestamp>` y lo concatena con su firma: `ok.<ts>.<sig>`.
- `verifyToken(token)` separa el payload de la firma (por el **último** punto, `lastIndexOf(".")`, porque el payload contiene puntos), re-firma el payload y compara con `safeEqual`.

```ts
export async function makeToken(): Promise<string> {
  const payload = `ok.${Date.now()}`;
  return `${payload}.${await sign(payload)}`;
}
```

> [!note] El token no expira por sí mismo
> `verifyToken` solo valida la firma, no chequea el timestamp del payload. La expiración real la impone la cookie vía `maxAge` (12 h, ver abajo). El `Date.now()` queda dentro del payload pero hoy no se usa para caducar el token del lado servidor.

### `app/api/admin/route.ts` — login/logout

- **POST** `/api/admin`: lee `{ password }` del body (con `.catch` que degrada a `password: ""` si el JSON falla), valida con `checkPassword`. Si falla → `401` con `{ ok: false }`. Si pasa → setea la cookie de sesión con `makeToken()`:
  - `httpOnly: true` (no accesible desde JS del cliente)
  - `sameSite: "lax"`
  - `path: "/"`
  - `maxAge: 60 * 60 * 12` → **12 horas**
- **DELETE** `/api/admin`: limpia la cookie (`maxAge: 0`). (El logout que usa el dashboard, sin embargo, va por server action — ver más abajo.)

### `app/admin/login/page.tsx` — la pantalla

Client Component minimalista. Un form con un solo input `password`. En `onSubmit` hace `fetch("/api/admin", { method: "POST", body: { password } })`:
- si `res.ok` → `window.location.href = "/admin"` (navegación dura para que el proxy relea la cookie recién seteada).
- si no → muestra "Contraseña incorrecta. Probá de nuevo." y resetea el estado de loading.

### `proxy.ts` — protección de `/admin`

> [!important] Convención de Next 16: `middleware` → `proxy`
> En esta versión de Next el archivo `middleware.ts` se renombró a `proxy.ts` y la función exportada es `proxy` (no `middleware`). Es una de las breaking changes que obliga a leer la doc antes de codear (ver `AGENTS.md` y [[02 - Arquitectura]]).

```ts
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!(await verifyToken(token))) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
```

- Protege **todo** `/admin/*` **excepto** la pantalla de login (`/admin/login`), sino sería un loop de redirects.
- Corre en Edge → por eso `verifyToken` tiene que ser Web Crypto y async.
- Si no hay token válido, redirige a `/admin/login`.

## Dashboard — `app/admin/page.tsx`

Server Component con `export const dynamic = "force-dynamic"` (no se cachea: cada visita lee el estado real). Carga en paralelo:

```ts
const [solicitudes, pacientes, s] = await Promise.all([
  listSolicitudes(),
  listPacientes(),
  stats(),
]);
```

(`listSolicitudes`, `listPacientes`, `stats` salen del store JSON — ver [[04 - Capa de Datos]].)

Y deriva dos vistas:
- `pendientes` = solicitudes con `estado === "pendiente"`.
- `agenda` = solicitudes con `estado === "confirmado"`, ordenadas por `startsAt` ascendente.

### Bloques de la pantalla

1. **Header**: nombre de la profesional (demo "Paulina Pilotti"), botón "Configurar disponibilidad" (`/admin/disponibilidad`), "Ver sitio" (`/`) y "Salir" (form que dispara la server action `logout`).
2. **Stats** (3 tarjetas): `s.pendientes`, `s.confirmados`, `s.pacientes`.
3. **Bandeja de solicitudes** (`pendientes`): cada solicitud muestra nombre, contacto, un badge de modalidad (Online / Presencial con colores), **el slot que eligió el paciente** (`Eligió: {fechaHoraAR(x.startsAt)} hs`) o, si no eligió slot, su `preferencia` textual, más `motivo` y fecha de recepción. Acciones por solicitud:
   - Form **Confirmar**: tiene un `datetime-local` precargado con el slot elegido (`isoToArLocal(x.startsAt)`). Si la profesional lo deja como está, confirma ese slot; si lo cambia, reprograma al confirmar. El botón dice "Confirmar" o "Confirmar con fecha" según haya o no slot previo.
   - Form **Rechazar**.
   - Link **Responder por WhatsApp** → `https://wa.me/<contacto sin no-dígitos>`.
4. **Próximos turnos** (`agenda`): cada turno confirmado muestra nombre, modalidad, contacto y horario, con dos acciones: **Reprogramar** (otro `datetime-local`) y **Marcar realizado**.
5. **Pacientes**: grilla de pacientes (se crean automáticamente al confirmar un turno). Si está vacía: "Los pacientes se crean automáticamente al confirmar un turno."
6. **Pie**: nota honesta de MVP — "datos en archivo local. En producción: Supabase + facturación AFIP + recordatorios automáticos." (alineado con [[10 - Roadmap]]).

> [!note] Formato de fechas
> El dashboard usa dos helpers de `lib/scheduling/slots.ts` (ver [[03 - Motor de Turnos]]): `fechaHoraAR` para mostrar al humano e `isoToArLocal` para precargar inputs `datetime-local`. Hay además un `fmt()` local que formatea con `toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })` para el "Recibido …".

## Acciones del dashboard — `app/admin/actions.ts`

Archivo `"use server"`. Todas reciben `FormData`, mutan el store y hacen `revalidatePath("/admin")`.

| Acción | Qué hace |
| --- | --- |
| `aceptarSolicitud` | Confirma una solicitud. El campo `fecha` es **opcional**: si viene vacío, confirma el slot que el paciente ya eligió; si viene completo, reprograma a esa fecha (calcula `endsAt` con `endFromStart(startsAt, config.slotDurationMin)`). Llama a `setEstado(id, "confirmado", startsAt, endsAt)`. |
| `reprogramarTurno` | Igual que aceptar, pero la `fecha` es **obligatoria** (si falta, no hace nada). Recalcula `endsAt` y deja el estado en `confirmado`. |
| `rechazarSolicitud` | `setEstado(id, "rechazado")`. |
| `marcarRealizado` | `setEstado(id, "realizado")`. |
| `logout` | Borra la cookie `SESSION_COOKIE` y `redirect("/admin/login")`. |

```ts
export async function aceptarSolicitud(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;
  const fechaLocal = String(formData.get("fecha") || "").trim();
  let startsAt: string | undefined;
  let endsAt: string | undefined;
  if (fechaLocal) {
    startsAt = arLocalToIso(fechaLocal) || undefined;
    if (startsAt) {
      const { config } = await getScheduling();
      endsAt = endFromStart(startsAt, config.slotDurationMin);
    }
  }
  await setEstado(id, "confirmado", startsAt, endsAt);
  revalidatePath("/admin");
}
```

La conversión de fechas (`arLocalToIso`, `endFromStart`) maneja la zona Argentina fija (UTC-3, sin DST) — detalle en [[03 - Motor de Turnos]]. La persistencia (`setEstado`, `getScheduling`) es del store — ver [[04 - Capa de Datos]].

## Editor de disponibilidad

Es donde la profesional define qué horarios ofrece. Lo que guarda acá alimenta directamente el cálculo de slots del sitio público.

### Página — `app/admin/disponibilidad/page.tsx`

Server Component (`dynamic = "force-dynamic"`). Lee `getScheduling()` y pasa `config`, `rules` y `exceptions` como props iniciales al componente cliente `DisponibilidadEditor`.

### UI — `components/DisponibilidadEditor.tsx`

Client Component con estado local. Tres bloques:

1. **Ajustes** (la `SchedulingConfig`): cuatro inputs numéricos:
   - `slotDurationMin` — Duración (min)
   - `bufferAfterMin` — Descanso entre turnos (min)
   - `minNoticeHours` — Anticipación mínima (hs)
   - `bookingWindowDays` — Reservar hasta (días)
2. **Horario semanal**: una fila por día (`DIAS` ordena de Lunes a Domingo). Cada día puede tener **varias franjas**, y cada franja es `{ startTime, endTime, modalidad }` con `modalidad` online/presencial. Funciones locales:
   - `addFranja(day)` — agrega una franja default `09:00–13:00 online`.
   - `setFranja(day, idx, patch)` — edita una franja.
   - `delFranja(day, idx)` — borra una franja.
   - `copiarLunesATodos()` — copia las franjas del lunes a los días **hábiles** (lun-vie; no toca sábado ni domingo). El botón dice "Copiar lunes a días hábiles".
3. **Días que no atiende** (bloqueos): un `date` picker + botón "Bloquear" agrega fechas a una lista (`blocked`), evitando duplicados y manteniéndola ordenada. Cada fecha bloqueada se muestra como chip removible. Pensado para feriados/vacaciones/días puntuales.

Al **Guardar**, aplana `byDay` a un array de reglas `{ weekday, startTime, endTime, modalidad }` y llama a la server action con `{ config, rules, blockedDates: blocked }`. El botón muestra estados `guardando` → `ok` (✓ Guardado, que se auto-resetea a los ~2,2 s).

### Server Action — `app/admin/disponibilidad/actions.ts`

`guardarDisponibilidad(payload)` es donde se valida TODO de nuevo. Dos cosas importantes:

> [!important] Defensa en profundidad
> Aunque el `proxy.ts` ya protege `/admin`, esta server action **vuelve a verificar el token** por su cuenta:
> ```ts
> const token = (await cookies()).get(SESSION_COOKIE)?.value;
> if (!(await verifyToken(token))) throw new Error("No autorizado");
> ```
> Las server actions son endpoints invocables; no se confía solo en el proxy.

Después saneamiento estricto (no se confía en el input del cliente):
- **Config**: cada número pasa por `clampInt(valor, min, max, default)`. Si no es finito, usa el default; sino lo recorta al rango:

  | Campo | min | max | default |
  | --- | --- | --- | --- |
  | `slotDurationMin` | 10 | 240 | 50 |
  | `bufferAfterMin` | 0 | 120 | 10 |
  | `minNoticeHours` | 0 | 168 | 24 |
  | `bookingWindowDays` | 1 | 120 | 30 |

- **Reglas**: se filtran las que tengan `startTime`/`endTime` con formato `HH:MM` válido y `startTime < endTime`; se les asigna un `id` nuevo (`randomUUID()`), se clampea el `weekday` a 0–6 y la `modalidad` se normaliza a `"presencial"` u `"online"`.
- **Excepciones (bloqueos)**: solo fechas que matcheen `^\d{4}-\d{2}-\d{2}$`, cada una como `{ id, date, type: "block_day" }`.

Finalmente persiste en paralelo (`saveConfig`, `saveRules`, `setExceptions`) y revalida `/admin/disponibilidad` y `/admin`. El detalle del store y los tipos está en [[04 - Capa de Datos]]; cómo estas reglas se expanden a slots concretos, en [[03 - Motor de Turnos]].

## Notificación de turno — `lib/telegram.ts`

`notificarTurno(s: Solicitud)` avisa a la profesional por Telegram cuando entra un turno nuevo. Se configura con `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID` en `.env.local`.

- **Modo demo seguro**: si faltan las credenciales, loguea `[telegram] sin credenciales — turno no notificado (modo demo)` y **no rompe nada**.
- **Escapado MarkdownV2**: la función `esc()` escapa los caracteres especiales de MarkdownV2 (`_ * [ ] ( ) ~ \` > # + - = | { } . !`). Es una corrección detectada en auditoría: un nombre con `*` o `_` rompía el formato y hacía fallar la API de Telegram.
- Arma el mensaje con nombre, contacto, modalidad, horario (`fechaHoraAR(s.startsAt)` o la preferencia, o "a coordinar") y motivo opcional, y lo manda a `sendMessage` con `parse_mode: "MarkdownV2"`. Todo dentro de un `try/catch` que loguea el error sin tirar la request.

```ts
function esc(s: string) {
  return s.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, "\\$1");
}
```

> [!note] Dónde se dispara
> `notificarTurno` se invoca al crearse una solicitud desde el sitio público (flujo de reserva, ver [[03 - Motor de Turnos]] y [[05 - Sitio Publico]]). Esta nota documenta la lib en sí; el punto de invocación pertenece al flujo de reserva.

## Pendientes conocidos

- **Sin Supabase Auth / sin multi-usuario**: una sola contraseña por instancia (ver [[07 - Supabase]], [[09 - SaaS Multi-tenant]]).
- **Persistencia en JSON local**: todo lo de arriba escribe a `data/db.json`. El salto a Postgres + RLS está en [[04 - Capa de Datos]] y [[10 - Roadmap]].
- **Sin recordatorios automáticos, sin facturación**: hoy la única notificación es el aviso de Telegram a la profesional. Recordatorios al paciente y facturación AFIP están listados como futuro en el propio pie del dashboard y en [[10 - Roadmap]].

## Ver también

- [[03 - Motor de Turnos]]
- [[04 - Capa de Datos]]
- [[05 - Sitio Publico]]
- [[07 - Supabase]]
- [[09 - SaaS Multi-tenant]]
- [[10 - Roadmap]]
