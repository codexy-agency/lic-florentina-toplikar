// Clientes de Supabase. Se activan al completar las variables en .env.local.
//  - getServiceClient(): SOLO servidor (Route Handlers / Server Actions).
//    Usa la service_role key (bypassa RLS) — NUNCA importar desde el cliente.
//  - getPublicClient(): anon key, sujeto a RLS. Para lecturas públicas/seguras.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseConfigurado = Boolean(URL && SERVICE);

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

export function getPublicClient(): SupabaseClient {
  if (!URL || !ANON) {
    throw new Error("Supabase no configurado (URL / ANON key).");
  }
  return createClient(URL, ANON);
}
