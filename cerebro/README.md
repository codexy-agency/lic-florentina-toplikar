---
tags: [meta]
updated: 2026-06-20
---

# README — Cerebro del proyecto

Este es el **vault de Obsidian** del proyecto (la psicóloga + el SaaS replicable de Codexy). Es la fuente de contexto para retomar el trabajo en cualquier sesión sin tener que releer todo el código.

> Esto NO es el README del proyecto Next.js (ese está en la raíz del repo). Este vive dentro de `cerebro/` y documenta el contexto.

## Cómo usarlo

1. Abrí **Obsidian** → "Open folder as vault" → elegí la carpeta `cerebro/`.
2. Empezá por **[[00 - Indice]]** (el mapa de contenidos / puerta de entrada).
3. Navegá con los enlaces `[[wikilink]]`. Activá la **vista de grafo** para ver cómo se conecta todo.

## Convención

- Las notas se nombran `NN - Tema` (número para ordenarlas).
- Cada nota arranca con frontmatter (`tags`, `updated`) y un `# Título`.
- Al editar una nota, **actualizá su `updated:`**.
- Los hechos se documentan contra el código real; lo no hecho se marca **PENDIENTE**.

## Índice de notas

| Nota | De qué trata |
|---|---|
| [[00 - Indice]] | Mapa de contenidos y reglas críticas |
| [[01 - Vision y Negocio]] | Cliente, Codexy y la meta de SaaS replicable |
| [[02 - Arquitectura]] | Stack, estructura, workflow dev→OneDrive |
| [[03 - Motor de Turnos]] | Motor de slots (función pura, zona AR) |
| [[04 - Capa de Datos]] | Store en archivo JSON, atómico, migrable |
| [[05 - Sitio Publico]] | Landing, reserva nativa, página `/reservar`, CTAs |
| [[06 - Panel Interno]] | `/admin`: auth, bandeja, agenda, disponibilidad |
| [[07 - Supabase]] | Esquema, RLS, credenciales pendientes |
| [[08 - Vercel y Deploy]] | Deploy, env vars, límites de serverless |
| [[09 - SaaS Multi-tenant]] | Estrategia de tenancy y gaps |
| [[10 - Roadmap]] | Qué está hecho y qué sigue |
| [[11 - Glosario y Decisiones]] | Términos y mini-ADRs |

## Estado al 2026-06-20

Motor de turnos nativo funcionando y verificado; panel interno con disponibilidad configurable; **página dedicada `/reservar`** y CTAs de "Reservar turno" en todo el sitio. **Pendiente:** aplicar el esquema Supabase al proyecto del cliente y conectar; deploy a Vercel (paso a paso, con confirmación). Detalle en [[10 - Roadmap]] y [[07 - Supabase]].

## Ver también

- [[00 - Indice]]
- [[10 - Roadmap]]
