import { afterEach, describe, expect, it, vi } from "vitest";
import { readProductPage } from "@/lib/channel3/page";
import { dedupe } from "@/lib/channel3/dedupe";
import { rateLimit } from "@/lib/ratelimit";
import { suggest } from "@/data/typeahead";
import { product } from "./helpers";

afterEach(() => vi.unstubAllGlobals());

function servePage(html: string) {
  const fetchMock = vi.fn(async () => new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("reading a pasted product link", () => {
  it("reads a schema.org Product (cheapest USD offer, brand, rating, image)", async () => {
    servePage(`<html><head><script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "BreadcrumbList" },
        {
          "@type": "Product",
          name: "Tree Runner",
          brand: { "@type": "Brand", name: "Allbirds" },
          image: ["https://cdn.example/shoe.jpg"],
          aggregateRating: { ratingValue: "4.6", reviewCount: "812" },
          offers: [
            { "@type": "Offer", price: "110.00", priceCurrency: "USD", availability: "https://schema.org/InStock" },
            { "@type": "Offer", price: "98.00", priceCurrency: "USD", availability: "https://schema.org/InStock" },
            { "@type": "Offer", price: "50.00", priceCurrency: "EUR" },
          ],
        },
      ],
    })}</script></head></html>`);
    const p = await readProductPage("https://www.allbirds.com/products/tree-runner");
    expect(p).not.toBeNull();
    expect(p!.title).toBe("Tree Runner");
    expect(p!.brand).toBe("Allbirds");
    expect(p!.image).toBe("https://cdn.example/shoe.jpg");
    expect(p!.rating).toEqual({ score: 4.6, count: 812 });
    expect(p!.offers[0]).toMatchObject({ merchant: "allbirds.com", price: 98, inStock: true, url: "https://www.allbirds.com/products/tree-runner" });
  });

  it("falls back to Open Graph price tags", async () => {
    servePage(
      `<meta property="og:title" content="Desk Lamp"><meta property="og:image" content="https://cdn.example/lamp.png">` +
        `<meta property="product:price:amount" content="39.5"><meta property="product:price:currency" content="USD">`,
    );
    const p = await readProductPage("https://shop.example.com/lamp");
    expect(p?.title).toBe("Desk Lamp");
    expect(p?.offers[0].price).toBe(39.5);
  });

  it("returns null when there's no usable USD price", async () => {
    servePage(`<script type="application/ld+json">{"@type":"Product","name":"Thing","offers":{"price":"20","priceCurrency":"GBP"}}</script>`);
    expect(await readProductPage("https://shop.example.co.uk/thing")).toBeNull();
  });

  it("never fetches local or private addresses", async () => {
    const fetchMock = servePage("");
    for (const url of ["http://localhost:3000/", "http://127.0.0.1/admin", "http://192.168.1.10/", "http://10.0.0.5/", "http://169.254.169.254/latest"]) {
      expect(await readProductPage(url)).toBeNull();
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("search helpers", () => {
  it("dedupes the same item listed twice, keeping the one with more stores", () => {
    const a = product("d-a", "Sony WH-1000XM4 Wireless Noise Cancelling Headphones", [["focuscamera.com", 298]], "Sony");
    const b = product("d-b", "Sony WH-1000XM4 Wireless Noise Cancelling Headphones Black", [["focuscamera.com", 298], ["bestbuy.com", 298.5]], "Sony");
    const c = product("d-c", "Bose QuietComfort Headphones", [["bose.com", 129]], "Bose");
    const ids = dedupe([a, b, c]).map((p) => p.id);
    expect(ids).toContain("d-b");
    expect(ids).not.toContain("d-a");
    expect(ids).toContain("d-c");
  });

  it("suggests searches as you type (prefix and word matches)", () => {
    const s = suggest("hea");
    expect(s).toContain("noise cancelling headphones");
    expect(s).toContain("space heater");
    expect(s.length).toBeLessThanOrEqual(6);
    expect(suggest("")).toEqual([]);
  });

  it("rate-limits per IP and per route", () => {
    const ip = `test-${Math.random()}`;
    const results = Array.from({ length: 4 }, () => rateLimit("unit", ip, 3, 60_000));
    expect(results).toEqual([true, true, true, false]);
    expect(rateLimit("unit", `${ip}-other`, 3, 60_000)).toBe(true);
    expect(rateLimit("other-route", ip, 3, 60_000)).toBe(true);
  });
});
