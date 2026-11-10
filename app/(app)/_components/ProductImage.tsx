// Remote product photo on a soft light tile, or a quiet placeholder with the brand initial.
export function ProductImage({ src, alt, brand, className = "", small = false }: { src?: string; alt: string; brand?: string; className?: string; small?: boolean }) {
  if (src) {
    return (
      <div className={`overflow-hidden bg-[#f3f2ef] ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- remote store images, no next/image config */}
        <img src={src} alt={alt} loading="lazy" className={`h-full w-full object-contain ${small ? "p-0.5" : "p-[8%]"} mix-blend-multiply`} />
      </div>
    );
  }
  // No photo: a soft tile with the brand in handwriting, tinted warm or cool.
  const name = (brand || alt).trim();
  const warm = name.length % 2 === 0;
  const tint = warm ? "rgb(255 122 92 / 0.16)" : "rgb(69 209 181 / 0.14)";
  return (
    <div
      aria-hidden
      style={{ background: `radial-gradient(circle at 30% 20%, ${tint}, transparent 65%), #17171f` }}
      className={`flex items-center justify-center px-3 text-center ${className}`}
    >
      <span className={`font-hand font-bold leading-tight text-muted ${small ? "text-xl" : "text-2xl sm:text-3xl"}`}>
        {small ? name.charAt(0).toUpperCase() : name}
      </span>
    </div>
  );
}
