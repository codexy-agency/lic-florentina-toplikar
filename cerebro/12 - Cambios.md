---
tags: [proyecto, changelog]
updated: 2026-06-20
---

# 12 - Cambios

Bitácora de cambios grandes (lo más nuevo arriba). El detalle de cada área está en su nota.

## 2026-06-20 — Conexión a Supabase (single-tenant, JSONB)

Proyecto correcto del cliente: **`nojgdkesngpbaidqperp`** (cuenta licpaulinapilotti@gmail.com), accesible por MCP. Migraciones 0003/0004/0005 aplicadas + Paulina creada (`professional_id 3ba6c144-…`) + estado inicial sembrado.

**Decisión de arquitectura:** persistencia **single-tenant** como **JSONB versionado** en `public.app_state` (no las tablas relacionales, que quedan como destino multi-tenant). El store (`lib/store.ts`) solo cambió `read/writeAtomic/mutate` para despachar a Supabase (optimistic-lock con `rev`) o al archivo según `supabaseConfigurado` (URL+SERVICE_ROLE+PROFESSIONAL_ID). Las 25 funciones quedaron iguales.

> ⚠️ **NO se usa la anon key** (lo que digan notas viejas queda superado): en single-tenant TODO va server-side con `service_role`. `getPublicClient()` se eliminó. `app_state` tiene RLS solo-service_role + cifrado en reposo de Supabase. Probado/testeado: app↔Supabase solo se prueba en **Vercel** (esta PC no llega por red); las queries/optimistic-lock se verificaron por MCP. Revisado por workflow de agentes (0 críticos; fixes de atomicidad de disponibilidad, logging, dead-code anon, env-vars admin aplicados). Ver [[supabase-acceso-red]].

## 2026-06-20 — Multi-servicio + multi-profesional (esquema "Lumière")

Se replicó el esquema de un video de referencia (TikTok @crisoftdev, "Lumière Estética"): pasar de "1 profesional + modalidad" a **N servicios × N profesionales**, con reserva por pasos y panel ampliado. Construido sobre el store local (testeado con build + capturas; Supabase se conecta después — ver [[07 - Supabase]] y [[supabase-acceso-red]] en memoria).

**Datos** ([[04 - Capa de Datos]]): tipos `Service` y `Staff` en `lib/scheduling/types.ts`; `lib/store.ts` suma `services`/`staff` + funciones (`listServices`, `saveServices`, `listStaff`, `saveStaff`, `getBookingConfig`). `Solicitud` ahora guarda `serviceId/serviceName/staffId/staffName`. `getBusy(staffId)` filtra ocupados **por profesional** (dos profesionales pueden tener el mismo horario sin pisarse — verificado: 200/200/409).

**Motor** ([[03 - Motor de Turnos]]): `getAvailableSlots` acepta `durationMin` (override del servicio). Verificado: Terapia de pareja (60') da 09:00/10:10/11:20; Sesión individual (50') da 09:00/10:00/11:00/12:00.

**Reserva pública** ([[05 - Sitio Publico]]): `components/TurnoForm.tsx` reescrito como **wizard de 4 pasos**: Servicio → Profesional → Horario → Datos, con barra de progreso. Si un servicio lo ofrece una sola profesional, se saltea el paso 2. Nuevo `GET /api/reservar-config` (servicios + staff activos); `/api/slots` y `/api/turnos` reciben `serviceId/staffId`.

**Panel interno** ([[06 - Panel Interno]]): nav con pestañas (`components/AdminNav.tsx` + `AdminHeader.tsx`): **Agenda · Servicios · Profesionales · Disponibilidad**. Nuevas páginas `/admin/servicios` y `/admin/profesionales` (con asignación de qué servicio hace cada profesional). La agenda muestra servicio + profesional por turno.

**Supabase** ([[07 - Supabase]]): migración `supabase/migrations/0003_services_staff.sql` (tablas `services`, `staff`, `staff_services` + columnas `service_id/staff_id` en reservas/turnos + RLS por tenant + lectura pública de activos). Incluida en `supabase/apply_all.sql` (idempotente). PENDIENTE de aplicar en el proyecto.

### Pendiente / próximo
- Aplicar `0003` en Supabase y wirear el store a Supabase (solo testeable en Vercel).
- Del esquema Lumière faltan: **vista Calendario**, **Bonos**, **Pagos Mercado Pago** (ver [[10 - Roadmap]]).
- `staff` (personas que atienden) es distinto de `professionals` (el tenant/dueño): hoy en el store local `staff` es del único negocio; en Supabase `staff.professional_id` lo ata al tenant. Ver [[09 - SaaS Multi-tenant]].

## 2026-06-20 — Página de reserva + CTAs
Página dedicada `/reservar` (estática, optimizada) y CTAs "Reservar turno" en nav, hero, barra móvil y cierre (`components/BookingCTA.tsx`).

## Ver también
- [[10 - Roadmap]]
- [[00 - Indice]]
