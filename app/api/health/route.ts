import { NextResponse } from "next/server";
import { safeEqual } from "@/lib/auth";
import { esMultiTenant } from "@/lib/tenant";
import { supabaseConfigurado, getServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * GET /api/health  (con header `x-health-token`)
 *
 * Chequea que el despliegue esté sano ANTES de que un cliente lo descubra.
 * Pensado para un cron externo cada pocos minutos.
 *
 * NO ES PÚBLICO. La respuesta dice cuántos consultorios hay, si faltan
 * variables y si la base contesta: es un mapa de la topología. Va detrás de un
 * token comparado en tiempo constante, y sin CODEXY_HEALTH_TOKEN configurado
 * responde 404 (no 401: un 401 confirma que el endpoint existe).
 *
 * Devuelve 200 si está todo bien y 503 si algo falla, para que cualquier
 * monitor lo entienda sin leer el cuerpo.
 */

interface Chequeo {
  nombre: string;
  ok: boolean;
  detalle?: string;
}

export async function GET(req: Request) {
  const esperado = process.env.CODEXY_HEALTH_TOKEN;
  if (!esperado) {
    return new NextResponse("Not found", { status: 404 });
  }
  const recibido = req.headers.get("x-health-token") || "";
  if (!safeEqual(recibido, esperado)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const checks: Chequeo[] = [];
  const add = (nombre: string, ok: boolean, detalle?: string) =>
    checks.push({ nombre, ok, ...(detalle ? { detalle } : {}) });

  // 1) TENANTS parsea y los consultorios no comparten professional_id.
  //
  //    Dos hosts apuntando al mismo UUID es la causa número uno de S0 según el
  //    propio runbook: dos psicólogos escribiendo el mismo documento clínico.
  //    Un copy-paste al agregar un cliente alcanza, y hoy no lo detecta nadie.
  let tenants: Record<string, string> = {};
  try {
    tenants = JSON.parse(process.env.TENANTS || "{}") || {};
    add("TENANTS parsea", true, `${Object.keys(tenants).length} hosts`);
  } catch {
    add("TENANTS parsea", false, "no es JSON válido: el despliegue está roto");
  }

  const porPid = new Map<string, string[]>();
  for (const [host, pid] of Object.entries(tenants)) {
    const k = String(pid).toLowerCase();
    porPid.set(k, [...(porPid.get(k) ?? []), host]);
  }
  const duplicados = [...porPid.entries()].filter(([, hosts]) => hosts.length > 1);
  add(
    "sin professional_id repetido",
    duplicados.length === 0,
    duplicados.length
      ? duplicados.map(([pid, hosts]) => `${pid} ← ${hosts.join(", ")}`).join(" · ")
      : undefined
  );

  // 2) Variables sin las cuales el panel no abre.
  for (const v of ["ADMIN_SECRET", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
    add(`${v} presente`, !!process.env[v]);
  }

  // 3) La base contesta, y cada consultorio de TENANTS existe en professionals.
  //
  //    Un tenant sin su fila da error de clave foránea al primer guardado: para
  //    el psicólogo es "el panel no guarda nada" y no puede trabajar.
  if (supabaseConfigurado) {
    try {
      const sb = getServiceClient();
      const { data, error } = await sb.from("professionals").select("id");
      if (error) throw error;
      const existentes = new Set((data ?? []).map((r) => String(r.id).toLowerCase()));
      add("la base contesta", true, `${existentes.size} consultorios`);

      const huerfanos = [...porPid.keys()].filter((pid) => !existentes.has(pid));
      add(
        "todos los tenants existen en la base",
        huerfanos.length === 0,
        huerfanos.length ? `sin fila: ${huerfanos.join(", ")}` : undefined
      );
    } catch (e) {
      add("la base contesta", false, e instanceof Error ? e.message.slice(0, 200) : "error");
    }
  } else {
    add("la base contesta", !esMultiTenant(), "modo archivo (sólo válido en desarrollo)");
  }

  // 4) Cosas que no rompen nada pero conviene saber.
  const avisos: string[] = [];
  if (!process.env.SOPORTE_EMAILS) avisos.push("sin SOPORTE_EMAILS: nadie de Codexy puede entrar a ayudar");
  if (!process.env.CODEXY_ALERTAS_CHAT_ID) avisos.push("sin CODEXY_ALERTAS_CHAT_ID: las alertas no salen a ningún lado");
  if (!process.env.OPENAI_API_KEY) avisos.push("sin OPENAI_API_KEY: el asistente no funciona");

  const sano = checks.every((c) => c.ok);
  return NextResponse.json(
    {
      ok: sano,
      entorno: process.env.VERCEL_ENV || process.env.NODE_ENV || "local",
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7),
      checks,
      avisos,
    },
    { status: sano ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}
