"use client";

import { useState } from "react";
import type { ProductCard } from "@/lib/types";
import { DebateScreen } from "./DebateScreen";
import { SearchScreen } from "./SearchScreen";
import { SkipScreen } from "./SkipScreen";
import { sounds, unlockSound } from "../_lib/sounds";

type Screen = { name: "search" } | { name: "debate"; card: ProductCard; run: number } | { name: "skip"; kept: number };

// One route, three screens: search and pick, the debate (with the verdict), and the skip reaction.
// The search screen stays mounted (hidden) so going back keeps the results.
export function Haggl() {
  const [screen, setScreen] = useState<Screen>({ name: "search" });
  const toSearch = () => {
    setScreen({ name: "search" });
    window.scrollTo(0, 0);
  };

  return (
    <>
      <div className={screen.name === "search" ? "flex flex-1 flex-col" : "hidden"}>
        <SearchScreen
          onAsk={(card) => {
            unlockSound(); // the Ask tap is the user gesture browsers need before playing sound
            sounds.start();
            setScreen({ name: "debate", card, run: Date.now() });
          }}
        />
      </div>
      {screen.name === "debate" && (
        <DebateScreen
          key={`${screen.card.id}-${screen.run}`}
          product={screen.card}
          picked={screen.card.bestOffer}
          onBack={toSearch}
          onSkip={(kept) => setScreen({ name: "skip", kept })}
        />
      )}
      {screen.name === "skip" && <SkipScreen kept={screen.kept} onAgain={toSearch} />}
    </>
  );
}
