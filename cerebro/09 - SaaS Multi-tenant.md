---
tags: [proyecto, negocio]
updated: 2026-06-19
---

# 09 - SaaS Multi-tenant

El objetivo central de [[01 - Vision y Negocio|Codexy]] no es entregar **un** sitio para Paulina Pilotti: es construir un **producto replicable** que se revenda a muchos profesionales de la salud, cada uno con su panel, sus turnos y su marca. La demo de la psicóloga es la **plantilla viva** del SaaS. Esta nota documenta la estrategia de multi-tenancy: qué ya está escrito en el esquema, cómo aísla a cada profesional, qué falta para que el código sea realmente multi-inquilino, y cómo se empaqueta comercialmente.

> [!warning] Estado honesto
> El **esquema** multi-tenant ya está diseñado y escrito (`supabase/migrations/0001_init.sql` y `0002_rls.sql`), pero **el código de la app todavía NO es multi-tenant**. Hoy la auth es de contraseña única y la capa de datos es un JSON global sin noción de inquilino. Los gaps están listados abajo como **PENDIENTE**. Ver también [[07 - Supabase]] y [[04 - Capa de Datos]].

---

## 1. Qué significa multi-tenant acá

Un único despliegue del sistema sirve a N profesionales ("tenants" o inquilinos). Cada uno:

- ve **solo sus** pacientes, turnos, pagos y notas,
- configura **su** disponibilidad y aparece en **su** sitio público,
- tiene **su** marca (nombre, color, foto),
- entra a **su** `/admin`.

La clave de tenancy elegida es una columna `professional_id` presente en **todas** las tablas de datos, que apunta a `public.professionals.id`. Ese es el "tenant key" del sistema.

---

## 2. El esquema ya aísla por `professional_id`

### 2.1 La tabla `professionals` ES el tenant

En `supabase/migrations/0001_init.sql` (líneas 62-82), `professionals` liga el perfil de negocio a un usuario de `auth.users` de Supabase:

```sql
create table if not exists public.professionals (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null unique references auth.users(id) on delete cascade,
  nombre          text not null,
  matricula       text,
  email           citext,
  telefono        text,
  ...
  zona_horaria    text not null default 'America/Argentina/Buenos_Aires',
  activo          boolean not null default true,
  metadata        jsonb not null default '{}'::jsonb,
  ...
);
```

Cada fila de `professionals` es **un cliente del SaaS**. El `user_id` es único: una cuenta de login = un profesional = un tenant. La columna `metadata jsonb` es el gancho natural para guardar branding y configuración por tenant sin migrar el esquema (ver §4).

### 2.2 Todas las tablas hija cuelgan del tenant

Cada tabla de datos lleva `professional_id ... references public.professionals(id) on delete cascade`, con índice por ese campo. En el esquema actual eso aplica a:

| Tabla | Para qué | Tenant key |
|---|---|---|
| `patients` | pacientes | `professional_id` (0001_init L87) |
| `appointment_requests` | solicitudes desde la web pública | `professional_id` (L112) |
| `appointments` | agenda de turnos | `professional_id` (L136) |
| `clinical_notes` | notas clínicas (dato sensible) | `professional_id` (L161) |
| `payments` | cobros | `professional_id` (L184) |
| `invoices` | facturas / AFIP | `professional_id` (L207) |

El `on delete cascade` significa que si se da de baja un profesional, **todos sus datos se borran con él**: no quedan filas huérfanas de otro inquilino. Es un aislamiento por diseño, no solo por convención.

### 2.3 RLS: el aislamiento lo fuerza Postgres, no la app

El archivo `supabase/migrations/0002_rls.sql` activa Row Level Security en las 7 tablas (deny-by-default, líneas 8-14) y refuerza `clinical_notes` con `force row level security` (L16) para que **ni el dueño del schema** saltee la protección del dato clínico.

El corazón del aislamiento es un helper `SECURITY DEFINER` definido en `0001_init.sql` (L57-60):

```sql
create or replace function public.current_professional_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.professionals where user_id = auth.uid();
$$;
```

Traduce el usuario logueado (`auth.uid()`) a **su** `professional_id`. Es `SECURITY DEFINER` justamente para evitar la recursión de RLS al consultar `professionals` desde las policies de las otras tablas (comentario en L55-56).

Sobre ese helper, cada tabla hija tiene una policy `for all` que compara contra el tenant actual. Ejemplo de `patients` (`0002_rls.sql` L29-32):

```sql
create policy patients_all_own on public.patients
  for all to authenticated
  using (professional_id = (select public.current_professional_id()))
  with check (professional_id = (select public.current_professional_id()));
```

El mismo patrón se repite para `appointments`, `clinical_notes`, `payments` e `invoices`. La tabla `professionals` se restringe por `user_id = auth.uid()` (L19-26), y `appointment_requests` separa SELECT/UPDATE/DELETE por tenant (L34-43) pero **no** expone INSERT a usuarios autenticados.

> [!note] Conclusión
> El aislamiento entre inquilinos **no depende de que la app filtre bien**: lo garantiza la base de datos. Aunque un bug de la app pidiera "todos los pacientes", Postgres devuelve solo los del tenant logueado. Eso es lo que hace seguro un único proyecto compartido.

### 2.4 El paciente público sin login

Un visitante del sitio (sin cuenta) tiene que poder **pedir un turno**. RLS bloquea el INSERT directo, así que `0002_rls.sql` (L68-99) define una RPC `crear_solicitud_publica(...)` `SECURITY DEFINER` que:

1. valida que nombre y contacto no estén vacíos,
2. verifica que el `professional_id` exista, esté `activo` y no esté borrado,
3. inserta la solicitud con estado `'pendiente'`.

Se le da `grant execute ... to anon, authenticated` (L99). Esto es importante para multi-tenancy: el sitio público pasa **explícitamente** el `professional_id` del tenant dueño de ese sitio, de modo que la solicitud cae en la bandeja correcta. (El comentario del archivo recomienda, alternativamente, hacerlo server-side con `service_role` desde un Route Handler — ver [[02 - Arquitectura]].)

---

## 3. Modelo de tenancy: un proyecto vs. proyecto por cliente

Hay dos formas de hospedar N inquilinos. El esquema actual está pensado para la primera.

### Opción A — Pool: un proyecto Supabase, una fila por cliente (ELEGIDA)

Todos los profesionales viven en el mismo proyecto (`nojgdkesngpbaidqperp`), separados por `professional_id` + RLS.

**A favor:**
- Una sola base, una sola migración, un solo deploy. Operativamente barato.
- Onboarding instantáneo: dar de alta un cliente = insertar una fila en `professionals`.
- Costo marginal por cliente ≈ 0 hasta escalar de verdad.

**En contra:**
- "Noisy neighbor": un tenant pesado puede afectar el rendimiento de otros.
- El aislamiento depende 100% de que RLS esté bien escrito. Un error en una policy es un incidente cross-tenant.
- Backups y export por cliente requieren filtrar por `professional_id` (no es un dump aislado).

### Opción B — Silo: un proyecto Supabase por cliente

Cada profesional, su propio proyecto/base.

**A favor:**
- Aislamiento físico total. Cero riesgo de fuga cross-tenant por bug de RLS.
- Cuota de cómputo y backup independientes; export = dump entero.
- Encaja con clientes que exijan residencia/segregación de datos de salud.

**En contra:**
- N proyectos que aprovisionar, migrar y monitorear. Operativamente caro.
- Onboarding self-service mucho más complejo (crear proyecto por API, correr migraciones, rotar claves).
- Costo base por cliente desde el día uno.

### Recomendación

| | Pool (A) | Silo (B) |
|---|---|---|
| Esfuerzo operativo | Bajo | Alto |
| Costo por cliente | ≈0 al inicio | Fijo desde el día 1 |
| Riesgo de fuga | Depende de RLS | Casi nulo |
| Onboarding self-service | Fácil | Difícil |
| Apto para tier premium / datos sensibles | Aceptable | Ideal |

**Pool (A)** para el grueso del producto y los planes estándar — es lo que el esquema ya soporta. Reservar **Silo (B)** como opción para un plan enterprise/premium si algún cliente lo pide. No es excluyente: el código de acceso a datos puede abstraerse para soportar ambos a futuro. Decisión registrada en [[11 - Glosario y Decisiones]].

---

## 4. Branding por tenant

Cada sitio público debe sentirse del profesional, no de Codexy. Datos de marca por tenant:

- **Nombre** — ya existe: `professionals.nombre` (`0001_init.sql` L66).
- **Zona horaria** — ya existe: `professionals.zona_horaria` (L72), default Buenos Aires. Clave para que el [[03 - Motor de Turnos]] genere slots en la hora local de cada profesional.
- **Color, foto, logo, bio, slug, redes** — **no** tienen columna propia todavía. El lugar previsto es `professionals.metadata jsonb` (L74), que evita migrar el esquema por cada campo de presentación.

Forma sugerida del `metadata` por tenant (PENDIENTE de implementar y wirear al sitio):

```json
{
  "slug": "paulina-pilotti",
  "color_primario": "#7c6f64",
  "foto_url": "/tenants/paulina/perfil.png",
  "bio": "Psicóloga. Online y presencial en Viedma.",
  "instagram": "psicoterapia.pauli"
}
```

El [[05 - Sitio Publico]] leería `nombre`, `metadata.color_primario`, `metadata.foto_url` y `metadata.bio` para renderizar el theme del tenant. Hoy esos valores están **hardcodeados** en los componentes de la demo.

---

## 5. Ruteo: subdominio vs. path

Cómo el sistema sabe **qué tenant** está sirviendo en cada request.

| Estrategia | Ejemplo | A favor | En contra |
|---|---|---|---|
| **Path** | `codexy.app/paulina-pilotti` | Trivial con App Router (`/[slug]`); un solo dominio/cert | Marca menos "propia"; URL más larga |
| **Subdominio** | `paulina.codexy.app` | Se siente como sitio propio; aísla cookies | Requiere wildcard DNS + resolución de tenant en `proxy.ts` |
| **Dominio propio** | `paulinapilotti.com.ar` | Marca 100% del cliente; mejor para SEO | Verificación de dominio y certificados por cliente (tier premium) |

En todos los casos, el `proxy.ts` (la convención que en este Next.js reemplaza a `middleware`, ver [[02 - Arquitectura]]) o un segmento dinámico `app/[slug]/` resuelve el host/slug → `professional_id` antes de pintar la página. Ese `professional_id` es el que después se pasa a la RPC pública y al motor de turnos.

> [!note] Recordatorio de stack
> Antes de tocar ruteo, leer la doc local (`node_modules/next/dist/docs/`): este Next.js tiene breaking changes y ya migró `middleware` → `proxy`. Ver [[08 - Vercel y Deploy]].

---

## 6. Onboarding self-service

El sueño del SaaS: que un profesional se dé de alta solo, sin que Codexy toque nada. Flujo objetivo (Opción A / Pool):

1. **Sign up** — crea cuenta en Supabase Auth (`auth.users`).
2. **Crear tenant** — inserta su fila en `professionals` (la policy `professionals_insert_own` de `0002_rls.sql` L21-22 ya permite que el usuario cree **solo su propio** perfil con `user_id = auth.uid()`).
3. **Elegir slug + branding** — completa nombre, color, foto, zona horaria → va a `metadata`.
4. **Configurar disponibilidad** — en `/admin/disponibilidad`; se expande al sitio público automáticamente (esto ya funciona en la demo single-tenant, ver [[03 - Motor de Turnos]]).
5. **Listo** — su sitio queda en `codexy.app/<slug>` (o subdominio) y empieza a recibir solicitudes.

La policy de auto-alta de `professionals` muestra que el esquema **ya fue pensado** para self-service. Lo que falta es todo el wiring de app (ver §7).

---

## 7. Gaps: qué falta para ser realmente multi-tenant (PENDIENTE)

Hoy la app es **single-tenant disfrazada**. Lista honesta de lo que falta:

- **PENDIENTE — Auth es contraseña única, no por usuario.** `lib/auth.ts` valida contra **una** `ADMIN_PASSWORD` global (L5) y firma una cookie HMAC genérica `pp_admin` (L4). Su `makeToken()` (L36-39) genera un payload `ok.<timestamp>` que **no contiene ningún `professional_id`**: el token no identifica al tenant. No hay registro de usuarios ni vínculo a `auth.users`. Para multi-tenant hay que migrar a **Supabase Auth** (un usuario por profesional) o, como mínimo, meter el `professional_id` en el token firmado.
- **HECHO — Auth fail-closed.** `lib/auth.ts` ya NO tiene fallback de password ni secreto: si faltan `ADMIN_PASSWORD`/`ADMIN_SECRET` lanza error (antes un secreto conocido permitía forjar sesiones). El token vence a las 12 h. Falta meter `professional_id` en el token para multi-tenant.
- **PENDIENTE — La capa de datos es un JSON global.** La persistencia MVP (`data/db.json`, ver [[04 - Capa de Datos]]) no tiene noción de `professional_id`: es un único almacén compartido. Mientras siga así, **no hay aislamiento real** entre profesionales. El esquema con RLS existe en `supabase/migrations/` pero todavía no está aplicado ni wireado.
- **PENDIENTE — Aplicar el esquema y cablear Supabase.** Las migraciones `0001_init.sql` y `0002_rls.sql` no están aplicadas al proyecto, y `lib/supabase.ts` (clientes ya escritos) no se está usando para servir datos. Falta también `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`. Detalle en [[07 - Supabase]].
- **PENDIENTE — Resolución de tenant en el ruteo.** No hay `[slug]` ni resolución host→`professional_id` en `proxy.ts`. El sitio público y `/admin` asumen un único profesional.
- **PENDIENTE — Branding desde datos.** Nombre, color, foto y bio están hardcodeados en los componentes; deberían leerse de `professionals` + `metadata` (§4).
- **PENDIENTE — Onboarding self-service.** No existe sign-up ni alta de tenant en la UI (§6).

> [!important] Orden lógico para cerrar los gaps
> 1) Aplicar migraciones a Supabase → 2) migrar `lib/auth.ts` a Supabase Auth (token con `professional_id`) → 3) reemplazar `data/db.json` por queries con RLS → 4) resolución de tenant en ruteo → 5) branding desde datos → 6) onboarding self-service. Se sigue en [[10 - Roadmap]].

---

## 8. Pricing y empaquetado (alto nivel)

> [!warning] Sin métricas inventadas
> Los importes son **placeholders de discusión**, no precios oficiales. Definir con el negocio en [[01 - Vision y Negocio]].

Modelo natural: **suscripción mensual por profesional** (por-tenant), con tiers que mapean a features ya pensadas en el esquema.

| Tier | Para quién | Incluye (mapeo al esquema) |
|---|---|---|
| **Base** | Profesional solo/a | Sitio público + branding básico, motor de turnos, panel, solicitudes (`appointment_requests`), pacientes (`patients`). Modelo Pool. |
| **Pro** | Quien factura/cobra | Todo lo anterior + pagos (`payments`), facturas/AFIP (`invoices`), notas clínicas (`clinical_notes`), recordatorios. |
| **Premium / Enterprise** | Quien necesita marca o aislamiento fuerte | Dominio propio, branding total, posible **Silo** (proyecto dedicado, §3 opción B), export por tenant. |

Palancas de empaquetado:

- **Por-tenant flat** (lo más simple para clínicas chicas) vs. **por volumen** (pacientes/turnos activos).
- **Setup fee** de onboarding asistido mientras el self-service (§6) no esté listo.
- **Add-ons**: facturación AFIP, recordatorios automáticos por WhatsApp, integración de pagos.

El costo de servir un tenant en el modelo Pool es marginal, así que el margen escala bien con cada cliente nuevo: ese es el caso de negocio de Codexy. Contacto comercial: contact@codexyoficial.com.

---

## Ver también

- [[01 - Vision y Negocio]] — por qué Codexy apuesta a un producto replicable y no a sitios sueltos.
- [[07 - Supabase]] — esquema, RLS, clientes y credenciales pendientes.
- [[10 - Roadmap]] — secuencia para cerrar los gaps de multi-tenancy.
- [[04 - Capa de Datos]] — el `data/db.json` global que hoy impide el aislamiento real.
- [[02 - Arquitectura]] — `proxy.ts`, Route Handlers y resolución de tenant.
- [[11 - Glosario y Decisiones]] — registro de la decisión Pool vs. Silo.
