# Bitácora

> Registro cronológico de qué se hizo y por qué. Lo más reciente arriba.
> Al cerrar un bloque de trabajo, agregá una entrada.

---

## 2026-07-29 — Sistema de documentación + multi-tenant blindado

**Contexto:** el proyecto gira a **SaaS multi-tenant para psicólogos**. Se necesita
que varios profesionales convivan aislados, y que el conocimiento del proyecto no
se pierda entre sesiones.

**Hecho:**
- **Multi-tenant Fase 0** (`4499d2e`): el `professional_id` se resuelve por request
  a partir del host, en vez de una env fija. → [ADR-0001](decisiones/ADR-0001-multi-tenant-por-host.md)
- **Blindaje del aislamiento** (`5a390fc`): auditoría adversarial de 4 atacantes
  encontró 4 fallas críticas (fail-open, sesión no ligada al tenant, colisión por
  slug, fuga por Telegram). Corregidas y verificadas con ataques reales **antes**
  de desplegar. → [ADR-0002](decisiones/ADR-0002-fail-closed-y-sesion-por-tenant.md)
- **Sistema de documentación** (este `docs/`): arquitectura viva, postura de
  seguridad, ADRs y esta bitácora, versionados junto al código.
- **Push a GitHub arreglado**: el remote ahora incluye el usuario
  (`https://CODEXY-ofi@github.com/...`), que es el que tiene credencial guardada.

**Pendiente:** Fase 1 (cuentas reales con Supabase Auth + RLS como segunda barrera).

---

## 2026-06-25 — Asistente IA: voz, revisión y rediseño

- **Entrada por voz** (`2d69096`): el audio se transcribe con Whisper y **se envía
  solo** (no pasa por el campo de texto).
- **Revisión de 4 agentes** sobre el asistente. Corregido: escrituras fallidas que
  se mostraban en verde como éxito, un error de red que rompía el chat de forma
  permanente, fechas imposibles aceptadas al agendar, turnos "fantasma" sin fecha,
  falta de timeout con OpenAI.
- **Rediseño de UI** (`8b782b8`, `d10ee9b`): dirección "concierge editorial"
  elegida por un panel de diseño; después se pasó todo a tipografía sans para
  respetar la convención del panel.
- **Persistencia por sesión + limpiar con confirmación + tope de historial** (`b04f609`).
- **Definición única de deuda** (`4f9774b`) → [ADR-0003](decisiones/ADR-0003-definicion-unica-de-deuda.md)

---

## 2026-06-24 — Asistente IA y hardening de seguridad

- **Asistente IA en el panel** (`17d06b3`, `c48ae4b`): chat con herramientas de
  lectura (agenda, finanzas, pacientes, disponibilidad) y de escritura (agendar,
  confirmar, cobrar, bloquear, cargar movimiento) **siempre con confirmación**.
  Se evaluó Claude y se eligió OpenAI.
- **Hardening** (`1e2f192`): CSP completa, rate-limit en endpoints públicos, tope
  de body por tamaño real, inyección de fórmulas CSV neutralizada, fail-closed
  ante credenciales de demo, Telegram en tiempo constante, dependencias pesadas
  movidas a `devDependencies`.

---

## 2026-06-24 — Finanzas v2

- Gastos y **neto**, comparativa mes contra mes, export CSV para la contadora,
  cobranza agrupada por paciente, badge de deuda en la ficha (`416ff7b`).
- Fix de zona horaria: los ingresos manuales sin fecha se guardaban en UTC y caían
  en el mes equivocado.
