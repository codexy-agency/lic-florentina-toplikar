-- ============================================================
-- ESQUEMA COMPLETO — Supabase SQL Editor (Run). Idempotente.
-- 0001 init + 0002 rls + 0003 services/staff + 0004 user nullable + 0005 app_state
-- ============================================================

-- ─────────── 0001_init.sql ───────────
-- =====================================================================
-- MIGRACIÓN INICIAL — App de gestión para psicólogos (multi-tenant SaaS)
-- Supabase / Postgres. Pegar completo en el SQL Editor de Supabase.
-- Modelo: cada profesional (auth.users) ve SOLO sus filas vía RLS.
-- Tenant key en cada tabla: professional_id -> public.professionals.id
-- =====================================================================

-- 0) EXTENSIONES
create extension if not exists pgcrypto with schema extensions;   -- gen_random_uuid()
create extension if not exists citext   with schema extensions;   -- email case-insensitive
create extension if not exists pg_trgm  with schema extensions;   -- búsqueda por nombre

-- 1) ENUMs
do $$ begin
  create type public.modalidad_atencion as enum ('online', 'presencial');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.solicitud_estado as enum
    ('pendiente', 'confirmado', 'rechazado', 'cancelado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.turno_estado as enum
    ('programado', 'confirmado', 'realizado', 'cancelado', 'ausente');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.pago_estado as enum
    ('pendiente', 'pagado', 'parcial', 'anulado', 'reembolsado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.pago_metodo as enum
    ('efectivo', 'transferencia', 'mercadopago', 'tarjeta', 'otro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.factura_tipo as enum ('C', 'B', 'A', 'M', 'otro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.factura_estado as enum
    ('borrador', 'emitida', 'error', 'anulada');
exception when duplicate_object then null; end $$;

-- 2) FUNCIÓN updated_at (trigger genérico)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end; $$;

-- 3) professionals (perfil ligado a auth.users) = TENANT
create table if not exists public.professionals (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null unique references auth.users(id) on delete cascade,
  nombre          text not null,
  matricula       text,
  email           citext,
  telefono        text,
  cuit            text,
  condicion_fiscal text default 'monotributo',
  zona_horaria    text not null default 'America/Argentina/Buenos_Aires',
  activo          boolean not null default true,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index if not exists idx_professionals_user_id on public.professionals(user_id);
create or replace trigger trg_professionals_updated_at
  before update on public.professionals
  for each row execute function public.set_updated_at();

-- Helper: professional_id del usuario autenticado (SECURITY DEFINER para
-- evitar recursión de RLS al consultar professionals dentro de otras policies).
-- IMPORTANTE: se define DESPUÉS de professionals, porque una función SQL valida
-- su cuerpo al crearse y la tabla referenciada ya debe existir.
create or replace function public.current_professional_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.professionals where user_id = auth.uid();
$$;

-- 4) patients
create table if not exists public.patients (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  nombre          text not null,
  email           citext,
  telefono        text,
  documento       text,
  modalidad       public.modalidad_atencion default 'online',
  fecha_nacimiento date,
  notas           text,  -- nota administrativa (NO clínica)
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index if not exists idx_patients_professional on public.patients(professional_id);
create index if not exists idx_patients_nombre_trgm   on public.patients using gin (nombre extensions.gin_trgm_ops);
create unique index if not exists uq_patients_prof_telefono
  on public.patients(professional_id, telefono)
  where telefono is not null and deleted_at is null;
create or replace trigger trg_patients_updated_at
  before update on public.patients
  for each row execute function public.set_updated_at();

-- 5) appointment_requests (solicitudes desde la web pública)
create table if not exists public.appointment_requests (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  patient_id      uuid references public.patients(id) on delete set null,
  nombre          text not null,
  contacto        text not null,
  modalidad       public.modalidad_atencion not null default 'online',
  preferencia     text,
  motivo          text,
  estado          public.solicitud_estado not null default 'pendiente',
  fecha_turno     timestamptz,
  ip_origen       inet,
  user_agent      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index if not exists idx_requests_prof_estado on public.appointment_requests(professional_id, estado);
create index if not exists idx_requests_created     on public.appointment_requests(professional_id, created_at desc);
create or replace trigger trg_requests_updated_at
  before update on public.appointment_requests
  for each row execute function public.set_updated_at();

-- 6) appointments (turnos / agenda)
create table if not exists public.appointments (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  patient_id      uuid references public.patients(id) on delete set null,
  request_id      uuid references public.appointment_requests(id) on delete set null,
  inicio          timestamptz not null,
  fin             timestamptz,
  modalidad       public.modalidad_atencion not null default 'online',
  estado          public.turno_estado not null default 'programado',
  lugar           text,
  notas_admin     text,
  recordatorio_enviado_at timestamptz,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  constraint chk_appointments_horario check (fin is null or fin > inicio)
);
create index if not exists idx_appointments_prof_inicio on public.appointments(professional_id, inicio);
create index if not exists idx_appointments_patient     on public.appointments(patient_id);
create or replace trigger trg_appointments_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

-- 7) clinical_notes (DATO SENSIBLE DE SALUD — cifrar a nivel app, ver seguridad)
create table if not exists public.clinical_notes (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  patient_id      uuid not null references public.patients(id) on delete cascade,
  appointment_id  uuid references public.appointments(id) on delete set null,
  fecha_sesion    timestamptz not null default now(),
  contenido       text,
  contenido_cifrado bytea,
  cifrado         boolean not null default false,
  diagnostico     text,
  evolucion       text,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index if not exists idx_notes_prof_patient
  on public.clinical_notes(professional_id, patient_id, fecha_sesion desc);
create or replace trigger trg_notes_updated_at
  before update on public.clinical_notes
  for each row execute function public.set_updated_at();

-- 8) payments
create table if not exists public.payments (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  patient_id      uuid references public.patients(id) on delete set null,
  appointment_id  uuid references public.appointments(id) on delete set null,
  monto           numeric(12,2) not null check (monto >= 0),
  moneda          char(3) not null default 'ARS',
  metodo          public.pago_metodo not null default 'transferencia',
  estado          public.pago_estado not null default 'pendiente',
  fecha_pago      timestamptz,
  referencia_externa text,
  notas           text,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index if not exists idx_payments_prof_estado on public.payments(professional_id, estado);
create or replace trigger trg_payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- 9) invoices (facturas / AFIP)
create table if not exists public.invoices (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  patient_id      uuid references public.patients(id) on delete set null,
  payment_id      uuid references public.payments(id) on delete set null,
  tipo            public.factura_tipo not null default 'C',
  estado          public.factura_estado not null default 'borrador',
  punto_venta     integer,
  numero          bigint,
  cae             text,
  cae_vencimiento date,
  total           numeric(12,2) not null check (total >= 0),
  moneda          char(3) not null default 'ARS',
  fecha_emision   date,
  receptor_doc    text,
  pdf_path        text,
  afip_response   jsonb,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index if not exists idx_invoices_prof on public.invoices(professional_id, fecha_emision desc);
create unique index if not exists uq_invoices_prof_pv_numero
  on public.invoices(professional_id, punto_venta, numero) where numero is not null;
create or replace trigger trg_invoices_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

-- ─────────── 0002_rls.sql ───────────
-- =====================================================================
-- RLS — Aislamiento por profesional (tenant). Ejecutar DESPUÉS de 0001_init.
-- Cada fila pertenece a un professional_id; el usuario autenticado solo
-- accede a las filas cuyo professional_id = current_professional_id().
-- =====================================================================

-- 1) Habilitar RLS (deny-by-default) en todas las tablas
alter table public.professionals          enable row level security;
alter table public.patients               enable row level security;
alter table public.appointment_requests   enable row level security;
alter table public.appointments           enable row level security;
alter table public.clinical_notes         enable row level security;
alter table public.payments               enable row level security;
alter table public.invoices               enable row level security;
-- Endurecer el dato clínico: ni el owner del schema saltea RLS
alter table public.clinical_notes force row level security;

-- Idempotencia: si ya existían (re-ejecución del script), se recrean limpias.
drop policy if exists professionals_select_own on public.professionals;
drop policy if exists professionals_insert_own on public.professionals;
drop policy if exists professionals_update_own on public.professionals;
drop policy if exists patients_all_own on public.patients;
drop policy if exists requests_select_own on public.appointment_requests;
drop policy if exists requests_update_own on public.appointment_requests;
drop policy if exists requests_delete_own on public.appointment_requests;
drop policy if exists appointments_all_own on public.appointments;
drop policy if exists notes_all_own on public.clinical_notes;
drop policy if exists payments_all_own on public.payments;
drop policy if exists invoices_all_own on public.invoices;

-- 2) professionals — el usuario gestiona SOLO su propio perfil
create policy professionals_select_own on public.professionals
  for select to authenticated using (user_id = (select auth.uid()));
create policy professionals_insert_own on public.professionals
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy professionals_update_own on public.professionals
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 3) Tablas hija: solo filas del tenant actual
create policy patients_all_own on public.patients
  for all to authenticated
  using (professional_id = (select public.current_professional_id()))
  with check (professional_id = (select public.current_professional_id()));

create policy requests_select_own on public.appointment_requests
  for select to authenticated
  using (professional_id = (select public.current_professional_id()));
create policy requests_update_own on public.appointment_requests
  for update to authenticated
  using (professional_id = (select public.current_professional_id()))
  with check (professional_id = (select public.current_professional_id()));
create policy requests_delete_own on public.appointment_requests
  for delete to authenticated
  using (professional_id = (select public.current_professional_id()));

create policy appointments_all_own on public.appointments
  for all to authenticated
  using (professional_id = (select public.current_professional_id()))
  with check (professional_id = (select public.current_professional_id()));

create policy notes_all_own on public.clinical_notes
  for all to authenticated
  using (professional_id = (select public.current_professional_id()))
  with check (professional_id = (select public.current_professional_id()));

create policy payments_all_own on public.payments
  for all to authenticated
  using (professional_id = (select public.current_professional_id()))
  with check (professional_id = (select public.current_professional_id()));

create policy invoices_all_own on public.invoices
  for all to authenticated
  using (professional_id = (select public.current_professional_id()))
  with check (professional_id = (select public.current_professional_id()));

-- 4) INSERT público de solicitudes (paciente SIN login), sin exponer SELECT.
--    Recomendado: hacerlo server-side con service_role (Route Handler).
--    Alternativa: esta RPC SECURITY DEFINER que fija professional_id en el server.
create or replace function public.crear_solicitud_publica(
  p_professional_id uuid,
  p_nombre   text,
  p_contacto text,
  p_modalidad public.modalidad_atencion default 'online',
  p_preferencia text default null,
  p_motivo   text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if length(trim(coalesce(p_nombre,''))) = 0
     or length(trim(coalesce(p_contacto,''))) = 0 then
    raise exception 'Datos obligatorios faltantes';
  end if;
  if not exists (
    select 1 from public.professionals
    where id = p_professional_id and activo and deleted_at is null
  ) then
    raise exception 'Profesional inexistente';
  end if;
  insert into public.appointment_requests
    (professional_id, nombre, contacto, modalidad, preferencia, motivo, estado)
  values
    (p_professional_id, trim(p_nombre), trim(p_contacto),
     p_modalidad, p_preferencia, p_motivo, 'pendiente')
  returning id into v_id;
  return v_id;
end; $$;

revoke all on function public.crear_solicitud_publica(uuid,text,text,public.modalidad_atencion,text,text) from public;
grant execute on function public.crear_solicitud_publica(uuid,text,text,public.modalidad_atencion,text,text) to anon, authenticated;

-- ─────────── 0003_services_staff.sql ───────────
-- =====================================================================
-- 0003 — Servicios + Staff (profesionales que atienden) por tenant.
-- Modelo "centro/clínica": dentro de un professional (tenant) hay varios
-- SERVICIOS y varias PERSONAS que atienden, con mapeo de quién hace qué.
-- Ejecutar DESPUÉS de 0001_init y 0002_rls. Idempotente.
-- =====================================================================

-- services
create table if not exists public.services (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  nombre          text not null,
  duration_min    integer not null default 50 check (duration_min between 5 and 480),
  price_ars       numeric(12,2) check (price_ars is null or price_ars >= 0),
  descripcion     text,
  activo          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_services_prof on public.services(professional_id);
create or replace trigger trg_services_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

-- staff (personas que atienden dentro del tenant)
create table if not exists public.staff (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  nombre          text not null,
  titulo          text,
  bio             text,
  color           text,
  activo          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_staff_prof on public.staff(professional_id);
create or replace trigger trg_staff_updated_at
  before update on public.staff
  for each row execute function public.set_updated_at();

-- staff_services: qué servicios ofrece cada profesional (N a N)
create table if not exists public.staff_services (
  staff_id   uuid not null references public.staff(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  primary key (staff_id, service_id)
);

-- columnas de servicio/profesional en las reservas y turnos
alter table public.appointment_requests
  add column if not exists service_id uuid references public.services(id) on delete set null;
alter table public.appointment_requests
  add column if not exists staff_id uuid references public.staff(id) on delete set null;
alter table public.appointments
  add column if not exists service_id uuid references public.services(id) on delete set null;
alter table public.appointments
  add column if not exists staff_id uuid references public.staff(id) on delete set null;

-- RLS: aislamiento por tenant + lectura pública de lo activo (para el sitio)
alter table public.services        enable row level security;
alter table public.staff           enable row level security;
alter table public.staff_services  enable row level security;

drop policy if exists services_all_own on public.services;
create policy services_all_own on public.services
  for all to authenticated
  using (professional_id = (select public.current_professional_id()))
  with check (professional_id = (select public.current_professional_id()));

drop policy if exists staff_all_own on public.staff;
create policy staff_all_own on public.staff
  for all to authenticated
  using (professional_id = (select public.current_professional_id()))
  with check (professional_id = (select public.current_professional_id()));

drop policy if exists staff_services_all_own on public.staff_services;
create policy staff_services_all_own on public.staff_services
  for all to authenticated
  using (exists (select 1 from public.staff s
                 where s.id = staff_id
                   and s.professional_id = (select public.current_professional_id())))
  with check (exists (select 1 from public.staff s
                 where s.id = staff_id
                   and s.professional_id = (select public.current_professional_id())));

-- IMPORTANTE: NO se da SELECT a anon sobre services/staff/staff_services.
-- Una policy anon `using(activo)` filtraría por activo pero NO por tenant, así que
-- cualquiera podría leer el catálogo y precios de TODOS los profesionales (fuga
-- cross-tenant). El catálogo público del sitio se sirve SERVER-SIDE, filtrado por
-- professional_id, vía Route Handler con service_role o una RPC dedicada como:
--
--   create function public.catalogo_publico(p_professional_id uuid) returns ...
--     language sql security definer set search_path = public as $$
--       select ... from public.services where professional_id = p_professional_id and activo; $$;
--   grant execute on function public.catalogo_publico(uuid) to anon;
--
-- Así anon solo ve el catálogo del profesional cuyo sitio está visitando.
drop policy if exists services_public_read on public.services;
drop policy if exists staff_public_read on public.staff;
drop policy if exists staff_services_public_read on public.staff_services;

-- ─────────── 0004_professional_user_nullable.sql ───────────
-- =====================================================================
-- 0004 — MVP single-tenant: professionals.user_id puede quedar NULL.
-- La app gestiona los datos del profesional server-side con service_role,
-- sin Supabase Auth todavía. Cuando sumemos multi-tenant con login real,
-- cada profesional se vincula a su auth.users vía user_id (volver a NOT NULL).
-- =====================================================================
alter table public.professionals alter column user_id drop not null;

-- ─────────── 0005_app_state.sql ───────────
-- =====================================================================
-- 0005 — Estado de la app (single-tenant MVP) como JSONB versionado.
-- La app (lib/store.ts) lee/escribe TODO su estado en esta fila, con
-- escritura atómica y optimistic-lock (columna rev). Reutiliza la lógica
-- ya probada del store; persistencia segura en serverless (Vercel).
-- Las tablas relacionales (services/staff/appointments/...) quedan como
-- destino para la fase multi-profesional.
-- =====================================================================
create table if not exists public.app_state (
  professional_id uuid primary key references public.professionals(id) on delete cascade,
  data            jsonb not null default '{}'::jsonb,
  rev             bigint not null default 0,
  updated_at      timestamptz not null default now()
);
-- RLS ON sin políticas: SOLO service_role (servidor) puede tocarla.
-- anon/authenticated quedan denegados por deny-by-default.
alter table public.app_state enable row level security;
