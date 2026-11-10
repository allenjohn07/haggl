import { mockAnswer, mockBuy, mockDebate, mockSearch } from "./mock";

// The four calls the page makes. In development, NEXT_PUBLIC_HAGGL_MOCK=1 swaps in a local replay.
const MOCK = process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_HAGGL_MOCK === "1";

function post(url: string, body: unknown, signal?: AbortSignal) {
  return fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal });
}

export const api = {
  search: (query: string) => (MOCK ? Promise.resolve(mockSearch()) : post("/api/search", { query })),
  debate: (productId: string, offerId: string, signal: AbortSignal) =>
    MOCK ? Promise.resolve(mockDebate(productId)) : post("/api/debate", { productId, offerId }, signal),
  answer: (debateId: string, askId: string, answer: string) =>
    MOCK ? Promise.resolve(mockAnswer(askId, answer)) : post("/api/debate/answer", { debateId, askId, answer }),
  buy: (debateId: string, productId: string, offerId: string) =>
    MOCK ? Promise.resolve(mockBuy()) : post("/api/buy", { debateId, productId, offerId }),
};
