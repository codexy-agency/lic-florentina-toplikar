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

-- Lectura pública (anon) de servicios/profesionales ACTIVOS para el wizard del sitio.
drop policy if exists services_public_read on public.services;
create policy services_public_read on public.services
  for select to anon using (activo);
drop policy if exists staff_public_read on public.staff;
create policy staff_public_read on public.staff
  for select to anon using (activo);
drop policy if exists staff_services_public_read on public.staff_services;
create policy staff_services_public_read on public.staff_services
  for select to anon using (true);
