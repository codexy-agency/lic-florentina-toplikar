-- =====================================================================
-- 0004 — MVP single-tenant: professionals.user_id puede quedar NULL.
-- La app gestiona los datos del profesional server-side con service_role,
-- sin Supabase Auth todavía. Cuando sumemos multi-tenant con login real,
-- cada profesional se vincula a su auth.users vía user_id (volver a NOT NULL).
-- =====================================================================
alter table public.professionals alter column user_id drop not null;
