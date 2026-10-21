import { useEffect } from "react";

import { play } from "@/lib/sound";

const INTERACTIVE = "a[href], button, [role='button'], summary, .ios-tab";

/**
 * One delegated listener gives every button and link on the site the soft
 * "tick" — including HeroUI components that render into portals — without
 * each component having to remember to call play().
 */
export default function SoundEffects() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.(INTERACTIVE);

      if (el && !el.hasAttribute("data-silent") && !el.hasAttribute("disabled")) play("tap");
    };

    document.addEventListener("click", onClick, { capture: true });

    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
