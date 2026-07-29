# Guía del panel

Bienvenida. Este es el manual de tu consultorio digital: dónde está cada cosa y cómo hacer lo del día a día. Se lee en 10 minutos y no hace falta saber nada de tecnología.

Una idea para arrancar: **tu sitio web y tu panel son dos caras de lo mismo**. El paciente entra al sitio, elige un horario libre y esa reserva te llega acá como *solicitud*. Todo lo que configurás en el panel (horarios, servicios, profesionales) es lo que el sitio le muestra a los pacientes.

---

## 1. Cómo entrar

1. Abrí la dirección de tu panel y agregale `/admin` al final.
2. Escribí tu **email** y tu **contraseña**.
3. Tocá **Ingresar**.

Si los datos no coinciden vas a ver un aviso genérico ("no pudimos iniciar sesión"). Es a propósito: así nadie puede averiguar desde afuera qué emails existen.

- **Para salir:** abajo del menú lateral, botón **Salir**.
- **Desde el celular:** el menú se abre con el botón de las tres rayitas, arriba a la izquierda.
- **"Ver el sitio"** (también en el menú) abre la página de reservas como la ve un paciente. Sirve para chequear que todo se vea bien.

---

## 2. Mapa del panel

| Sección | Para qué es |
|---|---|
| **Agenda** | Tu pantalla principal: solicitudes nuevas, próximos turnos y quién te debe. |
| **Asistente** | Un chat que te contesta y hace tareas por vos ("¿qué turnos tengo hoy?"). |
| **Pacientes** | Listado, fichas e historia clínica. |
| **Finanzas** | Cobros, gastos, deuda y exportación para la contadora. |
| **Servicios** | Qué se puede reservar, cuánto dura y cuánto sale. |
| **Profesionales** | Quiénes atienden y qué ofrece cada una. |
| **Equipo** | Quién entra al panel y qué puede ver. |
| **Disponibilidad** | Tus horarios semanales y los días que no atendés. |

> Si tocás una sección que no te corresponde según tus permisos, el panel te devuelve solo a Agenda. No es un error.

### Puesta a punto (una sola vez, en este orden)

1. **Servicios** → cargá lo que ofrecés, con duración y precio.
2. **Profesionales** → tus datos, foto y qué servicios da cada una.
3. **Disponibilidad** → tus horarios de la semana.

Con eso el sitio ya puede recibir reservas.

---

## 3. Agenda

Arriba ves cuatro números: **solicitudes pendientes**, **turnos confirmados**, **turnos de hoy** y **pacientes**. Debajo podés elegir entre vista **Lista** y vista **Calendario**.

### Vista Lista

**Bandeja de solicitudes.** Cada persona que reservó desde el sitio aparece con su nombre, contacto, modalidad, el servicio y el horario que eligió, el motivo (si lo escribió) y cuándo llegó. Tenés tres acciones: **Confirmar**, **Rechazar** y **Responder** (abre WhatsApp).

**Agendar turno a mano.** Botón para cargar vos misma un turno de alguien que te escribió por WhatsApp o te llamó. Queda confirmado al instante y la persona se agrega sola a Pacientes.

**Próximos turnos.** Agrupados por *Hoy*, *Mañana* y después por fecha. En cada uno podés:

| Acción | Qué hace |
|---|---|
| Enviar recordatorio | Abre WhatsApp con el mensaje ya escrito (vos revisás y mandás). |
| Reprogramar | Cambiás fecha y hora y se guarda. |
| Marcar realizado | La sesión pasa a "dada" y entra a cobranza. |
| No asistió | Queda registrado que faltó. |

**Para poner al día.** Solo lo accionable: pacientes con deuda o con turno pendiente, con el total a cobrar arriba. Desde ahí llegás a la ficha o le escribís.

### Vista Calendario

- Vistas **Día / Semana / Mes**, botón **Hoy** y flechas para moverte.
- **Tocá un hueco libre** y se abre el formulario de turno nuevo con esa fecha y hora ya puestas.
- Podés elegir un paciente que ya existe o cargar uno nuevo. Si esa persona ya tenía un turno próximo, te avisa para que no lo dupliques.
- Los turnos se pintan según su estado: pendiente, confirmado, realizado, no asistió. Tocando uno vas a la ficha del paciente.
- Los días bloqueados se ven rayados con el cartel **"No atiende"**.
- En el celular, la semana se muestra como una lista día por día (se lee mucho mejor).

---

## 4. Pacientes

Buscador por nombre o contacto y tres filtros: **Todos**, **Con deuda**, **Con turno**.

Los pacientes **se crean solos** cuando alguien reserva o cuando agendás un turno a mano. También podés cargar uno con **+ Nuevo paciente**.

### La ficha de un paciente

- **Cabecera:** contacto, email, desde cuándo es paciente y, si corresponde, cuánto debe.
- **Botón de WhatsApp** con plantillas listas: recordatorio de turno, aviso de pago, saludo o mensaje libre. Nunca envía nada solo: abre WhatsApp para que vos revises.
- **Editar datos:** nombre, teléfono, email y modalidad.
- **Historia clínica:** notas con fecha y título opcional, ordenadas como una línea de tiempo. Se pueden eliminar.
- **Ficha:** un campo libre para datos fijos (obra social, motivo de consulta, contacto de emergencia).
- **Turnos:** todos los turnos de esa persona con su estado, y la deuda total.

> **La historia clínica es dato sensible de salud.** Solo la ven la dueña del consultorio y quienes tengan rol de *Profesional*. Una secretaria ve el contacto y la agenda, nunca la evolución clínica. Esto no se puede destildar.

---

## 5. Finanzas

Elegís el período arriba: **Este mes**, **Mes pasado**, **Este año** o **Histórico**.

| Número | Qué significa |
|---|---|
| **Cobrado** | Plata que ya entró en el período (con la variación respecto del mes pasado). |
| **Gastos** | Egresos que cargaste. |
| **Neto** | Cobrado menos gastos. |
| **Por cobrar** | Sesiones ya dadas y todavía impagas. |
| **Facturado** | Total de los turnos del período, cobrados o no. |
| **Ticket promedio** | Cuánto rinde en promedio cada turno. |

**Cobranza pendiente** agrupa por paciente las sesiones sin pagar del período: ves el total de cada uno, le escribís por WhatsApp con un toque y marcás cada sesión como pagada eligiendo el método.

Más abajo hay gráficos simples: evolución mes a mes (cobrado vs. facturado), por servicio, por método de pago y por profesional.

**Movimientos** es el detalle fila por fila: cada turno del período más los ingresos y gastos que cargaste a mano. Ahí registrás pagos, los deshacés si te equivocaste y quitás movimientos manuales.

**Exportar** te baja un archivo para abrir en Excel y pasarle a la contadora.

> **Qué cuenta como deuda:** una sesión que no está paga **y que ya ocurrió** (marcada como realizada, o confirmada con fecha pasada). Los turnos a futuro nunca son deuda.

---

## 6. Servicios

Cada servicio es una tarjeta con:

| Campo | Para qué sirve |
|---|---|
| Nombre | Lo que ve el paciente al reservar. |
| Duración | **Define cuánto dura el turno** en la agenda. |
| Precio de referencia | Es el monto que se usa para facturar ese turno. |
| Descripción | Una línea opcional que aparece en la reserva. |
| Activo / Inactivo | Si está inactivo, deja de ofrecerse en el sitio (pero no se borra). |

Acordate de tocar **Guardar servicios**. Si dejás todo inactivo, el panel te avisa: los pacientes no van a poder reservar nada.

---

## 7. Profesionales

Para cada persona que atiende: foto (se recorta y se achica sola), nombre, título o matrícula, una breve presentación, un color para el avatar y **qué servicios ofrece**. El interruptor **Activa / Oculta** decide si aparece o no en la reserva.

Todo esto se ve en el sitio público cuando el paciente elige con quién atenderse. Si un servicio lo da una sola profesional, se asigna automáticamente.

No te olvides de **Guardar profesionales**.

---

## 8. Equipo

Acá manejás **quién entra al panel**. Cada miembro aparece con su rol y con chips verdes o grises según lo que puede ver.

| Rol | Qué ve |
|---|---|
| **Dueño/a** | Todo, incluida la historia clínica. Solo un dueño puede nombrar a otro. |
| **Administrador/a** | Todo lo administrativo. **No** ve la historia clínica. |
| **Profesional** | Agenda, pacientes, historia clínica, disponibilidad y asistente. |
| **Asistente** | Agenda y datos de contacto de los pacientes. Nada de finanzas ni historia clínica. |

Dentro de cada rol podés afinar permisos uno por uno con **Cambiar rol y permisos**. La única excepción es la **historia clínica**: aunque la tildes, solo la ven dueño y profesionales.

Abajo, **Actividad reciente** te muestra quién entró, los intentos fallidos y los cambios de acceso.

---

## 9. Disponibilidad

- **Horario semanal:** agregás franjas por día (desde, hasta, y si esa franja es online o presencial). El botón **Copiar lunes a hábiles** te ahorra repetir. El sitio publica solo los huecos que quedan libres.
- **Días que no atiende:** feriados, vacaciones o un día puntual. **Se aplican al instante**, sin tocar guardar.
- **Ajustes avanzados** (cambialos solo si los necesitás): cuánto dura la sesión, cada cuántos minutos empieza un turno, con cuánta anticipación mínima se puede reservar y hasta cuántos días para adelante.

Los cambios de **horario** sí necesitan el botón **Guardar horarios** (la barra de abajo te avisa si tenés cambios sin guardar).

---

## 10. Asistente

Un chat que entiende lenguaje común. Podés **escribir o dictar** (botón del micrófono).

**Te consulta:** turnos de hoy, próximos turnos, solicitudes pendientes, resumen de finanzas, quién te debe, sesiones impagas, datos de un paciente y horarios libres.

**Y también hace cosas:** agendar un turno, confirmar una solicitud, registrar un pago, bloquear un día, cargar un ingreso o un gasto. Cuando propone una acción te muestra una tarjeta con el detalle y dos botones: **Confirmar** o **Cancelar**. Nada se ejecuta sin que vos toques Confirmar.

Por privacidad, el asistente **no lee ni comenta** la historia clínica ni el motivo de consulta.

La conversación se guarda mientras tengas el navegador abierto. El ícono de tacho la borra (te pide confirmación tocándolo dos veces).

---

## 11. Las cinco tareas más comunes

### Confirmar un turno

1. Entrá a **Agenda**.
2. Buscá la solicitud en **Bandeja de solicitudes**.
3. Si el horario que eligió te sirve, tocá **Confirmar**.
4. Si querés otro horario, cambiá la fecha en el campito de al lado y recién ahí tocá **Confirmar**.
5. Opcional: tocá **Responder** para avisarle por WhatsApp.

### Cobrar una sesión

1. Entrá a **Finanzas**.
2. Buscá a la persona en **Cobranza pendiente** (o buscá la fila en **Movimientos**).
3. Elegí el método: efectivo, transferencia, Mercado Pago o tarjeta.
4. Tocá **Pagado** (o **Registrar pago**).
5. ¿Te equivocaste? En Movimientos, **Deshacer**.

### Cargar un gasto

1. Entrá a **Finanzas** → **Agregar gasto**.
2. Escribí el concepto (por ejemplo, "Alquiler del consultorio").
3. Poné el monto y elegí la categoría (alquiler, supervisión, impuestos, matrícula, materiales, otros).
4. Ajustá la fecha si no es hoy.
5. **Registrar gasto**. Se resta del Neto y aparece en Movimientos.

### Dar acceso a la secretaria

1. Entrá a **Equipo** → **Dar acceso a alguien**.
2. Cargá nombre y email.
3. Elegí el rol **Asistente** (agenda y contactos, sin finanzas ni historia clínica).
4. Poné una contraseña inicial de al menos 10 caracteres.
5. **Crear acceso** y pasale email y contraseña por un canal seguro, pidiéndole que la cambie.

### Bloquear un día

1. Entrá a **Disponibilidad**.
2. Bajá a **Días que no atiende**.
3. Elegí la fecha en el calendario.
4. Tocá **Bloquear día**. Listo: ese día desaparece de la agenda online en el momento, no hay que guardar nada más.
5. Para deshacerlo, tocá la ✕ del chip de esa fecha.

---

## 12. Preguntas frecuentes

**¿De dónde salen las solicitudes?**
Del sitio público. El paciente elige servicio, profesional y horario libre, y la reserva te llega como *pendiente* a la Agenda.

**¿Una solicitud pendiente me bloquea el horario?**
Sí, lo reserva por **48 horas**. Si no la confirmás ni la rechazás en ese plazo, el horario vuelve a ofrecerse.

**¿Los WhatsApp se mandan solos?**
No. El panel abre WhatsApp con el mensaje ya escrito para que vos lo revises y lo envíes.

**¿Puedo borrar un turno?**
No hay "borrar". Las solicitudes se **Rechazan** y los turnos que no ocurrieron se marcan como **No asistió**. Así queda el historial completo.

**Bloqueé un día que ya tenía turnos, ¿qué pasa?**
Ese día deja de ofrecerse para reservas nuevas, pero los turnos ya confirmados siguen estando en tu agenda. Si hace falta, reprogramalos o rechazalos a mano.

**La deuda de la ficha no coincide con la de Finanzas.**
No es un error: Finanzas te muestra la cobranza **del período elegido**; la ficha del paciente muestra su deuda **total de todos los meses**.

**Quiero cambiar mi contraseña.**
Por ahora el cambio no se hace desde el panel. Quien administra el consultorio puede generar una **contraseña temporal** para otro miembro desde Equipo. Para la tuya propia, pedísela a soporte.

**Elegí un horario y me dijo que se superpone.**
Ya hay otro turno confirmado de esa misma profesional en ese rango. Elegí otra hora (dos profesionales distintas sí pueden atender a la misma hora).

**¿Los horarios son de mi zona?**
Sí, todo el panel trabaja en hora de Argentina.

**Alguien de mi equipo no ve una sección.**
Es por sus permisos. Revisalos en **Equipo → Cambiar rol y permisos**. Recordá que la historia clínica solo la ven dueño y profesionales, siempre.

---

¿Algo no se comporta como dice esta guía? Contale a soporte qué pantalla estabas usando y qué esperabas que pasara.
