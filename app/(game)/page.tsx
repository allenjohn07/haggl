import { PRODUCTS, toPublic } from "@/data/products";

// Minimal starting screen. The `ui` lane replaces this with the market-stall game screen.
export default function Home() {
  const products = PRODUCTS.map(toPublic);
  return (
    <main className="mx-auto w-full max-w-[390px] p-6">
      <h1 className="text-3xl font-bold">Haggle</h1>
      <p className="mt-1 opacity-70">Today at Mr. Pickle&apos;s stall:</p>
      <ul className="mt-6 space-y-3">
        {products.map((p) => (
          <li key={p.id} className="rounded-xl border p-4">
            <div className="font-semibold">
              {p.emoji} {p.name} <span className="font-mono">${p.listPrice}</span>
            </div>
            <div className="text-sm opacity-70">{p.blurb}</div>
          </li>
        ))}
      </ul>
    </main>
  );
}
