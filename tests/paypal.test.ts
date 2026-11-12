import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captureOrder, createOrderForPurchase } from "@/lib/paypal/orders";
import { createPurchase, getPurchase } from "@/lib/purchases";
import { rememberProducts } from "@/lib/products";
import { product } from "./helpers";

// PayPal is stubbed: these tests check what we send and how we treat the answers.
type Call = { url: string; body?: string; headers: Record<string, string> };
let calls: Call[] = [];

function stubPayPal(handler: (url: string) => { status?: number; json: unknown }) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit = {}) => {
      calls.push({ url, body: init.body as string | undefined, headers: (init.headers ?? {}) as Record<string, string> });
      const r = handler(url);
      return new Response(JSON.stringify(r.json), { status: r.status ?? 200, headers: { "content-type": "application/json" } });
    }),
  );
}

beforeEach(() => {
  calls = [];
  process.env.PAYPAL_BASE = "https://api-m.sandbox.paypal.com";
  process.env.PAYPAL_CLIENT_ID = "test-id";
  process.env.PAYPAL_CLIENT_SECRET = "test-secret";
  process.env.APP_URL = "https://haggl.example";
});
afterEach(() => vi.unstubAllGlobals());

describe("purchases", () => {
  it("copy the price from the stored offer, and refuse unknown offers", () => {
    rememberProducts([product("pp-1", "Kettle", [["target.com", 49.99]])]);
    const p = createPurchase("d1", "pp-1", "pp-1:target.com", 59.99)!;
    expect(p.price).toBe(49.99);
    expect(p.pickedPrice).toBe(59.99);
    expect(createPurchase("d1", "pp-1", "pp-1:nowhere.com", 1)).toBeUndefined();
  });
});

describe("createOrderForPurchase", () => {
  it("creates a sandbox CAPTURE order for the stored price, opening on PayPal's login page", async () => {
    rememberProducts([product("pp-2", "Headphones", [["bose.com", 129]])]);
    const purchase = createPurchase("d2", "pp-2", "pp-2:bose.com", 129)!;
    stubPayPal((url) =>
      url.endsWith("/v1/oauth2/token")
        ? { json: { access_token: "tok", expires_in: 3600 } }
        : { status: 201, json: { id: "ORDER-1", status: "PAYER_ACTION_REQUIRED", links: [{ rel: "payer-action", href: "https://sandbox.paypal.com/approve" }] } },
    );

    const { orderId, approveUrl } = await createOrderForPurchase(purchase.purchaseId);
    expect(orderId).toBe("ORDER-1");
    expect(approveUrl).toBe("https://sandbox.paypal.com/approve");

    const create = calls.find((c) => c.url.endsWith("/v2/checkout/orders"))!;
    expect(new URL(create.url).origin).toBe("https://api-m.sandbox.paypal.com");
    const body = JSON.parse(create.body!);
    expect(body.intent).toBe("CAPTURE");
    expect(body.purchase_units[0].amount).toEqual({ currency_code: "USD", value: "129.00" });
    const ctx = body.payment_source.paypal.experience_context;
    expect(ctx.landing_page).toBe("LOGIN");
    expect(ctx.return_url).toBe(`https://haggl.example/api/capture?purchaseId=${purchase.purchaseId}`);
    expect(ctx.cancel_url).toBe(`https://haggl.example/receipt/${purchase.purchaseId}?status=cancelled`);
    expect(getPurchase(purchase.purchaseId)?.status).toBe("order_created");
  });

  it("refuses a live (non-sandbox) PayPal base", async () => {
    rememberProducts([product("pp-3", "Lamp", [["ikea.com", 20]])]);
    const purchase = createPurchase("d3", "pp-3", "pp-3:ikea.com", 20)!;
    process.env.PAYPAL_BASE = "https://api-m.paypal.com";
    stubPayPal(() => ({ json: {} }));
    await expect(createOrderForPurchase(purchase.purchaseId)).rejects.toThrow(/sandbox/);
    expect(calls).toHaveLength(0);
  });
});

describe("captureOrder", () => {
  it("is idempotent: an already-captured order counts as success with the same capture id", async () => {
    stubPayPal((url) => {
      if (url.endsWith("/v1/oauth2/token")) return { json: { access_token: "tok", expires_in: 3600 } };
      if (url.endsWith("/capture")) return { status: 422, json: { name: "UNPROCESSABLE_ENTITY", details: [{ issue: "ORDER_ALREADY_CAPTURED" }] } };
      return { json: { id: "ORDER-9", status: "COMPLETED", purchase_units: [{ payments: { captures: [{ id: "CAP-1", status: "COMPLETED" }] } }] } };
    });
    const [a, b] = await Promise.all([captureOrder("ORDER-9"), captureOrder("ORDER-9")]);
    expect(a).toEqual({ ok: true, captureId: "CAP-1" });
    expect(b).toEqual(a);
    // Concurrent calls share one request; the capture uses a request id derived from the order.
    const captures = calls.filter((c) => c.url.endsWith("/capture"));
    expect(captures).toHaveLength(1);
    expect(JSON.stringify(captures[0].headers)).toContain("haggl-capture-ORDER-9");
  });
});
