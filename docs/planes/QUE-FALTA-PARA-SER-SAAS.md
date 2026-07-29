# Qué le falta a Codexy para ser un SaaS

## 1. El veredicto en tres líneas

Tenés un producto de consultorio excelente —multi-tenancy real, permisos con invariante clínico, lock optimista bien hecho— **servido como una copia del sitio de Paulina Pilotti**: el que se suscriba hoy publica el nombre, la matrícula MP 7321, el WhatsApp +54 2920 612515 y el alias bancario `paulina.pilotti.psi` de otra persona (`app/reservar/page.tsx:76,153,159`, `components/Reveal.tsx:6`, `app/page.tsx:675`).

No existe **ninguna** línea de código capaz de cobrar: ni plan, ni suscripción, ni pasarela, ni webhook, ni moneda — el grep de `suscrip|billing|stripe|checkout|trial` sobre `app/ lib/ components/ supabase/` devuelve un (1) hit y es un comentario en `app/layout.tsx:61`.

Y no hay **un solo documento legal** en el repo (`git ls-files | grep -iE 'legal|privac|terms|dpa|consent'` = 0) en un producto que guarda historias clínicas de tres países.

**Traducción:** hoy no sos un SaaS, sos una agencia con un producto muy bueno. La diferencia se puede cerrar en semanas, pero no en el orden en el que estarías tentado de hacerlo.

---

## 2. La línea que separa "software" de "SaaS"

**El consultorio no existe como objeto.** No es una fila, no es un registro, no tiene fecha de alta, ni estado, ni dueño consultable: es **una clave de un JSON dentro de una variable de entorno de Vercel** (`lib/tenant.ts:32`, `process.env.TENANTS`), leída desde el edge en cada request (`proxy.ts:17`).

De ahí cuelga *todo* lo que te falta, y por eso es un solo cuello y no diez:

| Lo que no podés hacer | Por qué |
|---|---|
| Registro autoservicio | No hay dónde escribir el tenant nuevo. Una env var no se escribe desde la app. |
| Trial de 14 días | No hay fecha de alta del consultorio. `creadoEn` existe en AppUser, Membership, Sesión, Solicitud, Paciente — en el consultorio no. |
| Cobrar / suspender | No hay estado. La única palanca es sacar el host del JSON y redeployar. |
| Métricas (MRR, churn, activación) | La lista de clientes es un campo de texto en un panel de Vercel. |
| Dar de baja | No hay a quién marcar como cerrado. |
| Panel de superadmin | No hay tabla que listar. |

Y hay un agravante que convierte esto de "incomodidad comercial" en **riesgo de datos clínicos**: el comentario de `lib/tenant.ts:38-39` dice que un TENANTS inválido "hace fail-closed", y es **falso**. El `catch` de `:37-41` devuelve mapa vacío → `esMultiTenant()` da `false` (`:56-58`) → `resolveTenantFromHost()` devuelve `PROFESSIONAL_ID` **para todos los hosts, con escritura incluida** (`:89-90`). Está asertado en `tests/tenant.test.ts:278-291` y documentado como trampa #1 en `docs/guias/OPERACION.md:479-482`. Es decir: el aislamiento entre historias clínicas depende hoy de que nadie tipee mal una coma en un textarea de Vercel.

**Pero** —y esto es lo importante para vos, que querés cobrar en días— **mover TENANTS a la base NO bloquea al primer cliente pago.** Bloquea al décimo. El primero lo podés dar de alta a mano en 25 minutos. Lo que **no** podés hacer a mano es entregarle un sitio que dice el nombre de otra psicóloga.

---

## 3. Bloqueante para el primer suscriptor que paga

Ordenado por "sin esto no cobrás", no por dificultad.

### 3.1 El entregable dice el nombre de otra persona — **imposible de hacer a mano**

Es lo primero que ve el cliente y lo primero que ven sus pacientes. Cinco frentes:

| Qué | Dónde | Efecto |
|---|---|---|
| `/reservar` con "Lic. Paulina Pilotti" y "MP 7321" junto a un sello de *matrícula verificada* | `app/reservar/page.tsx:10,16,24,76,153,159` | El link que el psicólogo pega en su bio de Instagram muestra la matrícula de un tercero |
| WhatsApp de Paulina como CTA principal de todo el producto | `components/Reveal.tsx:6` → consumido en `app/page.tsx:169,746`, `app/reservar/page.tsx:79`, `components/MobileCTA.tsx:46`, `components/WhatsAppCTA.tsx:23` | **Cada lead del cliente se va al teléfono de Paulina** |
| Alias bancario `paulina.pilotti.psi` con botón de copiar + link genérico `link.mercadopago.com.ar/` | `app/page.tsx:648,675` | Los pacientes del cliente transfieren a la cuenta de un tercero |
| `robots.txt` y `sitemap.xml` fijos a `paulinapilotti.com`; `SITE_URL` como fallback de `metadataBase` | `app/robots.ts:6`, `app/sitemap.ts:6`, `app/layout.tsx:20,34` | Cada suscriptor le regala su SEO a otro dominio. **Pasa por defecto, sin que el cliente haga nada mal** |
| Testimonios inventados ("M., 28 años · Viedma"), FAQ y servicios TCC/ACT hardcodeados | `app/page.tsx:16-63,486-501,556,838` | Publicidad engañosa firmada por tu cliente |

Verifiqué el hueco que lo explica: **`marca.whatsapp` no lo lee nadie.** `grep -rn "\.whatsapp" app components lib` devuelve exactamente dos líneas: el input de `components/EditorMarca.tsx:77` y el normalizador de `lib/marca.ts:122`. Cero consumidores. Lo mismo `marca.email`. El cliente carga su teléfono, ve "Listo, tu sitio ya se ve con estos datos" (`app/admin/marca/actions.ts:50`) y no pasa nada.

**Qué tocar:** `lib/marca.ts` (agregar `alias`/`cbu`/`clabe`), `components/EditorMarca.tsx`, `app/reservar/page.tsx` (pasar a `generateMetadata()` async + `getMarca()`), `app/page.tsx` (bajar el WhatsApp por prop a `Nav` → `WhatsAppCTA` y a `MobileCTA`), `app/robots.ts` y `app/sitemap.ts` (volverlos dinámicos con `headers()`), `app/layout.tsx:20,34`. **Regla dura: si un campo de marca está vacío, se oculta la sección — nunca se cae a un valor por defecto.** Y un test que falle si aparece el string "Pilotti" o "Viedma" fuera de fixtures.

**Esfuerzo:** 8 archivos, ninguno complejo. Es la tarea con mejor relación esfuerzo/plata de toda la lista.

### 3.2 Una forma de cobrar — **sí se puede a mano las primeras 10 veces**

No construyas Stripe ni el preapproval de Mercado Pago todavía. Para el primer cliente alcanza con un link de pago manual y una factura hecha a mano. **Pero sí construí el campo**: sin un `plan` y un `estado` por consultorio, en tres meses no vas a saber cuántos activos tenés.

El lugar más barato hoy, sin migración SQL: replicar el patrón que ya existe para el toggle de soporte (`lib/accounts.ts:41-59`, `soporte[professionalId]` dentro del blob `auth_state`). Agregar `suscripciones: Record<pid, {plan, estado, moneda, periodoHasta}>`. **Ojo:** ese patrón sirve para un flag que se escribe una vez por mes; **no** lo uses para contadores de uso — `auth_state` es una fila única global (`lib/accounts-store.ts:117`) serializada por `mutarAuth` con lock optimista de 10 reintentos.

**Esfuerzo:** 1 archivo nuevo (`lib/planes.ts`) + 20 líneas en `lib/accounts.ts`.

### 3.3 Precio y una página que lo diga — **sí, a mano / estática**

Hoy no existe ninguna página donde un psicólogo descubra Codexy. El funnel arranca en el paso 3: solo entra quien ya te habló por privado. Con esa restricción, tu techo de clientes por semana es igual a tu cantidad de conversaciones.

**Recorte agresivo:** no necesitás una app/(marketing) dentro de este repo. Un sitio estático separado (o un Notion público) con precio en ARS/MXN/USD, tres capturas y un botón de WhatsApp resuelve el 90% para los primeros diez. Si igual lo querés adentro: `app/(marketing)/page.tsx` servido cuando el host es `PLATFORM_DOMAIN` — y **no hace falta tocar `resolveTenantFromHost`**, alcanza con mapear el apex como una clave más en TENANTS (`lib/tenant.ts:94` hace match exacto antes del match por slug).

**Un dato para planificarlo:** `capturas/` está en `.gitignore:49`. Esas 201 PNG existen solo en tu máquina y son capturas de QA **con la base de Paulina**. Antes de publicarlas hay que revisarlas por PII.

### 3.4 El papel legal — **hay que conseguirlo, no escribirlo vos**

Ver sección 6. Es bloqueante del primer cliente porque es lo primero que mira un psicólogo con matrícula antes de meter historias clínicas.

### 3.5 Tres bugs baratos que no podés dejar pasar

Son horas de trabajo cada uno y los tres tocan datos de salud:

**(a) La contraseña temporal se guarda en texto plano y no se borra nunca.** `grep -rn passwordTemporal` devuelve **exactamente dos hits**: `app/admin/equipo/actions.ts:105` que la escribe, y `app/admin/equipo/page.tsx:66` que la renderiza. Ninguna ruta la borra — ni al loguearse, ni al cambiar la contraseña, ni por TTL. Queda para siempre en `auth_state`, la misma fila que tiene los hashes PBKDF2 600k de toda la plataforma, visible para cualquiera con permiso `equipo` (incluida una sesión de soporte tuya) y capturada por el `select data from auth_state` que tu propio runbook manda a copiar (`OPERACION.md:156`). Ojo con el fix: `resetearPassword` está declarada `Promise<void>` y se invoca como `<form action={...}>` (`page.tsx:151`), así que devolverla por retorno exige `useActionState`.

**(b) Una sesión de soporte de Codexy puede llegar a la historia clínica en dos pasos.** El invariante que le vendés al cliente ("el soporte NUNCA ve la historia clínica", `lib/soporte.ts:6-7`) no se sostiene: `puedeSoporte()` (`lib/soporte.ts:42-45`) solo niega `notas_clinicas`, así que una sesión de soporte pasa el `requirePermiso("equipo")` de `app/admin/equipo/actions.ts:23` y puede llamar `invitarMiembro` con `rol="profesional"` y una contraseña que elige ella misma. `exigirOwnerParaOwner` no frena porque el destino no es owner (`:13`). Y `permisosPorRol("profesional")` incluye `notas_clinicas: true` (`lib/permisos.ts:59-67`). **El fix tiene que bloquear la sesión de soporte en toda la sección equipo** (invitar, actualizar rol y resetear), no solo en el reset — el flag ya viaja en la sesión (`lib/session.ts:95`).

**(c) El TTL de soporte está escrito y nunca corre.** `TTL_SOPORTE_MS = 1 hora` (`lib/soporte.ts:48`): `grep` devuelve **un solo hit, la propia declaración**. Cero call sites. La cookie se setea a 12 h para todos los caminos por igual en `app/api/admin/route.ts:83`. Lo mismo `soporteConfigurado()`, declarada y nunca invocada.

Y agregá `tests/soporte.test.ts` — hoy `grep soporte tests/` devuelve **cero**, sobre la función más peligrosa del sistema.

### 3.6 El invariante clínico tiene dos fugas hacia adentro

Blindaste `notas_clinicas` contra terceros y está muy bien hecho. Pero:

- **El campo "Ficha"** queda fuera del gate. `app/admin/pacientes/[id]/page.tsx:51` calcula `verNotas` y lo usa solo en `:58` y `:173`; el bloque Ficha (`:271-287`) renderiza `paciente.notas` con el placeholder *"obra social, motivo de consulta, contacto de emergencia"*. `guardarFicha` (`app/admin/pacientes/actions.ts:62`) llama `auth()` = `requirePermiso("pacientes")`. El rol asistente tiene `pacientes: true` por defecto. **El producto le pide al profesional que escriba dato clínico en el único campo que la secretaria puede leer y sobrescribir.**
- **El "Motivo"** que el paciente escribe en la reserva pública se imprime en el dashboard (`app/admin/page.tsx:383-385`) detrás de `requireAdmin("agenda")`, que el asistente también tiene. Detalle para el que lo arregle: `app/admin/page.tsx:113` hace `await requireAdmin("agenda")` **sin asignar el resultado** — hay que capturarlo antes de poder llamar `sesion.puede()`.

Y corregí el comentario de `app/admin/pacientes/[id]/page.tsx:49-51` ("ni siquiera se consulta, no llega al servidor de render"): es falso. `getPaciente()` ya ejecutó `read()`, que baja el blob entero con `db.notasClinicas` de todos los pacientes. Le da a quien audite el código una garantía que el código no cumple.

### 3.7 Backup — **no se puede hacer a mano de forma confiable**

`sbWrite` hace `update set data` sobre la fila completa (`lib/store.ts:245-250`): la versión anterior desaparece. El único "backup" documentado es acordarse de copiar un SELECT antes de tocar algo (`OPERACION.md:359-366`), que por definición no cubre el caso en que algo se rompe sin que nadie estuviera tocando nada. Con historias clínicas eso no es un incidente técnico.

**Mínimo antes del primer peso cobrado:** `scripts/backup.mjs` que baje todas las filas de `app_state` y `auth_state` a JSON con timestamp, corriendo por cron **contra un bucket fuera de Supabase**. Y arreglá el footgun de `scripts/crear-cuenta.mjs:131-132`: imprime un `on conflict do update set data = excluded.data` que **reemplaza el blob de identidad completo** con tu `data/auth.json` local. Dar de alta el cliente 11 borra las cuentas de los 10 anteriores si tu copia local está desactualizada. Ya te pasó (`OPERACION.md:447-457`, incidente I-4).

### 3.8 Sacá `data/` de OneDrive — **acción tuya, hoy**

`data/db.json` (6.2 KB, 5 solicitudes con contacto, 3 pacientes) vive dentro de `C:\Users\Carlos\OneDrive\...`. Está bien excluido de git, pero está físicamente dentro del árbol sincronizado: se replica a la nube de Microsoft. Es una cesión de datos de pacientes a un destino que nadie declaró. Movelo a `C:\dev` o excluí la carpeta de la sincronización.

---

## 4. Bloqueante para llegar a diez

Acá sí empieza a doler el cuello estructural.

**4.1 El mapa de tenants a la base.** Tabla `tenants(slug unique, host unique, professional_id unique, estado, plan, creado_en, trial_hasta)`. `resolveTenantFromHost` consulta esa tabla con caché corta manteniendo el fail-closed idéntico. **Restricción real:** `proxy.ts` corre en edge y `lib/tenant.ts:1-2` está marcado EDGE-SAFE ("NO importar acá next/headers ni el cliente de Supabase") — hay que resolverlo con un fetch cacheado o KV. **Aviso honesto:** esta decisión ya fue evaluada y rechazada por escrito en `docs/planes/FASE-1-cuentas.md:~169` ("agregaría una lectura de red en Edge y caché que invalidar"), con `/api/health/tenants` como alternativa elegida — que tampoco está implementada. La estás reabriendo; el argumento nuevo que no estaba en esa decisión es que la constraint `UNIQUE` sobre `professional_id` hace **estructuralmente imposible** el copy-paste de dos hosts al mismo UUID, que es la causa #1 de S0 que vos mismo documentaste (`OPERACION.md`, I-1). Detección posterior ≠ imposibilidad.

**Prerequisitos del slug** que hoy no existen: regex `^[a-z0-9][a-z0-9-]{2,30}$`, `UNIQUE`, y lista negra (`www`, `admin`, `api`, `app`, `panel`, `soporte`, `blog`, `mail`, `static`, `codexy`). Hoy `lib/tenant.ts:44-49` solo valida que el **valor** sea UUID, nunca la forma de la clave.

**4.2 Suspender sin matar.** Hoy la única palanca es sacar el host de TENANTS: `proxy.ts:26-31` corta **antes** del chequeo de `/admin` (`:33`), así que el psicólogo moroso (a) ve su sitio muerto con un texto plano y (b) **pierde el acceso a las historias clínicas de pacientes en tratamiento**, y a la única vía de exportación, que vive detrás de sesión. Además `lib/store.ts:168-171` lanza en cualquier lectura y las sesiones vivas mueren.

Regla a fijar y escribir en el contrato: **la morosidad nunca corta el acceso del profesional a sus propios registros clínicos.** Escalones: aviso en el panel → solo lectura → sitio público con página sobria (no un 404 crudo), con `/admin/login` y export siempre abiertos. Precedente que ya tenés en casa para el lag: `lib/session.ts:39-40` cachea el chequeo de membresía 60 s.

**4.3 Export completo del consultorio.** Hoy el único exportador es `app/admin/finanzas/export/route.ts` (CSV de movimientos). Es barato justamente por el blob: `read()` ya devuelve todo. Dos cosas que el diseño tiene que arreglar y que el export existente tampoco tiene: (a) está gateado por `puede("finanzas")` (`:30`), o sea **un asistente con ese toggle se lleva la facturación completa**; (b) **no llama `logAudit`** — verifiqué los 11 call sites y ninguno está en `export/route.ts`. El export nuevo va detrás de `requirePermiso("notas_clinicas")` y deja rastro.

**4.4 Alertas.** Te enterás de que algo se rompió porque el cliente llama. No hay `vercel.json`, no hay `instrumentation.ts`, no hay ningún fetch a un webhook de alerta. **Es lo más barato de toda esta sección:** reusá `sendTelegram()` de `lib/telegram.ts:18` (ya tiene timeout y verifica `ok:true`) en un `lib/alertas.ts` con `avisarCodexy(sev, msg, pid?)` apuntando a un chat tuyo. Puntos de inserción que ya existen: `lib/tenant.ts:40` (el fail-open, S0), `lib/store.ts:235` (FK 23503 = tenant mal dado de alta), `lib/accounts-store.ts:178` (conflicto tras 10 intentos), `app/api/admin/route.ts:88`.

**4.5 Health check.** `app/api/health/route.ts` con token en header (no público: revela la topología). Verifica que TENANTS parsea, que cada UUID existe en `professionals` y no está duplicado, que `ADMIN_SECRET` está, que Supabase responde. **Pero el bug de verdad no es la falta del health check**: es que `lib/tenant.ts:37-41` degrada a single-tenant en silencio. Un `if (raw && raw.trim() && !parseOk) throw` en `tenantMap()` tapa el agujero sin infraestructura nueva y es más barato.

**4.6 Apagá el bot de Telegram en multi-tenant.** `TELEGRAM_ALLOWED_CHAT_IDS` es una lista blanca **global** (`app/api/telegram/route.ts:20`) mientras los comandos resuelven el tenant por el host del webhook, que es **uno solo** para todo el despliegue. Resultado: todos los chats de la lista ven siempre los datos del mismo consultorio, incluyendo `${s.nombre} (${s.contacto})` de pacientes y la facturación. Tres líneas: `if (esMultiTenant()) return 401` al inicio del POST.

**4.7 Costo del asistente IA.** Es tu único costo variable y es ilimitado y no atribuible. Una sola `OPENAI_API_KEY` global (`lib/openai.ts:61,99`), el loop hace **hasta 6 llamadas por mensaje** (`app/api/asistente/route.ts:59`) con historial de 30 mensajes, y `rateLimit` no se importa en **ninguna** de las tres rutas del asistente (los 5 call sites son admin, reservar-config, slots y turnos x2). Además `data.usage` se descarta (`lib/openai.ts:84-90`). Parche inmediato: `rateLimit("asistente:${pid}:${userId}", 30, 1h)` y `transcribir:${pid}`. Y prefijá con el pid los buckets existentes — `app/api/turnos/route.ts:101` usa `turnos-c:${contactoKey(contacto)}`, así que **un paciente que reserva con Ana consume el cupo del formulario de Juan** si usa el mismo teléfono.

**4.8 `auth_state` en caliente.** Un login hace **dos** ciclos read-modify-write completos sobre la fila única `identidad` (`lib/accounts.ts:140` para la sesión, `:154` para el audit). Fusionarlos en un solo `mutarAuth` corta la contención a la mitad y es una tarde. Y los topes son globales: **500 sesiones para toda la plataforma** (`lib/accounts.ts:149`, sin purga por TTL y sin borrar las revocadas) y **5000 entradas de audit** (`lib/accounts-store.ts:190`) — un consultorio activo expulsa las sesiones y borra el rastro de auditoría de otro. Peor: `app/admin/equipo/page.tsx:206` envuelve la sección en `{audit.length > 0 && ...}`, así que al cliente al que le evictaron todo **le desaparece "Actividad reciente"** sin ningún aviso. Eso rompe una promesa explícita de `lib/soporte.ts:11`.

---

## 5. Bloqueante para escalar / lo que explota después

**5.1 El blob.** Cada operación descarga el documento completo del consultorio: `read()` → `select data` (`lib/store.ts:208-221`). El dashboard dispara 6 en `Promise.all` (`app/admin/page.tsx:115`), más 2 del layout, más 1 del AdminShell. No hay memoización (`grep unstable_cache|cache(` = 0). Con 150 pacientes × 80 notas eso es decenas de MB parseados y normalizados 9 veces por pageview. **Parche de una tarde que compra meses:** envolver `read()` en `React cache()`.

**5.2 La landing pública materializa la historia clínica.** `getMarca()` → `read()` → blob entero. `app/layout.tsx:24,98` lo llaman **dos veces por request en todas las rutas**. Cada visita anónima al sitio de un psicólogo carga sus notas clínicas en memoria de una lambda que sirve tráfico no autenticado. Hoy no hay fuga, pero es superficie gratuita y es el mayor costo de egress del producto: lo paga el tráfico de marketing. **Sacá `marca` y `services` del blob a su propia columna** — se puede hacer solo y primero.

**5.3 `normalize()` borra en silencio lo que no conoce.** `lib/store.ts:136-151` construye un objeto nuevo copiando 8 claves fijas, y `mutate()` escribe **ese** objeto (`:284-286`). No hace falta un rollback: alcanza con que una instancia vieja siga viva durante la ventana de drenaje de un deploy mientras la nueva ya escribió un campo nuevo. La pérdida es silenciosa, no hay `schemaVersion` para detectarla, y no hay un solo test sobre `normalize`. **Fix: dos cosas chicas** — arrancar de `{...raw}` y sobrescribir las conocidas, y meter un campo `v` que haga que `sbWrite` rechace escribir si lee un esquema más nuevo que el que conoce el build.

**5.4 Multimoneda y zona horaria — bloquea MX y USA por completo.** El campo se llama literalmente `priceARS` (`lib/scheduling/types.ts:61`). Los formateadores `"$" + n.toLocaleString("es-AR")` son **9**: `app/page.tsx:72`, `app/admin/page.tsx:42`, `app/admin/finanzas/page.tsx:15`, `app/admin/pacientes/[id]/page.tsx:78`, `app/api/telegram/route.ts:9`, `lib/assistant/tools.ts:34`, `components/Asistente.tsx:61`, `components/PacientesList.tsx:8`, `components/TurnoForm.tsx:17`. Los hardcodes de `America/Argentina/Buenos_Aires` son **16** en 7 archivos, más el literal `-03:00` pegado en `app/admin/page.tsx:82` y `lib/assistant/tools.ts:425`, y el offset fijo del motor de slots en `lib/scheduling/slots.ts:15,45,161`. `professionals.zona_horaria` existe en SQL (`0001_init.sql:64`) y nunca se lee.

**Esto hay que hacerlo antes del primer cliente no argentino**, porque después son datos históricos guardados con la interpretación vieja.

**5.5 La RLS es decorativa.** El único cliente de Supabase es `getServiceClient()` con la service_role key, que tiene BYPASSRLS. Las políticas de `0002_rls.sql` están escritas sobre tablas que el código **nunca consulta**: `grep '.from('` devuelve exclusivamente `app_state` y `auth_state`. El aislamiento entre consultorios es una función de TypeScript (`lib/store.ts:157-180`) sin red debajo. `supabase/migrations/0007_auth_state.sql:24-27` lo admite textual. Decisión a tomar explícitamente: o blindás el punto único con tests de integración, o movés el dominio a las tablas relacionales con JWT por request (que es lo que vas a necesitar el día que le vendas a una clínica).

**5.6 Cero tests sobre la capa que guarda los datos.** Los tests cubren hashing, permisos, tenant y motor de turnos — nada ejercita la persistencia. Ni el lock optimista, ni `normalize`, ni que un pid ajeno haga lanzar a `read()`. La razón está documentada en `tests/deuda.test.ts:12-27` y es acoplamiento: `store.ts` importa `next/headers` dentro de la capa de persistencia. **Y ojo:** corrí la suite en este checkout — **113 tests, 112 pass, 1 FAIL** (`tests/deuda.test.ts` no carga: `ERR_MODULE_NOT_FOUND` de `@supabase/supabase-js`). No son 140. Tu propio checklist de alta (`OPERACION.md:51`) exige "npm test en verde en master" como prerrequisito para dar de alta un consultorio, y hoy está rojo.

**5.7 Sin borrado de nivel consultorio ni retención.** Se puede borrar una nota (`lib/store.ts:539`) o un movimiento (`:830`), pero no un paciente ni un consultorio. Y aunque borres la fila de `professionals` (el cascade se lleva `app_state`), la identidad vive en el blob global `identidad` que **nadie limpia**: membresías, sesiones y auditoría de clientes que se fueron conviviendo con los activos, sin FK ni cascade.

**5.8 Menores pero reales:** cola de mutación global al proceso (`lib/store.ts:269`, un `Map<pid, Promise>` lo arregla en 5 líneas); throttle que crece sin purga dentro del blob global; logs sin `pid` en las 6 líneas que se usan para diagnosticar; sin error boundary fuera de `/admin` — un throw en `/reservar` le muestra la pantalla cruda de Next **a un paciente que estaba por reservar**.

---

## 6. Riesgo legal

No soy abogado y esto no es asesoramiento. Lo que sigue es **qué falta y qué hay que conseguir**.

### Argentina (Ley 25.326, Ley 26.529)
| Falta | Consecuencia concreta |
|---|---|
| Política de privacidad y términos publicados | El sitio recolecta el motivo de consulta —dato de salud— sin informar finalidad ni responsable (art. 6) |
| Consentimiento en el reservador | El tratamiento de datos de salud pide consentimiento libre, expreso e informado **por escrito** (art. 5 y 7). Hoy `components/TurnoForm.tsx:551-594` no tiene ninguna casilla: `grep checkbox` en ese archivo = 0. Y `Solicitud` (`lib/store.ts:44-56`) no tiene campo de consentimiento, versión de texto, timestamp ni IP: **si mañana un paciente reclama, no hay nada que mostrar** |
| Contrato de encargado de tratamiento (DPA) | Art. 25 exige que la relación responsable↔encargado conste por contrato. Sin él, el psicólogo no puede demostrar que delegó legalmente, y vos no tenés definido qué podés hacer con los datos. Se agrava porque **existe una función de acceso de soporte y viene activada por defecto** (`lib/accounts.ts:41-43`, "ausente = habilitado") |
| Auditoría de acceso a historia clínica | La propia `0006_cuentas.sql:306-310` escribe que hay que loguear las lecturas por art. 9, y no se hace: los 11 `logAudit` son todos de identidad y equipo, **cero** sobre datos de pacientes |
| Política de retención | La HC tiene guarda decenal (Ley 26.529 art. 18) y no hay ningún plazo implementado ni escrito. `docs/planes/FASE-1-cuentas.md:168` dice, con razón, que el número lo tiene que fijar asesoría |
| Ejecutabilidad de acceso/rectificación/supresión | Art. 14 y 16, plazos de 10 y 5 días hábiles. No hay `borrarPaciente` ni export de historia clínica: la única salida es abrir el SQL Editor a mano |

### México (LFPDPPP)
- **Aviso de privacidad**: es obligatorio y con contenido tasado (art. 15-17). No existe.
- **Datos sensibles**: consentimiento **expreso y por escrito** (art. 9). Un formulario sin casilla no lo cumple, punto.
- **Transferencia internacional**: art. 36-37 exige informarla en el aviso. No sabés ni podés declarar dónde corre la lambda, dónde vive el Postgres ni dónde se procesa el audio (no hay `vercel.json`, `next.config.ts` no fija región, la región de Supabase no aparece en ningún archivo).
- **Derechos ARCO**: mismo problema de ejecutabilidad que AR.
- Facturación: sin RFC ni CFDI, un psicólogo mexicano no puede deducir tu suscripción como gasto de la práctica.

### Estados Unidos (HIPAA)
- `grep -riE 'hipaa|\bbaa\b|business associate|\bPHI\b'` = **0** en todo el repo.
- Un clínico que sea *covered entity* necesita un **BAA firmado** con vos, y vos necesitarías BAAs aguas arriba (Vercel, Supabase, y sobre todo OpenAI). Hoy no tenés ninguno.
- HIPAA exige **audit trail de accesos**, que no tenés.
- **Lo positivo:** hoy nadie de USA puede suscribirse solo, porque no hay flujo de alta. El control existe por accidente. El día que abras `/registro`, ese control desaparece — **poné un campo país en el alta y no habilites USA hasta tener BAA**.

### Los tres subencargados que hay que declarar (y el cuarto que sorprende)
Verificados en código: **Vercel** (hosting), **Supabase** (Postgres), **OpenAI** (chat `lib/openai.ts:3` y Whisper `:94`), **Telegram** (`lib/telegram.ts:8`). La lista es corta y eso es una ventaja: confirmé que **no hay ningún tracker** — `grep gtag|googletagmanager|analytics|plausible|posthog|hotjar|fbq|cdn\.|unpkg|jsdelivr` sobre `app/ components/ lib/` = 0, y las fuentes van por `next/font` (auto-hospedadas). Es un diferencial real frente a competidores que meten Google Analytics en un sitio de psicología: escribilo en la política.

**Dos riesgos concretos con OpenAI:**
1. La transcripción manda audio crudo a Whisper sin ningún filtro ni aviso (`app/api/asistente/transcribir/route.ts:31-33`). Dictar una evolución es el uso más natural de un dictado en un consultorio. El system prompt le pide al **modelo** no comentar notas clínicas (`lib/assistant/tools.ts:611`), pero **el audio ya salió del país antes de que el modelo opine nada**. Falta: advertencia explícita en la UI antes de la primera grabación, y un toggle por consultorio para apagar la voz sin apagar el asistente.
2. Las llamadas no piden retención cero ni exclusión de entrenamiento. El body es exactamente `{model, messages, tools, parallel_tool_calls, max_tokens}` (`lib/openai.ts:66-73`). **Eso se arregla con un acuerdo de cuenta con OpenAI, no con un campo del request** — pasar el header de organización/proyecto sirve para que la config aplique de forma verificable, no para activarla.

### Qué conseguir (no escribir vos)
1. **Términos de servicio Codexy↔psicólogo**, que fije explícitamente: el psicólogo es responsable del tratamiento, Codexy es encargado.
2. **DPA / anexo de tratamiento**: instrucciones, confidencialidad, lista de subencargados con derecho de objeción, **régimen del acceso de soporte**, plazo comprometido de notificación de brecha al psicólogo, y destino de los datos al terminar.
3. **Política de privacidad de la plataforma** + un **template de aviso de privacidad por consultorio** generado desde `lib/marca.ts` (nombre, matrícula, ciudad, email ya están). El template hace el trabajo pesado: el psicólogo no lo va a redactar solo, y es una razón para elegirte.
4. **Asesoría para el número de retención** por país.
5. **Región de Supabase y de Vercel decididas y escritas.**

Y **antes de afirmar por escrito que "la historia clínica no sale"**: cerrá las dos fugas del punto 3.6. Hoy la frase es verdadera hacia afuera y falsa hacia adentro.

---

## 7. Lo que YA está y no hay que rehacer

No lo pierdas de vista: es más de lo que suele tener un producto en esta etapa, y varias de estas piezas son argumento de venta.

- **Lock optimista y escritura atómica** (`lib/store.ts:270-298`): reintenta releyendo estado fresco, backoff con jitter, trata el 23505 como conflicto recuperable, distingue el 23503 con mensaje accionable. El anti-doble-booking ocurre **dentro** de la sección crítica (`:564-591`), eliminando el TOCTOU. En modo archivo, tmp + rename.
- **Fail-closed por tenant** (`lib/tenant.ts:87-103`, `proxy.ts:17-31`, `lib/store.ts:157-180`): sin lookup adivinado, IDNA/punycode normalizado, el header se sobrescribe siempre, y el store re-valida aunque el proxy ya lo puso. Prefiere romper antes que servir datos de otro. Es el criterio correcto para datos de salud. *(Con la salvedad del fail-open por JSON inválido — punto 2.)*
- **El invariante de historia clínica hacia terceros** (`lib/permisos.ts:81,88-93`, testeado en `tests/auth.test.ts:312+`): verifiqué las 8 tools de lectura del asistente y ninguna toca `motivo` ni `notasClinicas`, y `lib/telegram.ts:94` excluye el motivo con comentario explícito. Se puede afirmar por escrito una vez cerradas las fugas internas.
- **Cuentas individuales**: PBKDF2 600k, cookie HMAC edge, identidad global por email con membresías N:N (resuelve bien el psicólogo que trabaja en dos consultorios), protección de que el consultorio no quede sin owner (`lib/accounts.ts:302-307`).
- **El chokepoint de autorización** (`lib/session.ts:103-130`): un solo lugar por donde pasa todo, ya conoce el pid. Meter entitlements es agregar un eje, no un refactor. *(Con dos asteriscos: `puede()` tira la Sesión, así que los 3 handlers que lo usan no tienen el pid; y la ventana legacy `:64-73` devuelve `rol: "owner"` y `puede: () => true` — hay que decidir explícitamente qué pasa ahí.)*
- **El runbook operativo** (`docs/guias/OPERACION.md`, 540 líneas): severidades con tiempos, seis runbooks de incidente incluida fuga cross-tenant, tabla de envs con alcance, 7 trampas conocidas. Es tu activo operativo más fuerte.
- **Las guías del cliente** (`PRIMEROS-PASOS.md`, `GUIA-PANEL.md`): escritas en segunda persona, sin jerga. **Están hechas y no se sirven desde ningún lado** — `grep 'docs/'` en `app/ components/ lib/` devuelve un comentario. Una ruta `/admin/ayuda` que las renderice es lo más barato de todo este documento y te corta tickets desde el día uno.
- **Cero rastreadores en el sitio público.** Escribilo en la política.

---

## 8. El camino más corto a cobrar

Recorte agresivo. Todo lo que se puede hacer a mano las primeras diez veces, **se hace a mano**.

### Paso 0 — Hoy, antes de hablar con nadie (horas)
1. Mové `data/` y `cerebro/` fuera de OneDrive.
2. Arreglá `npm test` (`@supabase/supabase-js` no resuelve en este checkout). Tu propio checklist lo exige.
3. Borrá `passwordTemporal` del modelo y saneá el blob productivo.
4. Bloqueá la sesión de soporte en **toda** la sección equipo.
5. `if (esMultiTenant()) return 401` en `app/api/telegram/route.ts`.
6. Un `throw` en `tenantMap()` si TENANTS está seteada y no parsea.

### Paso 1 — Despersonalizar el entregable (la tarea más importante)
Esto es lo único que no se puede compensar con trabajo manual. Los 8 archivos del punto 3.1, con la regla "campo vacío = sección oculta, nunca un default". Borrá los testimonios inventados: no los parametrices. Sumá el test anti-"Pilotti"/"Viedma".

**Criterio de salida:** creás un tenant vacío, entrás, cargás nombre + WhatsApp + alias + un servicio + una franja horaria, y el sitio público resultante no menciona a Paulina en ningún lado, ni en el HTML, ni en el `robots.txt`, ni en el `canonical`.

### Paso 2 — Semilla de arranque + checklist (2 archivos)
Un consultorio nuevo hoy ve cuatro ceros y un sitio sin horarios. Sembrá `emptyDB()` (`lib/store.ts:110`) con dos servicios sugeridos sin precio y una franja lunes a viernes, y agregá un bloque de 5 ítems en `app/admin/page.tsx` usando los datos que la página **ya carga** (`services`, `staff`, `sched.rules`, `marca`), con el aviso duro "tu sitio no puede recibir reservas" cuando falten servicios o reglas. *(Los parámetros del motor ya vienen razonables: `DEFAULT_CONFIG` en `lib/scheduling/types.ts:78-84`.)*

Y la ruta `/admin/ayuda` que renderice las dos guías que ya escribiste, con un ítem en `components/AdminSidebar.tsx`. Media tarde, te ahorra semanas de WhatsApp.

### Paso 3 — El papel (en paralelo, arranca ahora porque no depende de vos)
Encargá los tres documentos. Mientras tanto, en código: casilla de consentimiento obligatoria en `components/TurnoForm.tsx` con validación server-side en `app/api/turnos/route.ts`, persistiendo `{aceptadoEn, versionTexto, ip}` en la Solicitud — la IP ya la podés sacar con `clientIp(req)` de `lib/ratelimit.ts`, que esa ruta ya importa. Es además el cimiento del "encuadre digital" de tu roadmap, así que no es trabajo tirado.

### Paso 4 — Precio y una página que lo diga
Decidí el número por mercado. Página estática fuera de este repo (o el apex mapeado como clave más en TENANTS). Precio, tres capturas revisadas por PII, un botón de WhatsApp. **No construyas `/registro` todavía.**

### Paso 5 — Cobrar a mano
Link de pago manual + factura manual. En código, solo el **campo**: `suscripciones[pid] = {plan, estado, moneda, periodoHasta}` en el blob de `auth_state`, con el patrón de `soporteHabilitado`. Sin webhook, sin pasarela, sin dunning. Vos ponés el estado a mano cuando entra la plata.

### Paso 6 — Red de seguridad antes del primer peso
- `scripts/backup.mjs` + cron a un bucket **fuera de Supabase**.
- `lib/alertas.ts` con `avisarCodexy()` sobre `sendTelegram`, enganchado en los 4 puntos del 4.4.
- Arreglar el SQL destructivo de `crear-cuenta.mjs`.
- `rateLimit` en las tres rutas del asistente.
- Export completo del consultorio detrás de `notas_clinicas` + `logAudit`.
- Plan pago de Supabase con PITR.

### Paso 7 — Recién acá, la tabla `tenants`
Cuando tengas 5-8 clientes pagando y el alta manual te esté doliendo de verdad. Ahí sí: tabla con `slug`/`host`/`professional_id` UNIQUE, estado, plan, `creado_en`, caché corta en el edge, `/registro`, suspensión por escalones y panel de superadmin. **Ese es el salto de agencia a SaaS**, y llega mucho mejor financiado si lo hacés con ingresos que sin ellos.

---

**El resumen honesto:** lo que te separa de cobrar no es arquitectura, es que el producto todavía es el sitio de una persona y no tenés ni precio ni papel. Los pasos 1 a 5 son código acotado en archivos que ya existen. Lo que te separa de **escalar** sí es arquitectura, y es una sola pieza: que el consultorio sea una fila en vez de una clave de un JSON en Vercel. No las mezcles.