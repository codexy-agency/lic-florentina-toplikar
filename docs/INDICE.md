# Índice del proyecto

> **Mapa navegable, generado automáticamente.** No lo edites a mano: corré `npm run indice`.
> Última generación: 2026-07-29 · 102 archivos.
>
> Para entender *cómo* funciona el sistema leé [ARQUITECTURA.md](ARQUITECTURA.md);
> para saber *por qué* está así, [decisiones/](decisiones/).


## Núcleo — lógica y datos

| Archivo | Qué hace | Exporta |
|---|---|---|
| [`lib/accounts-store.ts`](../lib/accounts-store.ts) <br><sub>201 líneas</sub> | Almacén de IDENTIDAD (cuentas, membresías, sesiones, auditoría). | `AppUser`, `Membership`, `Sesion`, `AuditEntry`, `normalizarEmail`, `leerAuth` |
| [`lib/accounts.ts`](../lib/accounts.ts) <br><sub>284 líneas</sub> | Casos de uso de cuentas. Acá viven las reglas de autorización. | `LoginOk`, `LoginError`, `tieneCuentas`, `login`, `sesionActiva`, `revocarSesion` |
| [`lib/auth.ts`](../lib/auth.ts) <br><sub>165 líneas</sub> | Auth mínima para el panel: cookie de sesión firmada con HMAC (Web Crypto, | `SESSION_COOKIE`, `safeEqual`, `checkPassword`, `TokenClaims`, `makeToken`, `readToken` |
| [`lib/marca.ts`](../lib/marca.ts) <br><sub>155 líneas</sub> | Identidad del consultorio: lo que cada psicólogo personaliza de SU sitio. | `PaletaMarca`, `Marca`, `PALETA_DEFECTO`, `PALETAS`, `MARCA_DEFECTO`, `normalizarMarca` |
| [`lib/openai.ts`](../lib/openai.ts) <br><sub>114 líneas</sub> | Cliente mínimo de la Chat Completions API de OpenAI (function calling), por | `ToolCall`, `OAIMessage`, `OAITool`, `aiConfigured`, `OAIResponse`, `aiChat` |
| [`lib/passwords.ts`](../lib/passwords.ts) <br><sub>107 líneas</sub> | Hashing de contraseñas — PBKDF2-HMAC-SHA256 con Web Crypto. | `ITERACIONES`, `hashPassword`, `verifyPassword`, `necesitaRehash`, `DUMMY_HASH`, `validarPassword` |
| [`lib/permisos.ts`](../lib/permisos.ts) <br><sub>109 líneas</sub> | Roles y permisos por consultorio. | `ROLES`, `Rol`, `PERMISOS`, `Permiso`, `Permisos`, `ROL_LABEL` |
| [`lib/ratelimit.ts`](../lib/ratelimit.ts) <br><sub>63 líneas</sub> | Rate limiter en memoria, best-effort. En serverless (Vercel) el estado es por | `RateResult`, `rateLimit`, `clientIp` |
| [`lib/session.ts`](../lib/session.ts) <br><sub>131 líneas</sub> | — | `Sesion`, `tenantDelRequest`, `sesionValida`, `requireSesion`, `requirePermiso`, `puede` |
| [`lib/store.ts`](../lib/store.ts) <br><sub>1199 líneas</sub> | Capa de datos del MVP — persistencia en archivo JSON con escritura ATÓMICA | `Estado`, `Solicitud`, `Paciente`, `NotaClinica`, `MovimientoManual`, `listSolicitudes` |
| [`lib/supabase.ts`](../lib/supabase.ts) <br><sub>44 líneas</sub> | Cliente de Supabase — SOLO servidor (Route Handlers / Server Actions). | `PROFESSIONAL_ID`, `supabaseConfigurado`, `assertBackendConfigOk`, `getServiceClient` |
| [`lib/telegram.ts`](../lib/telegram.ts) <br><sub>98 líneas</sub> | Telegram — notificador de salida + helper reutilizable de envío. | `escMarkdown`, `sendTelegram`, `notificarTurno` |
| [`lib/tenant.ts`](../lib/tenant.ts) <br><sub>112 líneas</sub> | Resolución de tenant (multi-tenant). Módulo EDGE-SAFE: lo usa el proxy | `TENANT_HEADER`, `esUuid`, `esMultiTenant`, `tenantPorDefecto`, `normalizarHost`, `resolveTenantFromHost` |

## Motor de turnos

| Archivo | Qué hace | Exporta |
|---|---|---|
| [`lib/scheduling/slots.ts`](../lib/scheduling/slots.ts) <br><sub>184 líneas</sub> | Motor de generación de slots — FUNCIÓN PURA y testeable. | `getAvailableSlots`, `horaAR`, `fechaHoraAR`, `arLocalToIso`, `endFromStart`, `isoToArLocal` |
| [`lib/scheduling/types.ts`](../lib/scheduling/types.ts) <br><sub>85 líneas</sub> | Tipos del motor de reservas. Modelan 1:1 las futuras tablas de Supabase, | `Modalidad`, `AvailabilityRule`, `SchedulingConfig`, `DateException`, `Slot`, `DaySlots` |

## Asistente IA

| Archivo | Qué hace | Exporta |
|---|---|---|
| [`lib/assistant/tools.ts`](../lib/assistant/tools.ts) <br><sub>501 líneas</sub> | Herramientas del asistente del panel. Las de LECTURA se ejecutan solas; las de | `WRITE_TOOLS`, `PERMISO_POR_TOOL`, `toolsPermitidas`, `toolPermitida`, `runReadTool`, `WriteResult` |

## Panel /admin (páginas y acciones)

| Archivo | Qué hace | Exporta |
|---|---|---|
| [`app/admin/actions.ts`](../app/admin/actions.ts) <br><sub>148 líneas</sub> | — | `aceptarSolicitud`, `reprogramarTurno`, `rechazarSolicitud`, `marcarRealizado`, `marcarNoAsistio`, `ManualState` |
| [`app/admin/asistente/page.tsx`](../app/admin/asistente/page.tsx) <br><sub>32 líneas</sub> | — | `dynamic` |
| [`app/admin/disponibilidad/actions.ts`](../app/admin/disponibilidad/actions.ts) <br><sub>98 líneas</sub> | — | `guardarDisponibilidad`, `setBloqueos` |
| [`app/admin/disponibilidad/page.tsx`](../app/admin/disponibilidad/page.tsx) <br><sub>30 líneas</sub> | — | `dynamic` |
| [`app/admin/equipo/actions.ts`](../app/admin/equipo/actions.ts) <br><sub>115 líneas</sub> | — | `EquipoState`, `invitarMiembro`, `quitarAcceso`, `actualizarMiembro`, `resetearPassword`, `ultimosAccesos` |
| [`app/admin/equipo/page.tsx`](../app/admin/equipo/page.tsx) <br><sub>194 líneas</sub> | — | `dynamic` |
| [`app/admin/error.tsx`](../app/admin/error.tsx) <br><sub>31 líneas</sub> | — | — |
| [`app/admin/finanzas/actions.ts`](../app/admin/finanzas/actions.ts) <br><sub>50 líneas</sub> | — | `agregarMovimiento`, `quitarMovimiento`, `registrarPago`, `quitarPago` |
| [`app/admin/finanzas/export/route.ts`](../app/admin/finanzas/export/route.ts) <br><sub>74 líneas</sub> | — | `dynamic`, `GET` |
| [`app/admin/finanzas/page.tsx`](../app/admin/finanzas/page.tsx) <br><sub>591 líneas</sub> | — | `dynamic` |
| [`app/admin/login/page.tsx`](../app/admin/login/page.tsx) <br><sub>165 líneas</sub> | — | — |
| [`app/admin/marca/actions.ts`](../app/admin/marca/actions.ts) <br><sub>60 líneas</sub> | — | `MarcaState`, `guardarMarca`, `marcaActual` |
| [`app/admin/marca/page.tsx`](../app/admin/marca/page.tsx) <br><sub>25 líneas</sub> | — | `dynamic` |
| [`app/admin/pacientes/[id]/page.tsx`](../app/admin/pacientes/[id]/page.tsx) <br><sub>337 líneas</sub> | — | `dynamic` |
| [`app/admin/pacientes/actions.ts`](../app/admin/pacientes/actions.ts) <br><sub>69 líneas</sub> | — | `crearPaciente`, `agregarNota`, `borrarNota`, `editarPaciente`, `guardarFicha` |
| [`app/admin/pacientes/page.tsx`](../app/admin/pacientes/page.tsx) <br><sub>66 líneas</sub> | — | `dynamic` |
| [`app/admin/page.tsx`](../app/admin/page.tsx) <br><sub>667 líneas</sub> | — | `dynamic` |
| [`app/admin/profesionales/actions.ts`](../app/admin/profesionales/actions.ts) <br><sub>59 líneas</sub> | — | `guardarProfesionales` |
| [`app/admin/profesionales/page.tsx`](../app/admin/profesionales/page.tsx) <br><sub>26 líneas</sub> | — | `dynamic` |
| [`app/admin/servicios/actions.ts`](../app/admin/servicios/actions.ts) <br><sub>46 líneas</sub> | — | `guardarServicios` |
| [`app/admin/servicios/page.tsx`](../app/admin/servicios/page.tsx) <br><sub>24 líneas</sub> | — | `dynamic` |

## API pública y webhooks

| Archivo | Qué hace | Exporta |
|---|---|---|
| [`app/api/admin/route.ts`](../app/api/admin/route.ts) <br><sub>117 líneas</sub> | — | `POST`, `DELETE` |
| [`app/api/asistente/execute/route.ts`](../app/api/asistente/execute/route.ts) <br><sub>44 líneas</sub> | — | `dynamic`, `POST` |
| [`app/api/asistente/route.ts`](../app/api/asistente/route.ts) <br><sub>106 líneas</sub> | — | `dynamic`, `POST` |
| [`app/api/asistente/transcribir/route.ts`](../app/api/asistente/transcribir/route.ts) <br><sub>39 líneas</sub> | — | `dynamic`, `POST` |
| [`app/api/reservar-config/route.ts`](../app/api/reservar-config/route.ts) <br><sub>24 líneas</sub> | — | `dynamic`, `GET` |
| [`app/api/slots/route.ts`](../app/api/slots/route.ts) <br><sub>52 líneas</sub> | — | `dynamic`, `GET` |
| [`app/api/telegram/route.ts`](../app/api/telegram/route.ts) <br><sub>182 líneas</sub> | — | `POST`, `GET` |
| [`app/api/turnos/route.ts`](../app/api/turnos/route.ts) <br><sub>208 líneas</sub> | — | `POST` |

## Sitio público

| Archivo | Qué hace | Exporta |
|---|---|---|
| [`app/layout.tsx`](../app/layout.tsx) <br><sub>118 líneas</sub> | — | `generateMetadata` |
| [`app/page.tsx`](../app/page.tsx) <br><sub>880 líneas</sub> | — | `dynamic` |
| [`app/reservar/page.tsx`](../app/reservar/page.tsx) <br><sub>176 líneas</sub> | — | `metadata` |
| [`app/robots.ts`](../app/robots.ts) <br><sub>9 líneas</sub> | — | — |
| [`app/sitemap.ts`](../app/sitemap.ts) <br><sub>13 líneas</sub> | — | — |

## Componentes

| Archivo | Qué hace | Exporta |
|---|---|---|
| [`components/AdminPageHeader.tsx`](../components/AdminPageHeader.tsx) <br><sub>39 líneas</sub> | — | `AdminPageHeader` |
| [`components/AdminShell.tsx`](../components/AdminShell.tsx) <br><sub>15 líneas</sub> | — | `AdminShell` |
| [`components/AdminSidebar.tsx`](../components/AdminSidebar.tsx) <br><sub>268 líneas</sub> | — | `AdminSidebar` |
| [`components/AgendaCalendario.tsx`](../components/AgendaCalendario.tsx) <br><sub>477 líneas</sub> | — | `CalTurno`, `AgendaCalendario` |
| [`components/AgendarManualForm.tsx`](../components/AgendarManualForm.tsx) <br><sub>154 líneas</sub> | — | `AgendarManualForm` |
| [`components/Arrow.tsx`](../components/Arrow.tsx) <br><sub>72 líneas</sub> | Flechas de marca — trazo grueso y redondeado para que se vean firmes | `Arrow`, `ArrowUpRight`, `ArrowLeft` |
| [`components/Asistente.tsx`](../components/Asistente.tsx) <br><sub>481 líneas</sub> | — | `Asistente` |
| [`components/BookingCTA.tsx`](../components/BookingCTA.tsx) <br><sub>46 líneas</sub> | — | `BookingCTA` |
| [`components/Botanical.tsx`](../components/Botanical.tsx) <br><sub>161 líneas</sub> | Decorative botanical SVGs — leafy branches and a winding vine. | `Branch`, `VineConnectorH`, `VineConnectorV`, `Vine` |
| [`components/CopyAlias.tsx`](../components/CopyAlias.tsx) <br><sub>41 líneas</sub> | — | `CopyAlias` |
| [`components/DeleteConfirm.tsx`](../components/DeleteConfirm.tsx) <br><sub>95 líneas</sub> | — | `DeleteConfirm` |
| [`components/DisponibilidadEditor.tsx`](../components/DisponibilidadEditor.tsx) <br><sub>437 líneas</sub> | — | `DisponibilidadEditor` |
| [`components/Divider.tsx`](../components/Divider.tsx) <br><sub>73 líneas</sub> | — | `Divider`, `Leaf`, `Sprig` |
| [`components/EditorMarca.tsx`](../components/EditorMarca.tsx) <br><sub>178 líneas</sub> | — | `EditorMarca` |
| [`components/FechaNotaAuto.tsx`](../components/FechaNotaAuto.tsx) <br><sub>49 líneas</sub> | — | `FechaNotaAuto` |
| [`components/InvitarMiembro.tsx`](../components/InvitarMiembro.tsx) <br><sub>84 líneas</sub> | — | `InvitarMiembro` |
| [`components/MobileCTA.tsx`](../components/MobileCTA.tsx) <br><sub>59 líneas</sub> | — | `MobileCTA` |
| [`components/Nav.tsx`](../components/Nav.tsx) <br><sub>165 líneas</sub> | — | `Nav` |
| [`components/NuevoTurnoModal.tsx`](../components/NuevoTurnoModal.tsx) <br><sub>202 líneas</sub> | — | `PacienteMini`, `NuevoTurnoModal` |
| [`components/PacientesList.tsx`](../components/PacientesList.tsx) <br><sub>157 líneas</sub> | — | `PacientesList` |
| [`components/Petals.tsx`](../components/Petals.tsx) <br><sub>60 líneas</sub> | Pétalos de cerezo cayendo — capa decorativa sutil sobre el hero. | `Petals` |
| [`components/ProfesionalesEditor.tsx`](../components/ProfesionalesEditor.tsx) <br><sub>324 líneas</sub> | — | `ProfesionalesEditor` |
| [`components/Reveal.tsx`](../components/Reveal.tsx) <br><sub>77 líneas</sub> | — | `WHATSAPP_URL`, `Reveal` |
| [`components/ServiciosEditor.tsx`](../components/ServiciosEditor.tsx) <br><sub>190 líneas</sub> | — | `ServiciosEditor` |
| [`components/SplineScene.tsx`](../components/SplineScene.tsx) <br><sub>58 líneas</sub> | — | `SPLINE_SCENE_URL`, `SplineScene` |
| [`components/SubmitButton.tsx`](../components/SubmitButton.tsx) <br><sub>28 líneas</sub> | — | `SubmitButton` |
| [`components/TiltCard.tsx`](../components/TiltCard.tsx) <br><sub>48 líneas</sub> | — | `TiltCard` |
| [`components/TurnoForm.tsx`](../components/TurnoForm.tsx) <br><sub>657 líneas</sub> | — | `TurnoForm` |
| [`components/VantaBg.tsx`](../components/VantaBg.tsx) <br><sub>66 líneas</sub> | — | `VantaBg` |
| [`components/WhatsAppButton.tsx`](../components/WhatsAppButton.tsx) <br><sub>169 líneas</sub> | — | `WhatsAppButton` |
| [`components/WhatsAppCTA.tsx`](../components/WhatsAppCTA.tsx) <br><sub>39 líneas</sub> | — | `WhatsAppCTA` |

## Base de datos (migraciones)

| Archivo | Qué hace | Exporta |
|---|---|---|
| [`supabase/apply_all.sql`](../supabase/apply_all.sql) <br><sub>485 líneas</sub> | ============================================================ | — |
| [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql) <br><sub>235 líneas</sub> | ===================================================================== | — |
| [`supabase/migrations/0002_rls.sql`](../supabase/migrations/0002_rls.sql) <br><sub>113 líneas</sub> | ===================================================================== | — |
| [`supabase/migrations/0003_services_staff.sql`](../supabase/migrations/0003_services_staff.sql) <br><sub>101 líneas</sub> | ===================================================================== | — |
| [`supabase/migrations/0004_professional_user_nullable.sql`](../supabase/migrations/0004_professional_user_nullable.sql) <br><sub>8 líneas</sub> | ===================================================================== | — |
| [`supabase/migrations/0005_app_state.sql`](../supabase/migrations/0005_app_state.sql) <br><sub>18 líneas</sub> | ===================================================================== | — |
| [`supabase/migrations/0006_cuentas.sql`](../supabase/migrations/0006_cuentas.sql) <br><sub>416 líneas</sub> | ===================================================================== | — |
| [`supabase/migrations/0007_auth_state.sql`](../supabase/migrations/0007_auth_state.sql) <br><sub>31 líneas</sub> | 0007 — Almacén de IDENTIDAD (cuentas, membresías, sesiones, auditoría). | — |

## Tests

| Archivo | Qué hace | Exporta |
|---|---|---|
| [`tests/auth.test.ts`](../tests/auth.test.ts) <br><sub>386 líneas</sub> | Tests de autenticación: hashing de contraseñas y permisos por rol. | — |
| [`tests/deuda.test.ts`](../tests/deuda.test.ts) <br><sub>286 líneas</sub> | Tests de la regla de negocio más delicada de la app: qué es DEUDA (`esImpaga`) | `headers`, `cookies`, `draftMode`, `resolve` |
| [`tests/slots.test.ts`](../tests/slots.test.ts) <br><sub>499 líneas</sub> | Tests del motor de turnos (`lib/scheduling/slots.ts`). | — |
| [`tests/tenant.test.ts`](../tests/tenant.test.ts) <br><sub>393 líneas</sub> | Tests de aislamiento entre consultorios (multi-tenant). | — |

## Scripts y herramientas

| Archivo | Qué hace | Exporta |
|---|---|---|
| [`scripts/crear-cuenta.mjs`](../scripts/crear-cuenta.mjs) <br><sub>133 líneas</sub> | Crea la PRIMERA cuenta (dueño/a) de un consultorio, o suma un miembro. | — |
| [`scripts/diagnostico-pacientes.mjs`](../scripts/diagnostico-pacientes.mjs) <br><sub>130 líneas</sub> | Diagnóstico de identidad de pacientes — ANTES de tocar contactoKey(). | — |
| [`scripts/generar-indice.mjs`](../scripts/generar-indice.mjs) <br><sub>139 líneas</sub> | Genera docs/INDICE.md — el mapa navegable del proyecto. | — |

## Raíz

| Archivo | Qué hace | Exporta |
|---|---|---|
| [`eslint.config.mjs`](../eslint.config.mjs) <br><sub>19 líneas</sub> | — | — |
| [`next-env.d.ts`](../next-env.d.ts) <br><sub>7 líneas</sub> | / <reference types="next" /> | — |
| [`next.config.ts`](../next.config.ts) <br><sub>64 líneas</sub> | — | — |
| [`postcss.config.mjs`](../postcss.config.mjs) <br><sub>8 líneas</sub> | — | — |
| [`proxy.ts`](../proxy.ts) <br><sub>60 líneas</sub> | — | `proxy`, `config` |
| [`types/vanta.d.ts`](../types/vanta.d.ts) <br><sub>21 líneas</sub> | — | — |

---

## Cómo está todo vinculado

```
Request
  └─ proxy.ts ─────────► lib/tenant.ts      (¿de qué consultorio es este host?)
       │                                     fail-closed: si no resuelve, 404
       ├─ /admin ──────► lib/session.ts     (¿hay sesión? ¿de ESTE consultorio?
       │                  └─ lib/auth.ts      ¿qué permisos tiene?)
       │                  └─ lib/accounts.ts (cuentas, roles, auditoría)
       │                       └─ lib/accounts-store.ts  → auth_state | data/auth.json
       │
       └─ páginas y acciones
            └─ lib/store.ts ────────────────► app_state | data/db.<tenant>.json
                 ├─ lib/scheduling/slots.ts   (horarios disponibles)
                 └─ esImpaga()                (única definición de deuda)
```

**Reglas de oro del proyecto**

1. Todo dato se scopea por consultorio (`professional_id`). Sin tenant resuelto, no se sirve nada.
2. La sesión se valida **siempre** con `sesionValida()` / `requirePermiso()`, nunca con `verifyToken` suelto.
3. La historia clínica y el motivo de consulta **no salen** a terceros (ni a Telegram ni a la IA).
4. Antes de commitear lógica de negocio o seguridad: `npm test`.
