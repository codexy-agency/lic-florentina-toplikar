# Arquitectura

> **Documento vivo.** Refleja cómo funciona el sistema HOY. Si cambiás una pieza
> estructural, actualizá esto en el mismo commit.
> Última actualización: 2026-07-29.

## Qué es

Plataforma para consultorios de psicología. Dos caras:

- **Sitio público** — landing del profesional + reserva de turnos online.
- **Panel `/admin`** — agenda, pacientes (ficha clínica), finanzas, servicios,
  profesionales, disponibilidad y un asistente de IA con voz.

Está evolucionando de **single-tenant** (un consultorio) a **SaaS multi-tenant**
(muchos psicólogos, cada uno con su sitio y su panel aislados).

## Stack

| Capa | Tecnología |
|---|---|
| Lenguaje | TypeScript |
| Framework (front + back) | Next.js 16 (App Router, Server Actions, Route Handlers, `proxy.ts`) |
| UI | React 19 + Tailwind CSS 4 |
| Base de datos | Supabase (PostgreSQL) |
| IA | OpenAI (chat con function calling + Whisper para voz) |
| Hosting | Vercel |
| 3D / efectos | three, vanta, @splinetool |

> Next 16 renombró la convención `middleware` → **`proxy.ts`**.

## Flujo de un request

```
Request
  │
  ▼
proxy.ts  ── resuelve TENANT por host ──► setea header x-tenant-pid
  │          (fail-closed: host desconocido = 404)
  │          y en /admin valida que la sesión sea DE ESE tenant
  ▼
Página / Route Handler / Server Action
  │
  ▼
lib/store.ts ── lee x-tenant-pid ──► datos SOLO de ese consultorio
  │
  ▼
Supabase (app_state) ó data/db.<tenant>.json (local)
```

## Multi-tenant

**Estado actual: Fase 0 + blindaje.** Ver `decisiones/ADR-0001` y `ADR-0002`.

- **Resolución por host** (`lib/tenant.ts`): el mapa `TENANTS` (env, JSON) asocia
  host o slug → `professional_id` (UUID). Match exacto por host; el match por slug
  solo se acepta bajo `PLATFORM_DOMAIN` y con un único label.
- **Dos modos:**
  - *Single-tenant* (sin `TENANTS`): todo va a `PROFESSIONAL_ID`. Comportamiento histórico.
  - *Multi-tenant* (con `TENANTS`): **fail-closed**. Un host no mapeado devuelve 404
    y el store lanza. Nunca se degrada al tenant por defecto.
- **Aislamiento de datos:** cada consultorio tiene su fila en `app_state`
  (`professional_id`) o su archivo `data/db.<uuid>.json` en local.

⚠️ **Hoy el aislamiento lo garantiza la APLICACIÓN, no la base.** Se usa la
`service_role` key de Supabase, que saltea RLS. Ver [SEGURIDAD.md](SEGURIDAD.md).

## Autenticación

- Contraseña **por consultorio** (`ADMIN_PASSWORDS`, JSON `professional_id → passphrase`).
  En single-tenant se usa `ADMIN_PASSWORD`.
- Cookie de sesión firmada con **HMAC-SHA256** (Web Crypto, compatible con el edge).
  Payload: `ok.<version>.<tenant>.<timestamp>` — **el tenant va dentro de lo firmado**,
  así una cookie emitida para un consultorio no vale en otro.
- Verificación **única y centralizada**: `sesionValida()` en `lib/session.ts`.
  Todas las server actions y route handlers del panel la usan (no llamar
  `verifyToken` suelto: sin el tenant, la cookie de un psicólogo valdría en el panel de otro).
- TTL 12 h + `ADMIN_SESSION_VERSION` para revocación global.
- **Fail-closed**: sin `ADMIN_SECRET` no se firma ni valida nada.

## Capa de datos (`lib/store.ts`)

- **Un blob JSONB por profesional** en la tabla `app_state`, con lock optimista
  por columna `rev` (escritura condicional + reintentos con backoff).
- Fallback a archivo local (`data/db*.json`) cuando no hay Supabase configurado.
- Cola in-process (`mutate`) que serializa los read-modify-write.
- Las firmas públicas son estables: migrar a tablas relacionales = cambiar el
  cuerpo, no la interfaz.

**Deuda conocida:** el blob único no escala y las tablas relacionales con RLS ya
están escritas (`supabase/migrations/0001-0003`) pero **no se usan**.

## Piezas clave

| Archivo | Rol |
|---|---|
| `proxy.ts` | Resuelve tenant, fail-closed, protege `/admin` |
| `lib/tenant.ts` | Resolución y validación de tenant (edge-safe) |
| `lib/auth.ts` | Contraseñas por tenant, firma y verificación del token |
| `lib/session.ts` | `sesionValida()` — única verificación de sesión server-side |
| `lib/store.ts` | Toda la persistencia y la lógica de dominio |
| `lib/scheduling/slots.ts` | Motor de turnos (zona AR, UTC-3 fijo) |
| `lib/assistant/tools.ts` | Herramientas del asistente IA (lectura + escritura con confirmación) |
| `lib/telegram.ts` | Notificaciones (chat **por consultorio**) |

## Reglas de dominio importantes

- **`esImpaga()`** (`lib/store.ts`) es la **única** definición de deuda en toda la app:
  sin pagar **y** la sesión ya ocurrió (realizada, o confirmada con fecha vencida).
  La usan Pacientes, la ficha, Finanzas y el asistente. Ver `ADR-0003`.
- **Zona horaria:** todo el motor de turnos usa hora de Argentina con offset fijo
  `-03:00`. Los ISO se generan siempre en "pared AR" (`nowIsoAR`, `arLocalToIso`).
- **Datos de salud:** el motivo de consulta y las notas clínicas **nunca** salen
  a terceros (no van a Telegram ni a la IA).

## Entorno de trabajo

- Se **edita y compila en `C:\dev\lic-florentina-toplikar`** (tiene `node_modules`).
- El **repo git** es `C:\Users\Carlos\OneDrive\lic-florentina-toplikar`; los archivos
  se espejan ahí después de verificar.
- Deploy: push a `master` → Vercel despliega solo.
