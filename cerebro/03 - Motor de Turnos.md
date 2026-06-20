---
tags: [proyecto, tecnico]
updated: 2026-06-19
---

# 03 - Motor de Turnos

El motor de slots es el corazón del sistema: dada la disponibilidad que la profesional configura (ver [[06 - Panel Interno]]), produce la lista de horarios concretos que se ofrecen al paciente en el [[05 - Sitio Publico]]. Está partido en dos archivos chicos y deliberadamente austeros:

- `lib/scheduling/types.ts` — los contratos (tipos). Modelan 1:1 las futuras tablas de Supabase.
- `lib/scheduling/slots.ts` — la lógica. Una **función pura** que toma datos y devuelve slots, sin tocar disco, red ni reloj global.

Esa separación es la que permite que el mismo motor sirva al MVP con `data/db.json` (ver [[04 - Capa de Datos]]) y, mañana, a Postgres con RLS (ver [[07 - Supabase]]) sin reescribir nada de la UI.

## Los tipos (`lib/scheduling/types.ts`)

El comentario de cabecera del archivo lo dice explícito: estos tipos *"modelan 1:1 las futuras tablas de Supabase, así la migración es cambiar la implementación del repo, no estos contratos"*. Es decir: el contrato de datos es estable; lo único que cambia al migrar es de dónde salen.

| Tipo | Qué es | Campos clave |
|---|---|---|
| `Modalidad` | Unión literal | `"online" \| "presencial"` |
| `AvailabilityRule` | Regla semanal recurrente | `weekday` (0=domingo … 6=sábado), `startTime`/`endTime` wall-clock AR (`"09:00"`), `modalidad` |
| `SchedulingConfig` | Ajustes globales del profesional | `slotDurationMin`, `bufferAfterMin`, `minNoticeHours`, `bookingWindowDays` |
| `DateException` | Excepción por fecha concreta | `date` (`"2026-07-09"`), `type: "block_day" \| "extra"`, `startTime?`/`endTime?`/`modalidad?`, `reason?` |
| `Slot` | Horario concreto ofrecido al paciente | `startsAt`/`endsAt` (ISO con offset `-03:00`), `modalidad` |
| `DaySlots` | Día con sus slots libres (selector público) | `date`, `label` (`"Mar 15 jul"`), `slots: Slot[]` |
| `BusyRange` | Rango ocupado (turno/solicitud que reserva) | `startsAt`, `endsAt` |

### Detalles que importan

- **`AvailabilityRule.weekday`** usa la convención `0=domingo … 6=sábado`, en hora local AR. Es la base de la recurrencia semanal: "los martes de 9 a 13, online".
- **`DateException`** *gana sobre las reglas semanales*. Hay dos tipos:
  - `block_day` — tapa un día entero (feriado, vacaciones), aunque haya regla semanal.
  - `extra` — abre una franja puntual que no existe en la grilla semanal (usa `startTime`/`endTime`; si no trae `modalidad`, se asume `"online"`).
- **`Slot.startsAt` / `endsAt`** siempre llevan offset `-03:00` explícito en el ISO. No hay ambigüedad de zona en lo que viaja hacia el cliente.
- **`DEFAULT_CONFIG`** es el fallback cuando la profesional todavía no configuró nada:

```ts
export const DEFAULT_CONFIG: SchedulingConfig = {
  slotDurationMin: 50,
  bufferAfterMin: 10,
  minNoticeHours: 24,
  bookingWindowDays: 30,
};
```

Sesión de 50 min, 10 de descanso, se reserva con 24 h de anticipación mínima y la ventana a futuro es de 30 días.

## El algoritmo (`lib/scheduling/slots.ts`)

### Por qué es una función pura

`getAvailableSlots(...)` recibe **todo** lo que necesita por parámetro (`rules`, `config`, `exceptions`, `busy`, y opcionalmente `now`) y devuelve `DaySlots[]`. No lee la base, no llama a APIs, no consulta un reloj global escondido. Consecuencias prácticas:

- **Testeable**: le inyectás un `now` fijo y un set de reglas, y verificás la salida exacta. Sin mocks de I/O.
- **Migrable**: el día que los datos vengan de Supabase en vez del JSON, cambia *quién llena los parámetros* (el repo / store), no el motor. La UI ni se entera. Esto es lo que materializa la promesa de los tipos.
- **Determinista**: misma entrada, misma salida.

### Zona horaria: Argentina UTC-3 fijo

El archivo trabaja con UTC-3 **fijo**, porque hoy Argentina no aplica horario de verano (DST). El comentario de cabecera deja la puerta abierta: *"Si vuelve el horario de verano, se reemplaza este módulo por una versión TZ-aware (luxon/Temporal) sin tocar el resto del sistema"*. Otra vez la función pura paga: el cambio queda contenido en un solo archivo.

La constante es `const AR_OFFSET_H = -3;` y todo el manejo de tiempo pasa por tres helpers internos:

- **`arWall(t: Date)`** — dado un instante (UTC real), devuelve los componentes *wall-clock* AR (`y, m, d, hh, mm, weekday`). Lo hace restando 3 h al instante y leyendo los getters `getUTC*`. Es el "¿qué hora marca el reloj de pared en Viedma?".
- **`arInstant(y, m0, d, "HH:MM")`** — el inverso: dada una fecha AR y una hora de pared, devuelve el `Date` (instante UTC real). Suma las 3 h (`h - AR_OFFSET_H`) porque `09:00 AR (UTC-3) = 12:00 UTC`.
- **`isoAR(y, m0, d, hh, mm)`** — serializa a string ISO con el sufijo `-03:00` ya pegado (`2026-07-15T14:00:00-03:00`). Es lo que termina en `Slot.startsAt`.

Helpers auxiliares: `pad` (dos dígitos), `dateKey` (clave `YYYY-MM-DD`), `overlaps` (solapamiento de rangos **semiabiertos** `[start, end)` — clave para que un turno que termina justo cuando otro empieza no se cuente como conflicto).

### El paso a paso de `getAvailableSlots`

```ts
export function getAvailableSlots({
  now = new Date(), daysAhead, modalidad,
  rules, config, exceptions, busy,
}: Args): DaySlots[] { ... }
```

1. **Ventana temporal**. Calcula `earliest = now + minNoticeHours` (el más temprano reservable) y `window = min(daysAhead ?? bookingWindowDays, bookingWindowDays)`. Ojo: `bookingWindowDays` es un **techo duro** — aunque el front pida `daysAhead` mayor, nunca se pasa de la ventana configurada.
2. **Pre-procesa ocupados**. Convierte cada `BusyRange` a un par de timestamps `[start, end]` una sola vez, fuera del loop.
3. **Recorre día por día** (`for i = 0..window`). Para evitar bordes de medianoche, "sondea" cada día parado en el **mediodía UTC** (`Date.UTC(..., 12)`) y de ahí saca el wall-clock AR con `arWall`. De cada día obtiene su `weekday` y su `dateKey`.
4. **Excepciones primero**:
   - Si hay un `block_day` para esa fecha → `continue` (día tapado, sin slots).
   - Junta las franjas de las `AvailabilityRule` cuyo `weekday` coincide, y **agrega** las franjas `extra` de ese día.
5. **Filtro de modalidad** (opcional). Si vino `modalidad`, descarta las franjas que no coinciden. Si no quedan franjas, `continue`.
6. **Genera slots dentro de cada franja**:
   - `step = (slotDurationMin + bufferAfterMin) * 60_000` — cuánto avanza el cursor entre inicios de slot (sesión **+** buffer).
   - `dur = slotDurationMin * 60_000` — cuánto dura el slot en sí.
   - Recorre desde `fStart` mientras `s + dur <= fEnd` (el slot tiene que entrar entero en la franja), saltando de a `step`.
7. **Dos filtros por slot**:
   - `if (s < earliest) continue;` — descarta lo que cae antes de la anticipación mínima.
   - `if (busyRanges.some(([bs, be]) => overlaps(...))) continue;` — descarta lo que pisa un rango ocupado.
8. **Emite el slot** con `isoAR(...)` para inicio y fin, más su `modalidad`.
9. **Cierre del día**. Si quedaron slots, los ordena por `startsAt` y arma el `DaySlots` con un `label` legible (`"${DIAS[weekday]} ${d} ${MESES[m]}"`, ej. `"Mar 15 jul"`).

El resultado es un `DaySlots[]`: solo los días que tienen al menos un hueco libre, listo para que el selector público lo pinte tal cual.

### Helpers exportados (formato y conversión)

Además del motor, el módulo exporta utilitarios que usan tanto el sitio público como el panel para no reimplementar la aritmética de zona:

| Helper | Para qué | Ejemplo |
|---|---|---|
| `horaAR(iso)` | Hora de pared AR de un ISO | `"14:00"` |
| `fechaHoraAR(iso)` | Etiqueta humana completa | `"Mar 15 jul · 14:00"` |
| `arLocalToIso(local)` | `datetime-local` AR → ISO `-03:00` | `"2026-06-20T14:00"` → `"…T14:00:00-03:00"` (devuelve `""` si es inválido) |
| `endFromStart(startIso, durationMin)` | ISO de fin = inicio + duración, en pared AR | suma minutos y reserializa |
| `isoToArLocal(iso)` | ISO AR → valor para `<input type="datetime-local">` | el inverso de `arLocalToIso` |

## Cómo se expone: `app/api/slots/route.ts`

El endpoint **`GET /api/slots`** es la única puerta del motor hacia el front. Es delgado a propósito:

```ts
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const modalidad = /* "online" | "presencial" | undefined desde el query */;
  const [{ config, rules, exceptions }, busy] = await Promise.all([
    getScheduling(),
    getBusy(),
  ]);
  const dias = getAvailableSlots({ modalidad, rules, config, exceptions, busy });
  return NextResponse.json({ ok: true, dias });
}
```

- Lee `?modalidad=online|presencial` (cualquier otro valor → `undefined`, sin filtro).
- Trae la config/reglas/excepciones con `getScheduling()` y los ocupados con `getBusy()` (ambos desde el store — ver [[04 - Capa de Datos]]), en paralelo con `Promise.all`.
- Le pasa todo a `getAvailableSlots` y responde `{ ok: true, dias }`. Ante cualquier error, `{ ok: false, dias: [] }` con status 500.
- `dynamic = "force-dynamic"` evita que Next cachee la respuesta: la disponibilidad cambia con cada reserva, no puede servirse estática.

> Nota de Next 16: el route handler usa la firma `Request`/`NextResponse` estándar del App Router. Como recuerda el AGENTS.md, *"esto no es el Next que conocés"* — antes de tocar handlers conviene revisar `node_modules/next/dist/docs`.

## El otro lado: reservar (`app/api/turnos/route.ts`)

`GET /api/slots` ofrece huecos; **`POST /api/turnos`** los toma. Acá vive la otra mitad de la integridad del sistema:

- Sanea cada campo con `clean()` (trim + recorte de longitud por campo).
- Valida obligatorios (`nombre`, `contacto`) → 400 si faltan.
- **Anti doble-reserva**: antes de persistir, re-consulta `getBusy()` y vuelve a chequear que el slot siga libre con la misma lógica de solapamiento semiabierto (`s < be && bs < e`). Si alguien lo tomó en el medio, responde **409** (`"Ese horario se acaba de ocupar. Elegí otro."`). Así, el hueco ocupado desaparece de la próxima respuesta de `/api/slots` y no se pisan dos reservas.
- Persiste con `addSolicitud(...)` y dispara `notificarTurno(...)` (Telegram) de forma *fire-and-forget* (`.catch(() => {})`), para no bloquear la respuesta.

El propio código deja anotado el rumbo de [[07 - Supabase]]: *"Anti doble-reserva (mitigación a nivel app; en Supabase lo garantiza un constraint de exclusión `tstzrange`)"*. Hoy la garantía es a nivel aplicación; mañana será una restricción de exclusión en la base, que cierra incluso la ventana de carrera entre el chequeo y el insert.

## El bug de TZ que se corrigió (doble offset)

El riesgo crónico de manejar zonas a mano es **aplicar el offset dos veces**. La trampa: tomar un `Date` (que ya es UTC internamente), restarle 3 h con `arWall` para leer la pared AR, y al reserializar volver a aplicar el offset — terminás con un corrimiento de 3 (o 6) horas. Síntoma típico: slots que aparecen a las 11:00 cuando la regla decía 14:00, o turnos que "saltan" de día cerca de medianoche.

La forma correcta —la que está hoy en el código— mantiene la simetría exacta entre los dos helpers:

- `arWall` **resta** `AR_OFFSET_H` (3 h) para ir de instante UTC → pared AR.
- `arInstant` **suma** ese mismo offset (`h - AR_OFFSET_H`) para ir de pared AR → instante UTC.
- `isoAR` no recalcula nada: recibe componentes de pared ya correctos y solo les **pega el sufijo `-03:00`** como texto.

La regla de oro: el offset se aplica **una sola vez** en cada dirección, y la serialización ISO no vuelve a tocarlo. Sondear cada día al **mediodía UTC** (no a medianoche) refuerza lo mismo: deja un colchón de 12 h para que el cruce UTC↔AR nunca empuje la fecha al día anterior o siguiente. Con esto, los slots caen en la hora de pared que la profesional configuró, y la zona Argentina queda consistente de punta a punta.

## Ver también

- [[04 - Capa de Datos]] — de dónde salen `rules`, `config`, `exceptions` y `busy` (store / `db.json`).
- [[05 - Sitio Publico]] — el selector que consume `GET /api/slots` y postea a `/api/turnos`.
- [[07 - Supabase]] — la migración del repo y el constraint de exclusión `tstzrange`.
- [[06 - Panel Interno]] — `/admin/disponibilidad`, donde se editan reglas y excepciones.
- [[02 - Arquitectura]] — cómo encaja el motor en el conjunto.
- [[11 - Glosario y Decisiones]] — UTC-3 fijo, función pura y otras decisiones de diseño.
