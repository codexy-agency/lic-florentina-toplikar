---
tags: [proyecto, referencia]
updated: 2026-06-20
---

# 11 - Glosario y Decisiones

Referencia rápida de términos del dominio/técnicos y registro de decisiones de diseño (mini-ADRs). Si una palabra del repo no se entiende, está acá.

## A — Glosario

**Slot** — Un horario reservable concreto (`startsAt` / `endsAt` en ISO `-03:00`) que el [[03 - Motor de Turnos|motor]] genera a partir de las reglas. Lo que el paciente elige.

**Franja** — Un tramo horario que el profesional configura en un día (ej. Lunes 09:00–13:00 online). De cada franja salen varios slots según duración + descanso.

**Modalidad** — `online` | `presencial`. Cada regla/franja y cada turno tiene una.

**Solicitud vs. Turno confirmado** — Una *solicitud* (`appointment_request`) la crea el paciente desde la web (estado `pendiente`). Pasa a *turno confirmado* (`appointment` / estado `confirmado`) cuando el profesional la acepta en el [[06 - Panel Interno|panel]].

**Hold** — (PENDIENTE, ver [[10 - Roadmap]]) Reserva temporal de un slot mientras el paciente completa sus datos, para evitar que dos personas tomen el mismo horario.

**BusyRange** — Rango ocupado (`{startsAt, endsAt}`) que el motor resta de la oferta de slots. Hoy lo arma `getBusy()` desde las solicitudes con slot en estado pendiente/confirmado.

**Anti-doble-reserva** — Mecanismo que impide reservar un horario ya tomado. En el MVP es un re-chequeo a nivel app (`/api/turnos` devuelve 409). En Supabase lo garantiza un constraint de exclusión `tstzrange`. Ver [[03 - Motor de Turnos]].

**tstzrange** — Tipo de Postgres "rango de timestamps con zona". Con un `EXCLUDE` constraint impide que dos turnos del mismo profesional se solapen, a nivel base de datos.

**RLS (Row Level Security)** — Políticas de Postgres que filtran filas por fila según la sesión. Es lo que aísla a cada profesional en el modelo multi-tenant. Ver [[09 - SaaS Multi-tenant]].

**Tenant / Inquilino** — Cada profesional dentro del SaaS. Clave de tenancy: `professional_id`. Ver [[09 - SaaS Multi-tenant]].

**RPC** — Función de Postgres invocable desde el cliente Supabase. `crear_solicitud_publica()` permite que un visitante anónimo cree una solicitud sin saltear RLS. Ver [[07 - Supabase]].

**service_role vs. anon** — Dos claves de Supabase. `anon` es pública (respeta RLS, va en el cliente). `service_role` es **secreta** y saltea RLS (solo server-side, nunca en git ni en el navegador). Ver [[07 - Supabase]] y [[08 - Vercel y Deploy]].

**Server Action** — Función `"use server"` que corre en el servidor y se invoca desde un form/cliente sin armar una API a mano. Ej.: `guardarDisponibilidad`, `aceptarSolicitud`. Ver [[02 - Arquitectura]].

**Route Handler** — Endpoint HTTP en `app/api/.../route.ts` (ej. `/api/slots`, `/api/turnos`). Ver [[02 - Arquitectura]].

**proxy (ex-middleware)** — En este Next.js el convention `middleware` se renombró a `proxy` (`proxy.ts`). Corre en el borde antes de renderizar; protege `/admin`. Ver [[06 - Panel Interno]].

**Escritura atómica** — Escribir a un archivo temporal y renombrarlo (`rename`) para que nunca quede un JSON a medias. Ver [[04 - Capa de Datos]].

**Wall-clock AR / `arWall`** — Helpers del motor para razonar en hora de pared Argentina (UTC-3 fijo) sin que el huso del servidor ensucie las cuentas. Ver [[03 - Motor de Turnos]].

**BookingCTA** — Componente (`components/BookingCTA.tsx`) del llamado a la acción "Reservar turno" que lleva a la página dedicada `/reservar`. Ver [[05 - Sitio Publico]].

## B — Decisiones (mini-ADRs)

Formato: **Decisión** · *Contexto* · Estado.

1. **Zona horaria UTC-3 fija, sin DST.** *Argentina no aplica horario de verano hoy; un offset fijo evita una dependencia pesada (luxon/Temporal).* El motor es un módulo aislado: si vuelve el DST, se reemplaza solo ese archivo. **Vigente.**

2. **Persistencia MVP en archivo JSON, con firmas estables.** *Permite desarrollar y demostrar sin infra.* `lib/store.ts` expone funciones estables; migrar a Supabase = cambiar solo la implementación interna, no el motor ni la UI. **Vigente (transitoria → Supabase).** Ver [[04 - Capa de Datos]].

3. **Escritura atómica + cola de mutaciones.** *La auditoría detectó condición de carrera al escribir el JSON.* Se serializan las mutaciones y se escribe con tmp+rename. **Vigente.**

4. **Auth custom con HMAC (Web Crypto), no Supabase Auth todavía.** *El MVP necesitaba un login simple y compatible con Edge Runtime.* Es contraseña única global; para multi-tenant migra a Supabase Auth con `professional_id` en el token. **Vigente (a revisar en multi-tenant).** Ver [[09 - SaaS Multi-tenant]].

5. **`middleware` → `proxy` (Next 16).** *AGENTS.md exige respetar deprecaciones.* Se renombró el archivo y la función. **Aplicado.**

6. **Motor de slots como función pura.** *Testeable, predecible y migrable.* Sin efectos secundarios; recibe reglas/config/ocupados y devuelve días con slots. **Vigente.** Ver [[03 - Motor de Turnos]].

7. **No inventar datos, métricas ni features.** *Pedido explícito de profesionalismo del cliente.* La UI y la documentación reflejan solo lo real; lo no hecho se marca PENDIENTE. **Vigente.**

8. **Workflow de 2 directorios (dev → OneDrive).** *OneDrive sincroniza en vivo y rompe `node_modules`/builds.* Se edita y compila en `C:/dev`, se espeja al repo en OneDrive. **Vigente.** Ver [[02 - Arquitectura]].

9. **Multi-tenant en modelo Pool (un proyecto, RLS).** *Costo marginal por cliente ≈ 0 y onboarding simple.* Silo (proyecto por cliente) queda como opción premium. **Vigente.** Ver [[09 - SaaS Multi-tenant]].

10. **Página dedicada `/reservar` + CTAs de turno en todo el sitio.** *El cliente quiere empujar el "sacar turno" como acción principal.* Se sumó `/reservar` (estática, liviana, sin 3D) y el `BookingCTA` en nav, hero, barra móvil y cierre. WhatsApp queda como canal secundario. **Aplicado (2026-06-20).** Ver [[05 - Sitio Publico]].

11. **No tocar el MCP de Supabase conectado.** *Apunta a otro proyecto (`zvsqcbeupeyjtgdguwoc`), no al del cliente.* Orden explícita: trabajar el proyecto real (`nojgdkesngpbaidqperp`) por SQL Editor / CLI / env vars, nunca por ese MCP. **Vigente.** Ver [[07 - Supabase]].

## Ver también

- [[02 - Arquitectura]]
- [[03 - Motor de Turnos]]
- [[04 - Capa de Datos]]
- [[07 - Supabase]]
- [[09 - SaaS Multi-tenant]]
- [[00 - Indice]]
