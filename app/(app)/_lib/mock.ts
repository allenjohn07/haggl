// DEV-ONLY fixture: replays a realistic debate with the exact CONTRACTS.md event shapes,
// so the UI can be built without the engine. Enabled only with NEXT_PUBLIC_HAGGL_MOCK=1 in development.
import type { ProductCard } from "@/lib/types";

const offer = (id: string, merchant: string, price: number) => ({ offerId: `${id}:${merchant}`, merchant, price, url: `https://www.${merchant}/`, inStock: true });

const CARDS: ProductCard[] = [
  { id: "fx-hp-1", title: "Over-Ear Noise Cancelling Headphones, 30h Battery", brand: "Aurel Audio", rating: { score: 4.6, count: 2841 }, bestOffer: offer("fx-hp-1", "target.com", 249.99), offerCount: 5 },
  { id: "fx-hp-2", title: "Wireless Noise Cancelling Headphones, Foldable, 40h Battery", brand: "Quietline", rating: { score: 4.3, count: 1206 }, bestOffer: offer("fx-hp-2", "walmart.com", 129.99), offerCount: 3 },
  { id: "fx-hp-3", title: "Studio Over-Ear ANC Headphones with Spatial Audio", brand: "Halvard", rating: { score: 4.7, count: 655 }, bestOffer: offer("fx-hp-3", "amazon.com", 349.99), offerCount: 4 },
  { id: "fx-hp-4", title: "Budget Hybrid ANC Headphones, 50h Battery", brand: "Brightwave", rating: { score: 4.1, count: 3920 }, bestOffer: offer("fx-hp-4", "amazon.com", 69.99), offerCount: 3 },
  { id: "fx-hp-5", title: "Premium Noise Cancelling Earbuds, Wireless Charging Case", brand: "Aurel Audio", rating: { score: 4.4, count: 1873 }, bestOffer: offer("fx-hp-5", "amazon.com", 199.99), offerCount: 3 },
];

export function mockSearch(): Response {
  return Response.json({ products: CARDS });
}

const waiters = new Map<string, (answer: string) => void>();

export function mockAnswer(askId: string, answer: string): Response {
  waiters.get(askId)?.(answer);
  waiters.delete(askId);
  return new Response(null, { status: 204 });
}

export function mockBuy(): Response {
  return Response.json({ purchaseId: "mock-purchase", error: "mock" }, { status: 502 });
}

export function mockDebate(productId: string): Response {
  const card = CARDS.find((c) => c.id === productId) ?? CARDS[0];
  const picked = { ...offer(card.id, "bestbuy.com", 299.99) };
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (event: string, data: unknown) => ctrl.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      const ask = (askId: string, from: "spark" | "penny", question: string, options: string[]) =>
        new Promise<string>((resolve) => {
          waiters.set(askId, resolve);
          send("ask", { askId, from, question, options });
          send("stage", { stage: "waiting_user", advisor: from, label: "Waiting for you" });
        });

      send("start", { debateId: "mock-debate", product: card, picked });
      await sleep(400);
      send("stage", { stage: "think", advisor: "spark", label: "Spark is thinking" });
      await sleep(2200);
      send("message", { id: "m1", from: "spark", turn: 1, text: "Okay, these are the ones! 30 hours of battery, adaptive noise cancelling, and 2,841 people gave them 4.6 stars. Your commute is about to get so quiet." });
      send("stage", { stage: "think", advisor: "penny", label: "Penny is thinking" });
      await sleep(1200);
      send("stage", { stage: "lookup", advisor: "penny", label: "Pulling prices from 5 stores" });
      await sleep(1800);
      send("evidence", {
        id: "e1", from: "penny", kind: "prices", title: "Same item, 5 stores",
        items: [
          { label: "target.com", price: 249.99, productId: card.id, offerId: `${card.id}:target.com` },
          { label: "walmart.com", price: 259.0 },
          { label: "amazon.com", price: 279.99, note: "was $329.99" },
          { label: "bestbuy.com", price: 299.99, note: "your pick" },
          { label: "crutchfield.com", price: 299.99, note: "out of stock" },
        ],
      });
      await sleep(900);
      send("message", { id: "m2", from: "penny", turn: 2, reaction: "Quiet commute, loud price.", text: "Lovely headphones. But you picked $299.99 at bestbuy.com and target.com has the exact same pair for $249.99. That's $50 for nothing." });
      await sleep(600);
      const a1 = await ask("ask1", "penny", "What's your budget for headphones?", ["Under $150", "Up to $250", "Up to $300", "Money's no object"]);
      send("answer", { askId: "ask1", answer: a1 });
      send("stage", { stage: "think", advisor: "spark", label: "Spark is thinking" });
      await sleep(1400);
      send("stage", { stage: "lookup", advisor: "spark", label: "Reading 2,841 reviews" });
      await sleep(1700);
      send("evidence", {
        id: "e2", from: "spark", kind: "details", title: "What owners love",
        items: [
          { label: "Adaptive active noise cancelling" },
          { label: "30-hour battery, 5 min charge = 3 h" },
          { label: "Multipoint Bluetooth 5.3" },
          { label: "4.6 out of 5", note: "2,841 ratings" },
        ],
      });
      await sleep(700);
      send("message", { id: "m3", from: "spark", turn: 3, reaction: "Fifty bucks? Fine, fair.", text: `${a1}? Then target.com at $249.99 fits. Same headphones, same joy, and you keep $50 for snacks.` });
      send("stage", { stage: "think", advisor: "penny", label: "Penny is thinking" });
      await sleep(1100);
      send("stage", { stage: "lookup", advisor: "penny", label: "Looking for cheaper alternatives" });
      await sleep(1900);
      send("evidence", {
        id: "e3", from: "penny", kind: "alternatives", title: "Cheaper, still good",
        items: [
          { label: "Quietline Foldable ANC, 40h", price: 129.99, note: "4.3 stars", productId: "fx-hp-2", offerId: "fx-hp-2:walmart.com" },
          { label: "Brightwave Hybrid ANC, 50h", price: 69.99, note: "4.1 stars", productId: "fx-hp-4", offerId: "fx-hp-4:amazon.com" },
        ],
      });
      await sleep(700);
      send("message", { id: "m4", from: "penny", turn: 4, reaction: "Snacks are not a strategy.", text: "Or the Quietline pair at $129.99. Ten fewer hours of noise cancelling joy, sure, but ten more hours of battery." });
      send("stage", { stage: "think", advisor: "spark", label: "Spark is thinking" });
      await sleep(2000);
      send("message", { id: "m5", from: "spark", turn: 5, reaction: "Battery isn't everything!", text: "The Aurel ones are just better at the quiet part. That's the whole point of noise cancelling headphones, Penny." });
      await sleep(500);
      const a2 = await ask("ask2", "spark", "How often would you wear them?", ["Every day", "A few times a week", "Only on flights"]);
      send("answer", { askId: "ask2", answer: a2 });
      send("stage", { stage: "think", advisor: "penny", label: "Penny is thinking" });
      await sleep(1700);
      send("message", { id: "m6", from: "penny", turn: 6, reaction: "Hm. That changes things.", text: `${a2}. At that rate the Aurel pair costs pennies per use. I'll allow it, but only at $249.99.` });
      send("stage", { stage: "think", advisor: "spark", label: "Spark is thinking" });
      await sleep(1500);
      send("message", { id: "m7", from: "spark", turn: 7, reaction: "Did Penny just agree?!", text: "Deal! Best headphones on the list, at the best price on the list. That's a treat AND a bargain." });
      send("stage", { stage: "think", advisor: "penny", label: "Penny is thinking" });
      await sleep(1300);
      send("message", { id: "m8", from: "penny", turn: 8, reaction: "Don't get used to it.", text: "Target.com, $249.99. Not a cent more." });
      send("stage", { stage: "verdict", label: "Putting our heads together" });
      await sleep(2400);
      send("verdict", {
        call: "buy_elsewhere",
        headline: "Buy them, but at target.com",
        reasons: ["Same headphones, $50 less than your pick", "Fits your budget", "You'd use them a lot, so the cost per use is tiny"],
        productId: card.id,
        offerId: `${card.id}:target.com`,
        price: 249.99,
        savings: 50,
      });
      send("done", {});
      ctrl.close();
    },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream" } });
}
