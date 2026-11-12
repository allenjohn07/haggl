// Minimal PayPal REST client: OAuth2 client-credentials token + JSON fetch.
// Sandbox only. Never logs tokens or secrets.
// Docs: https://developer.paypal.com/api/rest/authentication/

const SANDBOX_BASE = "https://api-m.sandbox.paypal.com";
const TIMEOUT_MS = 15_000;

export class PayPalError extends Error {
  constructor(
    message: string,
    public status = 0, // HTTP status, 0 for config or network problems
    public issue?: string, // e.g. "ORDER_ALREADY_CAPTURED"
    public debugId?: string, // PayPal's debug_id, safe to log
  ) {
    super(message);
    this.name = "PayPalError";
  }
}

function config() {
  const base = (process.env.PAYPAL_BASE || SANDBOX_BASE).replace(/\/+$/, "");
  if (base !== SANDBOX_BASE) {
    throw new PayPalError(`PAYPAL_BASE must be ${SANDBOX_BASE} (sandbox only)`);
  }
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) {
    throw new PayPalError("PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are not set");
  }
  return { base, clientId, secret };
}

// Cached in memory until a minute before it expires. One in-flight request at a time.
let cached: { token: string; expiresAt: number } | undefined;
let pending: Promise<string> | undefined;

async function getAccessToken(): Promise<string> {
  if (cached && Date.now() < cached.expiresAt) return cached.token;
  pending ??= fetchToken().finally(() => (pending = undefined));
  return pending;
}

async function fetchToken(): Promise<string> {
  const { base, clientId, secret } = config();
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }).catch(() => {
    throw new PayPalError("could not reach PayPal for a token");
  });
  if (!res.ok) throw new PayPalError("PayPal token request failed", res.status);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cached = {
    token: data.access_token,
    expiresAt: Date.now() + Math.max(0, data.expires_in - 60) * 1000,
  };
  return cached.token;
}

type PayPalErrorBody = { name?: string; message?: string; debug_id?: string; details?: { issue?: string }[] };

// JSON request to the PayPal REST API. Throws PayPalError on any non-2xx.
export async function paypalFetch<T>(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown; requestId?: string },
): Promise<T> {
  const { base } = config();
  for (let attempt = 0; ; attempt++) {
    const token = await getAccessToken();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    };
    if (init.requestId) headers["PayPal-Request-Id"] = init.requestId;

    const res = await fetch(`${base}${path}`, {
      method: init.method,
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }).catch(() => {
      throw new PayPalError(`could not reach PayPal (${init.method} ${path})`);
    });

    // Token revoked or expired early: drop it and try once more.
    if (res.status === 401 && attempt === 0) {
      cached = undefined;
      continue;
    }
    const data = (await res.json().catch(() => ({}))) as T & PayPalErrorBody;
    if (!res.ok) {
      throw new PayPalError(
        `PayPal ${init.method} ${path} failed: ${data.name ?? res.status}`,
        res.status,
        data.details?.[0]?.issue,
        data.debug_id,
      );
    }
    return data;
  }
}

// Safe one-line description of an error for server logs (no tokens, no secrets).
export function describeError(err: unknown): string {
  if (err instanceof PayPalError) {
    return [err.message, err.status && `http=${err.status}`, err.issue, err.debugId && `debug_id=${err.debugId}`]
      .filter(Boolean)
      .join(" ");
  }
  return err instanceof Error ? err.message : String(err);
}

// The app's public address, for PayPal's return and cancel links. Uses APP_URL; on Render, if APP_URL is
// missing or still points at localhost, falls back to RENDER_EXTERNAL_URL (set by Render for every web
// service), so a buyer is never sent to localhost after paying.
export function appUrl(path: string): string {
  const configured = process.env.APP_URL?.trim();
  const render = process.env.RENDER_EXTERNAL_URL?.trim();
  const isLocal = !configured || /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(configured);
  const base = (isLocal && render ? render : configured || "http://localhost:3000").replace(/\/+$/, "");
  return `${base}${path}`;
}

// Ids that came from a request (purchase ids, PayPal tokens) are cleaned before they reach a log line,
// so a crafted value can't add fake lines to the logs.
export function forLog(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, "?").slice(0, 64);
}
