export function money(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// "bestbuy.com" -> "bestbuy.com"; "https://www.target.com/x" -> "target.com"
export function store(merchant: string): string {
  return merchant.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
}
