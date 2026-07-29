# Seguridad

> El sistema maneja **datos de salud** (historias clínicas, motivo de consulta).
> En Argentina eso es dato sensible bajo la **Ley 25.326**. Todo lo de acá se
> trata con ese estándar, no con el de una app cualquiera.
> Última actualización: 2026-07-29.

## Principios

1. **Fail-closed siempre.** Ante duda o error de configuración, se corta el acceso.
   Nunca se degrada a "mostrar los datos de otro".
2. **Los datos de salud no salen.** El motivo de consulta y las notas clínicas no
   se envían a Telegram ni a la IA.
3. **Defensa en profundidad.** El proxy protege `/admin`, pero además **cada**
   página, server action y route handler revalida la sesión (los bypass de
   middleware son un vector real — CVE-2025-29927).
4. **Nunca borrar datos clínicos.** Ni por impago ni por baja.

## Auditorías realizadas

| Fecha | Alcance | Resultado |
|---|---|---|
| 2026-06-21 | Backend completo (19 agentes) | 10 hallazgos críticos/altos, corregidos |
| 2026-06-24 | Seguridad ofensiva, 8 superficies + verificación adversarial | 9 fixes aplicados (commit `1e2f192`) |
| 2026-06-25 | Lógica de deuda (5 agentes) | 4 cálculos divergentes unificados en `esImpaga()` (`4f9774b`) |
| 2026-06-25 | Asistente IA (4 revisores) | Escrituras fallidas mostradas como éxito, chat que se rompía, fechas imposibles — corregidos (`2d69096`) |
| 2026-07-29 | **Aislamiento multi-tenant (4 atacantes)** | **4 fallas críticas**, corregidas antes de desplegar (`5a390fc`) |

## Controles implementados

### Aislamiento entre consultorios
- **Fail-closed por host**: un host no mapeado devuelve 404; el store lanza en vez
  de caer al tenant por defecto. *(Antes: cualquier preview de Vercel o typo servía
  —y dejaba escribir— la historia clínica real.)*
- **Sesión atada al tenant**: el `professional_id` va dentro del payload firmado.
  Una cookie de un consultorio no vale en otro.
- **Contraseña por consultorio** (`ADMIN_PASSWORDS`). *(Antes: una sola clave global
  era la llave maestra de todas las historias clínicas.)*
- **Sin adivinanzas de host**: el match por slug exige `PLATFORM_DOMAIN` y un único
  label; el host se normaliza (minúsculas, punto final, puerto, IDNA/punycode).
- **Header de tenant no falsificable**: el proxy siempre lo sobreescribe o lo borra,
  y el store igual valida que sea un UUID de un tenant conocido.
- **Telegram por consultorio** (`TELEGRAM_CHAT_IDS`); sin chat propio, no se notifica.
- **Landing sin caché compartida** (`force-dynamic`).

### Aplicación
- Cabeceras: CSP (con `object-src 'none'`, `base-uri`, `form-action`), HSTS, COOP/CORP,
  `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cache-Control: no-store` en `/admin`.
- Rate limiting en login, reservas, slots y config pública.
- Tope de body por **tamaño real** (no por `content-length`, que se puede omitir).
- Saneo de caracteres de control en la entrada pública.
- CSV de finanzas: neutralizada la inyección de fórmulas (`= + - @`).
- Webhook de Telegram: secreto comparado en tiempo constante + lista blanca.
- Comparaciones de secretos en **tiempo constante** (`safeEqual`).
- Fail-closed si `ADMIN_SECRET`/`ADMIN_PASSWORD` quedan en valores de demo.

## Riesgos abiertos (pendientes)

| Riesgo | Severidad | Mitigación pendiente |
|---|---|---|
| **RLS decorativa**: se usa `service_role`, que saltea RLS. El aislamiento lo hace solo la app; si se filtra esa key, queda todo expuesto | **Alta** | Fase 1/3: Supabase Auth + anon key + JWT por profesional → RLS como segunda barrera |
| **Sin cuentas individuales**: contraseña compartida por consultorio, sin trazabilidad de quién accedió | Alta | Fase 1: Supabase Auth (email + recuperación + multiusuario) |
| **Sin log de auditoría**: una lectura de historia clínica no deja rastro | Media | Tabla de auditoría de accesos |
| **Notas clínicas sin cifrar**: viven en texto plano en el blob | Media | Cifrado a nivel app (el esquema ya prevé `contenido_cifrado`) |
| **Blob único por profesional**: no escala y serializa las escrituras | Media | Fase 3: migración a tablas relacionales |
| **Dependencias con CVEs**: GitHub reporta 21 alertas de Dependabot (13 altas) | Media | Revisar y actualizar |

## Acciones que dependen del dueño (no las puede hacer un agente)

- [ ] Rotar en Vercel: `ADMIN_PASSWORD`/`ADMIN_PASSWORDS`, `ADMIN_SECRET` (`openssl rand -hex 32`),
      `TELEGRAM_WEBHOOK_SECRET`; subir `ADMIN_SESSION_VERSION`.
- [ ] Confirmar que el repositorio de GitHub es **privado**.
- [ ] Purgar `cerebro/` del historial de git (`git filter-repo`) — es recuperable.
- [ ] Sacar la PII real de `data/db.json` de la carpeta sincronizada a OneDrive.
- [ ] 2FA en GitHub, Vercel y Supabase.
- [ ] Revisar las alertas de Dependabot.

> **Al desplegar cambios de sesión, todos deben volver a loguearse** (el formato
> del token cambió). Es el lado seguro.
