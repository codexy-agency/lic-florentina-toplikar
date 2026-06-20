---
tags: [proyecto, tecnico]
updated: 2026-06-19
---

# 02 - Arquitectura

Nota técnica de referencia: cómo está armado el proyecto a nivel código. Acá va el stack, la estructura de carpetas, el modelo de ejecución de Next 16 (Server vs Client, Server Actions, Route Handlers, `proxy.ts`), el workflow de 2 directorios y el flujo de datos extremo a extremo. Para el detalle del motor de turnos ver [[03 - Motor de Turnos]]; para la persistencia ver [[04 - Capa de Datos]]; para el `/admin` ver [[06 - Panel Interno]].

## Stack

Datos reales según `package.json`:

| Pieza | Versión | Notas |
|---|---|---|
| Next.js | `16.2.4` | App Router + Turbopack |
| React / React DOM | `19.2.4` | Server Components por defecto |
| Tailwind CSS | `^4` | vía `@tailwindcss/postcss` (PostCSS plugin) |
| TypeScript | `^5` | `strict: true` |
| `@supabase/supabase-js` + `@supabase/ssr` | `^2.108.2` / `^0.12.0` | instalados, wiring PENDIENTE (ver [[07 - Supabase]]) |
| `puppeteer-core` | `^25.1.0` | scripts de verificación con el Chrome real |
| `three` / `vanta` / `@splinetool/*` | — | fondo 3D y efectos del sitio público (ver [[05 - Sitio Publico]]) |

Scripts (`package.json`):

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint"
}
```

`next.config.ts` está hoy **vacío** (config por defecto), solo el tipo `NextConfig` importado — sin overrides de webpack, imágenes ni headers:

```ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  /* config options here */
};
export default nextConfig;
```

`tsconfig.json` define el alias de imports `@/*` → raíz del repo (`"paths": { "@/*": ["./*"] }`), `moduleResolution: "bundler"`, `strict: true` y `jsx: "react-jsx"`. Por eso en el código se ve `@/lib/...` en lugar de rutas relativas.

## La regla de Next: leer los docs antes de codear

`AGENTS.md` (raíz del repo) es una orden dura para cualquier agente que toque este código:

> "This is NOT the Next.js you know. This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices."

Traducción operativa: **no asumir** convenciones de memoria. Next 16 trae cambios respecto de lo que un modelo entrenado en versiones viejas espera. Antes de escribir, se lee la guía concreta en `node_modules/next/dist/docs/`. El caso más visible de este cambio es el renombre del convention `middleware` → `proxy` (abajo).

## Estructura de carpetas

```
lic-florentina-toplikar/
├─ app/                      # App Router (rutas + UI)
│  ├─ layout.tsx             # RootLayout: fonts, <head> JSON-LD, metadata
│  ├─ page.tsx               # landing pública
│  ├─ globals.css            # Tailwind 4
│  ├─ robots.ts / sitemap.ts # SEO (route handlers de Next)
│  ├─ admin/                 # panel interno (protegido por proxy.ts)
│  │  ├─ page.tsx            # bandeja de solicitudes
│  │  ├─ login/page.tsx
│  │  └─ disponibilidad/page.tsx   # editor de reglas de turnos
│  └─ api/                   # Route Handlers (backend)
│     ├─ slots/route.ts      # GET: días/horarios libres
│     ├─ turnos/route.ts     # POST: registrar solicitud + anti-doble-reserva
│     └─ admin/route.ts      # acciones del panel
├─ components/               # Client/Server Components reutilizables (Nav, Reveal, CTAs, 3D…)
├─ lib/                      # lógica de dominio
│  ├─ auth.ts                # HMAC + sesión (Web Crypto, Edge-compatible)
│  ├─ store.ts               # capa de persistencia (JSON local → futuro Supabase)
│  ├─ telegram.ts            # notificación de turnos
│  ├─ supabase.ts            # clientes Supabase (instalados, sin wiring)
│  └─ scheduling/            # motor de turnos
│     ├─ slots.ts            # getAvailableSlots() — expansión de disponibilidad
│     └─ types.ts            # Modalidad, reglas, excepciones, etc.
├─ supabase/                 # migraciones 0001_init.sql, 0002_rls.sql (PENDIENTE aplicar)
├─ data/                     # db.json — persistencia MVP (ver [[04 - Capa de Datos]])
├─ types/                    # tipos compartidos
├─ proxy.ts                  # ex-middleware: protege /admin (Edge)
├─ next.config.ts            # config (hoy vacío)
├─ tsconfig.json
├─ AGENTS.md / CLAUDE.md
└─ check*.js                 # scripts de verificación con puppeteer-core
```

## Modelo de ejecución de Next 16

### Server Components vs Client Components

Por defecto en App Router **todo es Server Component** (corre en el server, no manda JS al cliente). `app/layout.tsx` es el ejemplo canónico: importa fonts con `next/font/google` (`Fraunces` y `Plus_Jakarta_Sans`), define `metadata` y un bloque JSON-LD de `schema.org` (`@type: "Psychologist"`) inyectado en `<head>`, y renderiza `<html lang="es">` / `<body>`. No tiene `"use client"`: es server puro.

Los componentes que necesitan estado, efectos o eventos del browser (el slot-picker, los reveals animados, los CTAs de WhatsApp, los fondos 3D de `three`/`vanta`/Spline) llevan `"use client"` en `components/`. Regla práctica: **Server por defecto, Client solo donde hace falta interactividad**.

### Route Handlers (`app/api/`)

El "backend" del MVP vive en Route Handlers (`route.ts` exportando `GET`/`POST`). Son los tres endpoints reales:

- **`app/api/slots/route.ts`** — `GET /api/slots?modalidad=online|presencial`. Lee config + reglas + excepciones + ocupados (`getScheduling()`, `getBusy()` en paralelo con `Promise.all`) y delega en `getAvailableSlots()` de `lib/scheduling/slots.ts`. Marcado `export const dynamic = "force-dynamic"` (sin cache, siempre fresco). Devuelve `{ ok, dias }`.
- **`app/api/turnos/route.ts`** — `POST /api/turnos`. Sanitiza los campos del form (`clean()` con límites de longitud), valida obligatorios (nombre + contacto), **re-chequea anti-doble-reserva** comparando solapamiento de intervalos contra `getBusy()` y devuelve **409** si el slot se ocupó recién. Si está libre, `addSolicitud()` lo persiste y dispara `notificarTurno()` a Telegram (fire-and-forget, `.catch(() => {})`).
- **`app/api/admin/route.ts`** — acciones del panel interno.

Detalle real del anti-doble-reserva en `turnos/route.ts` (mitigación a nivel app; el comentario del propio código aclara que en Supabase lo va a garantizar un constraint de exclusión `tstzrange`):

```ts
const tomado = busy.some((b) => {
  const bs = new Date(b.startsAt).getTime();
  const be = new Date(b.endsAt).getTime();
  return s < be && bs < e; // hay solapamiento → 409
});
```

### Server Actions

El patrón de Server Actions de React 19 / Next 16 (funciones server invocadas directo desde forms client, sin endpoint explícito) está disponible en el stack. En el MVP las mutaciones del flujo público pasan por los Route Handlers de `api/` descritos arriba; el `/admin` y sus mutaciones se detallan en [[06 - Panel Interno]].

### `proxy.ts` (ex-`middleware`, corre en Edge)

En Next 16 el convention `middleware` se renombró a **`proxy`**. El archivo `proxy.ts` en la raíz exporta una función `proxy(req)` y un `config.matcher`. Su único trabajo hoy: **proteger `/admin`** (salvo `/admin/login`).

```ts
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!(await verifyToken(token))) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
```

Corre en Edge Runtime, por eso la verificación del token usa Web Crypto (HMAC) en `lib/auth.ts` en vez de `crypto` de Node — ver auth completo en [[06 - Panel Interno]].

## Workflow de 2 directorios (dev ↔ OneDrive)

Hay **dos copias** del proyecto y no es accidental:

| Directorio | Rol |
|---|---|
| `C:/dev/lic-florentina-toplikar` | Donde se **edita y compila**. Tiene `node_modules/`, `.next/` y los `check*.js`. |
| `C:/Users/Carlos/OneDrive/lic-florentina-toplikar` | **Repo git oficial** y working dir. Lo que se versiona y (a futuro) se despliega. |

**Por qué:** OneDrive sincroniza archivos en vivo. Si `node_modules/` o `.next/` vivieran dentro de OneDrive, la sync constante corrompería instalaciones y builds (locks, archivos a medio escribir, miles de ficheros chicos). Por eso el árbol "pesado" y volátil queda en `C:/dev`, fuera del alcance de OneDrive.

**Flujo:** se trabaja en `C:/dev` → se compila/verifica ahí → tras cada cambio se **espeja `dev` → OneDrive** (que es el repo git). El espejado es unidireccional `dev → OneDrive`. Más contexto en [[11 - Glosario y Decisiones]].

## Cómo se compila y se verifica

1. **Build de producción:** `npm run build` (Turbopack). El estado actual es **build verde**.
2. **Levantar para verificar:** `npm start -- -p 3100` (sirve en `http://localhost:3100`).
3. **Verificación visual/funcional:** los scripts `check*.js` de la raíz de `C:/dev` usan `puppeteer-core` apuntando al **Chrome real del usuario** (`C:\Program Files\Google\Chrome\Application\chrome.exe`), contra `BASE = "http://localhost:3100"`, y guardan capturas en `capturas/`.

Hay un script por área (`checkhero.js`, `checknav.js`, `checkfooter.js`, `checksections.js`, `checkmobilefull.js`, `checkbooking.js`, `checkadmin.js`, `checkslots.js`, etc.). Por ejemplo `checkslots.js` recorre el flujo completo punta a punta: abre la landing, scrollea a `#turnos`, espera a que cargue `/api/slots`, clickea un chip de horario `HH:MM`, captura el form de datos, después hace login en `/admin/login` y captura el panel y el editor de `/admin/disponibilidad`, y por último repite la reserva en viewport mobile (390×844). Es la prueba de que el flujo paciente→reserva→admin anda de verdad.

## Flujo de datos (extremo a extremo)

```
┌─────────────────── CONSULTA DE DISPONIBILIDAD ───────────────────┐
│                                                                  │
│  Paciente (UI / slot-picker)                                     │
│        │  GET /api/slots?modalidad=online|presencial             │
│        ▼                                                         │
│  app/api/slots/route.ts                                          │
│        │  getScheduling() + getBusy()  (Promise.all)             │
│        ▼                                                         │
│  lib/scheduling/slots.ts  →  getAvailableSlots()                 │
│        │  expande reglas/excepciones, descuenta ocupados,        │
│        │  zona Argentina UTC-3 fijo (sin DST)                    │
│        ▼                                                         │
│  { ok, dias[] }  ──►  UI renderiza días/horarios libres          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────── RESERVA DE TURNO ────────────────────────┐
│                                                                  │
│  Paciente elige slot + completa form                             │
│        │  POST /api/turnos  { nombre, contacto, modalidad,       │
│        │                      startsAt, endsAt, motivo… }        │
│        ▼                                                         │
│  app/api/turnos/route.ts                                         │
│        │  clean() + valida obligatorios                          │
│        │  anti-doble-reserva vs getBusy()                        │
│        │     └─ solapa? ──► 409 "elegí otro"                     │
│        ▼                                                         │
│  lib/store.ts  →  addSolicitud()   (persiste en data/db.json)    │
│        │                                                         │
│        ├──► lib/telegram.ts  notificarTurno()  (fire-and-forget) │
│        │         └─ Telegram: aviso a la profesional             │
│        ▼                                                         │
│  { ok: true, id }  ──►  confirmación en UI                       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

El detalle de la expansión de disponibilidad (reglas, excepciones, UTC-3) está en [[03 - Motor de Turnos]]. El detalle de `store.ts` / `data/db.json` y la migración futura a Postgres está en [[04 - Capa de Datos]].

## Pendientes que tocan la arquitectura

- **Supabase:** clientes en `lib/supabase.ts` y migraciones `supabase/0001_init.sql` + `0002_rls.sql` escritas, pero **sin aplicar ni cablear**. Hoy la persistencia real es `data/db.json`. Ver [[07 - Supabase]] y [[04 - Capa de Datos]].
- **Deploy:** Vercel disponible pero **no se despliega sin confirmación**. Ver [[08 - Vercel y Deploy]].
- **Multi-tenant:** la meta es que este mismo sistema sea replicable por profesional (cada uno con su `/admin`, sus turnos, su marca). El diseño está en [[09 - SaaS Multi-tenant]].

## Ver también

- [[03 - Motor de Turnos]]
- [[04 - Capa de Datos]]
- [[06 - Panel Interno]]
- [[07 - Supabase]]
- [[09 - SaaS Multi-tenant]]
- [[11 - Glosario y Decisiones]]
