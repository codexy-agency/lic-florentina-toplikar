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
