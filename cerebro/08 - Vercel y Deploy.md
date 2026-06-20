---
tags: [proyecto, infra]
updated: 2026-06-19
---

# 08 - Vercel y Deploy

Esta nota cubre el despliegue y la operación del proyecto en Vercel: estado actual, variables de entorno necesarias, la limitación del store en archivo bajo serverless, y el checklist previo a cualquier deploy real. Es la contracara operativa de [[02 - Arquitectura]] y depende directamente de [[07 - Supabase]].

## Estado actual: NO desplegar todavía

El usuario **ya tiene una cuenta de Vercel con otros proyectos**. La orden es explícita y dura:

> **No subir nada sin confirmación explícita.** Cualquier deploy a ciegas puede romper proyectos ajenos que ya estén corriendo en esa misma cuenta.

Por lo tanto, todo lo que sigue es **documentación de cómo se haría**, no un instructivo para ejecutar ya. Avanzamos paso a paso y con luz verde del usuario en cada etapa.

Además hay un **bloqueante técnico real** (no solo de permiso): hoy la persistencia es un archivo JSON local (`data/db.json`), que en Vercel **no funciona**. Ver la sección [Limitación serverless](#limitación-serverless-el-store-en-archivo-no-sirve-en-vercel). En la práctica, **un deploy real recién tiene sentido después de migrar a Supabase** (ver [[07 - Supabase]]).

## Variables de entorno

La fuente de verdad de qué variables existen es **`.env.example`** (que se copia a `.env.local` y se completa con valores reales; `.env.local` está gitignored y nunca se sube). El contenido real de `.env.example` define estos grupos:

```bash
# Supabase ── Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...   # pública (cliente)
SUPABASE_SERVICE_ROLE_KEY=eyJ...       # SECRETA — solo servidor

# Panel /admin
ADMIN_PASSWORD=cambiá-esto
ADMIN_SECRET=un-secreto-largo-y-aleatorio

# Bot de Telegram (opcional) — avisos de turno
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Mercado Pago (Fase 2)
# MP_ACCESS_TOKEN=
```

### Tabla de referencia

| Variable | Pública / Secreta | Para qué | Estado |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Pública (prefijo `NEXT_PUBLIC_`, va al cliente) | URL del proyecto Supabase | PENDIENTE de wiring |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Pública (anon key, OK exponer) | Cliente Supabase del browser, sujeto a RLS | PENDIENTE (falta la key) |
| `SUPABASE_SERVICE_ROLE_KEY` | **SECRETA** — solo servidor, **nunca** al cliente ni a git | Cliente admin que **saltea RLS**; tareas de servidor | PENDIENTE (falta la key) |
| `ADMIN_PASSWORD` | **SECRETA** | Contraseña del login de `/admin` (auth custom) | EN USO (en `.env.local`) |
| `ADMIN_SECRET` | **SECRETA** | Secreto para firmar la sesión/cookie (HMAC con Web Crypto) | EN USO |
| `TELEGRAM_BOT_TOKEN` | **SECRETA** | Token del bot que manda avisos de turno | Opcional |
| `TELEGRAM_CHAT_ID` | Secreta (sensible, no exponer) | Destino de los avisos de Telegram | Opcional |
| `MP_ACCESS_TOKEN` | **SECRETA** | Mercado Pago, **Fase 2** | Comentada, no usada aún |

> [!warning] Regla de oro de las claves
> Solo las variables con prefijo `NEXT_PUBLIC_` se inyectan en el bundle del cliente. **Todo lo demás es server-only.** En particular, `SUPABASE_SERVICE_ROLE_KEY` y `ADMIN_SECRET` jamás deben llegar al navegador, ni quedar versionados en git. Si una secreta se filtra, hay que rotarla.

> [!note] `ADMIN_PASSWORD` vs `ADMIN_SECRET`
> Son dos cosas distintas. `ADMIN_PASSWORD` es lo que tipea la profesional para entrar a `/admin`. `ADMIN_SECRET` es la clave con la que el servidor **firma** la cookie de sesión (HMAC) para que no se pueda falsificar. Cambiar `ADMIN_SECRET` invalida todas las sesiones activas. Ver el detalle de auth en [[06 - Panel Interno]].

## Cómo se setean en Vercel

En Vercel las variables **no se leen de `.env.local`** (ese archivo es local y gitignored). Se cargan a mano en el panel:

1. Entrar al proyecto en Vercel → **Project Settings → Environment Variables**.
2. Por cada variable: nombre exacto, valor, y elegir los **Environments** (Production / Preview / Development) donde aplica.
3. Las `NEXT_PUBLIC_*` se exponen al cliente; las demás quedan solo en el entorno de servidor. Vercel no las muestra una vez guardadas (las trata como secretos).
4. Tras agregar o cambiar variables, hay que **redeployar** para que tomen efecto (un build viejo conserva los valores con que se compiló).

> [!tip] Paridad de entornos
> Mantené el mismo set de variables entre lo local (`.env.local`) y Vercel. Un deploy que "anda en mi máquina pero falla en Vercel" suele ser una variable que existe en `.env.local` y nunca se cargó en el panel.

## Build y runtime

Lo que Vercel ejecuta sale de **`package.json`**:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint"
}
```

- **Framework:** Next.js `16.2.4`, React `19.2.4`, Tailwind 4 (vía `@tailwindcss/postcss`), TypeScript 5. Vercel autodetecta Next y usa `next build`.
- **`next.config.ts`** hoy está **vacío** (sin opciones custom): exporta un `NextConfig` sin overrides. No hay `output`, ni rewrites, ni config de imágenes especial. Bien tenerlo en cuenta antes de asumir comportamientos que en realidad no están configurados.
- Recordá la regla del proyecto (`AGENTS.md`): **este no es el Next.js de siempre** — hay breaking changes y deprecaciones; ante la duda, leer `node_modules/next/dist/docs/` antes de tocar config. Ya se migró la convención `middleware` → `proxy` (`proxy.ts`), que es lo que protege `/admin`. Ese `proxy.ts` corre en **Edge Runtime**, por eso la auth usa Web Crypto (HMAC) y no librerías de Node. Ver [[02 - Arquitectura]].

> [!note] Dependencias pesadas
> `package.json` incluye `puppeteer-core`, `ffmpeg-static`, `three`, `vanta`, `@splinetool/*`. `puppeteer-core` se usa en los scripts `check*.js` de verificación local (con el Chrome real del usuario) y **no** debería formar parte del runtime de producción. Antes de un deploy real conviene revisar que nada de eso se arrastre al bundle serverless innecesariamente.

## Limitación serverless: el store en archivo no sirve en Vercel

Este es el punto crítico de toda la nota.

- Hoy la persistencia del MVP es **`data/db.json`**, un archivo local que el motor de turnos lee y escribe (ver [[04 - Capa de Datos]] y [[03 - Motor de Turnos]]).
- En Vercel cada request corre en una **función serverless efímera**, con filesystem **de solo lectura** salvo `/tmp`, y **sin estado compartido** entre invocaciones. Consecuencias:
  - Escribir un turno en `data/db.json` **falla o se pierde**: no persiste entre requests ni entre instancias.
  - Aunque escribiera en `/tmp`, sería por instancia y efímero: dos usuarios podrían pegarle a instancias distintas y ver datos distintos. La protección anti-doble-reserva (el 409) deja de ser confiable.
  - En cada deploy el código se reconstruye: cualquier dato "guardado" se evapora.

> [!danger] Conclusión
> **El store en archivo no es desplegable en Vercel.** Por eso **Supabase es prerequisito de un deploy real**: necesitamos una base Postgres compartida y persistente (con RLS para el multi-tenant) antes de poner esto en producción. Todo el detalle del esquema y el wiring está en [[07 - Supabase]]. El modelo multi-tenant que esto habilita está en [[09 - SaaS Multi-tenant]].

## Checklist de pre-deploy

> [!important] No ejecutar ningún paso sin confirmación explícita del usuario.

**Bloqueantes (sin esto, no hay deploy real):**

- [ ] Migrar la persistencia de `data/db.json` a **Supabase Postgres** (aplicar `supabase/migrations/0001_init.sql` y `0002_rls.sql`, y hacer el wiring en `lib/supabase.ts`). Ver [[07 - Supabase]].
- [ ] Obtener las claves que faltan: `NEXT_PUBLIC_SUPABASE_ANON_KEY` (pública) y `SUPABASE_SERVICE_ROLE_KEY` (secreta).
- [ ] Confirmar con el usuario **a qué proyecto de Vercel** se despliega, para no pisar otros proyectos de la cuenta.

**Configuración:**

- [ ] Cargar TODAS las variables en **Vercel → Project Settings → Environment Variables**, en los Environments correctos:
  - Públicas: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  - Secretas: `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `ADMIN_SECRET`, y (si se usan) `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.
- [ ] Verificar que **ninguna** secreta esté commiteada en git ni expuesta vía `NEXT_PUBLIC_*`.
- [ ] Generar un `ADMIN_SECRET` largo y aleatorio para producción (distinto del de desarrollo) y una `ADMIN_PASSWORD` fuerte.

**Verificación previa:**

- [ ] `npm run build` en verde localmente (en `C:/dev/lic-florentina-toplikar`, el directorio donde se compila — ver workflow de 2 directorios en [[02 - Arquitectura]]).
- [ ] `npm run lint` sin errores.
- [ ] Correr los scripts `check*.js` de verificación con puppeteer-core (motor de turnos: slots correctos en UTC-3 sin DST, anti-doble-reserva devolviendo 409).
- [ ] Probar el flujo de `/admin` (login con `ADMIN_PASSWORD`, configurar disponibilidad) y el público (reserva real) contra Supabase, no contra el JSON.
- [ ] Revisar que dependencias de tooling (`puppeteer-core`, `ffmpeg-static`) no entren al runtime de producción.

**Post-deploy:**

- [ ] Smoke test en la URL de preview antes de promover a Production.
- [ ] Confirmar que las variables tomaron efecto (si se cambió alguna, redeployar).
- [ ] Verificar que el dominio/preview no exponga `/admin` sin auth.

## Pendientes y notas

- **Vercel CLI / dominios:** todavía no configurado. Pendiente hasta tener Supabase enchufado y luz verde del usuario.
- **Mercado Pago (`MP_ACCESS_TOKEN`):** Fase 2. Hoy está comentado en `.env.example`; cuando se active, va como **secreta** server-only.
- **Telegram:** opcional. Si no se setean `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`, los avisos simplemente no se mandan.
- **No tocar el MCP de Supabase** conectado al entorno: apunta a otro proyecto ajeno. Toda interacción con Supabase es manual/por archivos, nunca por esa tool.

## Ver también

- [[07 - Supabase]]
- [[02 - Arquitectura]]
- [[04 - Capa de Datos]]
- [[06 - Panel Interno]]
- [[09 - SaaS Multi-tenant]]
- [[10 - Roadmap]]
