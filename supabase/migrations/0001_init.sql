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
