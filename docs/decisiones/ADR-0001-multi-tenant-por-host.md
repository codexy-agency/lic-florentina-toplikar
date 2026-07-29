# ADR-0001 — Multi-tenant resuelto por host, sobre el blob existente

- **Fecha:** 2026-07-29
- **Estado:** aceptada
- **Commits:** `4499d2e` (implementación), `5a390fc` (blindaje)

## Contexto

La plataforma nació para **un** consultorio: el `professional_id` era una variable
de entorno fija (`PROFESSIONAL_ID`) y toda la persistencia (`lib/store.ts`) leía y
escribía la fila de ese único profesional en `app_state`.

Para convertirla en SaaS hacía falta que varios psicólogos convivan en el mismo
despliegue, cada uno con su sitio público y su panel, sin ver los datos del otro.

Las tablas relacionales con RLS por tenant ya estaban escritas
(`supabase/migrations/0001-0003`) pero **sin usar**: migrar a ellas era un
proyecto grande, y bloqueaba validar la idea de SaaS.

## Decisión

Resolver el tenant **por request, a partir del host**, manteniendo el modelo de
datos actual (un blob JSONB por profesional).

- `lib/tenant.ts` mapea host o slug → `professional_id` usando la env `TENANTS` (JSON).
- `proxy.ts` resuelve el tenant y lo propaga en el header interno `x-tenant-pid`.
- `lib/store.ts` lee ese header y scopea todas las lecturas y escrituras.

**Dos modos de operación:**

- **Single-tenant** (sin `TENANTS`): todo va a `PROFESSIONAL_ID`. Idéntico al
  comportamiento histórico — la demo sigue funcionando sin tocar nada.
- **Multi-tenant** (con `TENANTS`): modo estricto **fail-closed**.

## Alternativas consideradas

1. **Migrar primero a las tablas relacionales con RLS.** Es el destino correcto,
   pero es semanas de trabajo con riesgo de migración de datos. Bloqueaba validar
   el negocio. → Se pospone a una fase posterior (dual-write por entidad).
2. **Un despliegue de Vercel por psicólogo.** Aislamiento perfecto, pero
   inoperable: cada alta sería un deploy y una config manual. No escala.
3. **Tenant por ruta (`/p/slug`) en vez de por host.** Más simple de rutear, pero
   el profesional no tiene un dominio propio, que es parte del valor que se vende.
   → Se elige host; la ruta queda disponible como opción futura.

## Consecuencias

**A favor**
- Habilita N consultorios aislados con un cambio quirúrgico (3 archivos), sin
  migrar datos ni tocar el esquema.
- Las firmas públicas del store no cambiaron: la migración futura a tablas
  relacionales sigue siendo "cambiar el cuerpo, no la interfaz".
- Compatible hacia atrás: sin `TENANTS`, nada cambia.

**En contra / pendiente**
- **El aislamiento lo garantiza la aplicación, no la base**: se sigue usando la
  `service_role` key, que saltea RLS. Si esa key se filtra, queda todo expuesto.
  → Mitigación futura: Supabase Auth + anon key + JWT por profesional (Fase 1/3).
- El blob único por profesional sigue sin escalar y serializa las escrituras.
- Dar de alta un tenant todavía es manual (fila en `professionals` + entrada en
  `TENANTS` + dominio en Vercel). El onboarding self-service es una fase aparte.
