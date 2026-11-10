// Per-IP fixed-window rate limit, in memory (single instance). Shared by /api/search and /api/debate.
const g = globalThis as unknown as { __rate?: Map<string, { count: number; resetAt: number }> };
const buckets = (g.__rate ??= new Map());

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

// Returns true if the request is allowed. `name` separates limits per route.
export function rateLimit(name: string, ip: string, limit: number, windowMs: number): boolean {
  const key = `${name}:${ip}`;
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    if (buckets.size > 10_000) buckets.clear(); // crude cap so the map can't grow forever
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  b.count += 1;
  return b.count <= limit;
}
