export type Bubble = { text: string; price?: number };

type Props = {
  bubble: Bubble;
  x: number; // speaker x in CSS px inside the scene
  bottom: number; // distance from the scene's bottom edge to the tail tip, CSS px
  align: "left" | "center" | "right";
  maxWidth: number;
};

// Crisp HTML speech bubble positioned over the pixel scene. The tail points at the speaker.
export function SpeechBubble({ bubble, x, bottom, align, maxWidth }: Props) {
  const pos =
    align === "left" ? { left: 6 } : align === "right" ? { right: 6 } : { left: x, transform: "translateX(-50%)" };
  return (
    <>
      <div className="absolute" style={{ ...pos, bottom: bottom + 6, maxWidth }}>
        <div className="bubble bubble-pop rounded-2xl px-2.5 py-1.5 text-[13px] leading-[1.25] font-bold">
          {bubble.price !== undefined && (
            <span className="mr-1 rounded-md bg-gold px-1 font-mono text-[12px] text-outline">${bubble.price}</span>
          )}
          {bubble.text}
        </div>
      </div>
      <span
        aria-hidden
        className="absolute h-3 w-3 rotate-45 border-r-2 border-b-2 border-outline bg-[#fffdf7]"
        style={{ left: x - 6, bottom: bottom + 2 }}
      />
    </>
  );
}
