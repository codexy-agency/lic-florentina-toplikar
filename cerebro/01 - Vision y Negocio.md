---
tags: [proyecto, negocio]
updated: 2026-06-19
---

# 01 - Vision y Negocio

Esta nota fija la **verdad de negocio** del proyecto: qué construimos, para quién, quién paga, y hacia dónde va. Es el punto de entrada conceptual del vault; la traducción técnica vive en [[02 - Arquitectura]] y la visión comercial completa en [[09 - SaaS Multi-tenant]].

## Qué es el proyecto

Es un **sitio web profesional con motor de turnos propio** para profesionales de la salud, hoy materializado en la demo de una psicóloga. No es solo una landing: es una landing de alta conversión **+ un sistema de reservas tipo Calendly hecho a medida + un panel privado** donde el profesional configura su agenda.

La pieza pública (`app/page.tsx`) es un sitio de una sola página que recorre, en orden, el embudo de un paciente:

| Sección | Ancla | Función comercial |
|---|---|---|
| Hero inmersivo | `#inicio` | Promesa y CTA principal a WhatsApp |
| Sobre mí | `#sobre-mi` | Confianza, credenciales (matrícula MP 7321) |
| Servicios / Enfoques | `#servicios` | TCC y ACT explicados |
| Proceso | `#proceso` | Baja la fricción ("dar el primer paso") |
| FAQ | `#faq` | Resuelve objeciones (online, duración, temas) |
| Testimonios | — | Prueba social |
| **Turnos** | `#turnos` | El corazón del producto: el `TurnoForm` |
| Pagos | `#pagos` | Mercado Pago, transferencia (alias), valor de referencia |
| CTA final | — | Cierre cinematográfico hacia WhatsApp |

> Nota: el `README.md` del repo es todavía el genérico de `create-next-app` (no documenta nada del proyecto real). La verdad de negocio vive en el código y en este vault, no en ese README.

## Para quién es (la clienta)

La clienta del MVP es una **psicóloga clínica**. En la demo aparece con el nombre ficticio **"Paulina Pilotti"**, basado en la cuenta real de Instagram `@psicoterapia.pauli`. El detalle de marca está cableado en el código:

- **Metadata SEO** en `app/layout.tsx`: título "Lic. Paulina Pilotti | Psicóloga Clínica en Viedma y Online", keywords de psicología, `locale: es_AR`.
- **JSON-LD `schema.org/Psychologist`** en `app/layout.tsx` (líneas ~66-90): declara `areaServed` Viedma + online, y `availableService` TCC y ACT.
- **Modalidad doble**: presencial en **Viedma (Río Negro, Argentina)** y **online a todo el país**. Esto se repite en hero, FAQ, footer y schema.

Perfil terapéutico que se comunica: Terapia Cognitivo Conductual (TCC) y Terapia de Aceptación y Compromiso (ACT), basada en evidencia, para adolescentes, jóvenes y adultos.

## Quién lo construye y vende (la agencia)

**Codexy** es la agencia detrás del producto. Modelo de negocio: **vende automatizaciones con IA a clínicas y consultorios**. Contacto: `contact@codexyoficial.com`.

El sitio de Paulina es a la vez **producto entregado a un cliente** y **demo vendedora** del sistema que Codexy revende.

## La META: SaaS multi-tenant replicable

Este es el punto más importante y el que ordena todas las decisiones técnicas. **No es un sitio único.** Es un **SaaS multi-tenant replicable**: el mismo sistema se revende a muchos profesionales, donde cada uno tiene:

- su propio sitio público con su marca,
- su propio `/admin` (panel privado),
- su propia disponibilidad y sus propios turnos,
- (a futuro) sus propios datos aislados.

Hoy el código está hecho para **una** profesional (textos y marca hardcodeados, persistencia en un JSON local). La arquitectura objetivo —tenants aislados, base Postgres con RLS— está descrita en [[09 - SaaS Multi-tenant]] y [[07 - Supabase]]. El camino para llegar ahí está en [[10 - Roadmap]].

## Propuesta de valor

La frase corta:

> **El profesional configura su disponibilidad adentro (en `/admin`), y el sitio ofrece los horarios libres afuera, automáticamente.**

El paciente reserva solo, sin ida y vuelta de mensajes para coordinar. El sistema evita la doble reserva (devuelve `409` y el slot ocupado desaparece de la oferta). Esto reemplaza el clásico "escribime y vemos qué día" por una grilla de turnos reales y en vivo. El detalle del motor está en [[03 - Motor de Turnos]].

Para Codexy, el valor adicional es la **replicabilidad**: vender el mismo producto N veces con bajo costo marginal por cada nuevo profesional.

## Quién usa qué

Tres actores distintos, tres superficies distintas:

```
PACIENTE  ─►  Sitio público (app/page.tsx)
              · Lee servicios, FAQ, testimonios
              · Pide turno (TurnoForm en #turnos)
              · Paga (Mercado Pago / transferencia)
              · Contacta por WhatsApp

PROFESIONAL ─► Panel privado /admin  (protegido por proxy.ts)
              · Configura su disponibilidad (/admin/disponibilidad)
              · Ve y gestiona los turnos pedidos
              → eso se expande al sitio público solo

AGENCIA     ─► Codexy
(Codexy)      · Construye, despliega y revende el sistema
              · Replica el tenant para cada nuevo profesional
```

| Actor | Superficie | Qué hace | Nota técnica |
|---|---|---|---|
| **Paciente** | Sitio público | Reserva turno, paga, contacta | Sin login |
| **Profesional** | `/admin` | Define disponibilidad → se publica sola | Auth con contraseña custom (ver [[06 - Panel Interno]]) |
| **Agencia (Codexy)** | Infra / deploy | Construye y replica el SaaS | Ver [[08 - Vercel y Deploy]] |

El detalle del sitio público está en [[05 - Sitio Publico]] y el del panel en [[06 - Panel Interno]].

## Qué existe hoy vs. qué falta

Para no inventar nada, el estado verificado:

- **Existe**: sitio público completo, motor de turnos nativo funcionando (zona Argentina UTC-3 fija sin DST, anti-doble-reserva con `409`), panel `/admin` con configuración de disponibilidad, auth por contraseña custom protegiendo `/admin` vía `proxy.ts`, persistencia en `data/db.json`.
- **PENDIENTE**: migrar la persistencia a Supabase Postgres + RLS (esquema ya escrito, falta el wiring — ver [[07 - Supabase]]); despliegue en Vercel (no desplegar sin confirmación — ver [[08 - Vercel y Deploy]]); parametrizar marca/textos por tenant para que sea verdaderamente multi-tenant (ver [[09 - SaaS Multi-tenant]] y [[10 - Roadmap]]).

## Ver también

- [[09 - SaaS Multi-tenant]] — el modelo replicable en profundidad
- [[10 - Roadmap]] — el camino de demo a SaaS
- [[02 - Arquitectura]] — cómo está construido
- [[03 - Motor de Turnos]] — el corazón del producto
- [[05 - Sitio Publico]] — la superficie del paciente
- [[06 - Panel Interno]] — la superficie del profesional
