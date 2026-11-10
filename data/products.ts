import type { Product } from "@/lib/types";

// sellerFloor and buyerMax are PRIVATE. They never leave the server.
// Use toPublic() for anything that goes to the browser.
// Margins vary on purpose: buyerMax - sellerFloor is the zone where a deal is possible.
export const PRODUCTS: Product[] = [
  {
    id: "haunted-camera",
    name: "Haunted Film Camera",
    blurb: "Every photo has one extra person in it. Nobody knows who.",
    emoji: "📷",
    listPrice: 150,
    sellerFloor: 90,
    buyerMax: 120, // medium: $30 of room
  },
  {
    id: "sentient-lamp",
    name: "Sentient Desk Lamp",
    blurb: "Turns itself off when it disapproves of your choices.",
    emoji: "💡",
    listPrice: 80,
    sellerFloor: 35,
    buyerMax: 70, // easy: $35 of room
  },
  {
    id: "cursed-teapot",
    name: "Slightly Cursed Teapot",
    blurb: "Makes perfect tea. Whispers your search history.",
    emoji: "🫖",
    listPrice: 60,
    sellerFloor: 46,
    buyerMax: 50, // tight: only $4 of room
  },
  {
    id: "lucky-boots",
    name: "Boots of Mild Luck",
    blurb: "You will always find a parking spot. Only one, though.",
    emoji: "🥾",
    listPrice: 120,
    sellerFloor: 60,
    buyerMax: 95, // medium-easy
  },
  {
    id: "honest-mirror",
    name: "Brutally Honest Mirror",
    blurb: "It has notes about your haircut. Many notes.",
    emoji: "🪞",
    listPrice: 200,
    sellerFloor: 140,
    buyerMax: 155, // hard: $15 of room on a big price
  },
  {
    id: "jar-of-thunder",
    name: "Jar of Thunder",
    blurb: "Caught during a very dramatic storm. Do not open indoors.",
    emoji: "⛈️",
    listPrice: 45,
    sellerFloor: 20,
    buyerMax: 38, // easy
  },
];

export type PublicProduct = Pick<Product, "id" | "name" | "blurb" | "emoji" | "listPrice">;

export function toPublic({ id, name, blurb, emoji, listPrice }: Product): PublicProduct {
  return { id, name, blurb, emoji, listPrice };
}

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}
