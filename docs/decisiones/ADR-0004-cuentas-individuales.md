# ADR-0004 — Cuentas individuales con identidad global

- **Fecha:** 2026-07-29
- **Estado:** aceptada (núcleo implementado; equipo/invitaciones pendientes)
- **Complementa:** [ADR-0002](ADR-0002-fail-closed-y-sesion-por-tenant.md)

## Contexto

Tras ADR-0002 cada consultorio tenía **su** contraseña, pero seguía siendo **una
contraseña compartida por todo el consultorio**: sin cuentas individuales, sin
saber quién hizo qué, sin poder dar de baja a una sola persona y sin recuperación.

Un panel de 3 expertos detectó además el nudo estructural: la tabla `professionals`
hacía **dos trabajos incompatibles** — era el *consultorio* (tenant, referenciado
por `app_state`, el mapa `TENANTS` y todas las FKs) y a la vez pretendía ser la
*persona* (`user_id` único). Con esa conflación es imposible que una secretaria
trabaje en dos consultorios, o que un psicólogo tenga dos marcas.

## Decisión

**Separar identidad de consultorio.**

- `professionals` queda congelado como **consultorio** (no se toca su `id`: está
  cableado en env vars, `app_state` y todas las FKs). `user_id` queda deprecada.
- **`app_users`** = la persona. Identidad **global por email**, una sola cuenta
  aunque trabaje en varios consultorios.
- **`memberships`** = N:N usuario ↔ consultorio, con **rol** (owner/admin/
  profesional/asistente) y **permisos** finos configurables.
- **Credenciales en tabla aparte**, con hash **PBKDF2-HMAC-SHA256 (600k
  iteraciones)** vía Web Crypto — elegido porque debe correr en el runtime *edge*
  y sin dependencias nativas (bcrypt/argon2 no van en edge). Formato
  autodescriptivo (`pbkdf2$sha256$iters$salt$hash`) para poder subir el costo sin
  migración destructiva. `AUTH_PEPPER` opcional fuera de la base.
- **Token v2**: `v2.<version>.<tenant>.<userId>.<sessionId>.<emitido>`, todo dentro
  de la firma → trazabilidad y revocación de **una** sesión sin echar a todos.
- **Almacén de identidad separado** (`lib/accounts-store.ts`), con el mismo
  adaptador dual que el store de dominio (archivo local / Supabase). Va aparte
  porque la identidad es cross-tenant y porque el login no debe tocar —ni bloquear
  con su lock optimista— el documento que contiene la historia clínica.
- **Ventana de transición**: mientras un consultorio no tenga ninguna cuenta, se
  sigue aceptando su contraseña vieja. **Se apaga sola** al crear la primera cuenta.

Extras de seguridad incluidos: anti-enumeración (se verifica contra un hash señuelo
cuando el email no existe, para que el tiempo de respuesta no delate quién tiene
cuenta), bloqueo por intentos **por cuenta** (no solo por IP), cierre de sesiones
al cambiar contraseña o revocar acceso, y **log de auditoría**.

## Alternativas consideradas

1. **Guardar las cuentas dentro del blob del consultorio.** Descartado: la consulta
   fundacional es cross-tenant ("¿a qué consultorios pertenece este email?") y un
   blob por consultorio no puede responderla. Además la unicidad de email y el
   consumo de tokens de un solo uso necesitan atomicidad real.
2. **Ir directo a Supabase Auth.** Es el destino, pero está bloqueado por no tener
   proveedor de email transaccional, y no se puede verificar desde esta máquina.
   Por eso `app_users.id` es PK propia y `auth_user_id` arranca en NULL: se podrá
   migrar **de a un usuario por vez**, sin tocar membresías ni auditoría.
3. **Una capa `organizations` por encima.** Descartado: con membresías N:N no aporta
   y agrega otra dimensión de scoping que blindar.

## Consecuencias

**A favor**
- Cuentas reales, roles, permisos finos y trazabilidad, verificados con pruebas
  reales: login por email ✓, la contraseña vieja deja de funcionar sola ✓, mensaje
  genérico ante email inexistente ✓, bloqueo por intentos ✓, cookie de un
  consultorio rechazada en otro ✓, auditoría registrando accesos y fallos ✓.
- La demo no se rompe (ventana de transición).
- Preparado para Supabase Auth sin rehacer nada.

**En contra / pendiente**
- **RLS sigue sin ser real**: el acceso continúa siendo con `service_role`. El
  aislamiento lo garantiza la app.
- La revocación tarda hasta **60 s** en cortar (caché de sesión). Documentado.
- Falta la UI de equipo (invitar/roles), la recuperación por email y el gateo por
  permiso en cada sección: hoy toda sesión válida entra al panel completo.
