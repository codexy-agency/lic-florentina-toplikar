# ADR-0003 — Una sola definición de "sesión impaga"

- **Fecha:** 2026-06-25
- **Estado:** aceptada
- **Commit:** `4f9774b`

## Contexto

La dueña reportó que los montos de deuda **no coincidían entre pantallas**: la
lista de Pacientes decía que alguien debía $18.000, la ficha mostraba otra cosa,
Finanzas ni siquiera la listaba, y el asistente cobraba un importe distinto.

Una auditoría (4 agentes mapeando cada cálculo + 1 reconciliando) encontró que
había **cuatro definiciones distintas** de "deuda" conviviendo:

| Vista | Qué contaba | ¿Filtraba por mes? |
|---|---|---|
| Lista de Pacientes | solo turnos `realizado` sin pagar | no |
| Ficha del paciente | igual, pero **código duplicado** aparte | no |
| Finanzas → Cobranza | `realizado` + `confirmado` vencido | **sí** |
| Asistente IA | `realizado` + `confirmado`, **incluso futuros** | no |

Los conjuntos resultaban casi disjuntos: un turno viejo aparecía en Pacientes pero
no en Finanzas (filtrada al mes), y el asistente contaba como deuda sesiones que
todavía no habían ocurrido.

## Decisión

Una **única función canónica** `esImpaga(t)` en `lib/store.ts`, usada por todas
las vistas:

```ts
// Sin pagar Y la sesión ya ocurrió.
!t.pagado && (
  t.estado === "realizado" ||
  (t.estado === "confirmado" && t.startsAt && new Date(t.startsAt) < ahora)
)
```

Excluye pendientes, rechazados y turnos a futuro (un confirmado futuro **no** es
deuda hasta que la sesión pase).

Finanzas conserva su filtro por período **a propósito** (es un reporte mensual),
y la UI ahora lo aclara: "cobranza del período; la deuda total del paciente está
en su ficha".

## Alternativas consideradas

1. **Contar solo `realizado`.** Descartado: el caso real más común es dar la sesión
   y olvidarse de marcarla como realizada; esa plata quedaba invisible.
2. **Contar también los turnos futuros confirmados.** Descartado: inflaba la deuda
   con sesiones que todavía no ocurrieron y contradecía la intuición de la dueña.
3. **Que cada vista mantenga su criterio y solo documentarlo.** Descartado: la
   confusión sobre plata destruye la confianza en la herramienta.

## Consecuencias

**A favor**
- El monto que se muestra es el mismo que se cobra, en todas las pantallas.
- Los turnos "confirmados y vencidos" (el caso real más común) ya no desaparecen.
- Una sola función que auditar y testear.

**En contra / pendiente**
- La asociación paciente↔turno sigue siendo por contacto normalizado
  (`contactoKey`: email, o últimos 10 dígitos del teléfono), no por un id de
  paciente persistido. Dos personas con los mismos últimos 10 dígitos colisionan,
  y un mismo paciente cargado con email en un turno y teléfono en otro se cuenta
  dos veces. → Persistir `pacienteId` en la solicitud es deuda técnica pendiente.
