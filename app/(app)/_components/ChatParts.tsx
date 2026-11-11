import type { Advisor, Evidence } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { money, store } from "../_lib/format";

// Small shared pieces of the debate: names, the identity dot, and the evidence table.
export const NAME: Record<Advisor, string> = { spark: "Spark", penny: "Penny" };
export const ROLE: Record<Advisor, string> = { spark: "Treat yourself", penny: "Frugal skeptic" };

export function Dot({ who }: { who: Advisor }) {
  return <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${who === "spark" ? "bg-spark" : "bg-penny"}`} />;
}

// Who pulled a card: the advisor's dot and name.
function Byline({ who }: { who: Advisor }) {
  return (
    <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
      <Dot who={who} />
      <span className="font-medium text-foreground">{NAME[who]}</span>
    </p>
  );
}

const KIND: Record<Evidence["kind"], string> = { prices: "Price check", alternatives: "Alternatives", details: "A closer look" };

function subtitle(e: Evidence) {
  const n = e.items.length;
  if (e.kind === "prices") return `${n} ${n === 1 ? "store" : "stores"}`;
  if (e.kind === "alternatives") return `${n} similar ${n === 1 ? "pick" : "picks"}`;
  return `${n} ${n === 1 ? "detail" : "details"}`;
}

// "your pick, out of stock, was $99.00" -> pieces for the table.
function parseNote(note?: string) {
  const parts = (note ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    pick: parts.includes("your pick"),
    out: parts.includes("out of stock"),
    rest: parts.filter((p) => p !== "your pick" && p !== "out of stock").join(", "),
  };
}

// Prices, alternatives or details an advisor pulled with a tool: a compact table.
export function EvidenceCard({ evidence, className = "" }: { evidence: Evidence; className?: string }) {
  const priced = evidence.items.filter((i) => typeof i.price === "number");
  const best = priced.length > 1 ? Math.min(...priced.map((i) => i.price as number)) : undefined;
  const head = "px-3 py-1.5 text-left text-[11px] font-normal text-muted-foreground";
  return (
    <div className={`w-full overflow-hidden rounded-lg border border-border bg-surface ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
        <p className="truncate text-[12px]">
          <span className="font-medium text-foreground">{KIND[evidence.kind]}</span>
          <span className="text-muted-foreground"> · {subtitle(evidence)}</span>
        </p>
        <Byline who={evidence.from} />
      </div>
      {evidence.kind === "details" ? (
        <ul className="divide-y divide-border-soft">
          {evidence.items.map((item, i) => (
            <li key={i} className="flex items-baseline justify-between gap-3 px-3 py-1.5 sm:py-2 text-[13px]">
              <span className="text-text-2">{item.label}</span>
              {item.note && <span className="shrink-0 text-[12px] text-muted-foreground tabular-nums">{item.note}</span>}
            </li>
          ))}
        </ul>
      ) : (
        <table className="w-full table-fixed text-[13px]">
          <thead className="border-b border-border-soft">
            <tr>
              <th className={head}>{evidence.kind === "prices" ? "Store" : "Product"}</th>
              <th className={`${head} w-[30%]`}>{evidence.kind === "prices" ? "Stock" : "Store"}</th>
              <th className={`${head} w-[34%] text-right`}>Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-soft">
            {evidence.items.map((item, i) => {
              const isBest = best !== undefined && item.price === best;
              const n = parseNote(item.note);
              return (
                <tr key={i} className={isBest ? "bg-positive/[0.06]" : undefined}>
                  <td className="px-3 py-1.5 sm:py-2">
                    <span className={`block truncate ${isBest ? "text-foreground" : "text-text-2"}`}>
                      {evidence.kind === "prices" ? store(item.label) : item.label}
                    </span>
                    {evidence.kind === "prices" && (n.pick || n.rest) && (
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {[n.pick ? "Your pick" : "", n.rest].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </td>
                  <td className="truncate px-3 py-1.5 sm:py-2 text-[12px] text-muted-foreground">
                    {evidence.kind === "prices" ? (n.out ? "Out of stock" : "In stock") : item.note ? store(item.note) : ""}
                  </td>
                  <td className="px-3 py-1.5 sm:py-2 text-right">
                    <span className="inline-flex items-center justify-end gap-1.5">
                      {isBest && (
                        <Badge variant="outline" className="h-4 rounded-sm border-positive/30 px-1 text-[10px] text-positive">
                          Best
                        </Badge>
                      )}
                      {typeof item.price === "number" && (
                        <span className={`num ${isBest ? "text-foreground" : "text-text-2"}`}>{money(item.price)}</span>
                      )}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
