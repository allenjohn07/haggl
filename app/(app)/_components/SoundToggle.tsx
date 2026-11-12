"use client";

import { useSyncExternalStore } from "react";
import { Volume2Icon, VolumeXIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setSoundOn, soundOn } from "../_lib/sounds";

// Sound on/off, remembered in localStorage. Off on the server render, then the real value.
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export function SoundToggle() {
  const on = useSyncExternalStore(subscribe, soundOn, () => false);
  const toggle = () => {
    setSoundOn(!on);
    listeners.forEach((fn) => fn());
  };
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? "Mute sounds" : "Turn sounds on"}
      title={on ? "Mute sounds" : "Turn sounds on"}
      className="size-11 text-muted-foreground sm:size-8"
    >
      {on ? <Volume2Icon aria-hidden /> : <VolumeXIcon aria-hidden />}
    </Button>
  );
}
