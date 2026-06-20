// Cliente de Supabase — SOLO servidor (Route Handlers / Server Actions).
// getServiceClient() usa la service_role key (bypassa RLS) — NUNCA importar
// desde el cliente. En single-tenant todo va server-side: no se usa anon key.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Id del profesional (single-tenant). La app guarda/lee los datos de ESTE id. */
export const PROFESSIONAL_ID = process.env.PROFESSIONAL_ID;

/** Supabase se usa solo si están la URL, la service_role Y el professional_id. */
export const supabaseConfigurado = Boolean(URL && SERVICE && PROFESSIONAL_ID);

let _service: SupabaseClient | null = null;
export function getServiceClient(): SupabaseClient {
  if (!URL || !SERVICE) {
    throw new Error(
      "Supabase no configurado: definí NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local"
    );
  }
  if (!_service) {
    _service = createClient(URL, SERVICE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _service;
}
