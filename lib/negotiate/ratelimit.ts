// Per-IP rate limit for /api/negotiate, in memory (single instance).
const LIMIT = 10;
const WINDOW_MS = 10 * 60 * 1000;

const g = globalThis as unknown as { __negotiateHits?: Map<string, number[]> };
const hits = (g.__negotiateHits ??= new Map<string, number[]>());

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}

// Records a hit and returns true if this IP is still under the limit.
export function allow(ip: string, now = Date.now()): boolean {
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  return true;
}
