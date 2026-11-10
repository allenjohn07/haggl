import { rememberProducts } from "@/lib/products";
import type { Product } from "@/lib/types";

// STUB. The `search` lane replaces this with the real Channel3 client and fixtures.
// The signatures are the contract (docs/CONTRACTS.md). Both functions remember what they return.

const SAMPLE: Product = {
  id: "sample-headphones",
  title: "Over-Ear Noise Cancelling Headphones",
  brand: "Sample",
  keyFeatures: ["Active noise cancelling", "30-hour battery", "Fold-flat design"],
  rating: { score: 4.5, count: 1200 },
  offers: [
    { offerId: "sample-headphones:store-a.com", merchant: "store-a.com", price: 249.99, url: "https://store-a.com", inStock: true },
    { offerId: "sample-headphones:store-b.com", merchant: "store-b.com", price: 219.0, url: "https://store-b.com", inStock: true },
  ],
};

export async function searchProducts(query: string): Promise<Product[]> {
  void query;
  rememberProducts([SAMPLE]);
  return [SAMPLE];
}

export async function findAlternatives(product: Product, limit = 3): Promise<Product[]> {
  void product;
  void limit;
  return [];
}
