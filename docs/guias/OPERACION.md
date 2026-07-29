# Operación

> **Documento interno de Codexy.** No se comparte con clientes.
> Acá está cómo se da de alta un consultorio, cómo se diagnostica un problema y
> qué se hace cuando algo se rompe.
> Última actualización: 2026-07-29.

Lectura previa obligatoria: [ARQUITECTURA.md](../ARQUITECTURA.md) y
[SEGURIDAD.md](../SEGURIDAD.md). Esto es el *cómo*; ahí está el *qué* y el *por qué*.

---

## 0. Modelo mental (leer antes de tocar nada)

**Un consultorio = un tenant = una fila en `professionals`.** `professionals` **no es
una persona**: es el consultorio/marca. Las personas viven en `app_users` y se
conectan por `memberships` ([ADR-0004](../decisiones/ADR-0004-cuentas-individuales.md)).

El **`professional_id` (UUID)** es la clave de todo el sistema. Aparece cableado en
seis lugares y **una vez dado de alta no se cambia nunca**:

| Dónde | Qué es |
|---|---|
| `professionals.id` | la fila del consultorio en Supabase |
| `app_state.professional_id` | el blob JSONB con TODOS sus datos (turnos, pacientes, notas) |
| env `TENANTS` | mapa `host → professional_id`; es lo que hace que un dominio sirva a ese consultorio |
| env `ADMIN_PASSWORDS` | contraseña de transición, por consultorio |
| env `TELEGRAM_CHAT_IDS` | a qué chat se le avisan los turnos de ese consultorio |
| `memberships.professionalId` | qué personas entran a ese panel |

**Regla de oro:** el aislamiento entre consultorios lo garantiza **la aplicación**, no
la base (se usa `service_role`, que saltea RLS). Un error de configuración de tenant
no es un bug de UI: es exponer la historia clínica de un paciente a otra persona.
Ley 25.326. Se trata con ese criterio.

**Fail-closed por diseño:** si algo no resuelve, el sistema corta (404 / excepción).
Nunca degrada a "mostrar el consultorio por defecto". La única excepción conocida está
documentada abajo, en [Trampas conocidas](#7-trampas-conocidas-leer-antes-de-editar-envs).

---

## 1. Alta de un consultorio nuevo

Tiempo estimado: 20-30 minutos. **Hacelo entero de una sentada**: un alta a medias
deja un consultorio que carga pero no puede guardar.

### Prerrequisitos (una sola vez por proyecto Supabase)

- [ ] Migraciones `0001` a `0007` aplicadas (ver [§3](#3-migraciones-sql-por-el-navegador)).
- [ ] Envs base cargadas en Vercel: `NEXT_PUBLIC_SUPABASE_URL`,
      `SUPABASE_SERVICE_ROLE_KEY`, `PROFESSIONAL_ID`, `ADMIN_SECRET`.
- [ ] `npm test` en verde en `master`.

### Paso 1 — Crear la fila en `professionals`

Supabase → **SQL Editor** del proyecto. Ejecutar:

```sql
insert into public.professionals (nombre, email, telefono, matricula, condicion_fiscal)
values ('Consultorio Ana Gómez', 'ana@ejemplo.com', '+5491100000000', 'M.N. 12345', 'monotributo')
returning id;
```

**Anotá el UUID que devuelve.** Ese es el `professional_id` del consultorio y lo vas a
usar en los cuatro pasos siguientes. Si lo perdés, se recupera con
`select id, nombre from public.professionals order by created_at desc limit 5;`.

Notas:
- `user_id` queda **NULL** a propósito (migración `0004`): todavía no usamos Supabase Auth.
- El nombre acá es administrativo. El nombre que ve el paciente lo carga el psicólogo
  desde el panel (Profesionales) y vive en el blob, no en esta tabla.
- **No** hace falta crear la fila de `app_state`: el store la inserta sola en la primera
  escritura. Pero necesita que **esta** fila exista antes (hay FK).

### Paso 2 — Dominio en Vercel

Dos opciones. Elegí una y anotá **todos** los hosts que van a quedar operativos.

**A) Subdominio de la plataforma** (lo normal, cero fricción):
`anagomez.codexy.app`. Requiere que el wildcard `*.codexy.app` ya apunte al proyecto y
que `PLATFORM_DOMAIN=codexy.app` esté seteada. No hay que tocar Vercel por cada alta.

**B) Dominio propio del cliente** (`anagomez.com.ar`):
1. Vercel → Proyecto → **Settings → Domains** → agregar **el apex y el `www`**.
2. Pasarle al cliente los registros DNS que muestra Vercel (A/CNAME) para que los
   cargue en su proveedor.
3. Esperar a que Vercel marque ambos como **Valid Configuration** y emita el certificado.
4. Decidir la redirección (lo habitual: `www` → apex).

> **Los dos hosts tienen que estar en `TENANTS`.** Un dominio que Vercel sirve pero que
> no está en el mapa devuelve **404 "Consultorio no encontrado."**. Es el
> comportamiento correcto, pero el cliente lo va a reportar como "mi web no anda".

### Paso 3 — Variables de entorno en Vercel

Vercel → Proyecto → **Settings → Environment Variables** → entorno **Production**.

**3.1 · `TENANTS`** — agregá las entradas nuevas **sin borrar las existentes**:

```json
{"anagomez.com.ar":"aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa","www.anagomez.com.ar":"aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa","anagomez":"aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa"}
```

- Claves: **hosts exactos** en minúsculas, sin `https://`, sin puerto, sin barra final.
- La clave **sin puntos** (`anagomez`) es el *slug*: solo funciona como
  `anagomez.<PLATFORM_DOMAIN>` y con **un único label** (`a.b.codexy.app` no resuelve).
- Valores: el UUID del paso 1. Una entrada cuyo valor no sea un UUID válido **se
  descarta** y queda logueada en Vercel.
- **Validá el JSON antes de guardar** (pegalo en cualquier validador). Ver
  [§7 Trampas conocidas](#7-trampas-conocidas-leer-antes-de-editar-envs): un JSON roto
  acá no da error visible, colapsa el despliegue a single-tenant.

**3.2 · `ADMIN_PASSWORDS`** — contraseña de transición del consultorio:

```json
{"aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa":"passphrase-larga-y-unica-de-ana"}
```

Sirve **solo hasta que el consultorio tenga su primera cuenta**; después se apaga sola
(ver paso 5). Aun así hay que cargarla: es lo que te deja entrar a verificar el alta.
No reutilices contraseñas entre consultorios: sería una llave maestra.

**3.3 · `TELEGRAM_CHAT_IDS`** (opcional) — solo si el cliente quiere avisos:

```json
{"aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa":"123456789"}
```

Sin entrada propia, ese consultorio **no recibe avisos**. Nunca se manda al chat de otro.

**3.4 · `PLATFORM_DOMAIN`** — solo si vas a usar slugs. Un valor global, se setea una vez.

### Paso 4 — Redeploy

**Las variables de entorno no se aplican solas.** Vercel → **Deployments** → el último
deployment de producción → **Redeploy**. Sin esto el consultorio nuevo sigue dando 404.

### Paso 5 — Crear la cuenta dueño

Se usa `scripts/crear-cuenta.mjs`, que corre **local** (en `C:\dev\lic-florentina-toplikar`)
y escribe `data/auth.json`, además de imprimir el SQL para producción.

> ### ⚠️ Antes de correrlo: bajate el estado real de `auth_state`
>
> El SQL que imprime el script hace
> `insert ... on conflict (id) do update set data = excluded.data`, o sea **reemplaza
> el blob de identidad completo** con el contenido de tu `data/auth.json` local.
> Si tu archivo local está desactualizado, **pegar ese SQL borra las cuentas de todos
> los demás consultorios.** No hay merge.
>
> El procedimiento correcto es siempre este:

**5.1 — Traer el estado actual.** En el SQL Editor de Supabase:

```sql
select data from public.auth_state where id = 'identidad';
```

Copiá el JSON del resultado y guardalo tal cual en
`C:\dev\lic-florentina-toplikar\data\auth.json`. Si la consulta no devuelve filas,
es el primer alta: borrá el `data/auth.json` local si existe y seguí.

**5.2 — Crear la cuenta.** Desde `C:\dev\lic-florentina-toplikar`:

```bash
npm run cuenta:crear -- --email ana@ejemplo.com --nombre "Ana Gómez" --rol owner --pid aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa
```

- `--pid` es **obligatorio** en multi-tenant. Si lo omitís, la cuenta se crea contra
  `PROFESSIONAL_ID` (el consultorio demo) y el cliente no va a poder entrar al suyo.
- Roles válidos: `owner`, `admin`, `profesional`, `asistente`. Para el alta va **`owner`**.
- La contraseña **se pide por stdin**, no por argumento (no queda en el historial del
  shell). Mínimo 10 caracteres. Generá una aleatoria; no inventes una "temporal" débil.
- Si el proyecto usa `AUTH_PEPPER` en producción, **tiene que estar en el entorno del
  script también**, o el hash no va a verificar. Exportala antes de correrlo.

**5.3 — Aplicar en producción.** El script imprime un `insert ... on conflict`. Copialo
completo y pegalo en el SQL Editor de Supabase.

**5.4 — Verificar que no rompiste nada:**

```sql
select
  jsonb_array_length(data->'users')       as usuarios,
  jsonb_array_length(data->'memberships') as membresias,
  rev
from public.auth_state where id = 'identidad';
```

Los números tienen que ser **los de antes + 1** (o +1 membresía si el email ya existía
en otro consultorio). Si bajaron, pisaste cuentas: pará y andá a
[§6 Runbook — I-4](#i-4--se-pisaron-las-cuentas-auth_state).

**5.5 — Entregar la credencial por un canal seguro** y pedir que la cambie. Nunca por
mail ni WhatsApp en texto plano.

> **A partir de acá `ADMIN_PASSWORDS` deja de funcionar para ese consultorio.** La
> ventana de transición se apaga sola al existir la primera membresía activa. No la
> borres del env igual (no molesta), pero no cuentes con ella.

### Paso 6 — Verificación post-alta (no la saltees)

Con el navegador, contra el host real del cliente:

- [ ] `https://<host>/` carga la landing (no 404, no 500).
- [ ] `https://<host>/reservar` carga la pantalla de reserva.
- [ ] `https://<host>/admin` redirige a `/admin/login`.
- [ ] Entrás con el email y la contraseña del paso 5.
- [ ] **El panel está vacío** (sin turnos ni pacientes). Si ves datos de otro
      consultorio → **incidente crítico**, ir a [§6 I-1](#i-1--un-consultorio-ve-datos-de-otro-crítico).
- [ ] **Escritura real:** cargá un servicio de prueba y guardá. Recargá: tiene que
      persistir. Esto valida la fila `app_state` y la FK. Después borralo.
- [ ] `select * from public.app_state where professional_id = '<uuid>';` devuelve una
      fila con `rev >= 1`.
- [ ] El host **viejo** de otro consultorio sigue funcionando (no rompiste `TENANTS`).
- [ ] Un host inexistente (`zzz.codexy.app`) devuelve **404**, no la demo.

### Paso 7 — Entrega

Mandale al cliente: la dirección de su sitio, la de su panel (`/admin`), su email, la
contraseña por canal seguro, y el link a [PRIMEROS-PASOS.md](PRIMEROS-PASOS.md).

---

## 2. Variables de entorno — referencia operativa

Base: el `.env.example` del repo. Marcado con ⚠ lo que **no está documentado ahí** pero
el código sí usa.

| Variable | Obligatoria | Alcance | Notas operativas |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | sí | global | Sin ella, la app cae al archivo local (efímero en serverless: "guarda" y se pierde). |
| `SUPABASE_SERVICE_ROLE_KEY` | sí | global | **Saltea RLS.** Es la llave de todas las historias clínicas. Nunca en el cliente, nunca en git, nunca en un log. |
| `PROFESSIONAL_ID` | **sí, siempre** | global | Trampa: aunque estés en multi-tenant, **si falta, Supabase queda deshabilitado** (`supabaseConfigurado` exige las tres) y en producción la app tira "Supabase mal configurado". Dejá el UUID de la demo. |
| `TENANTS` | multi-tenant | global | JSON `host|slug → uuid`. Activa el modo estricto fail-closed. Validá el JSON. |
| `PLATFORM_DOMAIN` | si usás slugs | global | Habilita `slug.<dominio>` con **un solo** label. |
| `ADMIN_SECRET` | sí | global | Firma la cookie de sesión (HMAC). Mínimo 16 caracteres. `openssl rand -hex 32`. Es **una sola** para todos los tenants: el tenant va adentro del payload firmado. Rotarla desloguea a todos. |
| `ADMIN_SESSION_VERSION` | recomendada | global | Subirla en 1 revoca **todas** las sesiones abiertas, de todos los consultorios. |
| `ADMIN_PASSWORDS` | durante el alta | por tenant | JSON `uuid → passphrase`. Se apaga sola al crear la primera cuenta del consultorio. |
| `ADMIN_PASSWORD` | single-tenant | global | Solo para el despliegue histórico. **No** es fallback en multi-tenant. |
| `AUTH_PEPPER` ⚠ | opcional | global | Pimienta fuera de la base para los hashes PBKDF2. **Si la usás, no se puede cambiar sin invalidar todas las contraseñas**, y el script de alta necesita tenerla en su entorno. |
| `OPENAI_API_KEY` ⚠ | si hay asistente | global | Sin ella el asistente IA no responde. |
| `OPENAI_MODEL` ⚠ | opcional | global | Modelo de chat del asistente. |
| `OPENAI_TRANSCRIBE_MODEL` ⚠ | opcional | global | Modelo de voz (dictado). |
| `NEXT_PUBLIC_SITE_URL` ⚠ | recomendada | global | URL canónica (sitemap, metadata). Cae a `VERCEL_PROJECT_PRODUCTION_URL`. |
| `TELEGRAM_BOT_TOKEN` | opcional | global | Token de @BotFather. |
| `TELEGRAM_CHAT_IDS` | opcional | por tenant | Avisos de turno. Sin entrada, ese consultorio no recibe nada. |
| `TELEGRAM_CHAT_ID` | single-tenant | global | Histórico. |
| `TELEGRAM_WEBHOOK_SECRET` | si hay webhook | global | Se compara en tiempo constante. |
| `TELEGRAM_ALLOWED_CHAT_IDS` | si hay webhook | global | Lista blanca, coma-separada. |

**Valores prohibidos en producción:** `demo-secret-cambiar-en-produccion`,
`paulina2026`, `changeme`, `secret`, `admin`, `password`. La app **lanza** si detecta
alguno en `ADMIN_SECRET` o en la contraseña del tenant. Es a propósito.

> **Tarea recurrente:** `.env.example` está desactualizado — le faltan las cinco
> marcadas con ⚠. Actualizarlo en el próximo commit que toque configuración.

---

## 3. Migraciones SQL por el navegador

Esta máquina **no llega a Supabase por red** (TLS roto). No se usa `supabase db push`
ni el MCP: **todas las migraciones se aplican pegándolas en el SQL Editor** del
proyecto correcto, y se verifican desde Vercel.

**Orden y contenido:**

| # | Archivo | Qué crea | Cuándo |
|---|---|---|---|
| 0001 | `0001_init.sql` | extensiones, enums, `professionals` y tablas relacionales | una vez |
| 0002 | `0002_rls.sql` | políticas RLS (hoy **decorativas**: `service_role` las saltea) | una vez |
| 0003 | `0003_services_staff.sql` | servicios y staff | una vez |
| 0004 | `0004_professional_user_nullable.sql` | `professionals.user_id` pasa a NULL-able | una vez |
| 0005 | `0005_app_state.sql` | **`app_state`** — el blob por consultorio | una vez |
| 0006 | `0006_cuentas.sql` | `app_users`, `memberships`, roles | una vez |
| 0007 | `0007_auth_state.sql` | **`auth_state`** — identidad cross-tenant | una vez |

**Procedimiento:**

1. Confirmá **en qué proyecto Supabase estás parado**. Es el error más caro que se
   puede cometer acá. El MCP configurado apunta a otro proyecto: no lo uses para esto.
2. Abrí el archivo del repo, copiá **todo**, pegalo en el SQL Editor, Run.
3. Los scripts son **idempotentes** (`create ... if not exists`, `do $$ ... exception
   when duplicate_object then null`). Volver a correrlos no rompe nada.
4. Verificá que la tabla exista antes de dar por hecho el paso.

> **`0007` es la más crítica del set.** Sin `auth_state`, el primer deploy con
> `SUPABASE_SERVICE_ROLE_KEY` configurada **deja a todo el mundo afuera del panel**.
> Ya pasó una vez (detectado en auditoría antes de desplegar). Si vas a encender
> Supabase en un proyecto nuevo, aplicá `0007` **antes**.

**Verificación rápida del set completo:**

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('professionals','app_state','auth_state','app_users','memberships')
order by table_name;
```

Tienen que aparecer las cinco.

---

## 4. Diagnóstico

### Dónde mirar

| Fuente | Cómo se lee |
|---|---|
| **Vercel → Logs (Runtime)** | Filtrar por el host del cliente. Acá salen los `console.error` con prefijo `[tenant]`, `[auth]`, `[supabase]`, `[accounts]`, `[session]`. |
| **Supabase → SQL Editor** | Estado real de `professionals`, `app_state.rev`, `auth_state`. |
| **`auth_state.data.audit`** | Ingresos, intentos fallidos y cambios de acceso, con timestamp. |
| **El navegador del cliente** | Pedile una captura **de la pantalla completa, con la URL visible**. El host es el 80 % del diagnóstico. |

### Primera pregunta, siempre

**¿Por qué host entró?** Casi todos los reportes de "no anda" son un host que no está
en `TENANTS`, o un env que se editó sin redeploy.

### Síntoma → causa → arreglo

| Lo que reporta el cliente | Qué está pasando | Arreglo |
|---|---|---|
| 404 con el texto plano **"Consultorio no encontrado."** | El proxy no resolvió el host: no está en `TENANTS`, o está mal escrito, o falta el `www`. | Agregar el host exacto a `TENANTS` + **redeploy**. |
| **"Consultorio inválido: el acceso a los datos fue bloqueado."** | Llegó un `x-tenant-pid` que ya no es un tenant conocido: alguien sacó una entrada de `TENANTS` con sesiones vivas, o el deploy tiene envs distintas a las del proxy. | Restaurar la entrada en `TENANTS` y redesplegar. Si fue a propósito, avisar que hay que volver a loguearse. |
| **"Consultorio no resuelto: el acceso a los datos fue bloqueado."** | Modo multi-tenant y el código corrió sin header de tenant (contexto fuera de request, o una ruta excluida del matcher). | Revisar el `matcher` de `proxy.ts` y desde dónde se llamó al store. |
| **"Supabase mal configurado: hay NEXT_PUBLIC_SUPABASE_URL pero falta SUPABASE_SERVICE_ROLE_KEY o PROFESSIONAL_ID"** | Falta una de las tres envs. Casi siempre **`PROFESSIONAL_ID`**, que se borró creyendo que en multi-tenant no hace falta. | Cargar las tres + redeploy. |
| El cliente **guarda y al recargar no está** | Está corriendo contra el archivo local (efímero en serverless) porque Supabase quedó deshabilitado. | Mismo caso que el anterior. |
| En los logs: **`sbWrite: professional_id '<uuid>' no existe en professionals`** (FK 23503) | Se cargó el UUID en `TENANTS` pero **nunca se creó la fila** en `professionals` (paso 1 salteado). | Insertar la fila con **ese id explícito**: `insert into professionals (id, nombre) values ('<uuid>','...');` |
| **"ADMIN_SECRET sin configurar o demasiado corto"** / **"inseguro en producción"** | Falta, tiene menos de 16 caracteres, o quedó un valor de demo. | `openssl rand -hex 32` → cargar → redeploy. **Todos se deslogean.** |
| **"No hay contraseña configurada para este consultorio"** | El consultorio no tiene cuentas todavía **y** no tiene entrada en `ADMIN_PASSWORDS`. | Cargar la entrada, o mejor: crear la cuenta dueño ([§1 paso 5](#paso-5--crear-la-cuenta-dueño)). |
| El cliente entra y **el panel está vacío** aunque tenía datos | Cambió el `professional_id` del host (se editó `TENANTS`), o hay dos filas en `app_state`. | `select professional_id, rev, updated_at from app_state;` y comparar con `TENANTS`. **No borres nada** hasta identificar cuál tiene los datos buenos. |
| **"Demasiados intentos"** al loguearse | Rate limit: 6 intentos cada 5 min por IP, más bloqueo de 15 min por cuenta tras 8 fallos. | Esperar. El límite por IP es en memoria y por instancia: puede aflojarse solo. |
| **Quité un acceso y la persona sigue entrando** | Caché de sesión de **60 segundos**. | Esperar 1 minuto. Si es urgente, subir `ADMIN_SESSION_VERSION` (echa a todos, de todos los consultorios). |
| **"No se pudo guardar: conflicto de concurrencia (10 intentos)"** | Lock optimista sobre `app_state.rev`: demasiadas escrituras simultáneas sobre el mismo blob. | Reintentar. Si es recurrente, es la deuda conocida del blob único (ver ARQUITECTURA). |
| Reservas que **no aparecen** en la agenda | Cayeron en otro tenant (host mal mapeado) o la solicitud venció (retención de 48 h). | Verificar el host del formulario de reserva y el `updated_at` de `app_state`. |
| Fichas de paciente **duplicadas o fusionadas** | Identidad de paciente por contacto. | `npm run diagnostico:pacientes` (detecta fichas fusionadas y turnos huérfanos). |
| Nadie recibe avisos de Telegram | Ese consultorio no tiene entrada en `TELEGRAM_CHAT_IDS`. | Es el comportamiento correcto: sin chat propio no se notifica (nunca al de otro). Cargar la entrada. |

---

## 5. Cambios y despliegue

- **Deploy:** push a `master` → Vercel despliega solo. No hay staging.
- **Antes de pushear:** `npm test` (140 tests: hashing, permisos, aislamiento
  multi-tenant, motor de turnos, regla de deuda). Si tocaste lógica de negocio o
  seguridad, esto no es opcional.
- **Se edita y compila en `C:\dev\lic-florentina-toplikar`**; el repo git es
  `C:\Users\Carlos\OneDrive\lic-florentina-toplikar` y se espeja **después** de verificar.
- **Cambio de envs = redeploy.** Siempre.
- **Cambios en el formato de sesión** (`lib/auth.ts`, `lib/session.ts`) **deslogean a
  todos**. Avisar antes.
- **Nunca** aplicar una migración destructiva sin backup previo de `app_state` y
  `auth_state`.

**Backup manual antes de cualquier operación riesgosa:**

```sql
select professional_id, rev, data from public.app_state;
select id, rev, data from public.auth_state;
```

Guardar el resultado en un archivo fuera del repo antes de tocar nada.

---

## 6. Runbook de incidentes

**Severidades:**

| Nivel | Qué es | Respuesta |
|---|---|---|
| **S0** | Fuga de datos clínicos entre consultorios, o credencial de Supabase expuesta | Inmediata. Cortar primero, entender después. |
| **S1** | Un consultorio no puede trabajar (panel caído, no se puede loguear, no persiste) | < 1 h |
| **S2** | Función degradada (Telegram, asistente IA, export) | Mismo día |
| **S3** | Cosmético o consulta | Backlog |

**Los cuatro primeros minutos de cualquier S0/S1, siempre iguales:**

1. **Anotá la hora** y qué se reportó, textual.
2. **Reproducilo** contra el host real. Si no lo reproducís, pedí captura con URL.
3. **Mirá los últimos 30 minutos de logs de Vercel** filtrando por ese host.
4. **No toques `TENANTS` "para probar".** Cada edición sin redeploy es una hora perdida,
   y una edición mal hecha es un S0.

---

### I-1 · Un consultorio ve datos de otro (CRÍTICO)

Es el peor escenario del sistema: datos de salud de un paciente expuestos a un tercero.

1. **Cortar el acceso ya.** Sacá del env `TENANTS` los hosts involucrados y
   **redeployá**. El fail-closed va a devolver 404: es preferible una web caída a una
   historia clínica cruzada. Alternativa más agresiva si no tenés claro el alcance:
   subir `ADMIN_SESSION_VERSION` (echa a todos).
2. **Congelar la evidencia.** Bajá `TENANTS` tal como estaba, el `professional_id` de
   cada host, y `select professional_id, rev, updated_at from app_state;`.
3. **Determinar la dirección:** ¿fue solo **lectura** o hubo **escritura** en el blob
   equivocado? Comparar `updated_at` y `rev` de `app_state` con la ventana del incidente.
4. **Causa raíz.** Las tres realistas, en orden de probabilidad:
   - `TENANTS` con **JSON inválido** → el despliegue colapsa a single-tenant y **todos
     los hosts sirven `PROFESSIONAL_ID`**. Ver [§7](#7-trampas-conocidas-leer-antes-de-editar-envs).
   - Dos hosts apuntando al mismo UUID por copy-paste.
   - Un UUID mal transcrito en el paso 1 del alta.
5. **Reparar:** corregir el mapa, validar el JSON, redeploy, y rehacer la
   [verificación post-alta](#paso-6--verificación-post-alta-no-la-saltees) de **todos**
   los consultorios, no solo el afectado.
6. **Rotar** `ADMIN_SECRET` y las contraseñas de los consultorios involucrados.
7. **Escribir el post-mortem** en [BITACORA.md](../BITACORA.md) y agregar la fila en la
   tabla de auditorías de [SEGURIDAD.md](../SEGURIDAD.md). Si hubo exposición efectiva
   de datos clínicos, hay **obligación de notificar al titular** (Ley 25.326): esa
   decisión la toma el dueño, no un agente.

### I-2 · `SUPABASE_SERVICE_ROLE_KEY` expuesta (CRÍTICO)

Esa key saltea RLS: es acceso total a todas las historias clínicas de todos los
consultorios.

1. Supabase → **Settings → API → Rotate** la `service_role`.
2. Actualizar la env en Vercel + **redeploy inmediato** (entre la rotación y el deploy,
   la app está caída: es lo correcto).
3. Revisar los logs de Supabase buscando accesos desde IPs que no sean de Vercel.
4. Si la key estuvo en git: rotar **y** purgar del historial; el commit sigue siendo
   recuperable hasta que se reescriba.
5. Registrar en SEGURIDAD.md.

### I-3 · Nadie puede entrar al panel (S1)

Por orden de probabilidad:

1. **¿Existe `auth_state`?** `select 1 from public.auth_state limit 1;` — si la tabla no
   existe, aplicá `0007` (§3). Es la causa clásica al encender Supabase.
2. **¿`ADMIN_SECRET` está y es válida?** Sin ella no se firma ni valida ninguna cookie:
   todo redirige a login en loop. Buscá el error en los logs.
3. **¿Se desplegó un cambio de formato de token?** Entonces es esperado: todos vuelven a
   loguearse una vez. Avisar y cerrar.
4. **¿`ADMIN_SESSION_VERSION` se subió sin querer?** Mismo efecto.
5. **¿El consultorio tiene cuentas?** Si `tieneCuentas` es falso y no hay
   `ADMIN_PASSWORDS`, no hay puerta. Crear la cuenta dueño (§1 paso 5).
6. Último recurso, para **un** consultorio: cargar temporalmente su entrada en
   `ADMIN_PASSWORDS` — **solo sirve si ese consultorio todavía no tiene ninguna cuenta**.
   Si ya tiene, no hay atajo: hay que resetear la contraseña del usuario.

### I-4 · Se pisaron las cuentas (`auth_state`)

Síntoma: después de un alta, usuarios de **otros** consultorios no pueden entrar.
Causa: se pegó el SQL del script con un `data/auth.json` local desactualizado (§5.1).

1. **No repitas el script.** Cada corrida empeora el estado.
2. Reconstruí el blob: tomá el backup previo (si lo hiciste) o el `data/auth.json` más
   completo que tengas, y **fusioná a mano** `users`, `credentials` y `memberships`.
3. Aplicá el `insert ... on conflict` con el blob fusionado.
4. Verificá los conteos (§5.4) y pedile a un usuario de cada consultorio que pruebe entrar.
5. Si no hay backup: las cuentas se recrean con el script, una por una, con contraseñas
   nuevas. Se pierde la auditoría histórica, no los datos clínicos (viven en `app_state`,
   que es otra tabla y no se toca).

### I-5 · Supabase caído o el proyecto pausado

- Los proyectos free se **pausan por inactividad**. Síntoma: todo el panel tira error
  al leer. Supabase → **Restore project**.
- La app **no** degrada al archivo local en producción: es intencional (el archivo es
  efímero en serverless; "guardaría" y se perdería).
- Comunicación al cliente: "estamos con una interrupción del proveedor de base de
  datos, no se perdió nada". Es cierto: sin escritura no hay corrupción.

### I-6 · Asistente IA sin responder (S2)

Falta o venció `OPENAI_API_KEY`, o se agotó la cuota. No afecta agenda, pacientes ni
finanzas. Cargar la key + redeploy.

---

## 7. Trampas conocidas (leer antes de editar envs)

1. **`TENANTS` con JSON inválido = fail-OPEN.** Si el JSON no parsea, el mapa queda
   vacío; con el mapa vacío `esMultiTenant()` da **falso** y el sistema vuelve a
   single-tenant: **todos los hosts pasan a servir `PROFESSIONAL_ID`**, con escritura
   incluida. En los logs aparece un único `[tenant] TENANTS no es JSON válido; se ignora.`
   y nada más. **Validá el JSON siempre antes de guardar, y después de guardar entrá a
   dos hosts distintos y confirmá que muestran datos distintos.**
2. **`PROFESSIONAL_ID` no es opcional en multi-tenant.** Si falta, `supabaseConfigurado`
   da falso y producción tira "Supabase mal configurado". Dejá siempre el UUID de la demo.
3. **`ADMIN_SECRET` es global.** Una sola para todos los consultorios (el tenant va
   dentro del payload firmado). Rotarla afecta a todos.
4. **Los previews de Vercel dan 404** en modo multi-tenant, porque su host no está en
   `TENANTS`. Es correcto: un preview sirviendo datos reales sería una fuga.
5. **El script de cuentas reemplaza el blob de identidad completo.** Ver §5.1.
6. **Editar una env sin redeploy no hace nada.** Y genera diagnósticos falsos.
7. **RLS es decorativa hoy.** Todo va con `service_role`. No confíes en la base como
   segunda barrera: no lo es todavía.

---

## 8. Rotación de secretos

Trimestral, o inmediata ante sospecha.

| Secreto | Cómo se genera | Efecto colateral |
|---|---|---|
| `ADMIN_SECRET` | `openssl rand -hex 32` | Todos vuelven a loguearse. |
| `ADMIN_PASSWORDS` | passphrase larga y **única por consultorio** | Solo afecta a consultorios sin cuentas. |
| `SUPABASE_SERVICE_ROLE_KEY` | rotar en Supabase | App caída hasta el redeploy. |
| `TELEGRAM_WEBHOOK_SECRET` | `openssl rand -hex 32` | Hay que reconfigurar el webhook. |
| `AUTH_PEPPER` | — | **No se rota:** invalidaría todas las contraseñas. |

Después de cualquier rotación: subir `ADMIN_SESSION_VERSION`, redeploy, y dejar
constancia en [BITACORA.md](../BITACORA.md).

---

## 9. Pendientes del dueño (no los puede hacer un agente)

Del listado vivo de [SEGURIDAD.md](../SEGURIDAD.md) — revisar en cada alta:

- [ ] Repositorio de GitHub **privado** confirmado.
- [ ] 2FA en GitHub, Vercel y Supabase.
- [ ] Purgar `cerebro/` del historial de git (`git filter-repo`).
- [ ] Sacar la PII real de `data/db.json` de la carpeta sincronizada a OneDrive.
- [ ] Revisar las alertas de Dependabot (21 abiertas, 13 altas).
- [ ] Revocar el token `sbp_` que quedó expuesto.

---

## 10. Qué NO hacer, nunca

- **No cambiar el `professional_id`** de un consultorio ya dado de alta. Está cableado
  en cinco lugares y las FKs no perdonan.
- **No borrar filas de `app_state`.** Ahí vive la historia clínica. No hay papelera.
- **No borrar datos clínicos** por impago, por baja o "para limpiar".
- **No reutilizar una contraseña** entre consultorios.
- **No aplicar SQL sin confirmar en qué proyecto Supabase estás parado.**
- **No usar el MCP de Supabase para estas operaciones**: apunta a otro proyecto.
- **No pegar un `service_role` ni una contraseña** en un issue, un log, un chat ni en
  este repositorio.
- **No "probar en producción" con datos de un cliente real.** Para eso está el
  consultorio demo.
