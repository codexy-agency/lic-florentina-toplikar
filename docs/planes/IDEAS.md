# Lluvia de ideas — mejoras del producto y de la UI

> Generado por una auditoría multi-agente sobre el código real (julio 2026).
> Cada idea cita archivo y línea: no son sugerencias genéricas, son cosas que están pasando hoy.
> Marcadas **[WOW]** las que un psicólogo cuenta a otro psicólogo.

## Índice

- [Producto](#producto) — 15 ideas
- [UI artesanal](#ui-artesanal) — 19 ideas
- [Conversion y onboarding](#conversion-y-onboarding) — 15 ideas

---

## Producto

### Cobro anticipado con link de pago y conciliación automática

`Impacto Alto · Esfuerzo Alto`

**Por qué:** El paciente que pagó no falta: es la forma más efectiva de bajar el ausentismo, y además elimina la incomodidad de cobrar en persona y el rastreo manual de quién debe. Toca la plata del cliente, que es donde está la disposición a pagar por el software.

**Cómo:** MercadoPago para AR/MX y Stripe para USA. Link de pago dentro del recordatorio y en el link del turno; el webhook marca pagado y concilia contra el turno sin intervención. Configurable por servicio: pago obligatorio para primera consulta, opcional para el resto, o bono mensual de 4 sesiones (formato muy usado y que asegura la caja). Suma también 'saldo a favor' cuando el paciente paga el mes y falta una sesión. Es alto esfuerzo por las credenciales por tenant y el manejo de webhooks, pero es lo que permite después cobrar la suscripción con el mismo motor.

### [WOW] Recordatorio automático por WhatsApp con confirmación de un toque

`Impacto Alto · Esfuerzo Medio`

**Por qué:** El ausentismo es la sangría #1 del consultorio: 10-20% de las horas se pierden y el psicólogo hoy manda los recordatorios a mano, uno por uno, todos los domingos a la noche. Es el dolor que hace que alguien pague en la primera demo.

**Cómo:** 24h antes sale un mensaje: 'Hola Ana, mañana martes 15hs con Lic. X. Confirmás? [Sí] [Necesito reprogramar]'. La respuesta cambia el estado del turno en la agenda sin que el profesional toque nada. Si a las 6hs del día no confirmó, aparece marcado en amarillo en la agenda y (si está la lista de espera) se ofrece el hueco. Implementación: campo recordatorioEnviadoEn/confirmadoEn en Solicitud, un cron de Vercel cada 30 min y links firmados tipo /t/<token> (mismo HMAC de lib/auth.ts). Empezar con wa.me pre-cargado de un click (esfuerzo bajo, sin costo de API) y después WhatsApp Business API o Twilio para el envío 100% automático. En la demo se muestra el celular del cliente recibiendo el mensaje: cierra ventas.

### Turno fijo semanal (recurrencia) y su renovación automática

`Impacto Alto · Esfuerzo Medio`

**Por qué:** La psicoterapia no funciona con turnos sueltos: el 80% de la agenda son pacientes con 'los martes a las 15'. Sin recurrencia el psicólogo tiene que cargar 4 turnos por mes por paciente y descarta el producto en los primeros 10 minutos de prueba.

**Cómo:** Al agendar: 'repetir todas las semanas / cada 15 días', con fin abierto. El sistema mantiene siempre 8 semanas materializadas hacia adelante y respeta feriados y bloqueos. Editar un turno pregunta 'solo este / este y los siguientes' (patrón calendario, ya conocido). Además habilita el concepto de 'horario reservado' del paciente: si falta, la hora sigue siendo suya y la política de cancelación aplica. Esto es prerequisito para la lista de espera, el modo vacaciones y las métricas de adherencia.

### [WOW] Cierre de sesión en 60 segundos: nota dictada y próximo paso

`Impacto Alto · Esfuerzo Medio`

**Por qué:** Escribir la evolución es la tarea más postergada del oficio: se acumulan 3 semanas de notas y la historia clínica queda inútil (y legalmente floja). Como el asistente con voz ya existe, esto es la mejor demo del producto y lo que hace que lo recomienden entre colegas.

**Cómo:** Al terminar el turno aparece un botón 'Cerrar sesión'. El profesional habla 40 segundos y el asistente devuelve la nota estructurada (motivo del día / intervención / acuerdos y tarea / a seguir la próxima), la guarda en la ficha con fecha, marca el turno como realizado, registra el cobro y confirma el próximo turno. Todo en una sola confirmación. Reusa lib/assistant/tools.ts y /api/asistente/transcribir. Clave de diseño: la nota queda editable y siempre se guarda también el texto crudo dictado; nunca 'inventar' contenido clínico.

### Autogestión del paciente: cancelar y reprogramar con política de aviso

`Impacto Alto · Esfuerzo Medio`

**Por qué:** El psicólogo vive interrumpido por WhatsApp para mover turnos, y cada cancelación tardía es plata perdida sin respaldo. Darle al paciente un link propio le devuelve al profesional el control del encuadre sin tener que decir que no de a uno.

**Cómo:** Link firmado por turno donde el paciente ve su horario, puede reprogramar sobre los slots reales que ya calcula lib/scheduling/slots.ts, o cancelar. La política es configurable por consultorio (ej: 48hs) y el sistema la aplica solo: si cancela dentro del plazo el hueco se libera; si cancela fuera de plazo queda registrado como 'cancelación tardía' y, según lo que el profesional haya definido, se factura igual y aparece en Finanzas. Se acaba la discusión incómoda por dinero, que la sostiene el sistema y no la persona.

### [WOW] Encuadre digital: consentimiento, política de cancelación y honorarios firmados online

`Impacto Alto · Esfuerzo Medio`

**Por qué:** Es literalmente el nombre del producto y es un requisito ético/legal (historia clínica y consentimiento informado) que hoy casi nadie tiene en orden. Convierte al SaaS de 'agenda linda' a 'me cubre las espaldas', que es otro nivel de precio y de retención.

**Cómo:** Plantilla editable por consultorio con secciones armadas por defecto (confidencialidad y sus límites, modalidad, honorarios y actualización, política de cancelación, uso de datos, canal de contacto entre sesiones y qué hacer en una urgencia). Se envía junto con la ficha de admisión, el paciente lo lee y acepta, y queda guardado con fecha, hora, IP y versión del texto en su ficha, descargable en PDF. Si el profesional sube los honorarios, se re-firma solo la sección que cambió. Diferenciador enorme frente a Calendly o una planilla.

### [WOW] Recibos automáticos y resumen mensual para reintegro de obra social / seguro

`Impacto Alto · Esfuerzo Medio`

**Por qué:** En Argentina el paciente pide el recibo para el reintegro de OSDE/Swiss/prepaga y el psicólogo lo hace a mano en Word; en Estados Unidos es el superbill que el paciente presenta a su seguro. Es trabajo administrativo puro, mensual y odiado: automatizarlo es el argumento de venta más concreto en los tres mercados.

**Cómo:** Datos fiscales del profesional una sola vez (nombre, matrícula, CUIT/RFC/NPI, domicilio). Por cada sesión cobrada se genera el comprobante numerado, y a fin de mes el resumen por paciente con fechas, cantidad de sesiones y total, listo para presentar. Formatos por país: AR recibo con matrícula y CUIT, MX los datos para la factura del contador, USA superbill con CPT 90834/90837 y espacio para diagnóstico. Botón 'enviárselo a todos los pacientes del mes' con un click. Se apoya en la data que ya tiene Finanzas.

### [WOW] Informes, certificados y derivaciones redactados desde la historia clínica

`Impacto Alto · Esfuerzo Medio`

**Por qué:** Un informe escolar, un certificado de asistencia para el trabajo o una derivación a psiquiatría le cuestan al profesional entre 40 minutos y una semana de postergación. Que salga un borrador decente en 30 segundos, con membrete y matrícula, es magia visible y motivo de recomendación entre colegas.

**Cómo:** Tres plantillas: certificado de asistencia (dato duro: fechas y cantidad de sesiones, sin contenido clínico), informe de evolución para escuela/institución, y nota de derivación a psiquiatra o neurólogo. El asistente propone el borrador a partir de las notas del período, el profesional edita y firma, y sale en PDF con el membrete de 'Mi sitio' (ya está la marca y las paletas) más nombre y matrícula. Reglas duras: nunca inventar diagnóstico ni fechas, siempre marcar lo que falta completar, y dejar constancia en la ficha de qué informe se emitió y para quién.

### Onboarding de 10 minutos: importar pacientes y sincronizar con Google Calendar

`Impacto Alto · Esfuerzo Medio`

**Por qué:** El psicólogo no migra si tiene que cargar 35 pacientes a mano, y no confía en una agenda que no aparece en el calendario del celular donde también está el cumpleaños del sobrino. Es la diferencia entre 'probé la demo' y 'lo estoy usando': pura activación.

**Cómo:** Importar pacientes desde CSV/Excel/contactos con mapeo de columnas asistido y detección de duplicados; y sincronización bidireccional con Google Calendar (los turnos se ven en el celular, y los eventos personales bloquean la disponibilidad automáticamente, que es la objeción real: 'no quiero que me den turno cuando tengo al pediatra'). Sumar un checklist de arranque de 5 pasos en el panel (horarios, servicios y precios, importar, personalizar el sitio, primer turno de prueba) con barra de progreso: sube muchísimo la conversión de prueba a pago.

### [WOW] Radar de la práctica: ausentismo, retención y pacientes en riesgo de abandono

`Impacto Alto · Esfuerzo Bajo`

**Por qué:** El psicólogo no tiene idea de cómo le va su consultorio como negocio ni cuándo se le está yendo un paciente. Es la pantalla que da una razón para entrar todos los días (retención) y los datos ya están en el sistema, así que es el mejor valor/esfuerzo de toda la lista.

**Cómo:** Un tablero con 6 señales calculadas sobre lo que ya persiste el store: % de ausentismo del mes y a quiénes, retención (sesiones promedio por paciente y cuántos llegaron a la 4ta, que es el umbral donde se define el tratamiento), horas libres recurrentes ('los jueves de 16 a 19 nunca vendés'), ingreso proyectado del mes según turnos agendados, deuda vieja, y sobre todo 'pacientes en riesgo': los que no vienen hace más de 3 semanas sin alta ni próximo turno, con un botón de 'escribirle'. Ese último bloque solo ya recupera varios pacientes por mes y se paga la suscripción.

### [WOW] Ficha de admisión previa a la primera consulta

`Impacto Alto · Esfuerzo Bajo`

**Por qué:** La primera consulta es el momento de mayor fricción y mayor deserción. Hoy se van 15 minutos de una sesión paga preguntando datos, y el profesional llega a ciegas. Es un 'esto lo necesito' inmediato y es barato de construir.

**Cómo:** Al confirmarse una reserva de primera vez, el paciente recibe un link a un formulario corto: datos, obra social/seguro, motivo de consulta en sus palabras, tratamientos previos, medicación actual, y contacto de emergencia (dato clínicamente crítico que hoy no existe en el modelo Paciente). Las respuestas caen directo en la ficha y el asistente arma un resumen de 5 líneas que el profesional lee 2 minutos antes de entrar. Suma también el contacto de emergencia a la ficha, que es un tema de responsabilidad profesional real.

### Lista de espera con relleno automático del hueco

`Impacto Medio · Esfuerzo Medio`

**Por qué:** Cuando se cae un turno del martes a las 18, esa hora se pierde para siempre: es plata que ya estaba en la agenda. Recuperar 2 horas por mes paga la suscripción sola, y es el argumento de ROI más fácil de explicar en una venta.

**Cómo:** Dos usos. Uno: pacientes activos que quieren adelantar o cambiar de horario ('avisame si se libera algo a la tarde'). Dos: consultantes nuevos que no encontraron horario y en vez de irse a otro profesional dejan sus preferencias. Cuando se libera un slot, el sistema avisa por WhatsApp a los que matchean por orden y el primero que responde se lo queda. En la demo: se cancela un turno en vivo y a los 3 segundos el hueco ya tiene candidato.

### [WOW] Escalas de seguimiento con gráfico de evolución en la ficha

`Impacto Medio · Esfuerzo Medio`

**Por qué:** Le da al psicólogo evidencia de que su trabajo funciona: es material para mostrarle al paciente cuando siente que no avanza (momento típico de abandono), para el informe a la obra social y para la supervisión. Ningún competidor de agenda lo tiene y es lo que hace que un profesional se lo muestre a otro.

**Cómo:** Cuestionarios validados y de uso libre (PHQ-9 depresión, GAD-7 ansiedad, WHO-5 bienestar) que se envían por link cada 4 semanas según el caso. El paciente responde en 2 minutos desde el celular y en la ficha aparece la curva junto a los hitos del tratamiento. Alerta explícita si el ítem 9 del PHQ-9 (ideación suicida) da positivo. Cuidado clínico: presentarlo como seguimiento y nunca como diagnóstico, y que el resultado lo vea primero el profesional.

### Modo vacaciones y licencia con reprogramación asistida

`Impacto Medio · Esfuerzo Bajo`

**Por qué:** Irse dos semanas hoy significa 30 conversaciones de WhatsApp una por una, y es el momento en que más se rompe la agenda. Es un detalle chiquito de construir que grita 'esto lo hizo alguien que entiende cómo se trabaja'.

**Cómo:** Elegís el rango y el sistema muestra exactamente qué turnos caen adentro y de quiénes. Un botón avisa a todos con un mensaje editable, ofrece alternativas antes o después según la disponibilidad real, y deja el sitio público mostrando 'próximos turnos disponibles desde el 5 de agosto' en lugar de huecos. Al volver, los turnos fijos se retoman solos. Aplica igual a licencia por enfermedad y a un feriado suelto.

### Carpeta de supervisión: exportar un caso anonimizado

`Impacto Medio · Esfuerzo Bajo`

**Por qué:** Todo psicólogo lleva casos a supervisión y hoy los reescribe a mano en un cuaderno. Es un ritual profesional que ningún software contempla, cuesta poco hacerlo y convierte al producto en parte de la identidad profesional, no en una herramienta administrativa reemplazable.

**Cómo:** Desde la ficha, 'preparar para supervisión': elegís el período, el sistema arma un PDF con el paciente reducido a iniciales y edad, sin datos de contacto ni identificatorios, con el motivo de consulta, la línea de tiempo de sesiones, las intervenciones y las notas del período, más un espacio en blanco para las preguntas que el profesional le quiere llevar al supervisor. Opcionalmente el asistente resume la evolución y propone los ejes a consultar. Bonus de retención: quien arma su supervisión acá no se va a otro sistema.

---

## UI artesanal

### Un solo color de texto: hoy conviven dos "negros" y dos "grises"

`Impacto Alto · Esfuerzo Medio`

**Por qué:** El panel define var(--a-text)=#24201F y var(--a-text-2)=#565049, pero el 80% del markup usa text-espresso (#3A3137) y text-espresso-soft (#6B5E66) de la landing. Son colores distintos que se leen en la misma pantalla: el ojo lo registra como suciedad aunque no sepa nombrarla.

**Cómo:** 27 archivos del panel usan tokens de la landing. Los peores: app/admin/page.tsx (14 usos), app/admin/finanzas/page.tsx (8), app/admin/pacientes/[id]/page.tsx (8), components/AgendaCalendario.tsx (14), components/ProfesionalesEditor.tsx (10), components/DisponibilidadEditor.tsx (12). Fix mecánico: dentro de app/admin/** y de los componentes del panel reemplazar text-espresso→text-[var(--a-text)], text-espresso-soft→admin-muted, y en app/admin/pacientes/page.tsx:29 border-[var(--color-line)]→border-[var(--a-border)] (ese token ni siquiera existe en el scope .admin-shell, el borde se está renderizando transparente).

### Escala tipográfica ad-hoc: 22 tamaños distintos, con medios píxeles

`Impacto Alto · Esfuerzo Medio`

**Por qué:** Hay text-[13.5px], text-[12.5px], text-[11.5px], text-[14.5px] junto a 10/11/12/13/14/15/16/17/18/19/22/24/26/27/28/30/33. Eso es tipografía elegida a ojo, botón por botón. Es el tell #1 de "lo escribió una IA".

**Cómo:** Definir 7 pasos en globals.css dentro de .admin-shell (--fs-xs 11 / --fs-sm 12.5 / --fs-base 14 / --fs-md 15 / --fs-lg 18 / --fs-xl 22 / --fs-2xl 30) y mapearlos a clases .a-t-xs … .a-t-2xl. Después barrer: los 12 usos de text-[13.5px] van a --fs-sm o --fs-base, los 11 de text-[12.5px] a --fs-sm, y los títulos de página (27/30/33px en AdminPageHeader.tsx:25 y pacientes/[id]/page.tsx:97) a un único --fs-2xl. Objetivo: bajar de 22 tamaños a 7.

### Todo es una tarjeta redondeada: falta densidad en desktop

`Impacto Alto · Esfuerzo Medio`

**Por qué:** 61 tarjetas rounded-2xl idénticas apiladas. Listas que son tablas (movimientos, actividad, cobranza) están dibujadas como tarjetas de 4rem de alto: en un monitor entran 6 filas donde deberían entrar 25. Un panel de gestión se juzga por cuánto ves sin scrollear.

**Cómo:** Convertir a tabla densa: app/admin/finanzas/page.tsx:474-585 ('Movimientos', hoy <li> con admin-card p-4) → filas de 44px separadas por divide-y dentro de UNA tarjeta contenedora, columnas fijas [icono 36 | concepto flex | fecha 96 | método 110 | monto 96 text-right | acción 120]. Mismo tratamiento en app/admin/page.tsx:450-474 ('Sesiones sin cerrar') y en la lista de cobranza (finanzas:278-335). Ya existe el patrón correcto en app/admin/equipo/page.tsx:172 (admin-card + divide-y): usalo como base.

### Estados vacíos de una línea, sin ilustración ni salida

`Impacto Alto · Esfuerzo Medio`

**Por qué:** 'Todavía sin datos.', 'Sin turnos aún.', 'Todavía no hay nadie más en el equipo.' Son callejones sin salida. El primer día de un suscriptor TODO está vacío: es exactamente el momento en que decide si paga.

**Cómo:** Pobres: app/admin/finanzas/page.tsx:347 y :395, app/admin/pacientes/[id]/page.tsx:304, app/admin/equipo/page.tsx:53, components/ServiciosEditor.tsx:66. Ya existe uno bueno como referencia en app/admin/page.tsx:618-629 ('Todo al día': icono + título + explicación). Fix: componente <AdminEmpty icon titulo texto accion?> y aplicarlo a los 5, cada uno con su CTA real ('Cargá tu primer servicio', 'Invitá a alguien al equipo', 'Registrá un ingreso para ver la evolución').

### Colores fuera de la paleta: verde WhatsApp haciendo de "éxito" y estados del calendario inventados

`Impacto Alto · Esfuerzo Medio`

**Por qué:** El sistema declara un solo acento (vino) + rojo. Pero hay #25D366/#1c7a45 (verde de WhatsApp) usado como 'pagado' y como 'permiso concedido', más un amarillo y un verde inventados en el calendario. Son 5 familias de color donde el sistema dice que hay 2.

**Cómo:** Verde de marca ajena como semántico: app/admin/finanzas/page.tsx:486, :543 ('Cobrado'), app/admin/equipo/page.tsx:88 (chips de permiso), app/admin/page.tsx:421. Hex sueltos del calendario: components/AgendaCalendario.tsx:26 (#E4C589/#F6EFDD/#7E5E18) y :28 (#A9C3A4/#E8F0E7/#3F5E3C). Paleta random de avatares: components/ProfesionalesEditor.tsx:8 COLORES=['#9C5475','#7c8a6f','#C9A227','#6E7BA6','#B07154']. Fix: agregar al scope .admin-shell los tokens --a-ok / --a-ok-soft / --a-warn / --a-warn-soft armonizados con el vino, referenciarlos en los 4 estados del calendario y en 'pagado'/'permiso ok', y dejar el verde #25D366 SOLO adentro del botón de WhatsApp (donde es la marca de WhatsApp, no un estado).

### Patrón de guardado inconsistente entre los tres editores

`Impacto Alto · Esfuerzo Medio`

**Por qué:** Disponibilidad tiene barra sticky con estado; Servicios y Profesionales tienen un botón perdido al fondo de una lista larga y no avisan si hay cambios sin guardar. Se pierde trabajo y se percibe como tres pantallas hechas por tres personas distintas.

**Cómo:** components/DisponibilidadEditor.tsx:398-430 tiene el patrón correcto (sticky bottom-0, backdrop-blur, estados idle/guardando/ok/error). components/ServiciosEditor.tsx:164-186 y components/ProfesionalesEditor.tsx (bloque final) tienen el botón al fondo, sin sticky y sin indicador de dirty. Fix: extraer <BarraGuardado dirty estado onGuardar> a components/, usarla en los tres, con microcopy 'Tenés cambios sin guardar' cuando dirty y un beforeunload. Bonus: el '✓ Guardado' que desaparece a los 2200ms (ServiciosEditor.tsx:53) no deja rastro — mejor 'Guardado a las 14:32'.

### La fila de acciones del turno son 4 botones del mismo peso que se acomodan solos

`Impacto Alto · Esfuerzo Medio`

**Por qué:** WhatsApp + input de fecha + Reprogramar + No asistió + Marcar realizado, todos pill del mismo tamaño, con flex-wrap: en desktop angosto se parten en dos líneas desprolijas y no hay ninguna jerarquía. Es la interacción más frecuente del producto.

**Cómo:** app/admin/page.tsx:539-581. Fix: dejar UNA primaria ('Marcar realizado', .admin-btn) + WhatsApp como icon-button, y meter 'Reprogramar' y 'No asistió' en un menú de kebab. El <input type="datetime-local"> suelto dentro de la tarjeta (líneas 550-555 y 395-400) tiene que vivir adentro del popover de 'Reprogramar', no permanentemente visible en cada fila.

### Sacar la marca hardcodeada del sidebar (dice "Paulina Pilotti" en todos los consultorios)

`Impacto Alto · Esfuerzo Bajo`

**Por qué:** Es un SaaS multi-tenant y el panel muestra el nombre y el monograma de otra profesional. Cualquier suscriptor que entre ve una marca ajena: mata la venta en el primer segundo y delata que es un template.

**Cómo:** components/AdminSidebar.tsx:80-91 tiene <Brand> con el texto literal 'Paulina Pilotti' y el acento #EBC4D2; la línea 226 tiene el monograma 'PP' hardcodeado en el topbar mobile. app/admin/login/page.tsx tiene el mismo problema (16 usos de la paleta de la landing + serif de marca). Fix: pasar {nombre, iniciales, acento} desde la config del tenant (la misma fuente que usa /admin/marca) al AdminShell, y derivar las iniciales con nombre.split(' ').map(w=>w[0]).slice(0,2). El acento del sidebar tiene que salir de --a-accent, no de un hex fijo.

### Dos botones primarios distintos compitiendo en la misma pantalla

`Impacto Alto · Esfuerzo Bajo`

**Por qué:** El sistema define .admin-btn (vino, con elevación) como acción primaria, pero seis pantallas usan un segundo primario 'bg-espresso text-cream'. El usuario no sabe cuál es LA acción, y la marca se ve indecisa.

**Cómo:** Usos del primario fantasma: app/admin/page.tsx:403 ('Confirmar'), app/admin/pacientes/page.tsx:52 ('Crear y abrir historia'), components/ServiciosEditor.tsx:174, components/ProfesionalesEditor.tsx (botón 'Guardar profesionales'), components/DisponibilidadEditor.tsx:302 y :407, components/AgendaCalendario.tsx:158. Fix: reemplazar los 7 por className="admin-btn rounded-full …" y borrar el hover:-translate-y-px suelto (ya lo hace .admin-btn:hover). Regla: una sola acción primaria vino por pantalla; el resto .admin-btn-ghost.

### Glifos de texto usados como iconos (✓ ✕ ⌄ ▲ ▼ +)

`Impacto Alto · Esfuerzo Bajo`

**Por qué:** Son caracteres del sistema: cambian de forma, peso y baseline según la fuente y el SO, y nunca alinean con el texto. Es el detalle que separa un producto pago de un prototipo.

**Cómo:** components/ServiciosEditor.tsx:169 ('+ Agregar servicio') y :179 ('✓ Guardado'); components/ProfesionalesEditor.tsx (mismo '✓ Guardado', '+ Agregar profesional' y el prefijo '✓ ' dentro de los chips de servicios); app/admin/equipo/page.tsx:92 ({ok ? "✓" : "✕"} en cada chip de permiso); app/admin/pacientes/page.tsx:27 ('⌄' como chevron); app/admin/finanzas/page.tsx:58 ('▲'/'▼' en <Delta>). Fix: SVG inline de 14px con el mismo strokeWidth del resto (Check, X, ChevronDown, TrendUp/TrendDown, Plus) y gap-1.5 en el flex contenedor.

### Ningún control del panel tiene estado :focus-visible

`Impacto Alto · Esfuerzo Bajo`

**Por qué:** Solo .admin-input tiene anillo de foco. Los ~160 botones y links del panel no muestran nada al navegar con teclado: además de ser un problema de accesibilidad, se siente inacabado apenas alguien tabula.

**Cómo:** grep de focus-visible en app/admin+components solo devuelve componentes de la landing (BookingCTA, Nav, CopyAlias, WhatsAppCTA). Fix en app/globals.css: .admin-shell :is(a,button,summary,[role='switch']):focus-visible { outline: 2px solid var(--a-accent); outline-offset: 2px; border-radius: inherit; } y quitar los outline-none sin reemplazo de components/ProfesionalesEditor.tsx:182 y :189 (los inputs invisibles de nombre/título quedan sin ninguna señal de foco).

### Los montos no alinean entre filas

`Impacto Alto · Esfuerzo Bajo`

**Por qué:** Tienen tabular-nums pero están en flujo con ml-auto, así que cada fila termina en una x distinta según el largo del texto de al lado. Escanear una columna de plata se vuelve imposible y es lo primero que mira un psicólogo en Finanzas.

**Cómo:** app/admin/finanzas/page.tsx:523-530 (el monto del movimiento), :290 (total de cobranza), :306 (monto por sesión) y app/admin/page.tsx:649/:112 (chips 'Debe $…', que además no llevan tabular-nums). Fix: sacar ml-auto y darle al span de monto una columna fija: class="w-28 shrink-0 text-right tabular-nums" (w-32 en el total). Agregar tabular-nums a todos los chips de deuda.

### Iconos genéricos, dibujados a mano en cada archivo, con pesos distintos

`Impacto Medio · Esfuerzo Medio`

**Por qué:** Conviven strokeWidth 1.6, 1.7, 1.8, 1.9, 2, 2.2 y 2.4 y tamaños 11/13/14/15/16/17/18/20 px, cada SVG pegado inline donde hizo falta. Los iconos se ven de grosores distintos en la misma fila y no hay forma de mantenerlos coherentes.

**Cómo:** Ejemplos en la misma pantalla: app/admin/page.tsx:227 (1.6), :362 (1.6), :613 (2.2), :622 (2.4); components/AdminSidebar.tsx:11 (1.7) vs :211 (2). Además el icono de 'Servicios' en AdminSidebar.tsx:37 es una etiqueta de precio genérica y el de 'Mi sitio' es un globo terráqueo: no dicen nada del dominio. Fix: components/icons.tsx con ~20 iconos a strokeWidth 1.75 y prop size (14|16|18|20), currentColor, viewBox 24. Reemplazar los ~45 SVG inline. Para Servicios usá un icono de sesión/reloj+persona; para Mi sitio, una ventana de navegador.

### El contenido se corta a 1152px en un monitor de 1920

`Impacto Medio · Esfuerzo Medio`

**Por qué:** AdminShell fija max-w-6xl. Con el sidebar de 252px, en un monitor grande quedan ~500px de crema vacía a la derecha mientras la Agenda scrollea tres pantallas. Un panel que no usa el ancho se ve como un sitio web, no como una herramienta de trabajo.

**Cómo:** components/AdminShell.tsx:9 (max-w-6xl). Fix: max-w-[1440px] y, a partir de xl, layout de dos columnas en app/admin/page.tsx: columna principal (Solicitudes + Próximos turnos) y columna lateral sticky de 340px con 'Sesiones sin cerrar' + 'Para poner al día'. Hoy esas dos secciones están al final, después de tres pantallas de scroll, y son justamente lo accionable. Los KPIs de Finanzas (grid md:grid-cols-4) pueden pasar a 6 columnas en xl fusionando KPIS y KPIS2, que hoy son dos filas separadas con tamaños de número distintos (1.55rem vs 1.25rem) sin razón semántica.

### El serif aparece de a ratos y contradice la regla del propio CSS

`Impacto Medio · Esfuerzo Bajo`

**Por qué:** globals.css:399 dice explícitamente que los títulos del panel van en sans porque 'el serif se sentía fuera de lugar en un dashboard' — y después hay serif (y hasta itálica) salpicado en seis lugares. Una regla escrita y no respetada es exactamente lo que se ve como descuido.

**Cómo:** app/admin/page.tsx:534 ('admin-stat font-serif text-2xl italic' para la hora del turno — itálica en un dato numérico), :503 y :620; app/admin/finanzas/page.tsx:455 (monto por profesional en serif) y :467 ('Movimientos' en font-serif text-lg mientras los otros h3 de la misma página son .admin-kicker); app/admin/pacientes/[id]/page.tsx:97 y :225. Fix: sacar font-serif e italic de todo app/admin/** salvo el wordmark del sidebar. La hora del turno va en sans, font-semibold, tabular-nums.

### Tres estilos distintos para el mismo nivel de título de sección

`Impacto Medio · Esfuerzo Bajo`

**Por qué:** En Agenda los h2 son 18px semibold sobre border-b; en Finanzas los títulos de tarjeta son .admin-kicker (11-13px, mayúsculas, vino); y 'Movimientos' es serif 18px. Tres jerarquías para la misma altura de información: el usuario no puede aprender a leer la página.

**Cómo:** Comparar app/admin/page.tsx:311 / :440 / :481 (patrón A) contra app/admin/finanzas/page.tsx:343 / :391 / :425 / :448 (patrón B, .admin-kicker) y :467 (patrón C, serif). Fix: extraer <AdminSectionHeader title count hint action /> con el patrón A (h2 18px semibold + chip de conteo + hint a la derecha + border-b) y usarlo en las 11 secciones. Reservar .admin-kicker exclusivamente para labels de campo y KPIs, que es para lo que está definido.

### Ritmo vertical arbitrario, con un div espaciador vacío

`Impacto Medio · Esfuerzo Bajo`

**Por qué:** mt-14 / mt-8 / mt-6 / mt-5 / mt-4 mezclados sin criterio, y un <div className="mt-8" /> puesto a mano para empujar contenido. El espaciado es lo que hace que una UI se sienta diseñada; acá está resuelto a ojo.

**Cómo:** app/admin/page.tsx:493 es literalmente <div className="mt-8" /> (borrarlo y darle el margen al elemento siguiente). Después normalizar dos ritmos y nada más: separación entre secciones = mt-12, separación dentro de sección = mt-5. Hoy hay 22 mt-4, 14 mt-5, 11 mt-6, 7 mt-8 y 4 mt-14 solo en app/admin/**.

### Copy en femenino fijo: el producto asume que la usuaria es una sola persona

`Impacto Medio · Esfuerzo Bajo`

**Por qué:** Se vende a psicólogos de AR/MX/USA. Que el panel diga 'esta profesional' y 'Activa/Oculta' a un psicólogo varón es el tipo de detalle que hace desconfiar del resto del producto.

**Cómo:** components/ProfesionalesEditor.tsx: itemLabel 'esta profesional' en <DeleteConfirm>, los estados del switch 'Activa'/'Oculta', el title 'Visible para reservar', y el placeholder 'Psicóloga clínica · MP 0000'. Fix: 'este profesional' → mejor aún, usar el nombre cargado o 'este perfil'; switch a 'Visible'/'Oculto'; placeholder neutro 'Psicología clínica · MP 0000'. Revisar también 'Agregar profesional' vs el label del sidebar.

### Elevación sin escala: sombras de 3 capas, sombras coloreadas y shadow-2xl mezclados

`Impacto Medio · Esfuerzo Bajo`

**Por qué:** Hay una sombra distinta por componente (.admin-card de 3 capas, .admin-btn con sombra vino de 20px, shadow-float, shadow-2xl, shadow-[0_-12px_32px]). Sin escala declarada, todo se ve un poco flotando y nada se ve importante.

**Cómo:** app/globals.css:352 (.admin-card), :435 (.admin-btn, sombra coloreada rgba(138,74,102,0.55) — bajarla a 0.35 y a 12px de blur), :448 (.admin-btn-ghost); components/AdminSidebar.tsx:242 (shadow-2xl); components/DisponibilidadEditor.tsx:398. Fix: definir --a-shadow-1 (reposo), --a-shadow-2 (hover/elevado), --a-shadow-3 (overlay/drawer) en .admin-shell y que ningún componente escriba box-shadow propio. Aprovechá para sacar el gradiente de AdminPageHeader.tsx:22: es una barra de 1px de ancho con degradé vertical, imperceptible y gratuito — color sólido var(--a-accent).

---

## Conversion y onboarding

### Alta autoservicio real: sacar los tenants de la env TENANTS y llevarlos a la base

`Impacto Alto · Esfuerzo Alto`

**Por qué:** Hoy dar de alta un cliente exige editar la env var TENANTS (JSON host→UUID) y redeployar Vercel. Eso significa que nadie puede suscribirse un domingo a la noche, que el dueño es el cuello de botella de cada alta, y que el tiempo entre 'quiero probarlo' y 'estoy adentro' se mide en horas. Ese hueco es donde se pierde la mayoría de los interesados: el lead se enfría antes de ver el producto.

**Cómo:** lib/tenant.ts:31 tenantMap() lee process.env.TENANTS y resolveTenantFromHost() corre en el middleware (edge). El cambio: tabla tenants(slug unique, professional_id, dominio_propio, estado) en Supabase + resolución por slug/host con caché corta (KV o unstable_cache, 60s) y fail-closed idéntico al actual (host no mapeado ⇒ 404, nunca degradar al tenant por defecto — es la garantía del ADR-0001 y no se toca).
Flujo de alta: /registro pide email, nombre, y slug (con chequeo de disponibilidad en vivo) → crea fila en professionals + tenants + la cuenta owner en lib/accounts.ts → deja la sesión iniciada y redirige a /admin. Objetivo medible: de 'clic en suscribirme' a 'panel propio en anagomez.tudominio.app' en menos de 90 segundos, sin intervención humana.
Ojo con el orden: esto no sirve de nada si primero no se arregla el hardcode de marca (idea 1), porque el usuario nuevo aterrizaría en el panel de Paulina.

### Landing pública del SaaS con prueba gratis: hoy no hay dónde suscribirse

`Impacto Alto · Esfuerzo Alto`

**Por qué:** app/page.tsx es el sitio del psicólogo, no el del producto. No existe ninguna página que le explique a un psicólogo qué es esto, cuánto sale y cómo empezar — ni un solo string de 'prueba gratis', 'suscripción' o 'precio' en el código. El funnel arranca en el paso 3: solo puede entrar quien ya habló con el dueño por privado. Eso pone un techo duro a la cantidad de suscriptores por semana, sin importar cuán bueno sea el panel.

**Cómo:** Landing separada del sitio-plantilla (dominio de plataforma, no subdominio de tenant), con: demo interactiva o video de 60 segundos del panel real, precio en ARS/MXN/USD según país, y un solo CTA — 'Probá 14 días gratis' sin tarjeta.
Lo que más convierte en esta categoría es mostrar el producto ya lleno, no vacío: un sitio de ejemplo navegable ('así se va a ver el tuyo') y capturas del panel con datos. Ya existe la carpeta capturas/ en el repo.
Sobre el trial sin tarjeta: baja fricción de entrada y sube el volumen de pruebas, pero solo funciona si el onboarding lleva al aha (ideas 3, 4 y 5) dentro de los primeros 2 días. Un trial sin activación es una lista de emails muertos. Encadenado: día 0 alta → día 0 sitio publicado → día 1-3 primer turno de prueba → día 10 recordatorio con el resumen de lo que ya tiene cargado ('tenés 3 servicios, tus horarios y 12 turnos') → día 14 cobro.
Y una cosa que en salud pesa más que el precio: la landing tiene que decir con todas las letras dónde viven los datos, que las historias clínicas están aisladas por consultorio y qué pasa si el psicólogo se va (exportación). Sin eso, el que evalúa en serio no avanza.

### Checklist de primeros pasos dentro del panel, con progreso real

`Impacto Alto · Esfuerzo Medio`

**Por qué:** La checklist existe pero vive en docs/guias/PRIMEROS-PASOS.md — un markdown del repo que el psicólogo nunca va a abrir. Sin ella, el usuario entra a Agenda vacía, ve un menú de 8 secciones (Agenda, Asistente, Pacientes, Finanzas, Servicios, Profesionales, Mi sitio, Equipo, Disponibilidad) y no tiene idea de en qué orden tocar nada. La parálisis en la primera sesión es la causa #1 de churn en semana 1.

**Cómo:** Card fijo arriba de app/admin/page.tsx (antes de las métricas de la línea ~240), visible hasta completar los 5 pasos, con barra de progreso y estado derivado de datos reales — no de un flag que el usuario marca a mano:
1. Cargá tu primer servicio → listServices().length > 0
2. Contá quién sos → marca.nombre && marca.sobreMi
3. Definí tus horarios → getScheduling() con al menos una regla
4. Mirá tu sitio → evento 'sitio_visto'
5. Probá una reserva → existe al menos una solicitud
Cada ítem: título en imperativo, tiempo estimado real ('4 min'), y un botón que lleva directo a la pantalla. El paso completado se tacha y colapsa. Cuando cierran los 5, el card se reemplaza por 'Tu consultorio está publicado' + el kit de compartir (idea 6) y no vuelve a aparecer.
Detalle que importa: los 5 pasos deben ser exactamente los de PRIMEROS-PASOS.md, y ese doc pasa a ser la versión larga linkeada desde el card. Dos checklists distintas confunden más que ninguna.

### Aviso por email de cada turno nuevo (hoy la notificación depende de Telegram, que casi nadie configura)

`Impacto Alto · Esfuerzo Medio`

**Por qué:** Es el agujero más caro del funnel. El momento 'aha' del producto es 'entró un paciente sin que yo hiciera nada' — y hoy ese aviso solo sale por Telegram (lib/telegram.ts:78 notificarTurno), que requiere que el psicólogo cree un bot en BotFather y que el dueño cargue TELEGRAM_CHAT_IDS a mano. En multi-tenant sin ese mapa la función hace fail-closed y no notifica nada. Resultado: el primer turno entra, nadie se entera, el paciente no recibe respuesta en 48hs y se va. El psicólogo concluye que 'el sistema no trae pacientes' y cancela.

**Cómo:** Integrar Resend (no hay ninguna infra de email: el grep de resend/sendgrid/nodemailer/smtp en app, lib y components no devuelve nada) y disparar desde el after() que ya existe en app/api/turnos/route.ts.
Dos mails, no uno:
- Al psicólogo: 'Nueva solicitud: Ana G., martes 12 a las 15:00, online' + botón Confirmar que abre /admin. Sin el motivo de consulta en el cuerpo — es dato de salud y el código ya toma esa precaución con Telegram, hay que mantenerla.
- Al paciente (app/api/turnos/route.ts ya captura body.email): confirmación con fecha, modalidad y qué pasa después. Hoy el paciente reserva y no recibe absolutamente nada, lo que dispara ausencias y llamados de '¿me llegó el turno?'.
Más adelante: recordatorio 24hs antes. Es la funcionalidad que más se pide y la que justifica la suscripción mes a mes.

### Kit de compartir: link, QR, texto para Instagram, mensaje de WhatsApp y firma de mail

`Impacto Alto · Esfuerzo Medio`

**Por qué:** El producto termina en 'tu sitio está publicado' y ahí lo suelta. Pero el psicólogo no vive de tener un sitio: vive de que le lleguen pacientes, y para eso tiene que distribuir el link él mismo. Hoy lo único que hay es un '<a href="/">Ver mi sitio ↗</a>' en components/EditorMarca.tsx:135 — ni siquiera se puede copiar la URL. Si el link no circula, no entran turnos; si no entran turnos, el psicólogo no ve valor y no renueva. La retención del SaaS depende de resolver esta parte, no de más features del panel.

**Cómo:** Sección 'Compartir tu sitio' en /admin/marca (o solapa nueva), todo con botón Copiar y feedback visual — reusar el patrón de components/CopyAlias.tsx:
- Link limpio (anagomez.tudominio.app) + link directo a /reservar para saltear la landing.
- QR descargable en PNG y SVG, generado del lado del servidor. Es lo que va en la puerta del consultorio, en el recetario y en la tarjeta personal. Alto impacto en AR/MX, donde el QR ya es lenguaje cotidiano.
- Texto de bio de Instagram listo ('📅 Reservá tu turno online 👇' + link), porque el link en bio es el canal real de captación de esta profesión.
- Mensaje de WhatsApp armado para reenviar a un paciente que pide turno por chat: 'Hola! Podés elegir día y horario acá: <link>'. Con botón que abre wa.me directamente.
- Firma de mail en HTML, con botón Copiar (copia con formato) e instrucciones de 3 pasos para pegarla en Gmail y en Outlook.
- Placa cuadrada 1080x1080 para postear en Instagram con el nombre, la ciudad y el QR, generada con la paleta elegida en lib/marca.ts.
Medir clics por canal con un parámetro ?v=ig|wa|qr guardado en la solicitud: le muestra al psicólogo de dónde le vienen los pacientes, y eso solo ya es un argumento de renovación.

### Fotos e imágenes propias: hoy todos los sitios comparten las mismas

`Impacto Alto · Esfuerzo Medio`

**Por qué:** El sitio público usa assets fijos del repo — /hero/c1.jpg, /sobre-mi.jpg, /interludio.jpg, /nature/foliage.jpg (app/page.tsx:114, 222, 330, 359). Eso significa que el sitio de Ana en Guadalajara es visualmente idéntico al de Paulina en Viedma, con la misma foto en 'Sobre mí'. Un psicólogo no comparte en su Instagram un sitio con la foto de otra persona: se avergüenza y no lo difunde. El sitio deja de cumplir su única función, que es circular.

**Cómo:** Subida de imagen para hero y 'Sobre mí' en /admin/marca, reusando la lógica que ya está resuelta en components/ProfesionalesEditor.tsx:10 (lee, recorta y achica del lado del cliente antes de subir). Guardar en Supabase Storage con prefijo por professional_id.
Para quien no quiere subir foto (muy común: no tienen una foto profesional a mano), ofrecer 4-6 fondos abstractos por paleta en vez de la foto de una persona real. Un fondo genérico bonito es infinitamente mejor que la cara de otra psicóloga.
Y revisar los decorativos: /decor/rama-1.png, los pétalos de components/Petals.tsx y el video /video/hero-opt.mp4 son fuertemente 'botánico rosa'. Con la paleta Carbón o la Océano quedan incoherentes. Mínimo: que los decorativos se apaguen o cambien de tinte según marca.paleta.

### Despersonalizar el panel: hoy el suscriptor ve el nombre de otra psicóloga

`Impacto Alto · Esfuerzo Bajo`

**Por qué:** Es el abandono más brutal y más barato de arreglar. El psicólogo paga, entra a /admin y lee 'Paulina Pilotti · MP 7321' en el login, en el sidebar y en /reservar. En 3 segundos concluye 'esto es una demo, no es mío' y no vuelve. Ningún checklist de onboarding sobrevive a eso.

**Cómo:** Datos hardcodeados que hay que leer de lib/marca.ts (marcaActual()) en vez de tenerlos en el código:
- components/AdminSidebar.tsx:84 → 'Paulina Pilotti' + 'Panel de gestión'. Es un client component: pasarle la marca por prop desde components/AdminShell.tsx.
- app/admin/login/page.tsx:49 y :153 → nombre, iniciales 'PP' y 'Lic. Paulina Pilotti · MP 7321' en el pie. Convertirla en server component que resuelve el tenant por host y renderiza un <LoginForm> cliente adentro. Fallback neutro cuando la marca está vacía: iniciales del nombre o el logo de la plataforma, nunca un nombre ajeno.
- app/reservar/page.tsx:10, 16, 76, 153, 159 → título, metadata, header y ficha del profesional.
- app/layout.tsx:20 (SITE_URL = 'https://paulinapilotti.com') y :63 (JSON-LD name) → derivar de marca.dominio con fallback al host del request.
- app/robots.ts:6 y app/sitemap.ts:6 → mismo dominio hardcodeado; hoy todos los tenants le mandan a Google el sitemap de otra persona.
Regla que conviene fijar: agregar un test tipo tests/tenant.test.ts que falle si aparece el string 'Pilotti' fuera de fixtures. Es la red que evita que vuelva a filtrarse.

### Botón 'Probar una reserva' que cierra el circuito en 20 segundos

`Impacto Alto · Esfuerzo Bajo`

**Por qué:** El paso 6 de PRIMEROS-PASOS.md pide que el psicólogo abra su sitio en otra pestaña, complete el formulario como si fuera un paciente y vuelva al panel. Suena trivial y es donde muchos se caen: no encuentran la URL, se confunden entre panel y sitio, o directamente lo saltean. Y si lo saltean, nunca ven el producto funcionando y nunca creen que funciona. Ese es el momento aha; no se puede dejar librado a que el usuario lo arme solo.

**Cómo:** Botón en el paso 5 del checklist que abre un modal: 'Vamos a simular que un paciente reserva un turno con vos'. Precarga nombre 'Paciente de prueba', elige el primer servicio y el primer slot libre real (getAvailableSlots ya está expuesto en app/api/slots/route.ts), y confirma. Acto seguido la pantalla scrollea a la Bandeja de solicitudes con la solicitud recién entrada resaltada, y dispara el email de aviso (idea 4) para que el psicólogo lo vea llegar a su casilla en vivo.
La solicitud queda marcada con un flag esPrueba: se muestra con un chip 'Prueba' y un link 'Borrar esta prueba' que la saca sin ensuciar Finanzas ni Pacientes. Si no se puede simular porque falta un servicio o disponibilidad, el modal dice exactamente qué falta y linkea ahí.
Es la mejor demo del producto que existe, y la da el producto mismo.

### Arrancar con servicios, horarios y textos precargados en vez de todo vacío

`Impacto Alto · Esfuerzo Bajo`

**Por qué:** Hoy el psicólogo entra a un panel completamente en blanco y tiene que inventar de cero: qué servicios ofrece, cuánto duran, qué horarios, qué dice su hero. Cada campo vacío es una microdecisión, y la suma de microdecisiones es lo que hace que la configuración se posponga 'para el finde' y nunca se retome. Los defaults sensatos convierten un trabajo de 15 minutos en uno de 3.

**Cómo:** En el alta del tenant, sembrar:
- Servicios: 'Sesión individual · 50 min' y 'Primera consulta · 60 min', con precio vacío y un placeholder claro. El psicólogo ajusta el precio y ya tiene reservas habilitadas.
- Disponibilidad: lunes a viernes de 9 a 13 y de 15 a 19, zona horaria detectada del navegador (no asumir Buenos Aires: el objetivo incluye MX y USA, y lib/scheduling/types.ts ya modela zona_horaria).
- Textos de marca: los placeholders que ya están escritos en components/EditorMarca.tsx ('Un espacio para cuidar tu salud mental.', 'Terapia con respaldo científico…') dejan de ser placeholder y pasan a ser valor inicial real, para que el sitio nunca se vea roto.
Y marcar visualmente lo precargado con un chip 'Sugerido — editalo' para que no parezca dato propio olvidado. La diferencia clave: hoy un psicólogo que no configura nada tiene un sitio inservible; con esto tiene un sitio publicable desde el minuto cero y lo único obligatorio es poner el precio.

### Vista previa real del sitio en 'Mi sitio', no una tarjeta que lo imita

`Impacto Medio · Esfuerzo Medio`

**Por qué:** El aside de vista previa en components/EditorMarca.tsx:139-176 dibuja a mano una tarjetita con el nombre, el hero y un botón falso. Pero el sitio real (app/page.tsx, 880 líneas) tiene hero full-bleed con foto, sección sobre mí, interludio, servicios, botánicos animados y video. La brecha entre lo que el editor promete y lo que el sitio muestra genera dos problemas: el psicólogo no confía en lo que está editando y guarda a ciegas, o guarda, abre el sitio, se lleva una sorpresa y vuelve a editar. Cada ida y vuelta es fricción y cada fricción tiene una tasa de abandono.

**Cómo:** Reemplazar la tarjeta por un iframe del sitio real escalado (transform: scale) con selector Escritorio/Celular, que se refresca al cambiar de paleta. Para que el iframe muestre cambios sin guardar, servir la home con un query ?preview=<token-firmado> que aplica la marca en borrador. Si el iframe complica por CSP, la alternativa barata es un modo 'Previsualizar' que abre el sitio real en pestaña nueva con el borrador aplicado, antes de publicar.
Y separar los dos verbos que hoy están fusionados en el botón 'Guardar y publicar' (línea 126): 'Guardar borrador' vs 'Publicar cambios'. Un psicólogo que está probando textos a las 11 de la noche no quiere que cada tecleo salga en vivo, y hoy no tiene forma de saber que sí sale.

### Unificar las 4 pantallas de configuración en un flujo guiado

`Impacto Medio · Esfuerzo Medio`

**Por qué:** Publicar el sitio exige pasar por Servicios, Profesionales, Disponibilidad y Mi sitio, con dependencias que el psicólogo no ve (la disponibilidad depende de los servicios; el sitio depende de las dos). PRIMEROS-PASOS.md lo admite: 'El orden no es opcional'. Si la documentación necesita advertir sobre el orden, la interfaz está mal: hoy el usuario puede entrar por cualquier puerta, configurar en el orden equivocado, ver que no funciona y concluir que el producto está roto.

**Cómo:** Dos caminos posibles, ambos válidos:
a) Wizard de primera vez: en el primer login, en vez del panel, un flujo de 4 pasos con Siguiente/Atrás y barra de progreso, que reusa los editores existentes (ServiciosEditor, ProfesionalesEditor, DisponibilidadEditor, EditorMarca) y termina en 'Publicar mi sitio'. Se puede saltear ('lo hago después') y queda como checklist.
b) Más barato: agrupar en components/AdminSidebar.tsx (NAV, líneas 17-76) bajo un encabezado 'Configuración' los cuatro ítems, y deshabilitar visualmente Disponibilidad hasta que haya al menos un servicio, con tooltip 'Primero cargá un servicio: los horarios se definen por servicio'. Bloquear en el momento correcto enseña más que cualquier tour.
Además dos nombres que confunden hoy: 'Profesionales' en un consultorio unipersonal suena a otra cosa (es tu propio perfil) — llamarlo 'Mi perfil' o 'Quién atiende'. Y 'Mi sitio' contiene datos de contacto y el dominio, que el usuario busca en 'Configuración'. En el sidebar, un texto secundario de 3 palabras bajo cada ítem resuelve la mitad del problema sin refactor.

### Exportar y traer datos: qué hace el psicólogo que ya tiene 30 pacientes

`Impacto Medio · Esfuerzo Medio`

**Por qué:** Dos fricciones opuestas que frenan la suscripción. Adelante: quien ya trabaja con agenda propia ve que empezar implica cargar 30 pacientes a mano y lo posterga indefinidamente. Atrás: quien evalúa un sistema que va a guardar historias clínicas pregunta '¿y si mañana no me sirve, me quedo sin nada?'. En salud, la respuesta a la segunda pregunta condiciona la decisión de compra más que el precio.

**Cómo:** Importación: pantalla que acepta pegar una lista (nombre + contacto, uno por línea) o un CSV, con previsualización de las filas antes de confirmar. No hace falta un importador sofisticado — el 80% de los casos es una lista de nombres y teléfonos. Que se pueda copiar directo de la agenda del celular es más importante que soportar 15 formatos.
Exportación: ya existe app/admin/finanzas/export/route.ts para movimientos; extenderlo a pacientes y notas clínicas, y decirlo explícito en la landing y en el panel: 'Tus datos son tuyos. Exportalos cuando quieras.' Además de conversión, es lo correcto en términos de Ley 25.326 y equivalentes en MX/USA, y el proyecto ya toma en serio esa dimensión (docs/SEGURIDAD.md, RLS forzado sobre clinical_notes).

### Estados vacíos que enseñan y ofrecen la acción, no que informan

`Impacto Medio · Esfuerzo Bajo`

**Por qué:** Los estados vacíos actuales describen la ausencia pero no destraban nada. 'Todavía no hay turnos confirmados' (app/admin/page.tsx:496) o 'Todavía sin datos' (app/admin/finanzas/page.tsx:347 y :395) dejan al usuario en la misma pantalla sin saber qué hacer. El estado vacío es la pantalla que MÁS ve un usuario nuevo — es el único momento del producto donde tenés su atención completa y ninguna distracción.

**Cómo:** Patrón para todos: qué es esta sección (una línea) + por qué está vacía + botón con la acción concreta.
- app/admin/page.tsx:322 (bandeja): el texto ya es bueno; sumarle el botón 'Probar una reserva' (idea 5).
- app/admin/page.tsx:496 (turnos): 'Acá van a aparecer los turnos que confirmes. Podés confirmar una solicitud de la bandeja o cargar un turno a mano.' + botón 'Agendar turno' (components/NuevoTurnoModal.tsx ya existe).
- components/PacientesList.tsx:87 dice 'Se crean automáticamente al confirmar un turno' — es correcto y valioso, pero le falta la salida para quien ya tiene pacientes de antes: botón 'Cargar un paciente que ya atiendo'. Sin eso, el psicólogo con 20 pacientes activos siente que el sistema arranca de cero y no migra.
- app/admin/finanzas/page.tsx:347 y :395: 'Todavía sin datos' no explica nada. Cambiar por 'Cuando marques un turno como realizado, el ingreso aparece acá' + link a la agenda.
- components/DisponibilidadEditor.tsx:336 está bien resuelto; usarlo de modelo.

### Poner al Asistente IA a hacer el onboarding en vez de esperar preguntas

`Impacto Medio · Esfuerzo Bajo`

**Por qué:** Ya existe un asistente con voz y herramientas de escritura con confirmación (lib/assistant/tools.ts, 615 líneas) — es el diferencial más fuerte del producto frente a Doctoralia o una agenda de Google. Pero está escondido como un ítem más del menú y arranca en blanco: un usuario nuevo no sabe qué pedirle y no lo usa. La feature que más impresiona en una demo es la que menos se descubre sola.

**Cómo:** En el primer ingreso, que el asistente salude con una propuesta concreta en vez de un cursor vacío: 'Puedo configurarte el consultorio ahora. Contame qué atendés y en qué horarios, y lo cargo yo.' Con 3 chips de ejemplo listos para tocar: 'Atiendo lunes a viernes de 9 a 18', 'Sesión individual de 50 minutos a $X', 'Mostrame cómo va a quedar mi sitio'.
El mecanismo de confirmación para las tools de escritura ya está (WRITE_TOOLS en lib/assistant/tools.ts), así que el riesgo es bajo: el psicólogo dicta en lenguaje natural y aprueba cada cambio. Cargar la disponibilidad hablando en vez de tocar una grilla es exactamente el tipo de momento que hace que alguien cuente el producto a un colega.
Y un detalle de descubrimiento: cada ítem del checklist de primeros pasos (idea 3) debería tener un 'o pedíselo al asistente' que abre el chat con el prompt precargado. Es la forma más barata de que la feature se pruebe.

### Medir el funnel: hoy no hay forma de saber en qué paso se cae la gente

`Impacto Medio · Esfuerzo Bajo`

**Por qué:** Todas las hipótesis anteriores, incluidas las mías, son hipótesis. Sin eventos de activación, la próxima iteración se decide por intuición, y con los primeros suscriptores entrando en días esa ceguera cuesta caro: con 10 usuarios no hay margen para adivinar dos veces.

**Cómo:** Tabla eventos(professional_id, tipo, ts, metadata) y registrar los hitos del funnel: alta, primer_login, servicio_creado, disponibilidad_cargada, marca_guardada, sitio_visto, reserva_prueba, primer_turno_real, primer_pago_registrado. Una vista interna simple (o incluso una query guardada) con el embudo y la mediana de tiempo entre pasos alcanza para empezar.
Lo que hay que mirar todas las mañanas la primera semana: cuántos llegan a sitio_visto el día 0, y cuántos días pasan hasta primer_turno_real. Si el segundo número supera los 7 días, el problema no es el panel — es la distribución del link, y la prioridad pasa a ser el kit de compartir (idea 6).
Complemento barato y de mucho mayor señal con 10 usuarios: llamar por teléfono a los 5 primeros suscriptores a los 3 días. Con esa muestra, una conversación vale más que cualquier dashboard.

---
