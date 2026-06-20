---
tags: [proyecto, moc]
updated: 2026-06-19
---

# 00 - Indice

Este es el **cerebro** del proyecto: el vault de Obsidian donde vive toda la documentación viva del sistema que [[01 - Vision y Negocio|Codexy]] le construye a la psicóloga (demo: "Paulina Pilotti", basada en la cuenta real `@psicoterapia.pauli`). No es un README más: es el lugar donde se asienta la **verdad de base** del proyecto para que cualquiera —vos en tres meses, un colaborador nuevo, o el agente de IA— entienda en minutos qué hay hecho, qué falta y por qué se tomó cada decisión. Se usa como una wiki: empezás por esta nota, saltás por los [[wikilinks]] al área que te interesa, y cada nota se enlaza con sus vecinas. La regla de oro: **se documenta solo lo que existe de verdad en el código**; lo pendiente va marcado como PENDIENTE, sin inventar métricas ni features.

## Estado del proyecto en una línea

> Motor de turnos nativo tipo Calendly **FUNCIONANDO** (build verde, zona Argentina UTC-3 fija, anti-doble-reserva con 409), con sitio público + panel `/admin` y auth por contraseña custom (HMAC/Web Crypto); persistencia MVP en JSON local; **Supabase multi-tenant escrito pero sin aplicar** (PENDIENTE el wiring); **sin desplegar a Vercel**.

## Cómo está organizado el vault

Las notas están numeradas `00`–`11` y agrupadas por área. El número da el orden de lectura sugerido, no una jerarquía rígida.

### Negocio

- [[01 - Vision y Negocio]] — Quién es el cliente (psicóloga, online + presencial en Viedma), qué vende Codexy (automatizaciones con IA para clínicas y consultorios) y el modelo comercial. La nota de "por qué existe esto".

### Técnico

- [[02 - Arquitectura]] — Stack y estructura: Next.js 16.2.4 (App Router + Turbopack), React 19, Tailwind CSS 4, TypeScript. Incluye la **regla dura de Next**: "this is NOT the Next.js you know" (leer `node_modules/next/dist/docs` antes de codear) y la migración del convention `middleware` → `proxy` (`proxy.ts`).
- [[03 - Motor de Turnos]] — El corazón del producto. Motor nativo tipo Calendly: expansión de disponibilidad a slots, zona Argentina UTC-3 fija (sin DST), y anti-doble-reserva que devuelve **409** y saca el slot ocupado de la oferta. Lo que la profesional configura en `/admin/disponibilidad` se refleja en el sitio público automáticamente.
- [[04 - Capa de Datos]] — Persistencia actual: archivo JSON local (`data/db.json`). Modelo de datos, lectura/escritura y el camino de migración hacia Postgres. La frontera entre el MVP de hoy y el Supabase de mañana.

### Producto

- [[05 - Sitio Publico]] — La cara visible: home, presentación de la profesional y flujo de reserva de turnos que consume la disponibilidad publicada.
- [[06 - Panel Interno]] — El `/admin`: configuración de disponibilidad, gestión de turnos y todo lo que ve la profesional logueada. Protegido por [[07 - Supabase|auth]] custom vía `proxy.ts`.

### Infra

- [[07 - Supabase]] — **PENDIENTE de wiring.** Proyecto del usuario (`nojgdkesngpbaidqperp`). El esquema multi-tenant + RLS ya está escrito (`supabase/migrations/0001_init.sql`, `0002_rls.sql`) y `lib/supabase.ts` tiene los clientes; falta aplicar el esquema y conectar. Acá viven las reglas sobre las claves (`ANON_KEY` pública vs `SERVICE_ROLE_KEY` secreta). Auth: por ahora contraseña custom, **no** Supabase Auth.
- [[08 - Vercel y Deploy]] — Estado del deploy: **NO se despliega sin confirmación explícita.** Workflow de build local, variables de entorno y el porqué de avanzar paso a paso (puede haber otros proyectos en Vercel).

### Estrategia / Transversal

- [[09 - SaaS Multi-tenant]] — La **meta central**: esto es un SaaS replicable. El mismo sistema se revende a muchos profesionales, cada uno con su `/admin`, sus turnos y su marca. Cómo el diseño (esquema, RLS, branding) sirve a esa replicabilidad.
- [[10 - Roadmap]] — Qué sigue: aplicar Supabase, wiring real, deploy controlado a Vercel, y el resto del backlog ordenado por prioridad. Lo hecho vs. lo PENDIENTE en formato hoja de ruta.
- [[11 - Glosario y Decisiones]] — Diccionario de términos del proyecto (slot, tenant, RLS, proxy.ts, UTC-3 fijo) y registro de decisiones técnicas con su justificación. Para no re-discutir lo ya resuelto.

## Empezar acá

Si es tu primera vez en el vault, leé en este orden:

1. [[01 - Vision y Negocio]] — para entender **qué** estamos construyendo y para quién.
2. [[03 - Motor de Turnos]] — el feature que ya funciona y define el producto.
3. [[09 - SaaS Multi-tenant]] — para no perder de vista que esto **se replica**, no es un sitio único.

## Reglas críticas

> [!danger] No negociables
> Estas tres reglas mandan sobre cualquier otra instrucción. Romperlas puede destruir trabajo ajeno.

| Regla | Detalle |
| --- | --- |
| **No tocar el MCP de Supabase ajeno** | Hay un servidor MCP de Supabase conectado que apunta a otro proyecto (`zvsqcbeupeyjtgdguwoc`) que **NO** es del usuario. Prohibido usar cualquier tool `mcp__supabase__*` (ni siquiera de lectura). El proyecto real es `nojgdkesngpbaidqperp`. Ver [[07 - Supabase]]. |
| **No desplegar a Vercel sin OK** | No subir nada a Vercel sin confirmación explícita. Puede haber otros proyectos del usuario ahí y un deploy a ciegas los rompería. Se avanza paso a paso. Ver [[08 - Vercel y Deploy]]. |
| **Workflow de 2 directorios (dev → OneDrive)** | Se **edita y compila** en `C:/dev/lic-florentina-toplikar` (tiene `node_modules`, `.next` y los scripts `check*.js` con puppeteer-core). El **repo git oficial** es `C:/Users/Carlos/OneDrive/lic-florentina-toplikar`. Se espeja `dev` → OneDrive tras cada cambio. Motivo: OneDrive sincroniza en vivo y rompería `node_modules` y los builds. Ver [[02 - Arquitectura]]. |

Regla transversal de redacción del vault: **no inventar**. Si algo no está en el código, va como PENDIENTE.

## Ver también

- [[01 - Vision y Negocio]]
- [[03 - Motor de Turnos]]
- [[07 - Supabase]]
- [[08 - Vercel y Deploy]]
- [[09 - SaaS Multi-tenant]]
- [[10 - Roadmap]]
