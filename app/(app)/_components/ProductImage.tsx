// Remote product photo on a light tile, or a quiet placeholder with the brand initial.
export function ProductImage({ src, alt, brand, className = "" }: { src?: string; alt: string; brand?: string; className?: string }) {
  if (src) {
    return (
      <div className={`overflow-hidden rounded-md bg-[#ecebe8] ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- remote store images, no next/image config */}
        <img src={src} alt={alt} loading="lazy" className="h-full w-full object-contain p-[10%] mix-blend-multiply" />
      </div>
    );
  }
  const name = (brand || alt).trim();
  return (
    <div aria-hidden className={`flex items-center justify-center rounded-md border border-border bg-surface-2 ${className}`}>
      <span className="text-[13px] font-semibold text-muted-foreground">{name.charAt(0).toUpperCase()}</span>
    </div>
  );
}
