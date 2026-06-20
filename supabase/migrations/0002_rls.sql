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
