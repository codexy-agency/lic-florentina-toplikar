-- =====================================================================
-- supabase/migrations/0006_cuentas.sql
-- FASE 1 — CUENTAS INDIVIDUALES, ROLES Y TRAZABILIDAD.
-- Idempotente. Ejecutar DESPUES de 0005_app_state.sql, en el SQL Editor.
--
-- MODELO:
--   professionals = CONSULTORIO (tenant). NO es una persona. NO se toca su id
--                   (esta cableado en TENANTS, app_state, ADMIN_PASSWORDS,
--                   TELEGRAM_CHAT_IDS y todas las FKs).
--   app_users     = PERSONA. Identidad GLOBAL, una fila por email.
--   memberships   = persona <-> consultorio, con rol y permisos.
--
-- Los dos casos que esto habilita, sin ninguna tabla extra:
--   secretaria en dos consultorios = 1 app_user + 2 memberships
--   psicologo con dos marcas       = 2 professionals + 1 app_user + 2 memberships
--
-- El blob app_state NO se migra: sigue siendo el almacen del dominio.
-- Las cuentas NO van adentro del blob: la consulta fundacional
-- ("a que consultorios pertenece este email") es cross-tenant, y el email
-- unico y el consumo single-use de tokens necesitan indices unicos y
-- atomicidad reales.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) ENUMs
-- ---------------------------------------------------------------------
do $$ begin
  create type public.membership_role as enum ('owner','admin','profesional','asistente');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.membership_estado as enum ('activa','suspendida','revocada');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 2) professionals: user_id queda DEPRECADA
-- ---------------------------------------------------------------------
comment on table public.professionals is
  'TENANT = consultorio/marca. NO es una persona: las personas estan en app_users y se vinculan por memberships.';
comment on column public.professionals.user_id is
  'DEPRECADA desde 0006: la pertenencia usuario->consultorio vive en public.memberships. No leer ni escribir.';

-- ---------------------------------------------------------------------
-- 3) app_users — identidad GLOBAL (una fila por persona)
--    email es text normalizado por la app (lower+trim) con indice unico
--    sobre lower(email): sin depender de que citext resuelva en el
--    search_path del SQL Editor. La app DEBE normalizar siempre igual,
--    o el bucket de throttle y el lookup se desincronizan.
-- ---------------------------------------------------------------------
create table if not exists public.app_users (
  id                uuid primary key default gen_random_uuid(),
  email             text not null,
  nombre            text not null,
  telefono          text,
  -- Puente futuro con Supabase Auth. La PK NO es auth.users.id a proposito:
  -- permite migrar de a UN usuario por vez sin reescribir memberships ni audit_log.
  auth_user_id      uuid unique,
  ultimo_login_at   timestamptz,
  -- Revocacion masiva: subirlo invalida todos los tokens de esta persona.
  token_version     integer not null default 1,
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,
  constraint chk_app_users_email check (email = lower(btrim(email)) and position('@' in email) > 1)
);
create unique index if not exists uq_app_users_email
  on public.app_users (lower(email)) where deleted_at is null;
drop trigger if exists trg_app_users_updated_at on public.app_users;
create trigger trg_app_users_updated_at
  before update on public.app_users
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 4) user_credentials — hash APARTE, para que ningun select * del panel
--    lo roce y para que migrar a Supabase Auth sea borrar filas de aca.
--    Formato: pbkdf2-sha256$<iters>$<pepperId>$<salt_b64url>$<dk_b64url>
--    El CHECK es la red contra guardar la contraseña en claro por error.
-- ---------------------------------------------------------------------
create table if not exists public.user_credentials (
  user_id             uuid primary key references public.app_users(id) on delete cascade,
  password_hash       text not null,
  must_change         boolean not null default false,
  password_changed_at timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint chk_password_hash_formato check (
    password_hash ~ '^pbkdf2-sha256\$[0-9]{5,9}\$p[0-9]+\$[A-Za-z0-9_-]{16,}\$[A-Za-z0-9_-]{16,}$'
  )
);
drop trigger if exists trg_user_credentials_updated_at on public.user_credentials;
create trigger trg_user_credentials_updated_at
  before update on public.user_credentials
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 5) memberships — N:N persona <-> consultorio. El corazon del modelo.
-- ---------------------------------------------------------------------
create table if not exists public.memberships (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.app_users(id) on delete cascade,
  professional_id uuid not null references public.professionals(id) on delete cascade,
  rol             public.membership_role not null default 'asistente',
  permisos        jsonb not null default '{}'::jsonb,
  -- Ficha de staff que atiende (hoy id del blob app_state.data.staff; el tipo ya
  -- es uuid porque el blob genera ids con randomUUID). FK cuando staff migre.
  staff_id        uuid,
  estado          public.membership_estado not null default 'activa',
  token_version   integer not null default 1,
  invited_by      uuid references public.app_users(id) on delete set null,
  accepted_at     timestamptz,
  ultimo_acceso_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  revoked_at      timestamptz
);
create unique index if not exists uq_memberships_user_prof
  on public.memberships (user_id, professional_id);
create index if not exists idx_memberships_prof
  on public.memberships (professional_id) where estado = 'activa';
create index if not exists idx_memberships_user
  on public.memberships (user_id) where estado = 'activa';
-- Una ficha de staff no puede estar tomada por dos logins del mismo consultorio.
create unique index if not exists uq_memberships_prof_staff
  on public.memberships (professional_id, staff_id)
  where staff_id is not null and estado <> 'revocada';
drop trigger if exists trg_memberships_updated_at on public.memberships;
create trigger trg_memberships_updated_at
  before update on public.memberships
  for each row execute function public.set_updated_at();

-- Permisos por defecto segun rol. DEBE coincidir literalmente con
-- lib/permisos.ts. 'notas_clinicas' arranca FALSE para quien no atiende:
-- historia clinica = dato sensible (Ley 25.326), criterio need-to-know.
create or replace function public.permisos_por_rol(p_rol public.membership_role)
returns jsonb language sql immutable as $$
  select case p_rol
    when 'owner' then '{"agenda":true,"pacientes":true,"notas_clinicas":true,"servicios":true,"disponibilidad":true,"finanzas":true,"equipo":true,"asistente_ia":true,"configuracion":true}'::jsonb
    when 'admin' then '{"agenda":true,"pacientes":true,"notas_clinicas":false,"servicios":true,"disponibilidad":true,"finanzas":true,"equipo":true,"asistente_ia":true,"configuracion":false}'::jsonb
    when 'profesional' then '{"agenda":true,"pacientes":true,"notas_clinicas":true,"servicios":false,"disponibilidad":true,"finanzas":false,"equipo":false,"asistente_ia":true,"configuracion":false}'::jsonb
    else '{"agenda":true,"pacientes":true,"notas_clinicas":false,"servicios":false,"disponibilidad":false,"finanzas":false,"equipo":false,"asistente_ia":false,"configuracion":false}'::jsonb
  end;
$$;

create or replace function public.memberships_defaults()
returns trigger language plpgsql as $$
begin
  if new.permisos is null or new.permisos = '{}'::jsonb then
    new.permisos := public.permisos_por_rol(new.rol);
  end if;
  -- El owner no se puede auto-limitar y dejar el consultorio sin quien administre.
  if new.rol = 'owner' then
    new.permisos := public.permisos_por_rol('owner');
  end if;
  if new.estado = 'revocada' and new.revoked_at is null then
    new.revoked_at := now();
  end if;
  return new;
end $$;
drop trigger if exists trg_memberships_defaults on public.memberships;
create trigger trg_memberships_defaults
  before insert or update of rol, permisos, estado on public.memberships
  for each row execute function public.memberships_defaults();

-- Invariante: un consultorio NUNCA queda sin owner activo.
create or replace function public.memberships_owner_guard()
returns trigger language plpgsql as $$
declare v_owners integer;
begin
  -- Si el consultorio se esta borrando entero, el cascade es legitimo:
  -- sin esto, delete from professionals fallaria por este mismo trigger.
  if not exists (select 1 from public.professionals p where p.id = old.professional_id) then
    return null;
  end if;
  select count(*) into v_owners
    from public.memberships
   where professional_id = old.professional_id
     and rol = 'owner' and estado = 'activa' and revoked_at is null;
  if v_owners = 0 then
    raise exception 'El consultorio % quedaria sin owner activo', old.professional_id;
  end if;
  return null;
end $$;
drop trigger if exists trg_memberships_owner_guard on public.memberships;
create trigger trg_memberships_owner_guard
  after update or delete on public.memberships
  for each row when (old.rol = 'owner')
  execute function public.memberships_owner_guard();

-- ---------------------------------------------------------------------
-- 6) user_sessions — para revocar y para "dispositivos activos".
--    NO guarda el token: el session_id va DENTRO del payload firmado con
--    HMAC; sin la firma esta fila no sirve para autenticarse.
-- ---------------------------------------------------------------------
create table if not exists public.user_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.app_users(id) on delete cascade,
  professional_id uuid not null references public.professionals(id) on delete cascade,
  membership_id   uuid references public.memberships(id) on delete cascade,
  created_at      timestamptz not null default now(),
  last_seen_at    timestamptz not null default now(),
  expires_at      timestamptz not null default now() + interval '8 hours',
  revoked_at      timestamptz,
  ip_origen       inet,
  user_agent      text
);
create index if not exists idx_sessions_user
  on public.user_sessions (user_id) where revoked_at is null;
create index if not exists idx_sessions_expira on public.user_sessions (expires_at);

-- ---------------------------------------------------------------------
-- 7) invitations — el token en claro SOLO viaja en el link; aca su sha256.
-- ---------------------------------------------------------------------
create table if not exists public.invitations (
  id               uuid primary key default gen_random_uuid(),
  professional_id  uuid not null references public.professionals(id) on delete cascade,
  email            text not null,
  rol              public.membership_role not null default 'asistente',
  permisos         jsonb not null default '{}'::jsonb,
  token_hash       text not null,
  expires_at       timestamptz not null default now() + interval '7 days',
  accepted_at      timestamptz,
  accepted_user_id uuid references public.app_users(id) on delete set null,
  revoked_at       timestamptz,
  created_by       uuid references public.app_users(id) on delete set null,
  created_at       timestamptz not null default now()
);
create unique index if not exists uq_invitations_token on public.invitations (token_hash);
create unique index if not exists uq_invitations_pendiente
  on public.invitations (professional_id, lower(email))
  where accepted_at is null and revoked_at is null;

-- ---------------------------------------------------------------------
-- 8) password_resets — single-use, TTL corto. En Fase 1 SOLO los inicia
--    el owner desde el panel (no hay proveedor de email: no habilitar
--    autoservicio hasta tener remitente propio con SPF/DKIM).
-- ---------------------------------------------------------------------
create table if not exists public.password_resets (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.app_users(id) on delete cascade,
  professional_id uuid references public.professionals(id) on delete set null,
  token_hash      text not null unique,
  expires_at      timestamptz not null default now() + interval '60 minutes',
  used_at         timestamptz,
  created_by      uuid references public.app_users(id) on delete set null,
  requested_ip    inet,
  created_at      timestamptz not null default now()
);
create index if not exists idx_password_resets_user
  on public.password_resets (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- 9) auth_throttle — anti fuerza bruta PERSISTENTE (el limitador en
--    memoria de lib/ratelimit.ts es por instancia: no es un control).
--    key_hash = sha256(professional_id || ':' || email) o 'ip:<hash>' o
--    'pid:<uuid>'. Se hashea el identificador para no armar una tabla de
--    emails en claro, y el bucket existe exista o no la cuenta.
-- ---------------------------------------------------------------------
create table if not exists public.auth_throttle (
  key_hash        text primary key,
  professional_id uuid references public.professionals(id) on delete cascade,
  fails           integer not null default 0,
  first_fail_at   timestamptz not null default now(),
  locked_until    timestamptz,
  updated_at      timestamptz not null default now()
);
create index if not exists idx_auth_throttle_lock on public.auth_throttle (locked_until);

-- Registra un fallo y devuelve el bloqueo resultante, ATOMICO y en un solo
-- round-trip. Ventana deslizante de 15 min. NUNCA bloqueo permanente: dejar a
-- la psicologa afuera de su agenda del dia es un incidente de disponibilidad.
create or replace function public.auth_throttle_fail(p_key text, p_pid uuid default null)
returns table (fails integer, locked_until timestamptz)
language plpgsql security definer set search_path = public as $$
declare v_fails integer; v_lock timestamptz;
begin
  insert into public.auth_throttle as t (key_hash, professional_id, fails, first_fail_at, updated_at)
       values (p_key, p_pid, 1, now(), now())
  on conflict (key_hash) do update
     set fails = case when t.first_fail_at < now() - interval '15 minutes' then 1 else t.fails + 1 end,
         first_fail_at = case when t.first_fail_at < now() - interval '15 minutes' then now() else t.first_fail_at end,
         updated_at = now()
  returning t.fails into v_fails;

  v_lock := case
    when v_fails >= 9 then now() + interval '30 minutes'   -- TECHO
    when v_fails  = 8 then now() + interval '15 minutes'
    when v_fails  = 7 then now() + interval '5 minutes'
    when v_fails  = 6 then now() + interval '2 minutes'
    when v_fails  = 5 then now() + interval '1 minute'
    else null end;

  update public.auth_throttle set locked_until = v_lock where key_hash = p_key;
  return query select v_fails, v_lock;
end $$;
revoke all on function public.auth_throttle_fail(text, uuid) from public, anon, authenticated;

create or replace function public.auth_throttle_reset(p_key text)
returns void language sql security definer set search_path = public as $$
  delete from public.auth_throttle where key_hash = p_key;
$$;
revoke all on function public.auth_throttle_reset(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 10) audit_log — quien hizo que, en que consultorio.
--     entity_id es TEXT porque conviven ids del blob app_state y de tablas.
--     REGLA DURA: en `meta` NUNCA contenido clinico, solo ids y nombres de
--     campos. Loguear tambien los ACCESOS de lectura a notas clinicas
--     (art. 9 Ley 25.326), no solo las escrituras.
-- ---------------------------------------------------------------------
create table if not exists public.audit_log (
  id              bigint generated always as identity primary key,
  professional_id uuid references public.professionals(id) on delete set null,
  actor_user_id   uuid references public.app_users(id) on delete set null,
  actor_email     text,                       -- snapshot: sobrevive al borrado del usuario
  actor_rol       public.membership_role,
  accion          text not null,              -- 'login.ok','paciente.crear','nota.ver',...
  entity_type     text,
  entity_id       text,
  resultado       text not null default 'ok',
  meta            jsonb not null default '{}'::jsonb,
  ip_origen       inet,
  user_agent      text,
  created_at      timestamptz not null default now()
);
create index if not exists idx_audit_prof_created on public.audit_log (professional_id, created_at desc);
create index if not exists idx_audit_actor on public.audit_log (actor_user_id, created_at desc);
create index if not exists idx_audit_entity on public.audit_log (professional_id, entity_type, entity_id);

-- ---------------------------------------------------------------------
-- 11) app_state (blob) — NO se migra. Solo trazabilidad gruesa.
-- ---------------------------------------------------------------------
alter table public.app_state
  add column if not exists updated_by uuid references public.app_users(id) on delete set null;
comment on table public.app_state is
  'Datos del dominio por tenant (blob JSONB). Las CUENTAS no viven aca: ver app_users/memberships.';

-- ---------------------------------------------------------------------
-- 12) RLS deny-by-default en TODO lo nuevo (mismo criterio que 0005).
--     Hoy el acceso es 100% service_role, que saltea RLS: la autorizacion
--     real la aplica lib/accounts.ts. Esto es la red para anon/authenticated,
--     que en Supabase reciben privilegios por defecto sobre public.
-- ---------------------------------------------------------------------
alter table public.app_users        enable row level security;
alter table public.user_credentials enable row level security;
alter table public.memberships      enable row level security;
alter table public.user_sessions    enable row level security;
alter table public.invitations      enable row level security;
alter table public.password_resets  enable row level security;
alter table public.auth_throttle    enable row level security;
alter table public.audit_log        enable row level security;

-- Cinturon + tirantes: revocar los privilegios por defecto ademas de la RLS,
-- asi el aislamiento no depende SOLO de que las policies esten bien escritas.
revoke all on public.app_users        from anon, authenticated;
revoke all on public.user_credentials from anon, authenticated;
revoke all on public.memberships      from anon, authenticated;
revoke all on public.user_sessions    from anon, authenticated;
revoke all on public.invitations      from anon, authenticated;
revoke all on public.password_resets  from anon, authenticated;
revoke all on public.auth_throttle    from anon, authenticated;
revoke all on public.audit_log        from anon, authenticated;
-- OJO para el futuro: NO poner `force row level security` en memberships ni en
-- app_users. Los helpers de permisos son SECURITY DEFINER y consultan esas
-- tablas; forzar RLS ahi deja todo el panel denegado o entra en recursion.

-- ---------------------------------------------------------------------
-- 13) VERIFICACION — el SQL se aplica a mano por el navegador, asi que el
--     propio script tiene que fallar ruidoso si quedo a medias.
-- ---------------------------------------------------------------------
do $$
declare r record; faltan text := '';
begin
  for r in
    select c.relname, c.relrowsecurity
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relname in ('app_users','user_credentials','memberships','user_sessions',
                         'invitations','password_resets','auth_throttle','audit_log')
  loop
    if not r.relrowsecurity then faltan := faltan || r.relname || ' '; end if;
  end loop;
  if faltan <> '' then
    raise exception '0006 incompleta: RLS sin habilitar en: %', faltan;
  end if;
  raise notice '0006_cuentas aplicada OK: 8 tablas con RLS habilitada.';
end $$;

-- =====================================================================
-- SEED — ejecutar UNA VEZ POR TENANT EXISTENTE.
-- El hash lo genera `npm run auth:owner -- --pid=... --email=... --password=...`
-- (esta PC no llega a Supabase: se genera local y se pega aca).
-- =====================================================================
-- with u as (
--   insert into public.app_users (email, nombre)
--   values ('flor@ejemplo.com', 'Florentina Toplikar')
--   on conflict (lower(email)) where deleted_at is null
--     do update set nombre = excluded.nombre
--   returning id
-- ), c as (
--   insert into public.user_credentials (user_id, password_hash)
--   select u.id, 'pbkdf2-sha256$600000$p1$<SALT_B64URL>$<HASH_B64URL>' from u
--   on conflict (user_id) do update set password_hash = excluded.password_hash,
--                                       password_changed_at = now()
--   returning user_id
-- )
-- insert into public.memberships (user_id, professional_id, rol, estado, accepted_at)
-- select u.id, '<PROFESSIONAL_ID-DEL-TENANT>'::uuid, 'owner', 'activa', now() from u
-- on conflict (user_id, professional_id) do nothing;

-- VERIFICACION post-seed (debe devolver 0 filas):
-- select p.id, p.nombre from public.professionals p
--  where not exists (select 1 from public.memberships m
--                     where m.professional_id = p.id and m.rol = 'owner'
--                       and m.estado = 'activa' and m.revoked_at is null)
--    and p.deleted_at is null;