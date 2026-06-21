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

/** Fail-closed en producción: si configuraron la URL pero falta la service_role
 *  o el professional_id, NO degradamos en silencio al archivo local (efímero en
 *  serverless → "se guardó" pero se pierde al reciclar la lambda). Se chequea de
 *  forma perezosa (en cada acceso al store), NO al cargar el módulo, para no
 *  arriesgar el build de Vercel si las envs difieren entre build y runtime. */
export function assertBackendConfigOk(): void {
  if (process.env.NODE_ENV === "production" && URL && !supabaseConfigurado) {
    throw new Error(
      "Supabase mal configurado: hay NEXT_PUBLIC_SUPABASE_URL pero falta " +
        "SUPABASE_SERVICE_ROLE_KEY o PROFESSIONAL_ID. Completá las Variables de " +
        "Entorno en Vercel (no se permite caer al archivo local en producción)."
    );
  }
}

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
