// Most store links spell out the product in the URL itself:
//   amazon.com/Sony-WH-1000XM4-Canceling-Headphones/dp/B0863TXGM3
//   bestbuy.com/site/sony-wh-1000xm4-wireless-noise-cancelling-headphones/6408356.p
//   walmart.com/ip/Sony-WH-1000XM4-Wireless-Headphones/530123373
// productNameFromUrl() turns that into a search query ("sony wh 1000xm4 canceling headphones"),
// so a link can still be matched when the page itself can't be read. Nothing is fetched here.

const NOISE = new Set(["site", "ip", "dp", "gp", "p", "product", "products", "shop", "buy", "item", "items", "pd", "c", "s", "www", "html", "en", "us", "en-us"]);

export function productNameFromUrl(link: string): string | null {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return null;
  }
  const segments = url.pathname
    .split("/")
    .map((s) => decodeURIComponent(s).replace(/\.(html?|p|aspx|php)$/i, ""))
    .filter(Boolean);

  // The most descriptive segment: the one with the most real words.
  let best: string[] = [];
  for (const seg of segments) {
    const real = seg
      .split(/[-_+\s.]+/)
      .map((w) => w.toLowerCase())
      .filter((w) => w.length > 1 && !NOISE.has(w) && /[a-z]/.test(w) && !isId(w));
    if (real.length > best.length) best = real;
  }
  if (best.length < 2) return null;
  return best.slice(0, 9).join(" ");
}

// Product ids and SKUs that carry no meaning for a search: ASINs (B0863TXGM3), long numbers.
function isId(w: string): boolean {
  if (/^\d+$/.test(w)) return w.length > 4;
  if (/^b0[a-z0-9]{8}$/i.test(w)) return true; // Amazon ASIN
  const digits = (w.match(/\d/g) ?? []).length;
  return w.length >= 9 && digits >= 5; // mostly-digit SKUs
}
