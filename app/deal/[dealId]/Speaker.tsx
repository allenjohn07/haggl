import { PixelCharacter, type CharState, type CharacterId } from "@/components/pixel";

const IDS: Record<string, CharacterId> = { Bao: "bao", "Mr. Pickle": "pickle", Beanie: "beanie" };

// A character's pixel sprite, name tag and speech bubble (the text is plain HTML).
export function Speaker({ name, line, state = "idle" }: { name: string; line: string; state?: CharState }) {
  const id = IDS[name];
  return (
    <div className="flex items-start gap-3">
      <span className="flex shrink-0 flex-col items-center gap-1">
        {id && <PixelCharacter id={id} state={state} scale={2} />}
        <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold dark:bg-white/10">{name}</span>
      </span>
      <p className="rounded-2xl rounded-tl-sm bg-black/5 px-4 py-2 text-sm dark:bg-white/10" aria-live="polite">
        {line}
      </p>
    </div>
  );
}
