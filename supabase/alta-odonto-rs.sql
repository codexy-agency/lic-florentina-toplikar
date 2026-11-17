-- =====================================================================
-- ALTA DE RS ODONTOLOGÍA (Instagram @odonto.rs) — NO SE CORRIÓ. Lo revisa
-- y lo corre Carlos.
--
-- Esta rama (odonto-rs) es la plataforma de turnos DEDICADA a RS: sitio público
-- propio + reserva + panel. Se despliega como un proyecto aparte, en modo de un
-- solo consultorio (variable PROFESSIONAL_ID, SIN la variable TENANTS).
--
-- QUÉ CREA ESTE ARCHIVO
--   1 fila en public.professionals (el consultorio). Nada más.
--
-- QUÉ NO HACE FALTA CREAR A MANO
--   Los servicios, las dos profesionales, los horarios y la marca salen de la
--   semilla del código (lib/rs.ts). La fila de app_state la inserta la app sola
--   en la primera escritura (el primer turno o el primer cambio en el panel).
--
-- EN QUÉ BASE
--   Opción recomendada: un proyecto de Supabase NUEVO solo para RS. Antes de este
--   archivo hay que correr ahí, en este orden:
--       supabase/apply_all.sql
--       supabase/migrations/0006_cuentas.sql
--       supabase/migrations/0007_auth_state.sql
--   (apply_all.sql llega hasta la 0005: sin la 0007 no se puede iniciar sesión.)
--
--   Opción alternativa: la misma base de la plataforma. Funciona (los datos se
--   separan por professional_id), pero las cuentas de todos los consultorios
--   viven en una sola fila (auth_state 'identidad'): hacer backup antes.
-- =====================================================================

-- 1) El consultorio. El id va explícito porque es el mismo que se carga en la
--    variable PROFESSIONAL_ID del despliegue y en el comando de la cuenta.
insert into public.professionals (id, nombre, telefono)
values (
  '9ec4f6a0-509e-4956-a42d-6f30c132782f',
  'RS Odontología',
  '+543435149946'
)
on conflict (id) do nothing
returning id, nombre;

-- 2) Verificación (solo lectura).
select id, nombre, activo, created_at
  from public.professionals
 where id = '9ec4f6a0-509e-4956-a42d-6f30c132782f';

-- =====================================================================
-- DESPUÉS DEL SQL (fuera de la base)
--
-- a) Variables de entorno del proyecto de Vercel de RS (Production):
--      NEXT_PUBLIC_SUPABASE_URL   = URL del proyecto de Supabase elegido
--      SUPABASE_SERVICE_ROLE_KEY  = su service_role (secreta)
--      PROFESSIONAL_ID            = 9ec4f6a0-509e-4956-a42d-6f30c132782f
--      ADMIN_SECRET               = openssl rand -hex 32
--      ADMIN_PASSWORD             = contraseña de transición, larga
--    NO cargar TENANTS ni PLATFORM_DOMAIN: es un despliegue de un solo consultorio.
--
-- b) Cuenta de la dueña (pide la contraseña por teclado, no queda en el historial).
--    Desde la carpeta del proyecto:
--
--      npm run cuenta:crear -- --email <email de Arantxa> --nombre "Arantxa Rodriguez Signes" --rol owner --pid 9ec4f6a0-509e-4956-a42d-6f30c132782f
--
--    El script escribe data/auth.json y además imprime un bloque SQL que AGREGA
--    solo esa cuenta a auth_state. Ese bloque se pega en el SQL Editor.
--    Si la base es la compartida, primero: node scripts/backup.mjs
--
-- c) Comprobar: /  ·  /reservar (hacer una reserva de prueba)  ·  /admin
--    (entrar con la cuenta, ver la reserva en Agenda y borrarla).
-- =====================================================================
