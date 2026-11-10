import { PRODUCTS, toPublic } from "@/data/products";

// Public fields only: { id, name, blurb, emoji, listPrice }.
export function GET() {
  return Response.json(PRODUCTS.map(toPublic));
}
