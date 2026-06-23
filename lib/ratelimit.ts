// Rate limiter en memoria, best-effort. En serverless (Vercel) el estado es por
// instancia y se resetea en cold start, pero igual frena ráfagas contra una
// instancia caliente — que es el abuso más común contra un endpoint público de
// reservas (spam de turnos, flood del notificador). Para un límite duro
// multi-instancia haría falta un store compartido (Upstash/Redis); queda como
// mejora futura cuando haya volumen.

type Hit = { count: number; reset: number };

const buckets = new Map<string, Hit>();
const MAX_KEYS = 5000; // tope de seguridad para no crecer sin límite

export interface RateResult {
  ok: boolean;
  remaining: number;
  retryAfter: number; // segundos
}

export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();

  if (buckets.size > MAX_KEYS) {
    // 1) Soltar los expirados.
    for (const [k, b] of buckets) if (now > b.reset) buckets.delete(k);
    // 2) Si sigue lleno (ataque distribuido con muchas claves vivas), descartar
    //    las MÁS VIEJAS por vencimiento — NUNCA clear() global, porque eso
    //    resetería el contador de los abusadores activos (agujero de evasión).
    if (buckets.size > MAX_KEYS) {
      const masViejas = [...buckets.entries()]
        .sort((a, b) => a[1].reset - b[1].reset)
        .slice(0, Math.ceil(buckets.size * 0.2));
      for (const [k] of masViejas) buckets.delete(k);
    }
  }

  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }
  b.count++;
  if (b.count > limit) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((b.reset - now) / 1000) };
  }
  return { ok: true, remaining: limit - b.count, retryAfter: 0 };
}

/** IP del cliente. IMPORTANTE: `x-forwarded-for` CRUDO es spoofeable (el cliente
 *  puede anteponer su propio valor y rotar la clave del rate-limit en cada
 *  request). Priorizamos `x-vercel-forwarded-for`, que lo setea la plataforma en
 *  el edge y el cliente NO puede falsificar; después `x-real-ip`; y solo como
 *  último recurso el XFF. Fallback a un valor fijo (degradación segura: todos
 *  caen en el mismo bucket). */
export function clientIp(req: Request): string {
  const vercel = req.headers.get("x-vercel-forwarded-for");
  if (vercel) return vercel.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return "desconocida";
}
