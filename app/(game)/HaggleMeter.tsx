// Buyer and seller offers converging on a track from $0 to the list price.
export function HaggleMeter({ listPrice, buyer, seller, deal }: { listPrice: number; buyer?: number; seller?: number; deal?: number }) {
  const pct = (n: number) => `${Math.min(100, Math.max(0, (n / listPrice) * 100))}%`;
  const summary =
    deal !== undefined
      ? `Deal at $${deal} of $${listPrice}.`
      : `Bao offers ${buyer !== undefined ? `$${buyer}` : "nothing yet"}, Mr. Pickle asks $${seller ?? listPrice}, list price $${listPrice}.`;
  const marker = (n: number, label: string, cls: string, up: boolean) => (
    <div className="absolute top-0 h-full -translate-x-1/2 transition-[left] duration-500" style={{ left: pct(n) }}>
      <div className={`absolute left-1/2 h-full w-1 -translate-x-1/2 rounded-full ${cls}`} />
      <span
        className={`absolute left-1/2 -translate-x-1/2 rounded-md px-1.5 font-mono text-[12px] font-bold whitespace-nowrap text-white ${cls} ${up ? "-top-6" : "-bottom-6"}`}
      >
        {label} ${n}
      </span>
    </div>
  );
  return (
    <div className="flex items-center gap-2 px-4 pt-8 pb-8 font-mono text-[11px] text-ink-soft" role="group" aria-label="Haggle meter">
      <p className="sr-only">{summary}</p>
      <span aria-hidden>$0</span>
      <div className="relative h-3 flex-1 rounded-full border-2 border-outline bg-card" aria-hidden>
        {buyer !== undefined && seller !== undefined && deal === undefined && (
          <div className="absolute top-0 h-full bg-gold/70" style={{ left: pct(Math.min(buyer, seller)), width: `${(Math.abs(seller - buyer) / listPrice) * 100}%` }} />
        )}
        {deal !== undefined ? (
          marker(deal, "Deal", "bg-outline", true)
        ) : (
          <>
            {buyer !== undefined && marker(buyer, "Bao", "bg-bao", false)}
            {seller !== undefined && marker(seller, "Pickle", "bg-pickle", true)}
          </>
        )}
      </div>
      <span aria-hidden>${listPrice}</span>
    </div>
  );
}
