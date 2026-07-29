# Plan — Fase 1: cuentas individuales

> Generado por un panel de 3 expertos + tech lead (2026-07-29). Es el plan de referencia;
> el avance real se registra en [../BITACORA.md](../BITACORA.md).

## Resumen de la decisión

Fase 1 = cuentas individuales reales, con identidad GLOBAL por email (app_users) + membresias N:N por consultorio (memberships con rol y permisos), hash PBKDF2-HMAC-SHA256 600k con pepper opcional, sesion v2 firmada que lleva user_id+session_id+token_version DENTRO de la firma, y audit_log de quien hizo que. La clave para poder construir y VERIFICAR todo sin Supabase es que las cuentas viven en un adaptador dual identico al de lib/store.ts: modo ARCHIVO (data/auth.json, un solo archivo global porque la identidad es cross-tenant) o modo SUPABASE (tablas dedicadas, service_role). El blob app_state NO se toca. La demo no se rompe porque el login acepta email+password Y, mientras el tenant no tenga cuentas y no venza LEGACY_PASSWORD_HASTA, sigue aceptando la passphrase actual de ADMIN_PASSWORDS. Quedan fuera de Fase 1: RLS real con JWT propio, Supabase Auth, email transaccional y la migracion relacional del dominio.

## Plan de implementación

ORDEN DE IMPLEMENTACION (5 pasos, cada uno compila, corre y se verifica en modo ARCHIVO antes de pasar al siguiente).

═══ PASO 0 — Andamiaje de verificacion local (medio dia, ANTES de tocar auth) ═══
Sin esto no hay forma de saber si algo funciona: el dev local corre en modo archivo y esta PC no llega a Supabase.

0.1 tsconfig.json: agregar "allowImportingTsExtensions": true (es seguro, ya esta noEmit:true). Habilita que los tests importen "../lib/passwords.ts" con extension explicita, que es lo que exige el type-stripping de Node 22.
0.2 package.json scripts:
    "test:auth": "node --experimental-strip-types --test scripts/auth.test.mts"
    "auth:owner": "node --experimental-strip-types scripts/crear-owner.mts"
    "verificar:auth": "node scripts/verificar-auth.mjs"
    (Node local es v22.16.0: --experimental-strip-types es obligatorio, no viene por default.)
0.3 .env.local de verificacion: DOS consultorios en localhost, que es el truco que permite probar aislamiento cross-tenant sin dominios:
    TENANTS={"localhost":"aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa","127.0.0.1":"bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb"}
    ADMIN_SECRET=<32 bytes hex>   AUTH_PEPPER=<32 bytes hex>
    (normalizarHost() ya saca el puerto, asi que localhost:3000 y 127.0.0.1:3000 resuelven a tenants distintos.)
Criterio de salida: `npm run dev` levanta y /admin sigue funcionando con la passphrase actual.

═══ PASO 1 — Primitivas puras y testeables (1 dia) ═══
Todo lo de este paso es codigo SIN imports (solo Web Crypto global), para que corra bajo `node --test` sin arrastrar Next.

1.1 lib/passwords.ts (NUEVO)
    - hashPassword(plain): PBKDF2-HMAC-SHA256, 600.000 iteraciones, salt de 16 bytes de crypto.getRandomValues, dk de 32 bytes, todo con crypto.subtle (portable Edge/Node, cero dependencias nativas).
    - Pepper: si existe AUTH_PEPPER, se pre-hashea la contraseña con HMAC-SHA256(pepper, plain) y ESE digest de 32 bytes entra al PBKDF2. Entrada de longitud fija (no hay DoS por password de 1 MB) y un dump de la base sin la env no sirve para nada.
    - Formato: `pbkdf2-sha256$<iters>$<pepperId>$<salt_b64url>$<dk_b64url>`, pepperId = "p0" (sin pepper) o "p1" (con AUTH_PEPPER). Autodescriptivo: permite subir iteraciones o rotar pepper con rehash perezoso en el proximo login.
    - verifyPassword(plain, stored): parsea params del string, deriva y compara BYTES con acumulador XOR sobre 32 bytes fijos. NO reusar safeEqual() de lib/auth.ts (tiene early-return por longitud y opera sobre UTF-16; sirve para el hex del HMAC, no para esto).
    - needsRehash(stored): true si iters o pepperId no son los actuales.
    - DUMMY_HASH exportado (hash fijo de una passphrase constante) para quemar CPU en el camino "usuario inexistente" y no filtrar existencia por timing.
    - validarPassword(plain): min 12 code points tras NFKC, max 256, sin reglas de composicion, sin expiracion. Denylist contextual chica (nombre del consultorio, "psicologia", "consultorio", "turnos", año) — la lista de 10k va en un import() dinamico SOLO en el path de setear contraseña, nunca en el de login (cold start).

1.2 lib/permisos.ts (NUEVO, puro)
    - type Rol = 'owner'|'admin'|'profesional'|'asistente'
    - type Permiso = 'agenda'|'pacientes'|'notas_clinicas'|'servicios'|'disponibilidad'|'finanzas'|'equipo'|'asistente_ia'|'configuracion'
    - permisosPorRol(rol) con los mismos defaults que la funcion SQL (notas_clinicas en FALSE para admin y asistente: dato de salud, need-to-know, Ley 25.326).
    - tienePermiso(rol, permisos, p): owner siempre true (no se puede auto-limitar), el resto lee el jsonb.
    REGLA: este archivo y public.permisos_por_rol() en SQL tienen que dar lo mismo. El test 1.4 lo verifica contra una copia literal de la tabla de valores.

1.3 lib/auth.ts (MODIFICAR — se conserva sign() y safeEqual())
    - Token v2: payload `v2.<SESSION_VERSION>.<pid>.<uid>.<sid>.<tv>.<ts>` + "." + HMAC hex. El tenant sigue DENTRO de la firma (no perder la proteccion anti-replay cross-tenant que ya existe).
    - makeTokenV2({pid,uid,sid,tv}) y parseTokenV2(token, expectedPid) -> {uid,sid,tv} | null. parseTokenV2 valida firma, SESSION_VERSION, pid y TTL (8 h, bajado de 12 h: es la jornada de un consultorio). Cero I/O: es lo unico que corre en Edge.
    - Tokens con el formato viejo `ok.<v>.<tenant>.<ts>` se RECHAZAN (re-login forzado; ya es el criterio documentado en el archivo).
    - cookieName(): "__Host-pp_admin" en produccion, "pp_admin" en local (el prefijo __Host- exige Secure+Path=/+sin Domain y es lo que impide que ana.codexy.app sobreescriba la cookie de juan.codexy.app; en http local no se puede usar).
    - checkPassword() se renombra a legacyPasswordOk() y se marca @deprecated. NO se borra todavia.

1.4 scripts/auth.test.mts (NUEVO) — `npm run test:auth`
    - hash/verify ida y vuelta; verify falla con password mala; dos hashes de la misma password difieren (salt); needsRehash detecta iters viejos; verify de un hash con iters distintos sigue funcionando.
    - validarPassword rechaza <12 y acepta unicode/espacios.
    - permisosPorRol coincide con la tabla esperada; owner ignora permisos falseados.
    - makeTokenV2/parseTokenV2: token valido pasa; firma alterada falla; pid de otro tenant falla; token vencido falla; formato v1 falla.
Criterio de salida: `npm run test:auth` en verde.

═══ PASO 2 — Adaptador de cuentas dual (archivo | Supabase) (1,5 dias) ═══
2.1 lib/accounts-store.ts (NUEVO — el archivo grande, mismo patron que lib/store.ts)
    - Modo archivo: data/auth.json, UN SOLO archivo global (no por tenant) porque la identidad es cross-tenant: "a que consultorios pertenece este email" no se puede responder con un blob por tenant. Escritura atomica (tmp + rename) y cola de mutacion, copiadas de lib/store.ts:194-200 y 264-293.
    - Modo Supabase: tablas dedicadas de 0006 con service_role. NUNCA dentro del blob app_state: un contador de intentos fallidos reescribiendo el blob compite por `rev` (lib/store.ts:219-250) y un flood de logins DoSea las escrituras de turnos y notas.
    - Seleccion de modo FAIL-CLOSED: si NODE_ENV==='production' y no hay SUPABASE_SERVICE_ROLE_KEY, tirar. Nunca degradar a archivo en serverless (throttle por instancia = anti-fuerza-bruta inexistente).
    - API (identica en ambos modos): buscarUsuarioPorEmail, crearUsuario, setCredencial, getCredencial, getMembresia(pid,uid), listarMiembros(pid), crearMembresia, actualizarMembresia, revocarMembresia, crearSesion, getSesion, revocarSesion, revocarSesionesDeUsuario, crearInvitacion, consumirInvitacion, crearReset, consumirReset, throttleFallo(key), throttleEstado(key), throttleReset(key), logAudit(evento).
    - Consumo single-use SIEMPRE atomico: en Supabase `update ... where used_at is null and expires_at > now() returning ...`; en archivo, dentro de la cola de mutacion. Nunca select-then-update.
    - Los tokens de invitacion/reset se guardan como sha256(token); el token en claro solo existe en el link.
    - logAudit: REGLA DURA — en `meta` nunca contenido clinico, solo ids y nombres de campos. En modo archivo el array se topea (ultimos 5000).

2.2 lib/accounts.ts (NUEVO — casos de uso, es donde viven las reglas de autorizacion)
    - login({email,password,pid,ip,ua}): 1) throttle por cuenta (sha256(pid+':'+emailNorm)), por IP y por tenant ANTES de derivar; 2) buscar usuario + membresia ACTIVA en ESE pid; 3) si falta cualquiera de las dos, igual correr verifyPassword contra DUMMY_HASH y devolver el MISMO 401 generico "Email o contraseña incorrectos" (hoy checkPassword lanza y devuelve 500 cuando el tenant no esta configurado: eso distingue consultorio configurado de no configurado desde afuera, hay que igualarlo); 4) exito -> reset del throttle, crear sesion, rehash si needsRehash, audit login.ok.
    - invitar / aceptarInvitacion / cambiarMiPassword / resetIniciadoPorOwner / revocarMiembro / cambiarPermisos.
    - IMPORTANTE: mientras el acceso sea 100% service_role (que saltea RLS), las reglas de autorizacion viven ACA y son las unicas que aplican. Duplicarlas: solo un owner puede crear/quitar otro owner; nadie puede auto-otorgarse permisos; un consultorio nunca queda sin owner activo. Las policies SQL equivalentes son red de seguridad para el futuro, hoy son decorativas.
    - Cambiar contraseña, revocar membresia o resetear => subir token_version (revocacion masiva) + revocar user_sessions.

2.3 scripts/crear-owner.mts (NUEVO) — la herramienta que resuelve el bootstrap SIN conectividad a Supabase:
    `npm run auth:owner -- --pid=<uuid> --email=... --nombre="..." --password=...`
    (a) escribe el owner en data/auth.json (modo archivo, para verificar local) y (b) IMPRIME el INSERT SQL con el hash ya calculado, listo para pegar en el SQL Editor del navegador. Un solo comando cubre local y produccion.

═══ PASO 3 — Sesion por usuario+tenant y gating por permiso (1,5 dias) ═══
3.1 lib/session.ts (MODIFICAR — este es el choke point y por eso el cambio es barato)
    - sesionValida(): Promise<Sesion|null> donde Sesion = {userId,email,professionalId,rol,permisos,sessionId}. Cambiar de boolean a objeto NO rompe los ~18 call sites: todos lo usan como `if (!(await sesionValida()))`, y null es falsy. Migracion sin big-bang.
    - Chequeo caro (Node, no Edge): parseTokenV2 + sesion no revocada/vencida + membresia activa + token_version coincide. Cache en memoria de 60 s por sessionId. Documentar EN EL CODIGO el SLA: revocar tarda hasta 60 s; para corte inmediato esta ADMIN_SESSION_VERSION.
    - NUEVO requirePermiso(p: Permiso): Promise<Sesion> — lanza si no hay sesion o falta el permiso.
    - requireSesion() y requireAdmin() conservan su firma.
3.2 proxy.ts (MODIFICAR) — sigue haciendo SOLO criptografia (firma, version, pid, TTL). CERO I/O: el matcher agarra casi todo el sitio. Agregar /admin/invitacion y /admin/reset a las rutas publicas junto a /admin/login.
3.3 app/api/admin/route.ts (MODIFICAR) — POST recibe {email,password}. Mantener el corte por tamaño de body y el rateLimit por IP en memoria como primer filtro barato, pero el control real es el throttle persistente. El PBKDF2 tiene que ser LO ULTIMO que se ejecuta en la ruta (si no, el hashing lento es un vector de DoS). 429 con Retry-After cuando hay lock, incluso para cuentas inexistentes que llenaron su bucket. DELETE revoca la sesion en base ademas de borrar la cookie. AGREGAR comentario "NO cambiar el runtime de esta ruta a edge" (600k iteraciones exceden el presupuesto de CPU de Edge y el login empezaria a fallar intermitente).
    Ventana legacy: si email viene vacio, se prueba legacyPasswordOk() SOLO si (a) el tenant no tiene ninguna cuenta activa y (b) Date.now() < LEGACY_PASSWORD_HASTA. Se emite token v2 con uid="legacy", rol owner, y se audita como login.legacy. Apenas existe 1 cuenta activa el fallback se apaga solo, sin intervencion manual.
3.4 app/admin/login/page.tsx (MODIFICAR) — campo Email + Contraseña, link "¿No podes entrar?" que explica pedirle el link al owner (no hay self-service sin proveedor de email). Error unico y generico.
3.5 Migrar los call sites a permisos (uno por uno, sin apuro):
    finanzas -> requirePermiso('finanzas'); pacientes y notas -> 'pacientes' / 'notas_clinicas'; servicios -> 'servicios'; profesionales -> 'equipo'; disponibilidad -> 'disponibilidad'; asistente -> 'asistente_ia'; agenda (/admin y actions.ts) -> 'agenda'.
    components/AdminSidebar.tsx recibe los permisos y OCULTA lo que no corresponde (cosmetico: el gating real es server-side).
    Cada server action de escritura llama logAudit({accion,entity_type,entity_id}).

═══ PASO 4 — UI de Equipo, invitaciones y reset asistido (1,5 dias) ═══
4.1 app/admin/equipo/page.tsx + actions.ts (NUEVO, requirePermiso('equipo')): lista de miembros con rol/permisos/ultimo acceso, invitar (rol + toggles), revocar, "generar link de reset". Como no hay proveedor de email, el link se MUESTRA una sola vez al owner para que lo pase por su canal; TTL 7 dias invitacion, 60 min reset. PROHIBIDO devolver el link en una respuesta HTTP a alguien que no sea el owner logueado.
4.2 app/admin/invitacion/page.tsx (NUEVO, publico): GET con ?token=... valida, mueve el token a cookie HttpOnly de vida corta y hace 302 a /admin/invitacion SIN el token en la URL (que no quede en historial ni Referer). Header Referrer-Policy: no-referrer + X-Robots-Tag: noindex. Form: nombre + contraseña (validarPassword) -> crea app_user si no existe, crea la membresia con el rol de la invitacion, consume la invitacion y loguea.
4.3 app/admin/cuenta/page.tsx (NUEVO): cambiar mi contraseña (pide la actual), ver y cerrar mis sesiones activas.
4.4 app/admin/reset/page.tsx (NUEVO): mismo patron de token->cookie->302 que la invitacion.

═══ PASO 5 — Verificacion y despliegue ═══
5.1 scripts/verificar-auth.mjs (NUEVO) — E2E contra `next dev` en modo archivo, con los dos tenants de localhost. Casos que DEBEN pasar:
    (1) login con password mala -> 401 generico; (2) login ok en localhost -> cookie; (3) esa cookie en 127.0.0.1 -> redirect a login (aislamiento cross-tenant, el caso mas importante); (4) usuario 'asistente' -> /admin/finanzas redirige y la server action de finanzas tira "No autorizado"; (5) 6 intentos fallidos -> 429 con Retry-After, y el 7mo sigue bloqueado; (6) el usuario correcto sigue entrando desde otra IP/otro bucket; (7) invitacion: aceptar crea cuenta y funciona; el mismo token una segunda vez falla; (8) revocar membresia -> la sesion muere en <=60 s; (9) data/auth.json tiene las entradas de audit_log con actor y accion, y NINGUN contenido clinico; (10) con >=1 cuenta activa, la passphrase legacy deja de funcionar.
5.2 Aplicar 0006_cuentas.sql por el SQL Editor del navegador. El propio script termina con un bloque DO que verifica relrowsecurity en las 8 tablas nuevas y hace RAISE EXCEPTION si quedo a medias (el SQL se aplica a mano: este es el unico guardarrail contra deriva).
5.3 Correr `npm run auth:owner` una vez por tenant existente, pegar el SQL que imprime, verificar con la query de "consultorios sin owner" (debe devolver 0 filas).
5.4 Deploy a Vercel con AUTH_PEPPER, ADMIN_SECRET y LEGACY_PASSWORD_HASTA cargadas. Probar login real en el preview.
5.5 Pasada la fecha de LEGACY_PASSWORD_HASTA: borrar ADMIN_PASSWORDS y ADMIN_PASSWORD de Vercel y borrar legacyPasswordOk() del codigo.

RIESGOS QUE HAY QUE TENER PRESENTES
- AUTH_PEPPER es un secreto de DISPONIBILIDAD: si se pierde, ninguna contraseña vuelve a validar y todos quedan afuera. Guardarlo en el gestor de contraseñas ADEMAS de Vercel. Rotarlo = p1 -> p2 con rehash perezoso, nunca reemplazo directo.
- service_role sigue siendo la llave maestra: las policies de 0006 son deny-by-default para anon/authenticated pero el servidor las saltea. La autorizacion de Fase 1 la aplica lib/accounts.ts, no la base.
- El proxy Edge no consulta la base: una sesion revocada pasa el proxy y muere en sesionValida(). Si alguien agrega una pagina bajo /admin que no llama a requireSesion/requirePermiso, esa ruta acepta sesiones revocadas. Agregar al checklist de review.
- Email global = riesgo de enumeracion cross-tenant ("quien trabaja en tal consultorio"). Por eso error identico y tiempo constante son requisito, no adorno.
- Entregar el link de invitacion/reset por WhatsApp traslada el riesgo a ingenieria social: verificar identidad antes de entregarlo y auditar quien lo autorizo.

## Archivos a tocar

- supabase\migrations\0006_cuentas.sql (NUEVO — migracion completa, se aplica por el SQL Editor del navegador)
- lib\passwords.ts (NUEVO — PBKDF2 600k + pepper con Web Crypto, formato autodescriptivo, verificacion en tiempo constante sobre bytes, DUMMY_HASH, validarPassword. SIN imports para que corra bajo node --test)
- lib\permisos.ts (NUEVO — Rol, Permiso, permisosPorRol(), tienePermiso(). Debe coincidir literalmente con public.permisos_por_rol())
- lib\accounts-store.ts (NUEVO — adaptador dual archivo(data/auth.json) | Supabase(service_role), mismo patron de cola + escritura atomica que lib/store.ts; incluye logAudit y el consumo atomico single-use de tokens)
- lib\accounts.ts (NUEVO — casos de uso: login anti-enumeracion con throttle, invitar, aceptar, cambiar password, reset por owner, revocar, listar equipo. Aca viven las reglas de autorizacion mientras el acceso sea service_role)
- lib\auth.ts (MODIFICAR — token v2 con uid/sid/tv dentro de la firma, TTL 8h, cookieName() con __Host- en prod, rechazo del formato v1, checkPassword -> legacyPasswordOk() @deprecated. Se conservan sign() y safeEqual())
- lib\session.ts (MODIFICAR — sesionValida(): Promise<Sesion|null> (null es falsy: no rompe los ~18 call sites), requirePermiso(p), cache de 60s del chequeo de revocacion)
- proxy.ts (MODIFICAR — parseTokenV2 solo criptografia, cero I/O; sumar /admin/invitacion y /admin/reset a las rutas publicas)
- app\api\admin\route.ts (MODIFICAR — login por email+password, throttle persistente antes del PBKDF2, 429 con Retry-After, ventana legacy autoapagable, audit; DELETE revoca la sesion en base. Comentario: NO cambiar el runtime a edge)
- app\admin\login\page.tsx (MODIFICAR — campo Email + Contraseña, error unico y generico)
- app\admin\equipo\page.tsx (NUEVO — miembros, roles, toggles de permiso, invitar, revocar, generar link de reset)
- app\admin\equipo\actions.ts (NUEVO — requirePermiso('equipo'); solo un owner crea o quita otro owner)
- app\admin\invitacion\page.tsx (NUEVO — token por query -> cookie HttpOnly -> 302 sin token en la URL; crea cuenta y membresia)
- app\admin\reset\page.tsx (NUEVO — mismo patron token->cookie->302, TTL 60 min, single-use)
- app\admin\cuenta\page.tsx (NUEVO — cambiar mi contraseña, ver y cerrar mis sesiones activas)
- app\admin\actions.ts (MODIFICAR — requirePermiso('agenda') + logAudit)
- app\admin\finanzas\actions.ts (MODIFICAR — requirePermiso('finanzas') + logAudit; reemplaza el helper auth() local)
- app\admin\pacientes\actions.ts (MODIFICAR — 'pacientes' y 'notas_clinicas' + logAudit, incluido el ACCESO de lectura a notas)
- app\admin\servicios\actions.ts (MODIFICAR — requirePermiso('servicios'))
- app\admin\profesionales\actions.ts (MODIFICAR — requirePermiso('equipo'))
- app\admin\disponibilidad\actions.ts (MODIFICAR — requirePermiso('disponibilidad'))
- app\admin\page.tsx, app\admin\finanzas\page.tsx, app\admin\pacientes\page.tsx, app\admin\pacientes\[id]\page.tsx, app\admin\servicios\page.tsx, app\admin\profesionales\page.tsx, app\admin\disponibilidad\page.tsx, app\admin\asistente\page.tsx (MODIFICAR — requireAdmin() -> requirePermiso(...) por seccion)
- app\admin\finanzas\export\route.ts (MODIFICAR — requirePermiso('finanzas'))
- app\api\asistente\route.ts, app\api\asistente\execute\route.ts, app\api\asistente\transcribir\route.ts (MODIFICAR — requirePermiso('asistente_ia') y, en execute, chequear ademas el permiso del dominio que toca la tool)
- components\AdminSidebar.tsx (MODIFICAR — ocultar items sin permiso; cosmetico, el gating real es server-side)
- components\AdminShell.tsx (MODIFICAR — pasar la Sesion al sidebar y mostrar quien esta logueado)
- scripts\crear-owner.mts (NUEVO — CLI: escribe el owner en data/auth.json Y emite el INSERT SQL con el hash ya calculado para pegar en el navegador)
- scripts\auth.test.mts (NUEVO — node --test: hash/verify/rehash, validarPassword, permisosPorRol, token v2)
- scripts\verificar-auth.mjs (NUEVO — E2E en modo archivo contra next dev con los dos tenants de localhost: aislamiento cross-tenant, gating por permiso, lockout, invitacion single-use, revocacion, contenido del audit)
- tsconfig.json (MODIFICAR — allowImportingTsExtensions: true)
- package.json (MODIFICAR — scripts test:auth, auth:owner, verificar:auth)
- .env.example (MODIFICAR — AUTH_PEPPER, LEGACY_PASSWORD_HASTA; marcar ADMIN_PASSWORDS/ADMIN_PASSWORD como transitorias con fecha de baja)
- .gitignore (MODIFICAR — asegurar que data/auth.json no se versione)
- docs\SEGURIDAD.md (MODIFICAR — SLA de 60s de la revocacion, ventana legacy con fecha de cierre, regla de que en audit meta no va contenido clinico, y que las policies de 0002/0003 estan INACTIVAS desde 0004)

## Fuera de alcance (y por qué)

- RLS REAL (JWT propio firmado por la app + rol tenant_app): es el mejor siguiente paso, pero es un proyecto aparte y —critico— es 100% INVISIBLE en modo archivo. No hay forma de probarlo en esta PC; toda la garantia dependeria del SQL Editor. Meterlo en Fase 1 mezcla lo verificable con lo no verificable. Ademas requiere confirmar antes en el Dashboard si el proyecto todavia expone el JWT Secret legacy (HS256) o ya migro a claves asimetricas.
- REESCRITURA DE LAS POLICIES DE 0002/0003 a membresias: esas tablas relacionales NO se usan (todo el dominio vive en el blob app_state) y sus policies ya estan muertas desde 0004 (current_professional_id() devuelve NULL para todos). Reescribirlas ahora agrega ~25 policies que nadie ejercita y superficie para equivocarse. Se hace junto con la migracion relacional.
- SUPABASE AUTH: bloqueado por la falta de proveedor de email transaccional. Por eso app_users.id es una PK propia y auth_user_id arranca en NULL: cuando se contrate el SMTP se migra de a un usuario por vez sin tocar memberships ni audit_log. Ojo con la regresion: una sesion de Supabase Auth NO esta atada a un tenant, y hoy el tenant va dentro de la firma de la cookie.
- RECUPERACION DE CONTRASEÑA AUTOSERVICIO por email: sin remitente propio con SPF/DKIM/DMARC no se habilita. En Fase 1 el reset lo inicia el owner desde el panel y el link se entrega por su canal, con TTL de 60 min como unica defensa. Requiere procedimiento escrito de verificacion de identidad antes de entregarlo.
- CODIGOS DE RECUPERACION IMPRESOS (10 codigos base32 de un solo uso): buena idea, pero suma otra tabla, otra pantalla y otro flujo de consumo atomico. El reset iniciado por el owner ya cubre el caso comun; el break-glass del owner es un INSERT de password_reset por SQL Editor, documentado en el runbook.
- MFA/2FA, dispositivos recordados y politica de expiracion periodica de contraseñas: fuera de alcance. La expiracion periodica ademas esta desaconsejada por NIST SP 800-63B.
- CAPA `organizations` POR ENCIMA DE professionals: con memberships N:N no aporta nada y agrega otra dimension de scoping que blindar. El psicologo con dos marcas se resuelve con 2 professionals + 1 app_user + 2 memberships.
- MIGRACION DEL BLOB app_state A TABLAS RELACIONALES: no entra. Fase 1 solo le agrega updated_by. La trazabilidad se resuelve con audit_log usando entity_id text (conviven ids del blob y de tablas), sin FK.
- FK REAL DE memberships.staff_id: el staff todavia vive dentro del blob. Queda uuid sin FK; cuando staff migre a public.staff es un ALTER de una linea. Mientras tanto hay que chequear en la app al borrar un staff, o aparecera como 'un profesional no ve su agenda'.
- MOVER EL MAPA TENANTS A UNA TABLA tenant_domains: agregaria una lectura de red en Edge y cache que invalidar. Mas barato y efectivo: una ruta /api/health/tenants que verifique que cada UUID de TENANTS existe en professionals, esta activo, no esta duplicado y tiene fila en app_state. Queda como mejora chica post-Fase 1.
- CIFRADO EN REPOSO DE LAS NOTAS CLINICAS (clinical_notes.contenido_cifrado sigue vacia): ni RLS ni las cuentas lo cubren. Es un pendiente real de Ley 25.326 y necesita decision propia sobre custodia de la clave.
- RATE LIMIT DISTRIBUIDO (Upstash/Redis) y retencion/purga automatica del audit_log e IPs: la tabla auth_throttle ya da persistencia real sin infra nueva. La politica de retencion (la HC en AR tiene guarda decenal, Ley 26.529) hay que confirmarla con asesoria antes de fijar un numero.
