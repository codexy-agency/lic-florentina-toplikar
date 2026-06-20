---
tags: [proyecto, tecnico]
updated: 2026-06-19
---

# 04 - Capa de Datos

Esta nota documenta `lib/store.ts`: la única puerta de entrada a la persistencia del MVP. Todo lo que el sitio público y el [[06 - Panel Interno]] leen o escriben pasa por acá. La idea de diseño es simple y deliberada: **hoy** los datos viven en un archivo JSON local (`data/db.json`), pero las **firmas** de las funciones están pensadas para que migrar a Postgres ([[07 - Supabase]]) sea cambiar solo el cuerpo, no la interfaz.

## Qué resuelve esta capa

- Un único módulo `lib/store.ts` con funciones `async` que devuelven Promesas. Nadie más toca el archivo JSON directamente.
- Persistencia en `data/db.json` mediante **escritura atómica** (tmp + rename) para no dejar nunca el archivo a medio escribir.
- Una **cola de mutaciones serializada** (`mutate`) que evita carreras en el patrón read-modify-write (la condición de carrera que se detectó en la auditoría).
- Tipos de dominio (`Solicitud`, `Paciente`, `Estado`) y el bloque de `Scheduling` que alimenta al [[03 - Motor de Turnos]].

## Tipos de dominio

Los tipos están definidos en `lib/store.ts` (líneas 15-49) y son la fuente de verdad del shape de datos.

### `Estado` (línea 15)

```ts
export type Estado = "pendiente" | "confirmado" | "rechazado" | "realizado";
```

El ciclo de vida de una solicitud de turno: nace `pendiente`, la profesional la `confirma` o `rechaza`, y eventualmente queda `realizado`.

### `Solicitud` (líneas 17-28)

Lo que carga un visitante del sitio público cuando pide un turno.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `string` | UUID generado en el servidor (`randomUUID`) |
| `nombre` | `string` | quién pide el turno |
| `contacto` | `string` | email o teléfono; se usa como clave para deduplicar pacientes |
| `modalidad` | `string` | `online` / `presencial` |
| `startsAt?` | `string` | slot elegido, ISO con offset `-03:00` (Argentina, sin DST) |
| `endsAt?` | `string` | fin del slot, ISO `-03:00` |
| `preferencia` | `string` | texto libre de respaldo si no eligió un slot concreto |
| `motivo` | `string` | motivo de consulta |
| `estado` | `Estado` | arranca en `pendiente` |
| `creadoEn` | `string` | timestamp ISO de creación |

`startsAt` / `endsAt` son opcionales a propósito: una solicitud puede llegar sin slot exacto (solo con `preferencia` en texto), y el panel asigna el horario al confirmar.

### `Paciente` (líneas 30-37)

Se crea automáticamente al confirmar la primera solicitud de un contacto (ver `setEstado`). Campos: `id`, `nombre`, `contacto`, `modalidad`, `notas` (string vacío al crearse) y `creadoEn`.

### `Scheduling` y `DB` (líneas 39-49)

```ts
interface Scheduling {
  config: SchedulingConfig;
  rules: AvailabilityRule[];
  exceptions: DateException[];
}

interface DB {
  solicitudes: Solicitud[];
  pacientes: Paciente[];
  scheduling: Scheduling;
}
```

`SchedulingConfig`, `AvailabilityRule`, `DateException`, `BusyRange` y `DEFAULT_CONFIG` se importan de `lib/scheduling/types` — la pieza de configuración que detalla el [[03 - Motor de Turnos]]. `Scheduling` es solo un interface interno (no exportado): la profesional lo edita desde `/admin/disponibilidad` y se expande al sitio público automáticamente.

## El shape de `data/db.json`

Así está hoy el archivo (estado real verificado). `solicitudes` y `pacientes` arrancan vacíos; lo único poblado de fábrica son las reglas de disponibilidad de la demo:

```json
{
  "solicitudes": [],
  "pacientes": [],
  "scheduling": {
    "config": {
      "slotDurationMin": 50,
      "bufferAfterMin": 10,
      "minNoticeHours": 24,
      "bookingWindowDays": 30
    },
    "rules": [
      { "id": "r-lun-1", "weekday": 1, "startTime": "09:00", "endTime": "13:00", "modalidad": "online" },
      { "id": "r-lun-2", "weekday": 1, "startTime": "15:00", "endTime": "19:00", "modalidad": "presencial" },
      { "id": "r-mar-1", "weekday": 2, "startTime": "09:00", "endTime": "13:00", "modalidad": "online" },
      { "id": "r-mie-1", "weekday": 3, "startTime": "10:00", "endTime": "14:00", "modalidad": "online" },
      { "id": "r-mie-2", "weekday": 3, "startTime": "16:00", "endTime": "19:00", "modalidad": "presencial" },
      { "id": "r-jue-1", "weekday": 4, "startTime": "09:00", "endTime": "13:00", "modalidad": "online" },
      { "id": "r-vie-1", "weekday": 5, "startTime": "09:00", "endTime": "12:00", "modalidad": "online" }
    ],
    "exceptions": []
  }
}
```

Lectura rápida de `config`: sesiones de **50 min** con **10 min** de buffer después, no se puede reservar con menos de **24 h** de antelación, y la ventana de reserva es de **30 días** hacia adelante. Las `rules` describen la semana tipo (`weekday` 1 = lunes … 5 = viernes), combinando bloques `online` y `presencial`.

## Robustez: lectura tolerante y escritura atómica

### `read()` (líneas 61-78)

- Si el archivo **no existe**, devuelve una base vacía (`emptyDB()`) en vez de explotar.
- Si el JSON está **corrupto**, deja que `JSON.parse` lance: decisión consciente de no perder datos en silencio.
- Normaliza el resultado con defaults (`?? []`, `{ ...DEFAULT_CONFIG, ... }`), así un archivo viejo sin algún campo igual se lee bien.

### `writeAtomic()` (líneas 80-85)

```ts
async function writeAtomic(db: DB): Promise<void> {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  const tmp = `${DB_PATH}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf-8");
  await fs.rename(tmp, DB_PATH); // rename es atómico en el mismo FS
}
```

Nunca se escribe sobre `db.json` directamente. Se escribe a un `.tmp` único y recién al final se hace `rename` —operación atómica dentro del mismo filesystem—. Resultado: un lector nunca ve un archivo a medio escribir. O ve la versión vieja completa, o la nueva completa.

### Cola de mutaciones `mutate()` (líneas 87-98)

```ts
let queue: Promise<unknown> = Promise.resolve();
function mutate<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  const next = queue.then(async () => {
    const db = await read();
    const result = await fn(db);
    await writeAtomic(db);
    return result;
  });
  queue = next.catch(() => {});
  return next;
}
```

El patrón **read-modify-write** es vulnerable a carreras: dos pedidos simultáneos leen el mismo estado, cada uno modifica su copia, y el último `write` pisa al primero (lost update). `mutate` lo encadena todo a una `queue`: cada mutación espera a que termine la anterior antes de leer. Así, la escritura que protege contra **doble reserva** del [[03 - Motor de Turnos]] es consistente — el `getBusy` que ve cada mutación ya incluye lo que escribió la anterior.

Detalle fino: `queue = next.catch(() => {})` evita que un error en una mutación rompa la cadena para las siguientes; el error real igual viaja por `return next` a quien llamó.

> Las **lecturas** (`listSolicitudes`, `stats`, `getBusy`, `getScheduling`) NO pasan por la cola: llaman a `read()` directo. Son baratas y no necesitan serialización; solo las escrituras se serializan.

## Funciones públicas (la API de la capa)

### Solicitudes y pacientes

| Función | Líneas | Qué hace |
|---|---|---|
| `listSolicitudes()` | 102-107 | Devuelve todas las solicitudes ordenadas por `creadoEn` descendente (más nuevas primero). |
| `listPacientes()` | 109-114 | Ídem para pacientes, ordenado descendente. |
| `addSolicitud(input)` | 116-129 | Crea una solicitud con `id`, `estado: "pendiente"` y `creadoEn` autogenerados; la inserta al principio (`unshift`). El `input` es `Omit<Solicitud, "id" \| "estado" \| "creadoEn">`. |
| `setEstado(id, estado, startsAt?, endsAt?)` | 131-159 | Cambia el estado de una solicitud; opcionalmente fija el slot. **Al confirmar crea el paciente** si no existe. Devuelve la `Solicitud` o `null` si no la encuentra. |
| `stats()` | 161-168 | Conteos para el dashboard: `pendientes`, `confirmados`, `pacientes`. |
| `getBusy()` | 170-181 | Devuelve los `BusyRange[]` ocupados: solicitudes `pendiente` o `confirmado` que tengan `startsAt` y `endsAt`. Es lo que consume el motor para tachar slots. |

#### Creación de paciente al confirmar (`setEstado`)

Cuando `estado === "confirmado"`, `setEstado` deduplica por contacto normalizado (`trim().toLowerCase()`) y, si ese contacto no figura todavía, crea un `Paciente` nuevo con las notas vacías. Así el alta de paciente es un efecto del flujo real de turnos, no una carga manual aparte.

### Disponibilidad (configuración del scheduler)

Estas funciones son las que usa `/admin/disponibilidad` ([[06 - Panel Interno]]) para editar lo que después expande el [[03 - Motor de Turnos]]:

| Función | Líneas | Qué hace |
|---|---|---|
| `getScheduling()` | 185-187 | Devuelve el bloque `{ config, rules, exceptions }` completo. |
| `saveConfig(config)` | 189-193 | Reemplaza la `SchedulingConfig` (duración, buffer, aviso mínimo, ventana). |
| `saveRules(rules)` | 195-199 | Reemplaza el set de reglas semanales. |
| `addException(ex)` | 201-205 | Agrega una excepción de fecha (feriado, bloqueo puntual), generándole `id`. |
| `removeException(id)` | 207-211 | Quita una excepción por `id`. |
| `setExceptions(list)` | 213-217 | Reemplaza la lista completa de excepciones de una. |

Todas las de escritura corren dentro de `mutate`, así que comparten la garantía de atomicidad y serialización.

## Por qué las firmas son estables (y por qué importa)

El módulo arranca con un comentario que es la tesis de diseño (líneas 1-3):

> *Firmas estables: migrar a Supabase = cambiar SOLO la implementación interna.*

La idea: el resto de la app (rutas, panel, motor de turnos) depende de **funciones**, no del archivo JSON. `listSolicitudes()` devuelve `Promise<Solicitud[]>` sin que a quien la llama le importe si por dentro lee un archivo o hace `select` en Postgres. Cuando se haga el wiring de [[07 - Supabase]], el plan es reescribir el cuerpo de `read`, `writeAtomic`, `mutate` y las funciones públicas para que peguen contra Postgres con RLS —manteniendo las mismas firmas—. Idealmente, **cero cambios** en los consumidores.

Por eso conviene resistir la tentación de que las rutas lean `db.json` por su cuenta: cada acceso directo al archivo es un punto que habría que migrar a mano después.

## Limitación conocida: el archivo es efímero en serverless

`data/db.json` funciona perfecto en desarrollo local (workflow de 2 directorios: se compila en `C:/dev`, se espeja a OneDrive). Pero en un deploy **serverless** —el destino en [[08 - Vercel y Deploy]]— el filesystem es de solo lectura o efímero: cada invocación puede correr en una instancia distinta y los `writeAtomic` no persisten entre requests. Es decir, en producción serverless esta capa **no sirve como persistencia real**.

Esa es, justamente, la motivación de migrar a [[07 - Supabase]]: una base Postgres compartida, multi-tenant, con RLS. La capa JSON cumple su rol de MVP —probar el dominio y las firmas— y se descarta cuando se hace el wiring. Está marcado como **PENDIENTE**: el esquema ya está escrito (`supabase/migrations/0001_init.sql` y `0002_rls.sql`) y los clientes en `lib/supabase.ts`, pero falta aplicar el esquema y reescribir el cuerpo de `lib/store.ts`.

## Ver también

- [[03 - Motor de Turnos]]
- [[07 - Supabase]]
- [[06 - Panel Interno]]
- [[02 - Arquitectura]]
- [[09 - SaaS Multi-tenant]]
- [[08 - Vercel y Deploy]]
