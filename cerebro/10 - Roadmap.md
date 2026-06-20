---
tags: [proyecto, producto]
updated: 2026-06-19
---

# 10 - Roadmap

Roadmap priorizado del producto. El objetivo de fondo es doble: (1) terminar de cerrar el ciclo del turno para la profesional demo y (2) convertir el sistema en un SaaS multi-tenant replicable que **Codexy** revende a muchos consultorios (cada uno con su `/admin`, su agenda y su marca). Ver [[01 - Vision y Negocio]] y [[09 - SaaS Multi-tenant]].

El roadmap está dividido en **3 niveles** por impacto/esfuerzo. Cada item tiene estado `[HECHO]` o `[PENDIENTE]`. Lo `[HECHO]` ya está en el código y verificado; lo `[PENDIENTE]` está descripto pero **no** implementado (no inventamos features).

## Estado base (lo que ya está HECHO)

Antes de la lluvia de ideas, esto es el piso real sobre el que construimos:

- **Motor de slots nativo** tipo Calendly, zona Argentina fija (UTC-3, sin DST). Ver [[03 - Motor de Turnos]].
- **Config de disponibilidad interna**: la profesional define su agenda en `/admin/disponibilidad` y se expande al sitio público automáticamente.
- **Panel admin**: confirmar / reprogramar / rechazar turnos. Ver [[06 - Panel Interno]].
- **Anti-doble-reserva**: si dos personas pelean el mismo slot, el segundo recibe `409` y el slot ocupado desaparece de la oferta.
- **Notificación a Telegram** cuando entra una solicitud de turno.
- **Auth custom**: contraseña propia con HMAC (Web Crypto, compatible Edge), cookie de sesión y `proxy.ts` protegiendo `/admin`. Todavía **no** es Supabase Auth.

> Nota de convención: este Next no es el de siempre (ver `AGENTS.md`). Ya se migró `middleware` -> `proxy` (`proxy.ts`). Ante cualquier cambio, leer `node_modules/next/dist/docs/` antes de codear.

---

## Nivel 1 — Cerrar el ciclo del turno

Alto impacto, bajo esfuerzo. Son las piezas que faltan para que un turno pase de "solicitado" a "gestionado de punta a punta" sin intervención manual. Es lo que más valor percibido agrega por menos código.

| Idea | Nivel | Estado | Esfuerzo | Nota relevante |
|---|---|---|---|---|
| Hold de 10 min al elegir slot (reserva temporal anti-colisión) | 1 | `[PENDIENTE]` | Bajo | Extiende el anti-doble-reserva de [[03 - Motor de Turnos]] de un check instantáneo a un lock con expiración |
| Recordatorios automáticos 24h y 2h antes (email + WhatsApp) | 1 | `[PENDIENTE]` | Medio | Reusa el canal de notificaciones; hoy solo existe Telegram (ver [[06 - Panel Interno]]) |
| Confirmación con archivo `.ics` (calendario) | 1 | `[PENDIENTE]` | Bajo | Se genera al confirmar; se adjunta al email de confirmación |
| Link de cancelación/reprogramación para el paciente (token firmado) | 1 | `[PENDIENTE]` | Bajo-Medio | Mismo patrón HMAC que la auth (ver [[02 - Arquitectura]]); el paciente no necesita login |

**Por qué primero:** el hold y el `.ics` son casi gratis y eliminan fricción real (colisiones, "me olvidé del turno"). Los recordatorios bajan el ausentismo, que es la métrica que más le duele a la profesional. El token firmado reusa infraestructura criptográfica que ya existe.

---

## Nivel 2 — Negocio de Codexy (reseller)

Esto es lo que convierte una web de una psicóloga en un **producto vendible N veces**. Es la meta central. Ver [[09 - SaaS Multi-tenant]] y [[07 - Supabase]].

| Idea | Nivel | Estado | Esfuerzo | Nota relevante |
|---|---|---|---|---|
| Multi-tenant con RLS -> N profesionales en la misma app, subdominio por cada uno | 2 | `[PENDIENTE]` (esquema escrito) | Alto | Esquema y políticas ya escritos en `supabase/migrations/0001_init.sql` y `supabase/migrations/0002_rls.sql`; falta aplicar y cablear |
| Onboarding self-service (wizard de disponibilidad + marca) | 2 | `[PENDIENTE]` | Medio-Alto | Generaliza `/admin/disponibilidad` a un alta guiada por tenant |
| Plantillas por rubro (psicólogo, nutricionista, kinesiólogo) | 2 | `[PENDIENTE]` | Medio | Presets de copy, duración de sesión y campos por especialidad |

**Estado clave:** el corazón del multi-tenant (esquema + RLS) **ya está escrito**, no es un deseo. Lo que falta es operativo: aplicar el esquema al proyecto Supabase del usuario y conectar los clientes (`lib/supabase.ts`). Eso lo abren los "Próximos 3 pasos" más abajo.

---

## Nivel 3 — "Wow" premium

Diferenciadores de alto margen para vender tiers más caros. Mayor esfuerzo, pero algunos ya tienen base de datos prevista en el esquema.

| Idea | Nivel | Estado | Esfuerzo | Nota relevante |
|---|---|---|---|---|
| Asistente IA de admisión (pre-entrevista + resumen para el profesional) | 3 | `[PENDIENTE]` | Alto | El core de Codexy es automatización con IA; encaja con [[01 - Vision y Negocio]] |
| Ficha clínica + evolución por paciente | 3 | `[PENDIENTE]` (tablas previstas) | Alto | Tablas `clinical_notes` ya contempladas en el esquema (`supabase/migrations/0001_init.sql`); ver [[04 - Capa de Datos]] |
| Facturación AFIP + cobro/seña con Mercado Pago al reservar | 3 | `[PENDIENTE]` | Alto | La seña al reservar también ataca el ausentismo desde lo económico |
| Dashboard de métricas reales (ocupación, ausentismo, ingresos) | 3 | `[PENDIENTE]` | Medio-Alto | Solo con datos reales; **no** inventar métricas hasta tener volumen |

**Criterio:** el Nivel 3 se justifica recién cuando el Nivel 2 está en producción con varios tenants. La ficha clínica y la facturación tienen implicancias legales/datos sensibles (RLS bien apretado, ver [[07 - Supabase]]); no se apuran.

---

## Próximos 3 pasos concretos

Secuencia mínima para desbloquear el Nivel 2 sin romper nada. Orden estricto.

### 1. Aplicar el esquema multi-tenant a Supabase

Correr las migraciones ya escritas contra el proyecto del usuario (`nojgdkesngpbaidqperp`):

```text
supabase/migrations/0001_init.sql   # tablas multi-tenant + clinical_notes
supabase/migrations/0002_rls.sql    # Row Level Security por tenant
```

Esto crea la base sobre la que se apoyan los pasos 2 y 3. Detalle del esquema en [[07 - Supabase]] y [[04 - Capa de Datos]].

> Recordatorio operativo: el wiring real se edita y compila en `C:/dev/lic-florentina-toplikar` y se espeja a OneDrive. No desplegar a Vercel sin confirmación explícita (ver [[08 - Vercel y Deploy]]).

### 2. Anon key -> flujo de booking (lado público)

Cablear `NEXT_PUBLIC_SUPABASE_ANON_KEY` en el cliente de booking. Es la clave **pública**, OK que viva en el front; la RLS del paso 1 es la que garantiza que cada tenant solo vea lo suyo. Clientes ya preparados en `lib/supabase.ts`.

- Va en `.env.local` y en las env vars de Vercel.
- El booking público pasa de leer/escribir el JSON local (`data/db.json`) a Supabase, respetando RLS.

### 3. Service_role key -> panel admin (lado privado)

Cablear `SUPABASE_SERVICE_ROLE_KEY` para las operaciones de admin (confirmar/reprogramar/rechazar, gestión de disponibilidad).

- **SECRETA**: solo en `.env.local` (gitignored) y env vars de Vercel. **Nunca** en git ni en el cliente.
- Se usa exclusivamente del lado servidor (route handlers / acciones de `/admin`), porque saltea RLS y por eso no puede tocar el navegador.

Con estos 3 pasos, la persistencia deja de ser el JSON local y queda lista para el alta del segundo tenant.

---

## Ver también

- [[06 - Panel Interno]]
- [[07 - Supabase]]
- [[09 - SaaS Multi-tenant]]
- [[03 - Motor de Turnos]]
- [[04 - Capa de Datos]]
- [[08 - Vercel y Deploy]]
