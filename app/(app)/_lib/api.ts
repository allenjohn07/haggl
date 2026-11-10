// The four calls the page makes (routes in docs/CONTRACTS.md).
function post(url: string, body: unknown, signal?: AbortSignal) {
  return fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal });
}

export const api = {
  search: (query: string) => post("/api/search", { query }),
  debate: (productId: string, offerId: string, signal: AbortSignal) => post("/api/debate", { productId, offerId }, signal),
  answer: (debateId: string, askId: string, answer: string) => post("/api/debate/answer", { debateId, askId, answer }),
  buy: (debateId: string, productId: string, offerId: string) => post("/api/buy", { debateId, productId, offerId }),
};
