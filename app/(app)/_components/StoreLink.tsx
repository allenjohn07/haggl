import { ArrowUpRightIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { store } from "../_lib/format";

// Opens the store's own product page in a new tab, so the user can check the real thing.
export function StoreLink({ url, merchant, compact = false, className }: { url: string; merchant: string; compact?: boolean; className?: string }) {
  if (!/^https?:\/\//.test(url)) return null;
  const name = store(merchant);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`View it at ${name} (opens in a new tab)`}
      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-11 gap-1.5 bg-transparent text-[13px] font-normal sm:h-8", className)}
    >
      {compact ? "View" : `View at ${name}`}
      <ArrowUpRightIcon aria-hidden className="size-3.5 text-muted-foreground" />
    </a>
  );
}
