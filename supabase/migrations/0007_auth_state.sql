-- 0007 — Almacén de IDENTIDAD (cuentas, membresías, sesiones, auditoría).
--
-- IMPORTANTE: lib/accounts-store.ts consulta esta tabla. Sin ella, el primer
-- deploy con SUPABASE_SERVICE_ROLE_KEY configurada deja a TODOS afuera del panel.
-- Aplicar ANTES de encender Supabase.
--
-- Va en una tabla propia (no dentro de app_state) porque la identidad es
-- CROSS-TENANT: "¿a qué consultorios pertenece este email?" no se puede responder
-- desde un blob por consultorio. Y porque el login no debe tocar —ni bloquear con
-- su lock optimista— el documento que contiene la historia clínica.

create table if not exists public.auth_state (
  id          text primary key,          -- siempre 'identidad' (fila única)
  data        jsonb not null default '{}'::jsonb,
  rev         integer not null default 0, -- lock optimista (mismo patrón que app_state)
  updated_at  timestamptz not null default now()
);

comment on table public.auth_state is
  'Identidad de la plataforma: usuarios, membresías, sesiones y auditoría. Fila única (id=''identidad''). Cross-tenant a propósito.';
comment on column public.auth_state.rev is
  'Lock optimista: el UPDATE exige el rev leído. Si no coincide, la app reintenta.';

-- RLS activada y SIN políticas: nadie entra con anon/authenticated.
-- Solo el servidor, con service_role. (Recordatorio honesto: service_role tiene
-- BYPASSRLS, así que hoy esto NO es una barrera real — la barrera es la app.
-- Ver docs/SEGURIDAD.md, riesgo "RLS decorativa".)
alter table public.auth_state enable row level security;

revoke all on public.auth_state from anon, authenticated;
