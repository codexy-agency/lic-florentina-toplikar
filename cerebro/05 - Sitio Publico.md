---
tags: [proyecto, producto]
updated: 2026-06-19
---

# 05 - Sitio Publico

La cara visible del producto: la landing de una página y el flujo de reserva nativo. Es lo que ve el paciente y, en clave SaaS, es la "vidriera" replicable que cada profesional revende con su marca. Esta nota documenta lo que **realmente** hay en el código: la estructura de `app/page.tsx`, el componente estrella `components/TurnoForm.tsx`, la paleta pastel de `app/globals.css` y los componentes de chrome (`Nav`, `WhatsAppCTA`, animaciones `Reveal`).

> El motor que alimenta el formulario (slots, zona horaria AR, anti-doble-reserva) vive en [[03 - Motor de Turnos]]. El reverso administrativo (donde la profesional configura disponibilidad y ve los turnos) está en [[06 - Panel Interno]].

---

## Anatomía de `app/page.tsx`

Es un **Server Component** único (`export default function Home()`) que ensambla la landing entera como una secuencia de `<section>`. Los datos de contenido (servicios, proceso, FAQ, testimonios) están en constantes locales arriba del componente — no hay CMS, es contenido hardcodeado por ahora.

Importa los building blocks desde `@/components`: `Nav`, `Reveal`, `WhatsAppCTA`, `Divider`/`Leaf`, `Botanical` (conectores de enredadera), `MobileCTA`, `TurnoForm` y `CopyAlias`.

### Secciones reales (en orden de scroll)

| # | `id` | Sección | Qué hay |
|---|------|---------|---------|
| 1 | `#inicio` | **Hero** full-bleed | Imagen `/hero/c1.jpg` con efecto Ken Burns, velos en gradiente para legibilidad, titular animado palabra por palabra, dos CTAs (WhatsApp + "Conocer más"), indicador de scroll |
| 2 | — | **Franja de valores** | Tira con "Empatía · Escucha · Formación · Respeto" (de la bio real) |
| 3 | `#sobre-mi` | **Sobre mí** | Foto con marco redondeado + parallax, capitular (`first-letter`), texto sobre el enfoque basado en evidencia, badge "MP 7321" |
| 4 | `#servicios` | **Servicios / Enfoques** | Dos tarjetas "double-bezel": TCC y ACT. Cierra con motivos de consulta en prosa |
| 5 | — | **Interludio** | Banda con imagen `/interludio.jpg` y cita tipográfica |
| 6 | `#proceso` | **Proceso** | Tres pasos (01-02-03) conectados por una enredadera SVG (`VineConnector`) |
| 7 | `#faq` | **Preguntas frecuentes** | `<details>` nativos con animación de despliegue (`details.faq`) |
| 8 | — | **Testimonios** | Tres `<figure>` con quotes (prueba social) |
| 9 | `#turnos` | **Turnos** | Columna de copy + `<TurnoForm />` — el corazón funcional |
| 10 | `#pagos` | **Pagos** | Tres tarjetas: Mercado Pago, Transferencia (`<CopyAlias />`), Valor de referencia ($18.000/sesión) |
| 11 | — | **CTA final** | Banda con `<video>` de fondo + CTA de WhatsApp |
| 12 | — | **Footer** | Marca, navegación, contacto (`@psicoterapia.pauli`, Viedma), barra inferior con © y "Volver arriba" |
| — | — | **`<MobileCTA />`** | Barra fija de WhatsApp, solo mobile, fuera del `<main>` |

> [!note] Hechos reales del contenido
> El consultorio es presencial en **Viedma** + online a todo el país. Matrícula mostrada: **MP 7321**. Valor de referencia: **$18.000 / sesión de 50 min**. Instagram: **@psicoterapia.pauli**. Todo esto es copy de demo basado en la cuenta real — no inventar métricas más allá de esto (ver [[01 - Vision y Negocio]]).

### Detalle de las secciones de monetización

- **Pagos** (`#pagos`): tres medios. Mercado Pago (link externo placeholder a `link.mercadopago.com.ar`), Transferencia con `<CopyAlias alias="paulina.pilotti.psi" />` (copia el alias al portapapeles), y un valor de referencia visual. **Nota técnica:** estos métodos son informativos/manuales — no hay checkout integrado ni webhook de pago. El pago es por fuera, una vez confirmado el turno.
- **Servicios** y **Proceso** son puramente declarativos (arrays `SERVICES` y `PROCESS`).

---

## El componente estrella: `components/TurnoForm.tsx`

Es un **Client Component** (`"use client"`) que implementa una reserva **nativa estilo Calendly**: el sitio *muestra los horarios libres reales* y el paciente elige uno. No pregunta "¿qué horario te queda?" — ofrece los slots disponibles que la profesional configuró en `/admin/disponibilidad`. Esa expansión disponibilidad → slots es responsabilidad de [[03 - Motor de Turnos]].

### Dependencias

```ts
import { horaAR } from "@/lib/scheduling/slots";
import type { DaySlots, Slot, Modalidad } from "@/lib/scheduling/types";
```

Toda la lógica de fecha/hora (formateo a hora argentina, tipos de día/slot/modalidad) viene de la capa de scheduling — el formulario es solo la UI. Ver [[03 - Motor de Turnos]] y [[04 - Capa de Datos]].

### Estado del componente

```ts
const [modalidad, setModalidad] = useState<Modalidad>("online");
const [dias, setDias]           = useState<DaySlots[]>([]);
const [cargando, setCargando]   = useState(true);
const [diaSel, setDiaSel]       = useState<string | null>(null);
const [slot, setSlot]           = useState<Slot | null>(null);
const [enviando, setEnviando]   = useState(false);
const [error, setError]         = useState<string | null>(null);
const [enviado, setEnviado]     = useState(false);
```

### Flujo de reserva (paso a paso)

1. **Elegir modalidad** — botones tipo chip: `Online` / `Presencial en Viedma`. Cambiar de modalidad dispara la recarga de slots.
2. **Fetch de slots** — un `useEffect([modalidad])` llama a `cargarSlots(m)`, que hace:
   ```ts
   const r = await fetch(`/api/slots?modalidad=${m}`, { cache: "no-store" });
   const data = await r.json();
   const ds: DaySlots[] = data.dias ?? [];
   setDias(ds);
   setDiaSel(ds[0]?.date ?? null);   // preselecciona el primer día
   ```
   El `cache: "no-store"` es deliberado: los slots cambian en vivo, nunca se cachean.
3. **Elegir día** — fila de botones con scroll horizontal; cada uno muestra `label` + cuántos horarios tiene (`{n} horario(s)`). Al cambiar de día se resetea el slot (`setSlot(null)`).
4. **Chip de horario** — grilla de 3-4 columnas con los `dia.slots`. El texto del chip es `horaAR(sl.startsAt)` (hora AR formateada por la capa de scheduling). Seleccionar uno guarda el `Slot` y limpia el error.
5. **Datos del paciente** — el `<form>` aparece **recién al elegir slot** (`{slot && (...)}`): `nombre`, `contacto` (email o WhatsApp, requeridos) y `motivo` (opcional). Arriba muestra un resumen: "Reservás el {label} · {hora} hs (Online/Presencial)".
6. **POST a `/api/turnos`** — en `onSubmit` arma el payload y lo postea:
   ```ts
   const payload = {
     nombre, contacto, modalidad,
     startsAt: slot.startsAt,
     endsAt:   slot.endsAt,
     motivo,
   };
   const r = await fetch("/api/turnos", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify(payload),
   });
   ```

### Manejo del 409 (anti-doble-reserva)

El detalle profesional del componente: si dos personas eligen el mismo horario, el servidor responde **409** y la UI se recupera sola sin perder al paciente.

```ts
if (!r.ok || !data.ok) {
  if (r.status === 409) {
    setError("Ese horario se acaba de ocupar. Elegí otro, por favor.");
    await cargarSlots(modalidad);   // recarga slots → el ocupado desaparece
  } else {
    setError(data.error || "No se pudo reservar. Probá de nuevo.");
  }
  return;
}
setEnviado(true);
```

El 409 lo emite la API; la garantía de no-doble-reserva es del backend (ver [[03 - Motor de Turnos]]). Acá la UI solo lo refleja: muestra el aviso y **recarga la oferta**, de modo que el slot que se acaba de ocupar ya no aparece. También hay un `catch` para errores de conexión.

### Pantalla de éxito

Cuando `enviado === true`, el componente reemplaza todo el formulario por una confirmación: ícono de check, título "¡Turno reservado!" y el mensaje de que Paulina confirma personalmente dentro de las 24 horas. Incluye un botón **"Reservar otro turno"** que vuelve al inicio (`setEnviado(false)` + `cargarSlots`).

> [!important] El turno queda "pendiente", no auto-confirmado
> El copy dice claramente que la profesional **confirma a mano** y avisa al contacto dejado. El sistema reserva el slot (lo bloquea) pero la confirmación humana es parte del flujo, no un mail automático. Esto es honesto con lo que existe hoy: no hay envío automático de notificaciones implementado. Lo no hecho se marca como PENDIENTE en [[10 - Roadmap]].

### Estados de la UI

| Estado | Qué se ve |
|--------|-----------|
| `cargando` | "Buscando horarios disponibles…" |
| `dias.length === 0` | Aviso de que no hay horarios en esa modalidad + sugerencia de probar la otra o escribir por WhatsApp |
| slot elegido | Aparece el form de datos con resumen del turno |
| `enviando` | Botón muestra "Reservando…" y queda `disabled` |
| `error` (general) | Bloque rojo malva (`#9C5475`) con el mensaje |
| `enviado` | Pantalla de éxito |

---

## Paleta pastel y sistema de diseño (`app/globals.css`)

Tailwind v4 con `@import "tailwindcss"` y un bloque `@theme inline` que define la identidad como **CSS variables**. La decisión de diseño: calma terapéutica, rosa empolvado + lavanda, nada estridente.

> [!note] Truco de naming
> Los nombres de variable (`sage`, `espresso`, `cream`) son herencia de una identidad anterior "verde/tierra" y **se conservan por compatibilidad**, pero los valores son la paleta rosa/malva actual. Es decir: `--color-sage` NO es verde, es rosa empolvado. Tenerlo presente al leer el JSX.

```css
@theme inline {
  --color-cream: #FBF7F7;        /* fondo base */
  --color-cream-deep: #F4EBEC;   /* fondo de tarjetas */
  --color-espresso: #3A3137;     /* texto principal (ciruela profundo) */
  --color-espresso-soft: #6B5E66;/* texto secundario */
  --color-sage: #D9A7B8;         /* acento primario — rosa empolvado */
  --color-sage-deep: #9C5475;    /* acento saturado (cumple AA) */
  --color-clay: #C9B6D6;         /* acento secundario — lavanda */
  --color-line: rgba(58, 49, 55, 0.1);
  --ease-fluid: cubic-bezier(0.32, 0.72, 0, 1);
  /* sombras coloreadas hacia el rosa para coherencia pastel */
}
```

Mapa de la paleta: **rose** (`sage` / `sage-deep`), **lavender** (`clay`), **plum** (`espresso` como texto). Hay comentarios de contraste en el código (texto principal 11.8:1, `sage-deep` cumple AA), o sea que la accesibilidad se cuidó a propósito.

Otros detalles del CSS que vale conocer:

- **`.grain`** — overlay de film-grain (ruido SVG en `::before`, opacidad 0.03) para textura de papel.
- **`--ease-fluid`** — la curva `cubic-bezier(0.32, 0.72, 0, 1)` se repite en TODO el JSX como firma de movimiento.
- **Animaciones del hero** — `.hero-rise`, `.hero-mask` + `.hero-word` (titular palabra por palabra), `.kenburns`.
- **Parallax scroll-driven** — `.parallax-img`, `.parallax-back`, `.parallax-mid` usando `animation-timeline: view()` (corre en el compositor, degrada solo).
- **Sistema botánico** — `.botanic` tiñe las acuarelas PNG al rosa de marca vía filtros; `.sway` / `.sway-slow` les da un vaivén perpetuo.
- **FAQ** — despliegue suave con `grid-template-rows: 0fr → 1fr`.
- **`prefers-reduced-motion`** — todo el movimiento está envuelto en `@media (prefers-reduced-motion: no-preference)` y hay un bloque final que mata `animation`/`transition` si el usuario pide menos movimiento. Accesibilidad real, no decorativa.

---

## Chrome: Nav, WhatsAppCTA, Reveal, MobileCTA

### `components/Nav.tsx` (Client Component)

Header fijo con **tres estados** controlados por scroll:

1. **Arriba del todo (hero):** integrado y transparente, sin píldora.
2. **Scrolleando hacia abajo:** se esconde (`-translate-y-[130%]`) para dar lectura.
3. **Scrolleando hacia arriba:** reaparece "espejado" — píldora espresso con blur (`bg-espresso/95 backdrop-blur-md`).

La lógica vive en un `useEffect` que escucha `scroll` (passive) con umbral anti-flicker (`Math.abs(delta) > 6`). Links: Sobre mí, Servicios, Turnos, Pagos, Preguntas. Incluye CTA de WhatsApp (desktop) y un menú hamburguesa full-screen para mobile (con `inert` cuando está cerrado y cierre con `Escape`). Buen detalle de accesibilidad: `aria-expanded`, `aria-controls`, `aria-label` dinámico.

### `components/WhatsAppCTA.tsx` (Client Component)

Botón/enlace reutilizable a WhatsApp. Props: `label`, `variant` (`"dark"` | `"light"`), `className`. Apunta a `WHATSAPP_URL` (exportado desde `./Reveal`), abre en pestaña nueva con `rel="noopener noreferrer"`. Tiene un efecto "sheen" (barrido de brillo) en hover y un ícono de flecha. Es **el CTA principal de conversión** de toda la landing — aparece en hero, nav, footer y CTA final.

### `components/Reveal.tsx`

Wrapper de animación de entrada (revelar al hacer scroll), con prop `from` (`"left"`, `"up"`, etc.) y `delay`. Se usa en casi todas las secciones para el efecto escalonado. **Además exporta `WHATSAPP_URL`**, que es de dónde lo toma `WhatsAppCTA`.

### `components/MobileCTA.tsx`

Barra fija de WhatsApp visible **solo en mobile**, montada al final del árbol fuera del `<main>`. Garantiza que el CTA esté siempre a mano en celular.

---

## Decisiones de diseño (y lo que se evitó a propósito)

- **Sin métricas inventadas.** No hay "+500 pacientes" ni "98% de satisfacción". Los testimonios son anónimos y realistas, los números son los reales (matrícula, valor, duración de sesión). Coherente con la regla de profesionalismo del proyecto.
- **Tipografía con sentido.** Serif para títulos/acentos (clave emocional, calma), sans para cuerpo. Nada de fuentes display gratuitas. La jerarquía es sobria.
- **Movimiento que respeta al usuario.** Todo el parallax/animaciones degradan con `prefers-reduced-motion` y `@supports`.
- **Reserva nativa, no Calendly embebido.** Se eligió construir el flujo propio para que sea parte del SaaS multi-tenant (cada profesional su disponibilidad, su marca). Ver [[09 - SaaS Multi-tenant]].
- **Pagos informativos, no checkout.** Honesto: hoy son medios manuales (alias, link), sin integración de pago real.

---

## Cómo se conecta con el resto

- El `TurnoForm` consume `/api/slots` y postea a `/api/turnos`: ambos endpoints y su lógica están en [[03 - Motor de Turnos]].
- Los tipos `DaySlots`, `Slot`, `Modalidad` y el helper `horaAR` viven en `lib/scheduling/` — ver [[04 - Capa de Datos]].
- La disponibilidad que llena los slots la edita la profesional en `/admin/disponibilidad` → [[06 - Panel Interno]].
- La arquitectura general (App Router, Server vs Client Components, Tailwind v4) está en [[02 - Arquitectura]].

---

## Ver también

- [[03 - Motor de Turnos]]
- [[06 - Panel Interno]]
- [[04 - Capa de Datos]]
- [[02 - Arquitectura]]
- [[09 - SaaS Multi-tenant]]
- [[01 - Vision y Negocio]]
