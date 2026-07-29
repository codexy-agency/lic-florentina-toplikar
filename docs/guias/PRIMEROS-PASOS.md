# Primeros pasos

**Tu consultorio online, funcionando en 15 minutos.**

Esta guía es una checklist. No hace falta que sepas nada de tecnología: son cuatro
pantallas del panel, en un orden que importa, y una reserva de prueba al final para
comprobar con tus propios ojos que un paciente puede sacar turno.

Al terminar vas a tener: tus servicios con precio, tu perfil, tus horarios publicados
y tu primera reserva entrando sola a la agenda.

> Si querés el manual completo de cada sección, está en [GUIA-PANEL.md](GUIA-PANEL.md).
> Esto de acá es solo el arranque.

---

## Antes de empezar (1 minuto)

Codexy te mandó tres cosas. Tenelas a mano:

| Qué | Ejemplo | Para qué |
|---|---|---|
| La dirección de tu sitio | `anagomez.codexy.app` | Es lo que van a ver tus pacientes. |
| Tu panel | esa misma dirección + `/admin` | Donde trabajás vos. |
| Tu email y tu contraseña | `ana@mail.com` + la clave que te pasaron | Para entrar al panel. |

Y tené anotado (en un papel sirve):

- **Qué ofrecés** y **cuánto sale cada cosa** (ej.: "Sesión individual, 50 min, $X").
- **Tus horarios de la semana**, día por día.
- Una **foto tuya** (cualquiera sirve, el panel la recorta solo).

> **Consejo:** hacé todo esto desde una computadora. El panel anda en el celular, pero
> la puesta a punto se hace mucho más cómoda en pantalla grande.

---

## La checklist

Marcá a medida que avanzás. El orden **no es opcional**: la disponibilidad depende de
los servicios, y el sitio depende de las dos cosas.

- [ ] **1. Entrar al panel** *(1 min)*
- [ ] **2. Cargar tus servicios y precios** *(4 min)*
- [ ] **3. Completar tu perfil profesional** *(3 min)*
- [ ] **4. Cargar tu disponibilidad** *(4 min)*
- [ ] **5. Mirar tu sitio como lo ve un paciente** *(1 min)*
- [ ] **6. Hacer una reserva de prueba** *(2 min)*

---

## 1. Entrar al panel · 1 minuto

1. Abrí la dirección de tu sitio y agregale **`/admin`** al final.
2. Escribí tu **email** y tu **contraseña**.
3. Tocá **Ingresar**.

Vas a caer en **Agenda**, que es tu pantalla de todos los días. Está vacía: es normal,
todavía no configuraste nada.

**A la izquierda tenés el menú.** Desde el celular se abre con el botón de las tres
rayitas, arriba a la izquierda.

> Si te dice "email o contraseña incorrectos", fijate que no haya quedado un espacio
> al copiar y pegar. El mensaje es siempre genérico a propósito: así nadie puede
> averiguar desde afuera qué emails tienen cuenta.
>
> Si probaste varias veces seguidas, esperá unos minutos: el sistema bloquea los
> intentos repetidos para protegerte.

**Antes de seguir:** cambiá la contraseña que te dieron por una tuya. Si te la pasaron
por WhatsApp o mail, pedile a soporte que te genere una nueva y guardala en un lugar
seguro. Es la llave de las historias clínicas de tus pacientes.

---

## 2. Servicios y precios · 4 minutos

**Menú → Servicios.** Esto es lo primero porque define **qué se puede reservar** y
**cuánto dura cada turno**.

Para cada cosa que ofrecés, cargá:

| Campo | Qué poner | Por qué importa |
|---|---|---|
| **Nombre** | "Sesión individual", "Primera consulta", "Terapia de pareja" | Es exactamente lo que ve el paciente al reservar. |
| **Duración** | 50, 60, 90 minutos… | **Define el largo del turno en tu agenda.** Si ponés 50, los turnos ocupan 50 minutos. |
| **Precio de referencia** | El monto en pesos | Es lo que se factura por ese turno en Finanzas. Después podés cobrar distinto en un caso puntual. |
| **Descripción** | Una línea, opcional | Aparece abajo del nombre en la pantalla de reserva. |
| **Activo** | Encendido | Si lo apagás, deja de ofrecerse en el sitio (pero no se borra ni se pierde el historial). |

Cuando termines, tocá **Guardar servicios**.

**Recomendación para arrancar:** cargá dos o tres, no diez. Siempre podés sumar más
después, y una pantalla de reserva con pocas opciones claras convierte mejor.

> Si dejás todos los servicios inactivos, el panel te lo avisa: sin ningún servicio
> activo, tus pacientes no pueden reservar nada.

---

## 3. Tu perfil profesional · 3 minutos

**Menú → Profesionales.** Acá van los datos que el paciente ve en tu sitio.

1. **Foto.** Subila y listo: se recorta y se achica sola.
2. **Nombre** como querés que te vean (ej.: "Lic. Ana Gómez").
3. **Título o matrícula** (ej.: "Psicóloga · M.N. 12345").
4. **Presentación:** dos o tres líneas sobre cómo trabajás. Escribilo como se lo
   dirías a alguien que te pregunta en persona, no como un CV.
5. **Color del avatar:** elegí el que te guste, es solo estético.
6. **Qué servicios ofrecés:** tildá los que cargaste en el paso anterior.
7. Dejá el interruptor en **Activa** (si está en "Oculta" no aparecés en la reserva).

Tocá **Guardar profesionales**.

> **¿Trabajás sola?** Con cargarte a vos alcanza. El sistema se da cuenta y le
> saltea al paciente el paso de "elegir con quién", así reserva más rápido.
>
> **¿Sos un equipo?** Cargá a cada una acá, con sus propios servicios. Ojo: esto es
> el *perfil público*. Darle acceso al panel es otra cosa, y va en **Equipo**
> (dejalo para más adelante).

---

## 4. Tu disponibilidad · 4 minutos

**Menú → Disponibilidad.** Es la pieza que hace que aparezcan horarios libres en tu
sitio. Sin esto, el paciente entra a reservar y no ve nada.

### Horario semanal

1. Elegí un día, por ejemplo **lunes**.
2. Agregá una franja: **desde** las 9:00 **hasta** las 13:00.
3. Indicá si esa franja es **online** o **presencial**.
4. Agregá las franjas que necesites (mañana y tarde son dos franjas separadas: 9 a 13
   y 15 a 20, así el mediodía te queda libre).
5. ¿Tenés el mismo horario toda la semana? Tocá **Copiar lunes a hábiles** y listo.
6. Tocá **Guardar horarios** (la barra de abajo te avisa si te quedaron cambios sin guardar).

El sitio publica **solo los huecos que quedan libres** dentro de esas franjas: los
turnos que ya tenés confirmados desaparecen solos de la vista del paciente.

### Días que no atendés

Bajá a **Días que no atiende** y marcá feriados o vacaciones. Estos se aplican **al
instante**, sin botón de guardar.

### Ajustes avanzados (tocalos solo si los necesitás)

Vienen con valores razonables. Si algo no te cierra, están acá:

| Ajuste | Viene en | Qué significa |
|---|---|---|
| Duración de la sesión | 50 min | El largo por defecto, cuando el servicio no define uno propio. |
| Cada cuánto empieza un turno | 60 min | Turnos en punto: 9:00, 10:00, 11:00. Si lo ponés en 30, también ofrece 9:30. |
| Anticipación mínima | 24 h | Nadie puede reservarte para dentro de dos horas. Subilo si querés más aire, bajalo si te sirve llenar huecos. |
| Hasta cuántos días adelante | 30 días | Qué tan lejos en el futuro se puede reservar. |

> **El caso más común de "no aparecen horarios":** la anticipación mínima. Con 24 h,
> si hoy es martes al mediodía, el primer turno posible es el miércoles al mediodía.
> No está roto: está funcionando como lo configuraste.

---

## 5. Mirá tu sitio · 1 minuto

En el menú, abajo, tocá **Ver el sitio**. Se abre tu página de reservas tal cual la ve
un paciente.

Chequeá tres cosas:

- [ ] Aparecen **tus servicios**, con el precio y la duración correctos.
- [ ] Aparece **tu foto y tu presentación**.
- [ ] Hay **horarios disponibles** para elegir.

Si falta algo, volvé a la sección correspondiente. Lo más habitual: quedó algo sin
**Guardar**, o un servicio quedó en "inactivo", o tu perfil quedó en "Oculta".

---

## 6. La reserva de prueba · 2 minutos

Este es el paso que más tranquilidad da. Vas a reservarte un turno a vos misma para
ver el circuito completo, de punta a punta.

**En tu sitio (la pantalla de reserva):**

1. Elegí un **servicio**.
2. Elegí la **profesional** (si sos vos sola, este paso no aparece).
3. Elegí **día y horario** entre los que te ofrece.
4. Completá los datos: poné **tu propio nombre y tu teléfono**, así después lo
   reconocés fácil. Escribí "PRUEBA" en el nombre para no confundirte.
5. Confirmá.

**Ahora volvé al panel → Agenda.** Tiene que estar ahí:

- [ ] La reserva aparece en **Bandeja de solicitudes**, con el servicio, el horario y
      el contacto que pusiste.
- [ ] El contador de **solicitudes pendientes** subió a 1.
- [ ] Si vas a **Pacientes**, la persona se creó sola.

**Probá las acciones:**

- Tocá **Confirmar** → pasa a Próximos turnos.
- Tocá **Enviar recordatorio** → se abre WhatsApp con el mensaje ya escrito. **No se
  manda solo:** el panel te lo prepara y vos decidís si lo enviás. Cerralo sin mandar.
- Tocá **Marcar realizado** → la sesión entra a cobranza y la vas a ver en **Finanzas**,
  en "Por cobrar", con el precio del servicio.
- Andá a **Finanzas** y marcala como pagada, eligiendo un método. Así ves el circuito
  de plata completo.

**Listo. Tu consultorio está funcionando.**

> **¿Y el turno de prueba?** No hay botón de "borrar": es a propósito, para que el
> historial clínico nunca quede con agujeros. Dejalo marcado como realizado y pagado,
> o marcalo como **No asistió**. Con el nombre "PRUEBA" no te va a confundir.

---

## Lo que podés dejar para después

Ya podés recibir pacientes. Estas cosas suman, pero no te bloquean:

| Cuándo | Qué |
|---|---|
| Esta semana | **Equipo** — darle acceso a tu secretaria, con el rol *Asistente* (ve la agenda y los contactos, **nunca** finanzas ni historia clínica). |
| Esta semana | **Asistente** — el chat del panel. Probalo con "¿qué turnos tengo hoy?". Entiende texto y voz. |
| Cuando tengas movimiento | **Finanzas** — cargar tus gastos fijos (alquiler, supervisión, matrícula) para que el neto sea real. |
| Cuando quieras | Avisos por **Telegram** cuando entra una reserva. Pedíselo a soporte, se configura de nuestro lado. |

---

## Si algo no sale

| Lo que ves | Casi siempre es esto |
|---|---|
| En el sitio no aparece ningún horario | No cargaste franjas en **Disponibilidad**, o la **anticipación mínima** te tapa los próximos días, o el servicio quedó **inactivo**. |
| No aparece ningún servicio para elegir | Quedaron todos en **Inactivo**, o faltó tocar **Guardar servicios**. |
| Un servicio no se puede reservar | En **Profesionales**, ese servicio no está tildado para ninguna profesional activa. |
| Cargué un horario y no se ve en el sitio | Faltó **Guardar horarios**. Los días bloqueados sí se aplican solos; las franjas no. |
| Bloqueé un día pero seguía teniendo turnos | Correcto: el día deja de ofrecerse para reservas **nuevas**, pero los turnos ya confirmados siguen en tu agenda. Reprogramalos a mano. |
| El sitio dice "Consultorio no encontrado" | Estás entrando por una dirección que no es la tuya. Usá exactamente la que te pasó Codexy. Si es la correcta, escribinos. |
| Elegí un horario a mano y me dijo que se superpone | Ya hay otro turno confirmado de esa misma profesional en ese rango. |

**¿Seguís trabado?** Escribile a soporte contando **en qué pantalla estabas**, **qué
hiciste** y **qué esperabas que pasara**. Con esas tres cosas se resuelve rápido.

---

## Tres cosas que conviene saber desde el día uno

1. **Nada se envía solo.** Los WhatsApp de recordatorio y de cobranza los prepara el
   panel, pero los mandás vos. Siempre podés revisar y editar antes.
2. **Una solicitud pendiente te reserva el horario 48 horas.** Si no la confirmás ni
   la rechazás en ese plazo, el horario vuelve a ofrecerse a otros pacientes.
3. **La historia clínica es dato sensible de salud.** Solo la ven quien es dueña del
   consultorio y quien tenga rol de *Profesional*. Una secretaria ve el contacto y la
   agenda, nunca la evolución clínica, y eso no se puede destildar. Tampoco sale a
   Telegram ni al asistente de IA.

---

Cuando quieras el detalle de cada pantalla, seguí por [GUIA-PANEL.md](GUIA-PANEL.md).
