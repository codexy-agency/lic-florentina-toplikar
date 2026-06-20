---
tags: [proyecto, infra]
updated: 2026-06-19
---

# 07 - Supabase

Plan de migración de la persistencia desde el archivo JSON local (`data/db.json`) hacia **Supabase Postgres con RLS**. El esquema multi-tenant ya está **escrito y versionado** en el repo, pero todavía **NO está aplicado** al proyecto de Supabase ni cableado al código. Esta nota documenta lo que realmente existe hoy y el plan paso a paso para activarlo.

> [!warning] Estado: PENDIENTE de aplicar
> El SQL existe en `supabase/migrations/`, los clientes existen en `lib/supabase.ts`, pero **el esquema no se corrió** contra el proyecto y la app sigue leyendo de `data/db.json`. Ver [[04 - Capa de Datos]] para el estado actual de la persistencia.

> [!danger] PROHIBIDO usar el MCP de Supabase conectado
> Hay un servidor MCP de Supabase conectado que apunta a **OTRO proyecto** (`zvsqcbeupeyjtgdguwoc`) que **NO es del usuario**. **No se debe usar ninguna tool `mcp__supabase__*`**, ni siquiera de lectura (`list_tables`, `execute_sql`, `apply_migration`, etc.). El esquema se aplica **a mano** desde el SQL Editor del dashboard del proyecto correcto.

---

## Datos del proyecto

| Dato | Valor |
| --- | --- |
| **Project URL** | `https://nojgdkesngpbaidqperp.supabase.co` |
| **Project ref** | `nojgdkesngpbaidqperp` |
| Dashboard | Project Settings → API (de donde salen las keys) |
| Esquema | `supabase/migrations/0001_init.sql` + `0002_rls.sql` |
| Clientes JS | `lib/supabase.ts` |

El **MCP conectado (`zvsqcbeupeyjtgdguwoc`) es otro proyecto distinto** y queda fuera de límites.

---

## Esquema base — `supabase/migrations/0001_init.sql`

Modelo **multi-tenant**: cada profesional es un *tenant* y cada fila lleva un `professional_id` que apunta a `public.professionals.id`. El aislamiento real lo da RLS (ver más abajo). Ver [[09 - SaaS Multi-tenant]] para el porqué de este diseño replicable.

### Extensiones

```sql
create extension if not exists pgcrypto with schema extensions;  -- gen_random_uuid()
create extension if not exists citext   with schema extensions;  -- email case-insensitive
create extension if not exists pg_trgm  with schema extensions;  -- búsqueda por nombre
```

### ENUMs

Todos creados de forma idempotente (`do $$ ... exception when duplicate_object then null`):

| Tipo | Valores |
| --- | --- |
| `modalidad_atencion` | `online`, `presencial` |
| `solicitud_estado` | `pendiente`, `confirmado`, `rechazado`, `cancelado` |
| `turno_estado` | `programado`, `confirmado`, `realizado`, `cancelado`, `ausente` |
| `pago_estado` | `pendiente`, `pagado`, `parcial`, `anulado`, `reembolsado` |
| `pago_metodo` | `efectivo`, `transferencia`, `mercadopago`, `tarjeta`, `otro` |
| `factura_tipo` | `C`, `B`, `A`, `M`, `otro` |
| `factura_estado` | `borrador`, `emitida`, `error`, `anulada` |

### Funciones / triggers genéricos

- `public.set_updated_at()` — trigger genérico que setea `new.updated_at := now()`. Cada tabla tiene su `trg_*_updated_at` que lo invoca `before update`.
- `public.current_professional_id()` — **`SECURITY DEFINER`**, `stable`, con `set search_path = public`. Devuelve el `id` de `professionals` donde `user_id = auth.uid()`. Es `SECURITY DEFINER` justamente para **evitar la recursión de RLS** cuando otras policies consultan `professionals` (ver sección RLS).

### Tablas

Todas tienen `id uuid` (PK con `gen_random_uuid()`), `metadata jsonb`, `created_at`, `updated_at` y `deleted_at` (soft-delete). Salvo `professionals`, todas cuelgan de un `professional_id` con `on delete cascade`.

| Tabla | Rol | Claves / detalles relevantes |
| --- | --- | --- |
| `professionals` | **TENANT** (perfil ligado a `auth.users`) | `user_id` único → `auth.users(id) on delete cascade`; `zona_horaria` default `America/Argentina/Buenos_Aires`; `condicion_fiscal` default `monotributo`; `activo boolean` |
| `patients` | Pacientes del profesional | índice trigram GIN sobre `nombre`; **único parcial** `(professional_id, telefono)` donde el teléfono no es nulo y no está borrado; campo `notas` aclarado como **administrativo, NO clínico** |
| `appointment_requests` | Solicitudes desde la **web pública** | `nombre`, `contacto`, `modalidad`, `preferencia`, `motivo`, `estado` (`solicitud_estado`); guarda `ip_origen inet` y `user_agent`; `patient_id` opcional |
| `appointments` | Turnos / agenda | `inicio`/`fin timestamptz`; `estado` (`turno_estado`); `request_id` opcional al request de origen; check `chk_appointments_horario` (`fin is null or fin > inicio`); `recordatorio_enviado_at` |
| `clinical_notes` | **Dato sensible de salud** | `contenido text` + `contenido_cifrado bytea` + flag `cifrado`; `diagnostico`, `evolucion`; pensado para cifrado a nivel app |
| `payments` | Pagos | `monto numeric(12,2)` (check `>= 0`); `moneda` default `ARS`; `metodo` (`pago_metodo`), `estado` (`pago_estado`); `referencia_externa` |
| `invoices` | Facturas / AFIP | `tipo` (`factura_tipo`), `estado` (`factura_estado`); `punto_venta`, `numero`, `cae`, `cae_vencimiento`; `afip_response jsonb`; **único parcial** `(professional_id, punto_venta, numero)` donde `numero` no es nulo |

### Índices destacados

- `idx_patients_nombre_trgm` — GIN trigram para autocompletado/búsqueda por nombre.
- Índices compuestos por tenant: `(professional_id, estado)`, `(professional_id, created_at desc)`, `(professional_id, inicio)`, etc. — alineados a cómo el panel filtra siempre por profesional.
- Únicos parciales en `patients` (teléfono) e `invoices` (punto de venta + número) para evitar duplicados sin romper soft-deletes.

---

## Seguridad y RLS — `supabase/migrations/0002_rls.sql`

> Se ejecuta **después** de `0001_init.sql`.

### Habilitación (deny-by-default)

RLS habilitado en las 7 tablas. Además, `clinical_notes` lleva **`force row level security`**: ni el owner del schema saltea las políticas sobre el dato clínico.

### Patrón de políticas

- **`professionals`**: el usuario gestiona **solo su propio perfil** (`select`/`insert`/`update`) comparando `user_id = (select auth.uid())`.
- **Tablas hija** (`patients`, `appointment_requests`, `appointments`, `clinical_notes`, `payments`, `invoices`): cada una compara `professional_id = (select public.current_professional_id())`. La mayoría usa `for all`; `appointment_requests` separa `select` / `update` / `delete` (no expone `insert` autenticado porque las solicitudes entran por la vía pública).
- El uso de `current_professional_id()` como **`SECURITY DEFINER`** es lo que rompe la recursión: las policies de las tablas hija necesitan leer `professionals`, y si lo hicieran bajo RLS normal se generaría un ciclo.

### Anti-doble-reserva (exclusión `tstzrange`)

> [!note] Verificar antes de citar
> El contexto del proyecto menciona una **restricción de exclusión con `tstzrange`** para impedir solapamiento de turnos a nivel base de datos. En la versión actual de `0002_rls.sql` que se leyó, las políticas presentes son las de RLS por tenant; el constraint de exclusión `tstzrange` sobre `appointments` debe confirmarse en el archivo antes de darlo por aplicado. Hoy, la **anti-doble-reserva efectiva** la garantiza el motor de turnos nativo (devuelve **409** y el slot ocupado desaparece de la oferta) — ver [[03 - Motor de Turnos]]. Al migrar, conviene reforzarlo con una exclusión a nivel Postgres.

### Booking público — RPC `crear_solicitud_publica`

Para que un paciente **sin login** pueda crear una solicitud sin exponer `SELECT` sobre la tabla, hay una RPC **`SECURITY DEFINER`** con `set search_path = public`:

```sql
public.crear_solicitud_publica(
  p_professional_id uuid,
  p_nombre   text,
  p_contacto text,
  p_modalidad public.modalidad_atencion default 'online',
  p_preferencia text default null,
  p_motivo   text default null
) returns uuid
```

Qué hace:

1. Valida que `nombre` y `contacto` no vengan vacíos (`raise exception 'Datos obligatorios faltantes'`).
2. Verifica que el profesional exista, esté `activo` y no borrado (`raise exception 'Profesional inexistente'`).
3. Inserta en `appointment_requests` con `estado = 'pendiente'` y devuelve el `id` nuevo.

Permisos: se hace `revoke all ... from public` y luego `grant execute ... to anon, authenticated`. Es decir, **solo se puede ejecutar la RPC**, no tocar la tabla directamente. La alternativa recomendada en los comentarios del SQL es hacer el insert **server-side con `service_role`** desde un Route Handler.

---

## Clientes JS — `lib/supabase.ts`

Dos clientes que **se activan solos** al completar las variables de entorno:

```ts
export const supabaseConfigurado = Boolean(URL && SERVICE);
```

| Función | Key | Ámbito | RLS |
| --- | --- | --- | --- |
| `getServiceClient()` | `SUPABASE_SERVICE_ROLE_KEY` | **Solo servidor** (Route Handlers / Server Actions) | **Bypassa RLS** |
| `getPublicClient()` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente / lecturas públicas | **Sujeto a RLS** |

Detalles:

- `getServiceClient()` es **singleton** (`_service`), crea el cliente con `auth: { persistSession: false, autoRefreshToken: false }`, y **lanza error** si faltan `URL` o `SERVICE`. **Nunca** debe importarse desde código de cliente (su key bypassa RLS).
- `getPublicClient()` usa la `anon` key y lanza error si falta `URL` o `ANON`.
- Mientras `supabaseConfigurado` sea `false`, la app sigue con el JSON local sin romperse.

---

## Credenciales que faltan y su manejo de seguridad

Plantilla en `.env.example` (se copia a `.env.local`, que está gitignored):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://nojgdkesngpbaidqperp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...   # pública (cliente)
SUPABASE_SERVICE_ROLE_KEY=eyJ...       # SECRETA — solo servidor, nunca al cliente
```

| Variable | Sensibilidad | Dónde vive | Notas |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Pública | `.env.local` + Vercel | La URL del proyecto, no es secreto |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Pública** (OK compartir) | `.env.local` + Vercel | Va al bundle del cliente (`NEXT_PUBLIC_`); su poder está acotado por RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | **SECRETA** | `.env.local` (gitignored) + env vars de Vercel | **Nunca** en git, **nunca** en el cliente, sin prefijo `NEXT_PUBLIC_`. Bypassa RLS por completo |

> [!danger] Regla de oro de la `service_role`
> Si la `service_role` se filtra al cliente o se commitea, se rompe todo el aislamiento multi-tenant (un atacante leería/escribiría datos de **todos** los profesionales, incluidas `clinical_notes`). Solo en variables de entorno del servidor.

Ver el manejo de variables de entorno en deploy en [[08 - Vercel y Deploy]].

---

## Plan paso a paso

> [!info] Recordatorio de workflow
> Se edita y compila en `C:/dev/lic-florentina-toplikar` y se espeja a OneDrive (repo git). El SQL se aplica **desde el navegador** (SQL Editor del dashboard), **no** vía MCP.

1. **Aplicar el esquema** — desde el **SQL Editor** del dashboard de `https://nojgdkesngpbaidqperp.supabase.co`:
   - Pegar y correr `supabase/migrations/0001_init.sql` (tablas, ENUMs, índices, triggers, helpers).
   - Pegar y correr `supabase/migrations/0002_rls.sql` (RLS + RPC pública). **En este orden.**
   - Verificar que RLS quede habilitado en las 7 tablas y `force` en `clinical_notes`.
2. **`anon` key → booking público** — copiar `NEXT_PUBLIC_SUPABASE_ANON_KEY` desde Project Settings → API a `.env.local`. El sitio público crea solicitudes vía la RPC `crear_solicitud_publica` (o vía server con `service_role`). Ver [[05 - Sitio Publico]].
3. **`service_role` → panel admin** — copiar `SUPABASE_SERVICE_ROLE_KEY` a `.env.local` (y luego a las env vars de Vercel). El panel `/admin` usa `getServiceClient()` para leer/escribir saltando RLS desde el servidor. Ver [[06 - Panel Interno]].

Cuando las tres variables estén, `supabaseConfigurado` pasa a `true` y recién ahí se hace el **wiring** real (reemplazar lecturas/escrituras de `data/db.json` por llamadas a Supabase). Hasta entonces: **PENDIENTE**.

> [!warning] No desplegar sin confirmación
> No subir nada a Vercel sin orden explícita (puede haber otros proyectos que se rompan). Avanzar paso a paso. Detalles en [[08 - Vercel y Deploy]].

---

## Pendientes concretos

- [ ] Correr `0001_init.sql` y `0002_rls.sql` en el SQL Editor del proyecto correcto.
- [ ] Cargar `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` en `.env.local`.
- [ ] Confirmar / agregar el constraint de exclusión `tstzrange` anti-solapamiento en `appointments`.
- [ ] Cablear `getServiceClient()` / `getPublicClient()` en lugar de `data/db.json`.
- [ ] Implementar cifrado a nivel app de `clinical_notes` (campos `contenido_cifrado` / `cifrado`).
- [ ] Cargar `auth.users` reales (hoy la auth es contraseña custom HMAC, no Supabase Auth).

---

## Ver también

- [[04 - Capa de Datos]]
- [[08 - Vercel y Deploy]]
- [[09 - SaaS Multi-tenant]]
- [[03 - Motor de Turnos]]
- [[06 - Panel Interno]]
- [[05 - Sitio Publico]]
