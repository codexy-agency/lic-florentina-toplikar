# ADR-0005 — Identidad de paciente y zona horaria antes de expandir a MX/USA

- **Fecha:** 2026-07-29
- **Estado:** aceptada (diagnóstico entregado; el cambio de regla queda condicionado)

## Contexto

El objetivo comercial es vender el SaaS en **Argentina, México y Estados Unidos**.
El diseño de la capa de datos (panel de 4 expertos) detectó que hay **dos supuestos
argentinos escondidos en el código** que fallan silenciosamente al cruzar la frontera.
Ninguno de los dos rompe nada hoy; los dos dan **números o vínculos equivocados** mañana.

### 1. Identidad del paciente por "últimos 10 dígitos"

`contactoKey()` (`lib/store.ts`) identifica a un paciente por su email, o por los
**últimos 10 dígitos** de su teléfono. Es la clave que vincula cada turno con su
ficha, y por lo tanto con su historia clínica.

Argentina, México y Estados Unidos usan **10 dígitos locales**. Dos pacientes de
países distintos cuyos últimos 10 dígitos coincidan **se fusionan en una sola
ficha** — es decir, se mezclan dos historias clínicas. No hay error visible.

Es un escenario realista: un psicólogo argentino que atiende online a alguien en
México ya tiene pacientes de dos países en el mismo consultorio.

### 2. El período contable se calcula cortando texto

`enPeriodo()` y `porMes()` obtienen el mes haciendo `iso.slice(0,7)` sobre la fecha
del turno. Funciona **solo** porque el motor de turnos escribe siempre offset fijo
`-03:00` (`AR_OFFSET_H = -3` en `lib/scheduling/slots.ts`). Para un consultorio en
México o EE.UU., un turno del último día del mes a la noche cae en el **mes
siguiente** en los reportes de finanzas. Otra vez: sin error, con números mal.

## Decisión

**No cambiar ninguna de las dos reglas a ciegas.** Cambiar `contactoKey()` sin más
reasigna las claves y **rompe el vínculo turno↔paciente de los datos existentes**:
un paciente cargado una vez con `+54 9 2920 41 1122` y otra con `2920 41 1122`
pasaría a ser dos personas distintas, o peor, dos personas distintas quedarían
unidas por una fusión previa que nadie revisó.

Se define esta secuencia obligatoria:

1. **Diagnosticar primero.** `scripts/diagnostico-pacientes.mjs` (entregado)
   reporta, sin modificar nada: claves compartidas por varios pacientes,
   distinguiendo si los números completos **difieren** (personas distintas que hoy
   se fusionan → grave) o coinciden (duplicado real); fichas con email y teléfono
   separados; turnos sin ficha que los matchee; y contactos que no parecen argentinos.
2. **Resolver a mano** lo que aparezca. No hay deshacer barato para una fusión de
   historias clínicas.
3. **Recién ahí** cambiar la regla: normalizar a formato internacional (E.164)
   guardando el **código de país**, con un país por defecto **por consultorio**
   (un teléfono local se interpreta con el país de ese consultorio).
4. **Persistir un `pacienteId` en el turno.** Hoy el vínculo se recalcula en cada
   request comparando strings; con un id explícito, la identidad deja de depender
   de una heurística. Esto entra junto con la migración a tablas.
5. **Zona horaria por consultorio**: materializar la fecha local del tenant en vez
   de derivar el mes del string ISO. El motor de turnos (hoy `-03:00` fijo) se
   parametriza en la misma tanda.

## Alternativas consideradas

1. **Cambiar `contactoKey` ahora y ver qué pasa.** Descartado: el riesgo es mezclar
   historias clínicas, que es exactamente lo que no se puede permitir.
2. **Dejarlo como está y resolverlo cuando haya un cliente de México.** Descartado:
   para entonces habría datos reales que arreglar a mano, y el error es silencioso
   (nadie lo reporta porque no se ve).
3. **Usar una librería de teléfonos (libphonenumber).** Es la solución correcta a
   futuro, pero pesa y no resuelve el problema de fondo, que es la **migración** de
   las claves existentes. Se evalúa en el paso 3.

## Consecuencias

**A favor**
- El riesgo queda **medido y documentado** en vez de latente. Hoy el diagnóstico da
  limpio, así que el cambio de regla se puede hacer con bajo riesgo si se hace pronto.
- La herramienta de diagnóstico queda para correr antes de cada paso de la migración.

**En contra / pendiente**
- Mientras no se ejecuten los pasos 3-5, **no conviene dar de alta consultorios
  fuera de Argentina**: los reportes de finanzas darían mal y existe riesgo de
  fusión de pacientes.
- El motor de turnos sigue con offset argentino fijo.
