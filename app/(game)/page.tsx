import { PRODUCTS, toPublic } from "@/data/products";
import { Game } from "./Game";

// Public product fields only ever reach the client.
export default function Home() {
  return <Game products={PRODUCTS.map(toPublic)} />;
}
