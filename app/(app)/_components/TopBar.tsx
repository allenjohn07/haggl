import Link from "next/link";

// The slim workspace bar: wordmark, breadcrumb, and a quiet status on the right.
export function TopBar({
  crumbs,
  left,
  right,
  home = false,
}: {
  crumbs: (string | undefined)[];
  left?: React.ReactNode;
  right?: React.ReactNode;
  home?: boolean; // the wordmark links to "/" (pages outside the main screen)
}) {
  const shown = crumbs.filter(Boolean) as string[];
  const mark = <span className="text-[14px] font-semibold tracking-[-0.02em] text-foreground">Haggl</span>;
  return (
    <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-2 sm:px-4">
      {left}
      <nav aria-label="Breadcrumb" className={`flex min-w-0 flex-1 items-center gap-2 text-[13px] ${left ? "" : "pl-2 sm:pl-0"}`}>
        {home ? (
          <Link href="/" className="flex min-h-11 items-center rounded-sm sm:min-h-0">
            {mark}
          </Link>
        ) : (
          mark
        )}
        {shown.map((c, i) => (
          <span key={`${i}-${c}`} className={`min-w-0 items-center gap-2 ${i < shown.length - 1 ? "hidden sm:flex" : "flex"}`}>
            <span aria-hidden className="text-faint">
              /
            </span>
            <span className={`truncate ${i === shown.length - 1 ? "text-foreground" : "text-muted-foreground"}`}>{c}</span>
          </span>
        ))}
      </nav>
      {right && <div className="flex shrink-0 items-center gap-2 pr-2 text-[12px] text-muted-foreground sm:pr-0">{right}</div>}
    </header>
  );
}

// A small status dot with a label ("Live", the verdict).
export function Status({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden className={`size-1.5 rounded-full ${on ? "bg-positive" : "bg-faint"}`} />
      {children}
    </span>
  );
}
