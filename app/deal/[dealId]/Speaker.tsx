// A character's name tag and speech bubble, as plain HTML text.
// ui lane: drop the pixel character (components/pixel) in the marked slot when it lands.
export function Speaker({ name, line }: { name: string; line: string }) {
  return (
    <div className="flex items-start gap-3">
      {/* pixel character slot */}
      <span className="shrink-0 rounded-full bg-black/5 px-3 py-1 text-xs font-semibold dark:bg-white/10">
        {name}
      </span>
      <p className="rounded-2xl rounded-tl-sm bg-black/5 px-4 py-2 text-sm dark:bg-white/10" aria-live="polite">
        {line}
      </p>
    </div>
  );
}
