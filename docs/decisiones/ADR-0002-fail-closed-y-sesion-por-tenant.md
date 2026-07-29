# ADR-0002 — Fail-closed y sesión atada al consultorio

- **Fecha:** 2026-07-29
- **Estado:** aceptada
- **Commit:** `5a390fc`
- **Complementa:** [ADR-0001](ADR-0001-multi-tenant-por-host.md)

## Contexto

Una auditoría adversarial (4 atacantes en paralelo, cada uno sobre una superficie
distinta) sobre la implementación multi-tenant de ADR-0001 encontró **cuatro
fallas críticas** que habrían expuesto historias clínicas entre psicólogos:

1. **Fail-OPEN.** Cualquier host no mapeado — el alias `*.vercel.app`, un preview
   deployment, un `www.` faltante, un typo o un JSON inválido en `TENANTS` — caía
   al tenant por defecto y **leía y escribía** su historia clínica. Silencioso: sin
   error ni log, la contaminación de datos podía pasar semanas sin detectarse.
2. **Sesión no ligada al tenant.** Había una sola `ADMIN_PASSWORD` global y el
   token no contenía referencia al consultorio. El psicólogo B se logueaba en el
   host de A con su propia clave y entraba, **sin explotar nada**.
3. **Colisión por slug.** El lookup caía al primer label del host sin validar el
   dominio: `ana.otrodominio.com.ar` resolvía al tenant `ana`. Con nombres de pila
   en un directorio de psicólogos, la colisión es altamente probable.
4. **Fuga por Telegram.** Cada reserva de *cualquier* consultorio enviaba nombre y
   teléfono del paciente al chat del tenant por defecto (cesión a un tercero).

## Decisión

**Fail-closed en todas las capas, y el tenant como parte de la identidad de la sesión.**

- **Proxy**: en modo multi-tenant, host que no resuelve → **404**. No pasa a
  ninguna ruta que toque el store.
- **Store**: sin tenant resuelto → **lanza**. Se eliminó el fallback silencioso al
  tenant por defecto (solo existe en modo single-tenant).
- **Validación del id**: debe ser UUID **y** pertenecer a un tenant conocido, aunque
  el proxy ya sobreescriba el header.
- **Contraseña por consultorio** (`ADMIN_PASSWORDS`), sin caída a una clave global.
- **Tenant dentro del token firmado**: `ok.<version>.<tenant>.<timestamp>`. El proxy
  y el servidor comparan la sesión contra el consultorio del host.
- **Verificación centralizada**: un único helper `sesionValida()` (`lib/session.ts`)
  reemplazó las 12 llamadas sueltas a `verifyToken`, para que ninguna quede sin el
  chequeo de tenant.
- **Normalización estricta del host** (minúsculas, punto final, puerto, IDNA) y match
  por slug solo bajo `PLATFORM_DOMAIN` con un único label.
- **Telegram por consultorio** (`TELEGRAM_CHAT_IDS`); sin chat propio, no se notifica.
- **Landing sin caché compartida** entre hosts (`force-dynamic`).

## Alternativas consideradas

1. **Dejar el fallback al tenant por defecto "porque es cómodo".** Descartado: es
   exactamente el mecanismo que convierte un error de configuración en una fuga de
   datos de salud.
2. **Confiar solo en que el proxy sobreescribe el header.** Descartado: si alguna
   ruta quedara fuera del matcher del proxy, el header del cliente pasaría a ser un
   selector de base de datos. Se valida también en el store (defensa en profundidad).
3. **Mantener una contraseña global y separar solo los datos.** Descartado: no es
   aislamiento — es una llave maestra de todas las cajas fuertes.

## Consecuencias

**A favor**
- El aislamiento se verificó con **ataques reales**, no con supuestos: host no
  mapeado → 404; preview de Vercel → 404; dominio ajeno → 404; colisión de slug →
  404; cookie de un consultorio en el panel de otro → rechazada; contraseña cruzada
  → 401; header falsificado → ignorado; token manipulado → rechazado. Y los datos
  de cada consultorio quedaron **solo** en su propia base.
- Un error de configuración ahora produce una caída visible (404), no una fuga silenciosa.

**En contra / pendiente**
- **Al desplegar, todas las sesiones se invalidan** (cambió el formato del token):
  hay que volver a loguearse. Es el lado seguro.
- Hay que listar **explícitamente** todos los hosts operativos en `TENANTS` (apex,
  `www` y el `*.vercel.app` de producción), o el sitio devuelve 404.
- Sigue faltando: cuentas individuales con trazabilidad (Fase 1), **RLS como
  segunda barrera real** en la base, y log de auditoría de accesos.
