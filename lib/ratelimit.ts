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
    for (const [k, b] of buckets) if (now > b.reset) buckets.delete(k);
    // si sigue gigante (ataque distribuido), reseteamos todo: preferimos perder
    // precisión antes que consumir memoria sin tope.
    if (buckets.size > MAX_KEYS) buckets.clear();
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

/** IP del cliente detrás del proxy de Vercel. x-forwarded-for puede traer varias
 *  (cliente, proxies); la primera es la real. Fallback a un valor fijo para no
 *  romper si falta (todos caen en el mismo bucket: degradación segura). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "desconocida";
}
