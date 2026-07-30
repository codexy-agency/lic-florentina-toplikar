# Auditoría, venta y landing — Codexy SaaS para psicólogos

Verifiqué todo contra el código de `C:\Users\Carlos\OneDrive\lic-florentina-toplikar`. Corrí `npm test`: **196 tests, 195 pasan, 1 falla** — y la que falla es artefacto de esta copia, no del código: falta `node_modules/@supabase` en el espejo de OneDrive (`Cannot find package '@supabase/supabase-js' imported from lib/supabase.ts`). No hay nada que arreglar ahí. Ojo con la regla de la casa que dice "223 tests": son 196.

Dato de contexto que cambia el orden de todo: **el despersonalizado ya está hecho**. `grep -rn "Pilotti" app lib components` solo devuelve tres comentarios explicativos (`app/robots.ts:6`, `lib/marca.ts:23`, `lib/sitio.ts:3`). `docs/planes/QUE-FALTA-PARA-SER-SAAS.md §3.1` está viejo y sigue diciendo que el entregable lleva el nombre de otra persona. También está viejo el §2: dice que un `TENANTS` inválido degrada a single-tenant, y hoy `lib/tenant.ts:41-51` **lanza**. Actualizá ese doc o borralo: es el documento que vas a releer a las 2 de la mañana antes de un deploy.

---

## 1. Lo que hay que arreglar antes de mostrárselo a alguien

Hay nueve cosas. No es una lista inflada: cinco son salida de datos de salud o pérdida silenciosa de datos, cuatro te cuestan el primer cliente en la primera semana de uso. Todas menos dos son de menos de una hora.

### Bloque A — no se lo mostrás a nadie hasta que esto esté (2 a 3 horas de trabajo, todo junto)

**A1. La ficha clínica de TODOS los pacientes viaja al navegador de quien no puede verla.**

`app/admin/pacientes/page.tsx:12-13` hace `requireAdmin("pacientes")` y `getPacientesResumen()`, y en `:61` pasa el array entero a `<PacientesList pacientes={pacientes} />`. `components/PacientesList.tsx:1` es `"use client"` y `:31` recibe `PacienteResumen[]`. `lib/store.ts:440` dice `PacienteResumen extends Paciente`, `lib/store.ts:81` declara `notas: string; // ficha / resumen fijo`, y `lib/store.ts:505` devuelve `{ ...p, deuda, ... }` — el spread arrastra `notas`. Next serializa el objeto completo en el payload RSC.

Cómo falla: una secretaria con rol `asistente` (permiso `pacientes` sí, `notas_clinicas` no, invariante duro de `lib/permisos.ts:89`) abre DevTools → Network → respuesta del documento, busca `notas`, y se lleva la ficha de cada paciente del consultorio. La misma que la pantalla de detalle le niega con el cartel "La ficha del paciente la ven los profesionales del consultorio" (`app/admin/pacientes/[id]/page.tsx:300-307`). Peor: la sesión de soporte de Codexy tiene el mismo perfil (`lib/soporte.ts:55` le niega `notas_clinicas` y `equipo`, le deja `pacientes`), o sea que tu equipo se lleva las fichas con dos clics, contradiciendo lo que el propio panel le promete al cliente en `app/admin/equipo/page.tsx:170`. Y no queda rastro: no pasa por `logAudit`.

Qué tocar: `app/admin/pacientes/page.tsx`. Proyectar a mano antes del límite cliente, exactamente como ya se hace en `app/admin/page.tsx:321` con `pacientes.map((p) => ({ id, nombre, contacto, proximoTurno }))`. Tipar el prop de `PacientesList` con el tipo nuevo, no con `PacienteResumen`, para que el compilador impida la reincidencia.

**Por qué es la número uno:** el argumento de venta que te distingue de todo lo demás en este rango de precio es "la historia clínica es un candado del sistema, no una promesa nuestra". Vender eso con este bug adentro no es un bug, es un problema tuyo.

**A2. La contraseña global es llave maestra de todos los consultorios.**

`lib/auth.ts:71-85`: `passwordDeTenant()` solo entra al mapa por consultorio si `ADMIN_PASSWORDS` está seteada y no vacía; en cualquier otro caso `return PASSWORD`. El comentario de `lib/auth.ts:67-70` promete literalmente lo contrario ("NO cae a la global: una clave compartida sería una llave maestra de todas las historias clínicas"), y `ADR-0002` lo documenta como garantía. No lo está.

Cómo falla: `TENANTS` con dos consultorios, `ADMIN_PASSWORD` seteada (viene del despliegue histórico), `ADMIN_PASSWORDS` olvidada. Ninguno de los dos creó todavía su cuenta dueño — que es el estado normal de un cliente en sus primeros días. `tieneCuentas(pid)` da false (`app/api/admin/route.ts:57`), se toma el camino legacy de `:74-82`, y la MISMA contraseña abre los dos paneles con `rol: "owner"` y `puede: () => true` (`lib/session.ts:65-74`). El health check no lo detecta: chequea `ADMIN_SECRET`, `SUPABASE_URL` y la service key, no `ADMIN_PASSWORDS`.

Qué tocar: `lib/auth.ts` — devolver `PASSWORD` solo cuando NO hay `TENANTS`. En multi-tenant, `return mapa[pid]` y nada más (`undefined` ya falla cerrado en `checkPassword`). Y agregar al health check un aviso si `ADMIN_PASSWORD` sigue seteada con `TENANTS` presente.

**Esto es invisible con un cliente y catastrófico con dos. Vos querés el segundo esta semana.**

**A3. Un deploy viejo vacía las suscripciones y reactiva solo el acceso de soporte.**

`lib/accounts-store.ts:100-113`: `normalizar()` reconstruye el AuthDB con nueve claves fijas en vez de arrancar de `{...raw}`. `lib/store.ts:197-213` hace lo correcto (`return { ...raw, ... }`) y tiene el comentario que explica por qué. En el mismo commit `0a90e44` se arregló en un almacén y no en el otro.

Cómo falla: deploy nuevo en Vercel. Durante el drenado (o con skew protection, que rutea a la build vieja durante horas) una lambda vieja atiende un login. `mutarAuth` lee, `normalizar()` descarta `soporte`, `suscripciones` y `usoAsistente` porque su `AuthDB` no los tiene, y escribe el blob mutilado con rev+1. Resultado, silencioso y para todos los consultorios a la vez: se pierde quién pagó y hasta cuándo; **el kill switch del cliente se reactiva solo** porque `soporteHabilitado()` es `db.soporte?.[pid] !== false` (`lib/accounts.ts:45-48`), o sea que un consultorio que apagó el acceso de Codexy vuelve a permitirlo sin que nadie se entere; y los contadores del asistente vuelven a cero.

Qué tocar: `lib/accounts-store.ts:100`. `return { ...d, users: ..., credentials: ... }`. Una línea. Más un test que meta una clave desconocida y verifique que sobrevive al round-trip.

**Agravante que va en el mismo archivo:** `leerAuth`/`mutarAuth` (`lib/accounts-store.ts:182-217`) nunca llaman a `assertBackendConfigOk()`. El grep en todo el repo da tres hits, todos en `lib/store.ts` (:19, :353, :368). Si se rota o se borra `SUPABASE_SERVICE_ROLE_KEY`, el store de dominio lanza y el de identidad sigue andando contra `data/auth.json` en el disco efímero: `tieneCuentas(pid)` da false para todos los consultorios y **toda la plataforma cae a la puerta legacy de A2**. Los dos bugs juntos son una sola contraseña para todo. Agregá la llamada al inicio de las dos funciones, y en `fileRead` distinguí ENOENT del resto antes de devolver `vacia()` (`:120-126`).

**A4. El CSV de finanzas se lo puede bajar el soporte de Codexy, con nombre de cada paciente y lo que pagó.**

El commit `9a767c3` tocó los dos route handlers de export y solo le puso el bloqueo a uno. `app/admin/exportar/route.ts:35-37` rechaza explícitamente: `if (sesion.soporte) return new NextResponse("El soporte de Codexy no exporta datos de pacientes.", { status: 403 })`. `app/admin/finanzas/export/route.ts:31-34` solo chequea `sesion.puede("finanzas")` y nunca mira `sesion.soporte`. Que el CSV lleva identidad lo dice el propio archivo en `:39-43`: "es una extracción masiva de datos personales, no un reporte de números". Y `puedeSoporte("finanzas")` devuelve true (`lib/soporte.ts:56-61`).

Qué tocar: `app/admin/finanzas/export/route.ts`, justo después de la línea 32, copiar el bloque de `exportar/route.ts:35-37`. Mejor todavía, para que no se olvide en el próximo export: un helper `soportePuedeExportar(sesion)` en `lib/soporte.ts` llamado desde los dos.

**A5. Dos server actions sin autorización devuelven la auditoría de cualquier consultorio.**

`app/admin/equipo/actions.ts:136-140`, en un archivo con `"use server"` en la línea 1:

```ts
export async function ultimosAccesos(professionalId: string, limite = 12) {
  const db = await leerAuth();
  return db.audit.filter((a) => a.professionalId === professionalId).slice(0, limite);
}
export async function estadoSoporte(pid: string) { return soporteHabilitado(pid); }
```

Sin sesión, sin permiso, sin pertenencia, y el pid llega como argumento del cliente. Los docs de Next que están en el repo son explícitos (`node_modules/next/dist/docs/01-app/02-guides/data-security.md:272`: toda función exportada de un archivo `'use server'` es alcanzable por POST directo). No las salva el dead-code elimination porque se consumen desde un Server Component (`app/admin/equipo/page.tsx:43-44`).

Cómo falla: POST con la cabecera `Next-Action` y el pid del consultorio B. Devuelve `meta.email` de cada login y de cada miembro creado (los emails del equipo de otro cliente), los `soporte_ingreso`, y los `export_consultorio` con `meta: { pacientes, notas, solicitudes }` — cuántos pacientes y cuántas notas clínicas tiene ese consultorio. El proxy no ayuda: solo protege rutas que empiezan con `/admin` (`proxy.ts:33`) y la action se invoca desde cualquier ruta pública.

Qué tocar: `app/admin/equipo/actions.ts`. Sacar el pid de la firma y tomarlo de `requirePermiso("equipo")`. Mejor: moverlas a `lib/` fuera del archivo `"use server"`, ya que el único consumidor es un Server Component. Y hacer una pasada por todos los archivos `"use server"` buscando exports que reciban ids de recurso.

### Bloque B — no se lo dejás en manos de un cliente hasta que esto esté

**B1. Borrar una nota de historia clínica es un toque, sin confirmación, sin deshacer y sin auditoría.**

`app/admin/pacientes/[id]/page.tsx:246-252`: un `<form action={borrarNota}>` con un `<button>` pelado de 12px, en la misma fila que el chip de fecha. Va a `app/admin/pacientes/actions.ts:50-56` y de ahí a `lib/store.ts:632-636`: `db.notasClinicas = db.notasClinicas.filter(n => n.id !== id)`. Sin tombstone, sin papelera, sin `logAudit`.

El contraste que lo vuelve indefendible: `components/DeleteConfirm.tsx` existe y se usa en `components/ServiciosEditor.tsx:99` y `components/ProfesionalesEditor.tsx:220`, con el hint "Se quita de la lista. Se aplica al Guardar". O sea, se confirma lo reversible y no se confirma lo irreversible.

Qué tocar: envolver en `<DeleteConfirm>` con texto propio ("Se borra la nota del <fecha>. No se puede deshacer."), agregar `logAudit` en `borrarNota`, y —lo que corresponde a un registro clínico que la ley obliga a conservar— borrado lógico con `borradaEn` y purga a los N días.

**B2. Nadie puede cambiar su contraseña, el mensaje de error manda a una pantalla que no existe, y no hay recuperación.**

`app/admin/equipo/actions.ts:114` devuelve "Para cambiar tu propia contraseña usá Mi cuenta." — y `grep -rn "Mi cuenta" app lib components` devuelve **exactamente esa línea**. `find app -name page.tsx` da 16 rutas y ninguna es de cuenta. `cambiarPassword` (`lib/accounts.ts:416`) tiene un único llamador: `resetearPassword`, que rechaza el caso propio. `components/LoginForm.tsx:78-157` no tiene link de "olvidé mi contraseña".

Cómo falla, dos escenarios que van a pasar en el mes 1: la secretaria recibe `Temp-a8f3k2-9d1`, busca dónde cambiarla como le dijeron, no existe, y sigue trabajando con la contraseña que el dueño también conoce. Y la psicóloga —única owner, que es el caso típico— olvida la suya: el login no ofrece recuperación, `resetearPassword` se niega al caso propio, y nadie más tiene permiso `equipo`. Queda afuera de su propia agenda hasta que alguien de Codexy toque la base a mano.

Qué tocar: crear `app/admin/cuenta/page.tsx` con cambio propio (pide la actual, PBKDF2, invalida las demás sesiones como ya hace `cambiarPassword`) y linkearlo desde `components/AdminSidebar.tsx`. En `components/LoginForm.tsx`, un link "¿Olvidaste tu contraseña?" que abra `soporteUrl()` de `lib/codexy.ts` con el email precargado.

**B3. La pantalla de error miente, no tiene salida, y en el período de prueba se dispara sola al paciente 16.**

Este es un bug compuesto y es el que te arruina el onboarding.

`app/admin/error.tsx:16-26` muestra "Puede que ese horario ya esté ocupado o que haya un problema momentáneo" para **cualquier** fallo de Server Action, y su único control es `<button onClick={reset}>Reintentar</button>`. Sin link de vuelta, a 100dvh, sin sidebar. Los errores que llegan ahí no tienen nada que ver con horarios: `lib/session.ts:127-138` (solo lectura), `app/admin/pacientes/actions.ts:27-28` (`throw new Error(cupo.motivo)` del tope del plan), `lib/session.ts:113` (sin permiso). Ninguno se captura: 17 acciones son `<form action={serverAction}>` sin try/catch.

Ahora sumale el tope: `lib/planes.ts:62` da al plan Prueba `pacientes: 15`. El primer día, la psicóloga carga a mano sus pacientes actuales (que son 15 a 40, es el segmento). Al 16, en vez de leer el mensaje que el sistema tenía escrito —"Tu plan Prueba incluye hasta 15 pacientes. Ya tenés 15. Escribinos y lo ampliamos en el momento"— le tapa toda la pantalla con "Puede que ese horario ya esté ocupado". Aprieta Reintentar, mismo cartel. Pierde el sidebar. **Ese es el primer día de tu primer cliente.**

Qué tocar, tres cosas chicas: (1) `app/admin/error.tsx` — texto neutro y agregar "Volver al panel"; (2) `lib/planes.ts:62` — subir el tope de prueba de 15 a 40 pacientes (ver sección 3, va junto con los 30 días); (3) capturar el error en `crearPaciente` y devolverlo con `useActionState` como ya se hace en `agendarTurnoManual` (`app/admin/actions.ts:85`).

**B4. Un servicio creado después de cargar a los profesionales nunca aparece en el reservador, y nada lo avisa.**

`lib/store.ts:870-872`: `db.services.filter(s => s.activo && staff.some(st => st.serviceIds.includes(s.id)))`. Y `components/ProfesionalesEditor.tsx:83` asigna `serviceIds: services.map(s => s.id)` — una foto de los servicios de ESE momento. Nada vuelve a tocar `serviceIds` cuando después se crea un servicio nuevo. `app/admin/servicios/page.tsx:9-23` ni siquiera recibe `staff`, así que no puede advertir nada.

El síntoma que te va a reportar el cliente es "guardé y no se guardó": agrega "Terapia de pareja", ve el cartel verde, va a su página y no está. El único lugar del producto que sabe explicarlo es `components/PrimerosPasos.tsx:86-95`, y ese componente hace `return null` cuando los 6 pasos están tildados (`:77-78`), o sea justo antes de calcular el aviso.

Qué tocar: `app/admin/servicios/actions.ts` — al guardar un servicio nuevo, tildarlo por defecto para todos los profesionales activos. Y en `components/PrimerosPasos.tsx`, mover el cálculo de `falta` **arriba** del return anticipado y renderizar el aviso rojo solo aunque los 6 pasos estén hechos. Son cinco líneas y arreglan dos hallazgos de una.

### Lo que NO está en esta lista, a propósito

**La zona horaria y la moneda cableadas a Argentina** (`lib/scheduling/slots.ts:15` `AR_OFFSET_H = -3`, `"$" + n.toLocaleString("es-AR")` en cinco archivos, `lib/marca.ts:22-51` sin `zonaHoraria` ni `moneda`) están marcadas como "alto" y no las toco antes de vender. Razón: **la decisión comercial es no vender fuera de Argentina** (sección 3). Con esa decisión, no es un bug, es un límite conocido. El día que aparezca el primer prospecto mexicano, es un proyecto de dos semanas, no un parche.

---

## 2. Lo que se arregla después

Cuatro grupos, en orden de cuándo te muerde.

**Grupo 1 — Se rompe cuando tengas 10 o 20 clientes (aislamiento y escala).**
La fila única de identidad `auth_state` se reescribe entera en cada login, cada auditoría y cada mensaje del asistente (`lib/accounts-store.ts:140,190-217`), con `podar()` O(n) sobre el blob completo en cada intento; si se agotan los 10 reintentos, **el login falla**. La cola de mutación es global al proceso, no por tenant (`lib/store.ts:362-391`): la ráfaga de reservas de un consultorio bloquea el guardado de otro. El cache de permisos crece sin tope y nunca borra vencidos (`lib/session.ts:41`, tres `set`, cero `delete`), a diferencia de `lib/ratelimit.ts:22-34` que ya tiene el patrón resuelto. Y el guardado de listas completas (`saveServices`, `saveStaff`, `saveMarca`, `saveDisponibilidad`, `updatePacienteFicha`) pisa sin aviso lo que acaba de guardar otra persona del mismo consultorio — el lock por `rev` no protege contra reemplazo total. El caso grave es la ficha clínica: se pisa entera, sin historial.

**Grupo 2 — Los planes no se aplican en ningún camino real.** El tope de pacientes solo se consulta desde el botón "+ Nuevo paciente" (`app/admin/pacientes/actions.ts:27`); los pacientes se crean de verdad desde `registrarPacienteSiNuevo` (`lib/store.ts:513`), llamado desde la reserva pública, el turno a mano y el asistente, sin ningún chequeo. O sea: **el tope frena al que paga y deja pasar al que no.** El tope de profesionales no se consulta en ningún lado. `sitioPublicoActivo()` está definida, documentada y testeada y **no la llama nadie** (grep en `app lib components`: solo la definición y `tests/planes.test.ts:57`), así que una cuenta cancelada sigue recibiendo reservas que el profesional no puede confirmar. `periodoHasta` no tiene ningún efecto sobre el acceso: la prueba no vence sola, vence cuando alguien de Codexy se acuerda. Y el cupo del asistente se consume antes de verificar que exista la API key (`app/api/asistente/route.ts:33` antes de `:41`).

**Grupo 3 — Bugs de lógica que aparecen en el mes 2.** Un turno reservado antes de poner precios vale $0 para siempre y no hay forma de corregirlo (no existe `setPrecio` en `lib/store.ts`): aparece como "2 sesiones impagas · debe $0", literalmente incobrable. El asistente agenda siempre con el primer profesional que ofrece el servicio, sin parámetro para elegir (`lib/assistant/tools.ts:284`), y la tarjeta de confirmación no dice con quién. El anti-solape de `setEstado` mira solo `confirmado` mientras el criterio de ocupación cuenta también los pendientes con hold (`lib/store.ts:752-767` vs `:398-409`). Un turno pagado con `no_asistio` entra en el KPI Cobrado pero no en la curva mensual (`lib/store.ts:1023` vs `:1099`), así que la tarjeta y el gráfico muestran números distintos en la misma pantalla. Y al invitar a alguien que ya tiene cuenta en la plataforma, la contraseña que escribís se ignora en silencio mientras la UI dice "Acceso creado" (`lib/accounts.ts:331-362`).

**Grupo 4 — UX y prolijidad.** El menú lateral muestra las 9 secciones a todos los roles y el click rebota en silencio a `/admin` (`components/AdminSidebar.tsx:16-74` es una constante de módulo; `lib/session.ts:181-186` hace `redirect` sin mensaje). El reservador borra nombre, teléfono, email y motivo de consulta cuando el horario se ocupa (`components/TurnoForm.tsx:553`, inputs no controlados + `setStep(3)` en `:214-217`) — es el peor momento posible para pedirle esfuerzo extra a alguien que está pidiendo ayuda por primera vez. El badge "Más elegida" está pegado al servicio con índice 0 sin ningún dato detrás (`components/TurnoForm.tsx:396-400`): es una afirmación falsa sobre un servicio de salud publicada bajo la matrícula de tu cliente. El título vacío cae a "Psicóloga clínica" contra la regla de la casa, y ese default termina en el texto legal que el paciente acepta (`lib/marca.ts:139` → `lib/consentimiento.ts:38-41`). Los links para compartir saltan al dominio propio antes de que el DNS exista, mientras el texto de abajo dice lo contrario (`components/LinksDelSitio.tsx:13-15` vs `app/admin/marca/page.tsx:63-65`). Cargar un ingreso no confirma nada y puede no guardar en silencio (`app/admin/finanzas/actions.ts:21`, `return` mudo). El reservador público le muestra al paciente "Cargalos desde el panel (/admin/servicios)". La pantalla del Asistente le pide a la psicóloga que edite variables de entorno en Vercel. La página de reserva ignora la paleta que eligió (`app/reservar/page.tsx:122`, hex literales). Y quedan tres glifos de texto como iconos y un `font-serif` en el error boundary.

Ninguno de estos frena una venta. Los del grupo 4 los arreglás mientras esperás respuestas de los DMs.

---

## 3. El modelo de venta — decidido

**Supuestos que tenés que verificar con datos frescos antes de cotizar. El razonamiento no cambia si están corridos 20%:** sesión particular en Argentina ARS 35.000-45.000; ARS/USD ~1.600.

### 3.1 A quién le vendés — decidido: consultorio compartido primero

Hay dos beachheads posibles y el código decide cuál. **Priorizás el consultorio compartido de 3 a 8 psicólogos con una secretaria.** El psicólogo solo es relleno de volumen, no el objetivo.

Cuatro razones, todas verificables:

1. **El modelo de permisos se construyó para eso.** `lib/permisos.ts:78-92` define `ROLES_CON_HISTORIA_CLINICA` como invariante duro: al rol `asistente` no se le puede dar `notas_clinicas` ni tildando el permiso. Ese es exactamente el problema del consultorio compartido con secretaria, y no lo resuelve ningún Excel, ningún WhatsApp y ningún Calendly. Un psicólogo solo no tiene ese problema.
2. **La aritmética del alta.** Cada cliente nuevo es editar la env `TENANTS` en Vercel + redeploy (`lib/tenant.ts:32`) más 20-30 minutos de configuración. Ese costo se amortiza entre 5 profesionales, no entre uno.
3. **Es el único lugar donde el precio por asiento tiene sentido**, y el precio por asiento es lo que te lleva de USD 18 de ARPU a USD 60-100.
4. **Es el único lugar donde existe el attach de servicios** — el punto de la sección 3.4, que es el que realmente te acerca a los USD 20k.

Quién NO es tu cliente hoy: psiquiatras, quien trabaja con obra social (no hay una sola línea de liquidación ni nomenclador en el repo), quien tiene la agenda 100% de turnos fijos (no existe recurrencia; ver sección 6), y **México y Estados Unidos**, por `AR_OFFSET_H = -3` y `priceARS`.

### 3.2 El precio — decidido

| | Hoy en el código | **Decidido** |
|---|---|---|
| Prueba | 14 días, 15 pacientes | **30 días, 40 pacientes** |
| Esencial | ARS 18.000 | **ARS 29.000/mes** — anual ARS 290.000 |
| Consultorio | ARS 34.000 plano hasta 10 prof. | **ARS 49.000/mes hasta 3 profesionales + ARS 12.000 por profesional adicional** — anual ×10 |
| MXN / USD | 349/649 y 19/39 | **No se publican. Se sacan de la página de precios.** |

**Por qué 29.000 y no 18.000.** No es por el cliente, es por vos. Para él, 29.000 es 0,7 de una sesión — sigue siendo la línea más barata de su estructura de costos (alquiler del consultorio, contadora 40-80k/mes, supervisión 40-60k por sesión, matrícula). El problema de 18.000 es que son **USD 11**: con alta manual, cobro manual y un mensaje de soporte al mes, el margen es cero o negativo. A ese precio no vendés barato, subsidiás. Y hay un piso psicológico: a 18.000 un psicólogo no cree que ahí adentro viva una historia clínica. Contra $0 y la inercia —que es tu competidor real— nunca ganás por precio; bajarlo no te compra el deal y te quema el techo.

**Por qué por asiento en Consultorio.** Hoy una oficina de 8 paga lo mismo que una de 3 (`lib/planes.ts:76`, `profesionales: 10` plano). Es el cambio de pricing con mejor relación esfuerzo/plata que tenés: una oficina de 5 pasa de 34.000 a 73.000, una de 8 a 109.000. Y es lo que hace posible el camino de ARPU de la sección 3.3.

**Por qué 30 días de prueba y no 14.** `DIAS_DE_PRUEBA = 14` es una constante en `lib/planes.ts:56`. La segunda mejor pantalla del producto es el cierre de mes de Finanzas; con 14 días **el cliente nunca ve un mes cerrado** y evalúa el producto sin su mejor argumento. Y el tope de 15 pacientes tiene que subir a 40 junto con eso, o la prueba con "pacientes reales" que promete `lib/planes.ts:60` es mentira para el segmento que elegiste (ver B3).

**Por qué sacar USD.** USD 19 es demasiado bajo para ser creíble contra SimplePractice (69-99) y Jane (79): le grita a un terapeuta estadounidense "esto es un proyecto de fin de semana". Y es invendible igual, sin inglés, sin HIPAA/BAA, sin superbills, sin zona horaria. Vender a USD 19 hoy te cuesta la capacidad de cobrar USD 89 mañana. MXN 349 está bien de precio, pero sin CFDI el software no es gasto deducible y el bug de zona horaria le corre el día. No los publiques.

**Tres cosas de pricing que el código no soporta y las vas a necesitar en el mes 2:**
- **Indexación.** El precio es un literal en `lib/planes.ts:71`. Sin indexar, tu MRR en dólares cae 3-5% por mes con churn cero: un cliente firmado a 29.000 vale USD 18 hoy y USD 12,6 en 12 meses.
- **No hay precio por cliente.** Cambiar el precio es un deploy y **le cambia el precio a todos a la vez**. No podés grandfatherear. Hace falta un `precioMensual?: number` en `Suscripcion` (`lib/planes.ts:84-95`) que, si está, pise lo que muestra `app/admin/plan/page.tsx`. Son ~15 líneas y sin eso no podés cobrar por asiento sin mentirle al panel.
- **Vendé anual, no mensual.** Resuelve tres cosas de un saque: la erosión del peso (congelás y cobrás adelantado), la cobranza manual (1 cobro al año en vez de 12) y la retención. Con 100 clientes anuales son USD 18-30k de caja en el año.

### 3.3 Las cuentas hacia USD 20.000/mes — no cierran, y prefiero decírtelo

Con el pricing decidido: Esencial ARS 29.000 ≈ USD 18; Consultorio promedio (base + 1 asiento extra ≈ 61.000) ≈ USD 38. Con un mix 70/30, **ARPU ≈ USD 24**.

**USD 20.000 / 24 = 830 clientes pagando.**

Tres formas de ver por qué eso no pasa pronto:

- **Mercado.** Argentina tiene ~90-110 mil psicólogos matriculados, quizá 60 mil en práctica privada activa. 830 clientes es **1,4% de todo el mercado privado del país**. Eso no es una meta de meses: es ser el líder consolidado de la categoría.
- **Entrega.** A 1,5-2 h de onboarding manual, 830 clientes son ~1.400 horas solo de altas. Y cada alta es una env var más un redeploy sobre clientes en producción — que es, literalmente, el evento que dispara el bug A3.
- **Churn.** En estado estacionario, `N = altas_mensuales / churn`. Para sostener 830 con 6% mensual (realista para profesional solo) necesitás **50 altas netas todos los meses, para siempre**. Con 4%, 33. Hoy sumás por conversación, y tu techo de conversaciones por semana es tu techo de clientes.

**Plan honesto a 12 meses (Argentina, churn 6%, mix 70/30):**

| Mes | Clientes | MRR aprox. |
|---|---|---|
| 1 | 5 | USD 110 |
| 3 | 18 | USD 430 |
| 6 | 45 | USD 1.080 |
| 12 | ~105 netos (≈160 altas brutas) | **USD 2.500** |

**USD 20k/mes no es una meta 2026 para este SaaS. Es 2027, y solo con otra forma del producto.** La meta 2026 correcta es **USD 2.500-3.000 de MRR con 100-120 clientes argentinos** — suficiente para probar retención y justificar construir la pasarela.

### 3.4 El camino que sí cierra, y no está en ninguno de los dos informes

Los USD 20.000/mes de Codexy hoy salen de proyectos de automatización para PyMEs. **El SaaS no reemplaza ese ingreso: lo alimenta**, y esa es la única aritmética que llega al número en un plazo defendible.

Cada consultorio suscripto es un lead calificado, ya adentro de tu sistema, que te ve todas las semanas. Con 100 consultorios y una conversión conservadora del 2% mensual a proyecto: **2 proyectos/mes × USD 2.500 = USD 5.000/mes de ingreso atribuible al SaaS**, encima de los USD 2.500 de MRR. Eso son USD 7.500/mes a 12 meses, contra los USD 2.500 del camino "SaaS puro" — y con la misma cantidad de clientes.

Esto refuerza la decisión de la sección 3.1: **un psicólogo solo nunca te compra un proyecto de USD 2.500. Un consultorio de 8, o una red de consultorios, sí.** El attach solo existe en el beachhead B.

Los tres caminos, con plazo:

| Camino | Cómo | Plazo | Qué hace falta |
|---|---|---|---|
| Volumen SaaS | 830 clientes AR | 24-36 meses | Alta autoservicio, pasarela, motor de marketing. Nada existe. |
| ARPU | 200 clientes × USD 100 | 18-24 meses | Consultorios de 10-25 profesionales por asiento, o USA con HIPAA. |
| **SaaS + attach de servicios** | 100-150 consultorios + 2-4 proyectos/mes | **12-18 meses** | Nada nuevo de producto. Es tu negocio actual con un canal de leads propio. |

Elegí el tercero. Es el único donde la palanca ya la tenés.

### 3.5 Qué construís antes de vender (y qué no)

**Construí, en este orden:** los nueve arreglos de la sección 1 (2 días). `DIAS_DE_PRUEBA` 14 → 30 y el tope de prueba 15 → 40 (dos constantes). `precioMensual` override en `Suscripcion` (15 líneas). **Turno fijo semanal (recurrencia)** — no existe, `grep -rni "recurren|repetir|turno fijo"` devuelve un comentario de `lib/scheduling/types.ts:6` sobre reglas de disponibilidad, nada de turnos. Es la feature más cara de la lista y sin ella perdés al cliente en el mes 2. Sacar el alta de tenant de la env var (te tapa a los 40 clientes y cada alta es un redeploy sobre gente en producción).

**No construyas:** la pasarela de pago (el cobro manual aguanta hasta ~40 clientes), la localización de México/EE.UU., y sobre todo **no sigas puliendo el asistente IA**. Es un loop de tools sobre OpenAI: dos semanas para un competidor. Es tu feature menos diferenciada, la que más escepticismo despierta en una demo de salud, y tiene el único costo variable real que tenés.

### 3.6 La primera conversación (15 minutos, es un diagnóstico, no una demo)

**Apertura, nunca con el producto:**
> "Hola X, soy Carlos, de Codexy. Hacemos software para consultorios y estamos armando la versión de psicología con diez profesionales, no más. Antes de mostrarte nada quiero entender cómo laburás: ¿cómo te pide un turno alguien que te encuentra por Instagram?"

**Cuatro preguntas, en este orden, y después te callás:**
1. ¿Cómo llega un paciente nuevo y cómo termina agendado?
2. **La última vez que se te superpusieron dos, o que alguien no vino: ¿qué pasó?** (sin incidente concreto no hay venta)
3. ¿Cómo sabés hoy cuánto facturaste el mes pasado y quién te quedó debiendo?
4. **¿Compartís consultorio? ¿Hay alguien más que maneje la agenda?** (esta bifurca el plan y detecta al beachhead B — hacela siempre, aunque el prospecto sea uno solo)

**Devolución en una frase, con SUS palabras:**
> "Entonces hoy perdés como una hora por día coordinando, y no tenés un número confiable de cuánto entró. Te muestro dos pantallas, cinco minutos."

**La demo son DOS pantallas y ninguna más:** (1) **su** página de reservas ya cargada con su nombre, su matrícula, su ciudad, sus colores — y reservás un turno en vivo desde tu celular delante suyo y lo mostrás aparecer en el panel; 40 segundos, ese es el wow. (2) **Finanzas**, con el número del mes, quién debe y el CSV para la contadora.

**No muestres:** el asistente IA (invita escepticismo y preguntas de privacidad), la pantalla de Equipo salvo que haya dicho que sí a la pregunta 4, el bot de Telegram.

**Cierre:**
> "Te lo dejo andando hoy con tus datos. Probalo 30 días con pacientes de verdad. Si no lo estás usando, no me pagás y borramos todo. Si te sirve, son ARS 29.000 por mes."

No lideres con la prueba: liderá con "te lo dejo andando hoy". La prueba es el paracaídas si duda.

### 3.7 Las cinco objeciones

**1. "¿Por qué le voy a dar historias clínicas a una agencia que no conozco?"** — la que decide todo.
> "La historia clínica está detrás de un permiso que a un rol administrativo el sistema no se lo puede dar, ni por error ni con un toggle: está bloqueado en el código. Cada ingreso queda registrado y el registro lo ves vos, en tu panel. El soporte de Codexy entra solo si vos lo dejás prendido, lo apagás cuando quieras, y aun entrando no puede leer notas ni tocar accesos."

Y le mostrás la pantalla de Actividad reciente en Equipo. Nadie en este rango de precio puede decir esto. **Pero no lo digas hasta tener A1 y A4 arreglados**, porque hoy las dos frases del medio son falsas.

**2. "Ya uso Google Calendar y WhatsApp, y me funciona."** No discutas. Acordá y angostá:
> "Es verdad, y para la agenda funciona. Calendar no puede hacer tres cosas: que un desconocido vea tus horarios sin ver tu vida, que dos personas no puedan tomar el mismo horario, y que a fin de mes te diga cuánto entró y quién te debe. ¿Cuál de las tres te pasó este mes?"

Si no le pasó ninguna, todavía no es cliente. No lo convenzas: seguí.

**3. "Está caro."** Nunca descuentes el mensual. Reencuadrá en su unidad: *"Es dos tercios de una sesión. Si te evita UN turno perdido por mes, ya se pagó."* Si insiste, ofrecé anual con 2 meses bonificados: es un descuento que no te cuesta margen y te compra retención y caja.

**4. "¿Y si en un año desaparecen? Me quedo sin las historias clínicas."** La más justa y la que mata deals de SaaS chico. Respondé mostrando el botón:
> "Bajátelo ahora mismo si querés. Todo: pacientes, notas, turnos, pagos. Y si dejás de pagar, seguís pudiendo entrar y bajarlo — está escrito así en el sistema, no es una promesa. Somos una empresa chica; por eso el sistema está hecho para que te puedas ir."

Es cierto y verificable: `app/admin/exportar/route.ts` no pasa por el gate de suscripción, y `lib/planes.ts:145-147` deja escribir hasta `vencida` y leer y exportar siempre.

**5. "¿Puedo mandar recordatorios automáticos por WhatsApp?"** Va a aparecer. **Hoy la respuesta es no. No mientas.**
> "Hoy no. Hoy te arma el mensaje y lo mandás de un toque desde la agenda, uno por uno. El automático necesita la API de WhatsApp Business, y cuando salga el precio no te cambia."

Después contá: si es deal-breaker en 3 de tus primeras 10 conversaciones, eso es lo próximo que construís, no la pasarela.

---

## 4. La landing

### 4.1 Dos decisiones antes del copy

**Dónde vive: fuera de este repo, en `codexyoficial.com`, como deploy separado.** `proxy.ts:26-31` devuelve 404 a cualquier host que no esté en `TENANTS` cuando hay multi-tenant. Meter la landing acá te obliga a mapear el dominio de Codexy como si fuera un consultorio, o a excepcionar el proxy — que es exactamente el archivo que garantiza el aislamiento entre historias clínicas. No lo toques por una landing. La paleta ya está lista en `lib/codexy.ts` (`PALETA_CODEXY`: tinta `#161B2E`, índigo `#4B5FCF`, ámbar `#E0A24B`, papel `#F7F8FB`) y es deliberadamente distinta de las paletas de los consultorios; copiala tal cual.

**Qué trabajo hace: no es el canal de adquisición de los primeros 10.** Esos vienen de tu agenda (sección 5). La landing es el **artefacto de credibilidad que mandás después del DM**: la abre alguien que ya fue referido y está decidiendo si sos serio. Eso cambia las prioridades del copy — no necesita capturar tráfico frío, necesita sobrevivir a la lectura escéptica de un matriculado que te va a googlear.

### 4.2 Estructura final

| # | Sección | Trabajo |
|---|---|---|
| 1 | Hero | Qué es, para quién, CTA único |
| 2 | El circuito completo (video 90s) | Mostrar el producto antes de pedir nada. Sin clientes, ver el producto reemplaza al testimonio |
| 3 | Las cuatro pantallas | Concretar: agenda, pacientes, finanzas, disponibilidad |
| 4 | La historia clínica | El diferencial duro. Va antes del precio: sin esto no hay compra a ningún precio |
| 5 | Quién ve qué (equipo) | La consecuencia operativa de la 4. Es la sección que le vende al consultorio compartido |
| 6 | El asistente | Después de seguridad, porque "IA" en salud enciende alarmas |
| 7 | Tus datos son tuyos | Mata el miedo a la dependencia |
| 8 | Precio | Después del valor y de la reversibilidad |
| 9 | Lo que todavía no hace | La sección más importante de una landing sin clientes |
| 10 | Quién está atrás | Responsabilidad personal en lugar de logos |
| 11 | Preguntas | Barrer lo que quedó |
| 12 | Cierre + CTA | El mismo botón |

**El CTA es uno solo, repetido tres veces (hero, después del precio, cierre), con el mismo texto: "Pedí tu consultorio".** Lleva a WhatsApp con mensaje previo (`soporteUrl()` de `lib/codexy.ts:17`). No puede ser "Creá tu cuenta" ni "Empezá gratis": no existe registro autoservicio, y un botón que promete autoservicio y desemboca en un formulario quema la confianza en el peor momento, el clic. No puede ser "Agendá una demo": le agregás un paso de calendario a alguien que ya vive peleado con su agenda, y la sección 2 ya es la demo. **Sin CTA secundario.**

### 4.3 El copy, listo para pegar

---

**1 · Hero**

> Kicker: Software para consultorios de psicología
>
> # Tu consultorio entero en una pantalla.
>
> Tu página de turnos, tu agenda, las fichas de tus pacientes y la plata del mes. Con tu secretaria adentro, y sin que vea lo que no tiene que ver.
>
> [ **Pedí tu consultorio** ]
>
> Lo dejamos andando el mismo día. 30 días de prueba con pacientes reales, sin tarjeta.

---

**2 · El circuito completo**

> ## Mirá cómo entra un turno y termina cobrado.
>
> Sin cortes y sin edición. Una paciente reserva desde tu página, la solicitud te llega a la agenda, la confirmás, marcás la sesión como realizada y aparece en Finanzas para cobrar. Noventa segundos.
>
> *[video]*
>
> Esto es exactamente lo que hace tu consultorio el primer día, con los horarios que ya vienen cargados.

---

**3 · Las cuatro pantallas**

> ## Cuatro pantallas. Nada más.
>
> **Agenda.** Arriba, los cuatro números del día: solicitudes nuevas, turnos confirmados, turnos de hoy, pacientes. Abajo, la bandeja: quién reservó, qué eligió, a qué hora, cómo lo contactás. Confirmás con un toque. Vista lista o calendario; tocás un hueco libre y agendás ahí mismo.
>
> Una solicitud sin responder te reserva ese horario 48 horas. Después el horario vuelve solo a la web, sin que tengas que acordarte.
>
> **Pacientes.** Se crean solos cuando alguien reserva. Cada uno tiene su contacto, sus turnos, lo que debe y su historia clínica en línea de tiempo, con fecha y título.
>
> **Finanzas.** Cobrado, gastos, neto, por cobrar, facturado y ticket promedio, por mes o histórico. La cobranza pendiente viene agrupada por paciente: ves cuánto te debe cada uno, le escribís por WhatsApp desde ahí y marcás la sesión como pagada con el método que usó. Un archivo para la contadora, cuando lo necesites.
>
> Deuda es una sola cosa en todo el sistema: una sesión que no está paga y que ya ocurrió. Los turnos de la semana que viene nunca figuran como deuda.
>
> **Disponibilidad.** Tus franjas por día —mañana y tarde son dos franjas, y el mediodía te queda libre—, un botón para copiar el lunes al resto de la semana, y los días que no atendés se aplican al instante. Tu página publica solamente los huecos que te quedan libres.

---

**4 · La historia clínica**

> ## La historia clínica no se puede abrir por error.
>
> No es una configuración que alguien puede destildar un martes a la tarde. Está escrita como una regla del sistema: solamente el dueño del consultorio y quien tenga rol de Profesional la ven. Si le das el rol de Asistente a tu secretaria y encima le tildás "historia clínica", igual no la ve. El código la niega antes de mirar los permisos.
>
> Lo mismo con el motivo de consulta que escribe el paciente al reservar: es dato de salud, y se muestra con la misma llave.
>
> Y no sale del sistema. No viaja a Telegram cuando te avisamos que entró un turno. No se le manda a la inteligencia artificial. No hay un solo rastreador ni un script de terceros en tu página: ni Google Analytics, ni píxel de Facebook, ni una tipografía cargada desde afuera. Nada.
>
> Tampoco la ve el soporte de Codexy. Eso está en la sección de abajo, porque merece su propio párrafo.

---

**5 · Quién ve qué**

> ## Tu secretaria entra, y no ve la evolución de nadie.
>
> Cada persona de tu equipo tiene su propia cuenta con su propio email y su propia contraseña. No hay una clave del consultorio que circule por WhatsApp.
>
> | | Ve |
> |---|---|
> | **Dueño/a** | Todo. Es el único que puede nombrar a otro dueño. |
> | **Administrador/a** | Todo lo administrativo. La historia clínica no. |
> | **Profesional** | Agenda, pacientes, historia clínica, sus horarios y el asistente. |
> | **Asistente** | Agenda y los datos de contacto. Ni finanzas, ni evolución clínica. |
>
> Adentro de cada rol podés afinar permiso por permiso. Si le sacás el acceso a alguien, se le cierran las sesiones abiertas.
>
> Abajo de todo, en Equipo, tenés Actividad reciente: quién entró, cuándo, los intentos fallidos y cada cambio de acceso. Sin pedírselo a nadie.

---

**6 · El asistente**

> ## Un asistente que pide permiso antes de tocar algo.
>
> Le escribís o le hablás: "¿qué turnos tengo hoy?", "¿quién me debe?", "agendame a Marina el jueves a las 4", "registrá que Julián pagó en efectivo".
>
> Cuando la respuesta es información, te la da. Cuando implica modificar algo, no lo hace: te muestra una tarjeta con el detalle exacto de lo que va a pasar y dos botones, Confirmar y Cancelar. Nada se ejecuta sin que lo toques vos.
>
> Y solo puede hacer lo que vos podés hacer. Si tu perfil no llega a Finanzas, tampoco llega preguntándoselo al asistente.
>
> No lee las notas clínicas ni el motivo de consulta. Ese es el límite y no tiene excepción.

*(Nota para vos, no para la página: la función de voz transcribe con un proveedor externo y no hay advertencia previa en la UI. Mientras eso no exista, mencioná el dictado en una línea y sin destacarlo, o no lo menciones.)*

---

**7 · Tus datos son tuyos**

> ## No te tomamos nada de rehén.
>
> Un botón, un archivo. Te bajás el consultorio entero —pacientes, historias clínicas, turnos, finanzas y la configuración de tu sitio— cuando se te dé la gana. No hace falta pedirlo, ni esperar, ni que nadie te corra una consulta.
>
> Y si un mes no nos pagás, seguís entrando. Podés quedar en modo solo lectura: no cargás datos nuevos, pero consultás todo y te exportás todo igual. Retener las historias clínicas de pacientes en tratamiento para cobrar una factura no lo vamos a hacer nunca. Está escrito en el código antes de estar escrito acá.
>
> Cada exportación queda registrada en la actividad de tu consultorio, así sabés siempre quién se llevó qué.

---

**8 · Precio**

> ## Precio
>
> **Prueba — 30 días, sin cargo.**
> Con pacientes reales, no con datos de mentira. Hasta 40 pacientes y 2 personas con acceso.
>
> **Esencial — $29.000 por mes.**
> Para quien atiende solo. Hasta 80 pacientes, 2 personas con acceso y 300 mensajes al asistente por mes.
>
> **Consultorio — $49.000 por mes, hasta 3 profesionales.**
> Cada profesional adicional, $12.000. Para un equipo que comparte agenda y secretaría: pacientes sin límite, hasta 10 personas con acceso, 1.500 mensajes al asistente.
>
> Pagando el año por adelantado, dos meses bonificados.
>
> Se paga por mes o por año. Cambiás de plan o te das de baja cuando quieras.
>
> **Todavía no tenemos cobro automático.** Nos escribís, te pasamos el link o los datos para transferir, y te dejamos la cuenta al día en el momento. Es más trabajo para nosotros y menos vueltas para vos. Si el plan te queda chico, avisanos y lo ampliamos sin cambiarte de plan.

---

**9 · Lo que todavía no hace**

> ## Lo que todavía no hace
>
> *Actualizado el 30/07/2026.*
>
> Somos nuevos. Preferimos que lo sepas por nosotros y no el segundo día.
>
> - **No hay registro automático.** El alta la hacemos nosotros, a mano, uno por uno. Hoy es una ventaja: nos sentamos con vos hasta que tu página está andando.
> - **No cobramos con tarjeta todavía.** Link de pago o transferencia.
> - **No mandamos recordatorios solos.** El panel te arma el WhatsApp con el mensaje escrito y lo mandás vos. Fue una decisión, no un pendiente: en salud, un mensaje automático mal mandado se paga caro.
> - **Todavía no hay turno fijo semanal.** Si atendés a alguien todos los martes a las 15, hoy se carga sesión por sesión. Lo estamos haciendo y es lo próximo que sale.
> - **Todavía no hacés videollamadas acá adentro.** Seguís usando Meet o Zoom.
> - **No emitimos facturas.** Te llevás el archivo para tu contadora.
> - **No nos conectamos con Google Calendar.** Todavía.
> - **Está pensado para Argentina.** Horarios y montos en pesos y hora argentina. Si atendés desde otro país, hablemos antes de que pagues nada.
>
> Si algo de esta lista es imprescindible para vos, decínoslo y te decimos si está en camino o si no somos lo tuyo.

*(Cuando resuelvas un ítem, tachalo y dejalo tachado unos meses. Un ítem tachado vale más que un testimonio. Y ponele la fecha visible: esta sección es la primera que te va a delatar cuando esté vieja.)*

---

**10 · Quién está atrás**

> ## No tenemos logos para poner acá.
>
> No vas a encontrar en esta página cuatro clínicas famosas ni testimonios de gente con iniciales. No los tenemos, y los inventados serían más fáciles de escribir que este párrafo.
>
> Lo que sí tenemos: este sistema se construyó laburando adentro de un consultorio real, resolviendo el problema de una psicóloga que atiende todos los días. No salió de una reunión de producto.
>
> Cuando escribís a soporte te contesta una persona del equipo que escribió el código, no un formulario. Y si necesitamos entrar a tu consultorio para ayudarte, vas a ver un cartel arriba de la pantalla todo el tiempo que estemos adentro, no vamos a poder abrir ninguna historia clínica ni tocar los accesos de tu equipo, la sesión se nos cae sola en una hora, y te queda anotado en tu propia actividad. Si preferís que ni así podamos entrar, lo apagás vos.

---

**11 · Preguntas**

> **¿Quién es el responsable legal de los datos de mis pacientes?**
> Vos. Codexy provee el sistema donde se guardan. Así se lo decimos al paciente, con esas palabras, en el momento de reservar.
>
> **¿Mis pacientes firman algo?**
> Al reservar tienen que tildar una casilla que dice quién recibe los datos, para qué, quién los ve y qué derechos tienen. Guardamos qué texto aceptaron, en qué versión, qué día y desde dónde. Si mañana alguien reclama, hay algo para mostrar.
>
> **¿Otro psicólogo puede llegar a ver mis pacientes?**
> Cada consultorio vive en su propia dirección y sus propios datos. Si una dirección no está reconocida, el sistema no muestra nada: devuelve un error, nunca los datos de otro. Tu sesión está firmada contra tu consultorio: si la usás en otro, no vale.
>
> **¿Y si desaparecen?**
> Te bajás todo cuando quieras, sin pedirnos permiso, y en un formato que se abre con cualquier cosa. Es la garantía que podemos darte hoy y no depende de que confíes en nosotros.
>
> **¿Se puede borrar un turno?**
> No. Las solicitudes se rechazan y los turnos que no ocurrieron se marcan como "no asistió". Es a propósito: un historial clínico con agujeros no sirve.
>
> **¿Se manda algo solo?**
> Nada. Ni recordatorios, ni avisos de pago. El panel te lo prepara y vos decidís.
>
> **¿Puedo usar mi propio dominio?**
> Sí, y también te damos una dirección de la plataforma para arrancar el mismo día.
>
> **¿Cuánto tardo en tenerlo funcionando?**
> Servicios, tu perfil y tus horarios: unos quince minutos. Después hacés una reserva de prueba a vos misma y ves el circuito entero. La guía está adentro del panel.

---

**12 · Cierre**

> ## Empecemos por tu página.
>
> Escribinos, nos contás cómo trabajás y te dejamos el consultorio armado con tus servicios, tus horarios y tu nombre. Después probalo 30 días con pacientes de verdad. Si no te sirve, te llevás todo lo que cargaste.
>
> [ **Pedí tu consultorio** ]

---

### 4.4 Las capturas, en este orden

1. **Agenda, vista lista, un martes cualquiera, con 2 solicitudes y 5 turnos.** No el estado vacío ni uno con 40: 5 es creíble.
2. **Split: el editor de Disponibilidad a la izquierda, la pantalla de reserva del paciente a la derecha, con las mismas franjas.** "El sitio publica solo tus huecos libres" es abstracto hasta que lo ves dos veces en la misma imagen.
3. **La misma ficha de paciente, dos veces, lado a lado: vista por la dueña y vista por la cuenta Asistente.** En la primera, la historia clínica; en la segunda, el bloque que dice que no tiene acceso. **Es la captura más importante de la página** y la única forma de probar la objeción #1 sin pedir fe. Sacala con dos cuentas reales, no en Photoshop.
4. **El checkbox de consentimiento con el detalle desplegado.** Es lo primero que busca un matriculado prolijo y casi ningún competidor lo tiene.
5. **La tarjeta de confirmación del asistente**, congelada antes de tocar Confirmar.
6. **Finanzas → Cobranza pendiente**, tres pacientes agrupados y el total arriba. Es la plata que hoy se le está perdiendo, y es la captura que justifica los $29.000.
7. **El cartel de sesión de soporte**, chiquito, al lado del párrafo de la sección 10.

**Advertencia operativa, no negociable:** la carpeta `capturas/` tiene 201 PNG hechos contra la base con datos reales de la psicóloga del proyecto original. Están gitignoreadas (`.gitignore`, línea `/capturas/`) y no están trackeadas (`git ls-files capturas` = 0), pero están en tu disco y en OneDrive. **Ninguna puede ir a la landing.** Levantá un consultorio de demo con nombres claramente ficticios y capturá de cero.

### 4.5 Qué NO poner, corto

Testimonios (ni "ilustrativos"), logos, contadores ("+200 psicólogos"), sellos de compliance ("cumple la Ley 25.326" / HIPAA — no hay ToS, ni DPA, ni aviso de privacidad; decir eso en salud es exposición legal tuya y del cliente), "datos cifrados" (las notas están en texto plano en el blob, es un riesgo abierto reconocido en `docs/SEGURIDAD.md`), jerga técnica (Postgres, Supabase, Next.js, "multi-tenant", y en particular RLS, que hoy es decorativa porque se usa `service_role` — contá el efecto, no la pieza), "la IA escribe tus notas por vos" (es lo que más se vendería y es exactamente lo que el producto se prohíbe en `lib/assistant/tools.ts:4`), recordatorios automáticos, Google Calendar, videollamada, app móvil, facturación electrónica, portal del paciente, Google Analytics / Meta Pixel / Hotjar / chat widget / banner de cookies (autogol literal: la página presume "cero rastreadores"), fotos de stock de terapeutas sonriendo, precios "desde $X" o "consultar", comparativas por nombre contra competidores, formularios largos, SLA o "99,9%", y un blog o newsletter en el lanzamiento.

---

## 5. Los primeros 10 clientes — el plan de esta semana

Hoy es **jueves 30 de julio de 2026**. Este plan va de hoy al viernes 7 de agosto. La regla que lo organiza: **no mandás un solo DM hasta que el Bloque A esté arreglado**, porque el primer contacto es irrepetible y hoy le estarías vendiendo un candado abierto.

**Jueves 30 (hoy).** Bloque A completo: A1 (proyección en `app/admin/pacientes/page.tsx`), A2 (`lib/auth.ts` + setear `ADMIN_PASSWORDS` en Vercel), A3 (una línea en `lib/accounts-store.ts:100` + `assertBackendConfigOk` en `leerAuth`/`mutarAuth`), A4 (helper en `lib/soporte.ts` + los dos handlers), A5 (`app/admin/equipo/actions.ts`). Correr `npm test` (en C:\dev, donde el `node_modules` está completo). Deploy. **No empieces el bloque B hoy.**

**Viernes 31.** Bloque B: B1 (DeleteConfirm + logAudit), B2 (`/admin/cuenta` + link de recuperación), B3 (error boundary neutro + "Volver al panel" + `DIAS_DE_PRUEBA = 30` + tope de prueba a 40 + try/catch en `crearPaciente`), B4 (asignar servicios nuevos a todos los profesionales activos + mover el cálculo de `falta` arriba del return en `PrimerosPasos`). Deploy. A la tarde: armás el **consultorio de demo** con datos inventados —nombres obviamente ficticios, 12 pacientes, 5 turnos, 3 pagos, 2 deudas— y hacés las 7 capturas.

**Sábado 1.** Grabás el video de 90 segundos del circuito completo, en una toma continua, sin voz en off, con subtítulos: reservar desde el sitio público → la solicitud aparece en Agenda → Confirmar → Marcar realizado → aparece en Finanzas → cobrar eligiendo método. Que se vea el mouse dudando; el corte de edición es exactamente lo que un escéptico sospecha. Después armás la **lista de 40 nombres** en una planilla, en tres columnas: (a) psicólogos que conocés o que te pueden presentar tus clientes PyME actuales, (b) consultorios compartidos de tu ciudad y de las ciudades donde ya tenés clientes, (c) psicólogos de Instagram cuyo "link en bio" es un WhatsApp o un Linktree.

**Domingo 2.** Escribís la landing (copy de la sección 4) y la deployás en `codexyoficial.com`, aparte de este repo. Sin ads, sin SEO, sin blog. Y preparás **cinco consultorios de demo pre-armados**, uno por cada uno de los cinco primeros nombres de la lista: su nombre, su ciudad, su matrícula si la encontrás, su paleta. Cada uno son 10 minutos y es la mejor apertura en frío que tenés, porque le mandás un link que funciona con SU nombre adentro.

**Lunes 3.** El día de los pedidos, no de las ventas. Le escribís a **cada cliente PyME actual** (uno por uno, no un broadcast): *"Estamos sacando un sistema para consultorios de psicología. ¿Conocés alguna psicóloga o algún consultorio a quien le pueda servir? Con que me la presentes ya me hacés un favor."* Una intro tibia convierte 5-10 veces más que un DM frío. A la psicóloga del build original le pedís **cinco nombres**, no uno: los psicólogos viven en grupos de supervisión y de WhatsApp de 20 a 40 personas, y un grupo es toda tu primera cohorte. Y le escribís a **dos supervisores**: les regalás el producto gratis para siempre a cambio de que lo muestren en su grupo. El supervisor es el nodo de influencia del gremio y cuesta cero.

**Martes 4.** Primeros **20 DMs**, con el video de SU consultorio ya armado. Regla: el DM no vende, pide 15 minutos. *"Te armé tu página de turnos para mostrarte una cosa, mirá [link]. ¿Tenés 15 minutos esta semana?"* Y las primeras **2 o 3 llamadas** que salgan de los referidos del lunes, con el guion de la sección 3.6: cuatro preguntas, dos pantallas, cierre.

**Miércoles 5.** **20 DMs más** + las llamadas agendadas. Al final del día, la primera revisión de números: cuántos abrieron, cuántos respondieron, cuántas llamadas. Si de 40 DMs respondieron menos de 4, el problema es el DM, no el producto: reescribí la apertura antes de mandar más.

**Jueves 6.** Solo llamadas y altas. **Cada alta la hacés vos, en vivo, compartiendo pantalla con el cliente** (20-30 minutos): servicios, perfil, horarios, y terminás haciendo juntos la reserva de prueba. Esa media hora es tu onboarding y tu mejor arma anti-churn. Y ojo: cada alta es una edición de `TENANTS` + redeploy, o sea que estás desplegando sobre clientes en producción — hacelo fuera de horario de atención.

**Viernes 7.** Cierre de la semana y una decisión con datos. Registrá para cada conversación: qué respondió a la pregunta 2 (el incidente), si dijo que sí a la pregunta 4 (consultorio compartido), y cuál de las cinco objeciones apareció. **Si "recordatorios automáticos" o "turno fijo semanal" apareció en 3 de las primeras 10, eso es lo próximo que construís, no la pasarela.** Ese conteo vale más que cualquier roadmap que escribas hoy.

**Meta realista de la semana: 40 DMs, 8 a 12 conversaciones, 3 a 5 pruebas activas, 1 o 2 pagando.** Si sacás 5 clientes en la primera semana, el cuello inmediato pasa a ser el onboarding manual, no la demanda.

**Lo que NO hacés esta semana:** ni un peso en ads, ni SEO, ni contenido, ni newsletter, ni pasarela de pago, ni tocar el asistente IA.

**Y de los primeros 100:** cambia el canal, porque el DM no escala más allá de ~30 por semana. El motor principal pasan a ser los **colegios provinciales** (Río Negro, Neuquén, Santa Fe, Córdoba, Mendoza — no CABA, grande y lento): una charla de 30 minutos titulada *"Historia clínica y Ley 25.326: qué te pueden pedir y qué tenés que poder mostrar"* es un canal de venta disfrazado de formación continua, y el contenido de la charla son literalmente tus features. Segundo canal: **referido dentro del producto**, no un cupón sino un pedido en el momento exacto — cuando cierra su primer mes y Finanzas muestra un número real, ahí pedís dos nombres y das un mes gratis por cada uno. No existe en el código; construilo. La diferencia en una línea: los primeros 10 vienen de gente que confía en vos; los siguientes 90 vienen de gente que confía en una institución.

---

## 6. Lo que me preocupa y no estás viendo

**1. No existe el turno fijo semanal, y ese es el 80% de una agenda de psicoterapia.** Verifiqué: `grep -rni "recurren|repetir|turno fijo|serie"` sobre `lib app components` devuelve dos hits y ninguno es de turnos (uno es el comentario de reglas semanales de disponibilidad en `lib/scheduling/types.ts:6`, el otro es el KPI de MRR del panel interno). Una psicóloga que atiende a alguien todos los martes a las 15 tiene que cargar cada sesión a mano, para siempre. **Ese es tu churn del mes 2**, y no lo vas a ver en la demo ni en la primera semana: lo vas a ver cuando el cliente 4 deje de renovar y no sepas por qué. Es la feature más cara de tu lista y la única que compraría antes que la pasarela.

**2. No tenés un solo documento legal, y estás por guardar historias clínicas de terceros a cambio de plata.** `git ls-files | grep -iE 'legal|privac|terms|dpa|consent'` = 0. El circuito de consentimiento del paciente está muy bien hecho —versión, fecha, IP, validado en servidor— pero eso es el contrato del paciente con el psicólogo, **no el tuyo con el psicólogo**. El día que un cliente tenga un incidente, la pregunta va a ser qué firmaste vos. Sin términos de servicio, sin acuerdo de tratamiento de datos y sin aviso de privacidad, el primer cobro te convierte en encargado de tratamiento de datos de salud sin contrato. Esto no es un ítem de backlog: es la única cosa de toda esta auditoría que puede terminar la empresa en vez de costarte un cliente. Un abogado, tres documentos, una semana. Hacelo mientras vendés.

**3. El backup existe pero nadie sabe si funciona.** `scripts/backup.mjs` está ahí, pero según tu propia memoria esta máquina no llega a Supabase (TLS roto), y no encontré ningún registro de una restauración probada. Un backup que nunca se restauró no es un backup, es un archivo. **Y el bug A3 es exactamente el escenario donde lo vas a necesitar**: pérdida silenciosa, sin error, sin log, descubierta días después. Corré un backup y una restauración completa a un proyecto Supabase de prueba, una vez, antes del primer cliente pago. Es media tarde.

**4. Cada alta de cliente es un deploy sobre clientes en producción, y ese deploy es el gatillo del bug A3.** No son dos problemas: son el mismo. Mientras `TENANTS` viva en una env var, dar de alta al cliente 5 implica redeployar el panel de los clientes 1 a 4, con el skew de versiones que dispara el borrado silencioso de `normalizar()`. Arreglar A3 baja el riesgo, pero el patrón sigue mal. Sacar el alta de tenant a una tabla es la deuda técnica con mayor palanca comercial que tenés, y te tapa a los 40 clientes, no a los 400.

**5. La meta de USD 20.000/mes te está haciendo optimizar la cosa equivocada.** Te lo digo derecho: 830 clientes argentinos no es un objetivo, es ser el líder de la categoría. Perseguir ese número te empuja a construir pasarela, autoservicio y marketing —tres proyectos grandes— cuando la palanca real que ya tenés es que cada consultorio suscripto es un lead calificado para un proyecto de automatización de USD 2.500. El SaaS no es el negocio: es el canal de leads propio más barato que vas a construir en tu vida. Medí el attach desde el cliente 1 (cuántos consultorios derivan en una conversación de proyecto), porque esa métrica —y no el MRR— es la que te dice si esto está funcionando.

**6. Estás a punto de vender el argumento que hoy el código no cumple.** El diferencial que te separa de todo lo que hay en este rango de precio es "la historia clínica es un candado del sistema". Y hoy: la ficha de todos los pacientes baja al navegador de cualquiera con permiso `pacientes` (A1), el CSV con nombres y montos se lo lleva tu propio soporte (A4), y la auditoría de cualquier consultorio sale por un POST sin autenticar (A5). Si vendés esa frase esta semana sin arreglar eso, y aparece, no es un bug: es una promesa incumplida sobre datos de salud, dicha por escrito, a un profesional matriculado que responde legalmente por esos datos. Es el único riesgo de esta lista que no se arregla con un commit después.

**7. La higiene del repo se te va a volver en contra.** 57 archivos `check*.js` y `cf*.js` sueltos en la raíz y 201 PNG en `capturas/` con datos reales de la psicóloga original. Están todos gitignoreados y ninguno trackeado —lo verifiqué—, así que no es una fuga hoy. Pero es un repo que ya no podés mostrarle a nadie, ni a un dev que contrates, ni a un socio, ni a un cliente que pida auditar, sin explicar durante diez minutos qué es cada cosa. Movelos a `scripts/qa/` y borrá `capturas/` en cuanto tengas las del consultorio de demo.