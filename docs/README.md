# Documentación del proyecto

> **Memoria viva del proyecto.** Todo lo que se decide y se construye queda acá,
> versionado junto al código. Si alguien (persona o IA) toma el proyecto desde
> cero, esto es lo primero que tiene que leer.

## Qué hay acá

| Archivo | Qué contiene | Cuándo se actualiza |
|---|---|---|
| [ARQUITECTURA.md](ARQUITECTURA.md) | Cómo está cableado el sistema hoy: capas, flujo de datos, multi-tenant, auth. **Documento vivo.** | Cada vez que cambia una pieza estructural |
| [SEGURIDAD.md](SEGURIDAD.md) | Postura de seguridad, auditorías hechas, hallazgos y su estado. | Después de cada auditoría o fix de seguridad |
| [BITACORA.md](BITACORA.md) | Registro cronológico: qué se hizo, cuándo y por qué. | Al cerrar cada bloque de trabajo |
| [decisiones/](decisiones/) | **ADRs**: una decisión técnica por archivo, con contexto y consecuencias. Son **inmutables** (si una decisión se revierte, se escribe un ADR nuevo que la supersede). | Cada decisión estructural |

## Reglas

1. **Nada de secretos acá.** Ni contraseñas, ni tokens, ni claves. Solo placeholders.
2. **Nada comercial acá.** Precios, estrategia de marketing y planes de negocio van al
   vault interno (`Codexy-Docs`), fuera de este repositorio.
3. **Los ADR no se editan.** Se agrega uno nuevo que reemplace al anterior.
4. **Si cambiás cómo funciona algo, actualizá `ARQUITECTURA.md` en el mismo commit.**

## Convención de ADR

Nombre: `decisiones/ADR-NNNN-titulo-en-kebab.md`. Estructura mínima:

```markdown
# ADR-NNNN — Título
- **Fecha:** YYYY-MM-DD
- **Estado:** propuesta | aceptada | supersedida por ADR-XXXX

## Contexto
Qué problema había.

## Decisión
Qué se decidió hacer.

## Alternativas consideradas
Qué otras opciones había y por qué se descartaron.

## Consecuencias
Qué gana y qué cuesta esta decisión. Qué queda pendiente.
```
