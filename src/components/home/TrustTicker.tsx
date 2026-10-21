import { Clock, Shield, Star, Zap, type LucideIcon } from "lucide-react";

import { useSiteStore } from "@/lib/siteStore";

// Trust items store an icon *name* (admin-editable, Material-Symbols style).
// Map the known set to lucide icons; anything else falls back to a star.
const ICON_MAP: Record<string, LucideIcon> = {
  bolt: Zap,
  shield: Shield,
  schedule: Clock,
  star: Star,
};
const TINTS = ["#ffd24a", "#7ee27a", "#6fc3ff", "#ff9d6b"];

/** A glossy black "stock ticker" strip. Pauses on hover; static for reduced motion. */
export default function TrustTicker() {
  const trustItems = useSiteStore((s) => s.trustItems);
  const items = [...trustItems, ...trustItems];

  return (
    <section
      aria-label="Why choose Mobicare"
      className="ios-ticker -mx-[clamp(12px,3vw,24px)] my-2 overflow-hidden rounded-none sm:mx-0 sm:rounded-[10px]"
      id="trust-banner-section"
    >
      <div className="flex w-max animate-[ticker-scroll_30s_linear_infinite] items-center hover:[animation-play-state:paused] motion-reduce:animate-none">
        {items.map((t, i) => {
          const Icon = ICON_MAP[t.icon] || Star;

          return (
            <div
              key={i}
              aria-hidden={i >= trustItems.length ? true : undefined}
              className="inline-flex items-center gap-2.5 whitespace-nowrap border-r border-white/10 px-7 py-3"
            >
              <Icon aria-hidden="true" className="size-5 shrink-0" style={{ color: TINTS[i % TINTS.length], filter: `drop-shadow(0 0 6px ${TINTS[i % TINTS.length]}88)` }} />
              <strong className="text-body-sm" style={{ textShadow: "0 -1px 0 #000" }}>{t.label}</strong>
              <span className="text-label text-white/60">{t.desc}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
