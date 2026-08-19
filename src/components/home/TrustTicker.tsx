import { Clock, Shield, Star, Zap, type LucideIcon } from "lucide-react";

import { useSiteStore } from "@/lib/siteStore";

// Trust items store an icon *name* (admin-editable, currently Material-Symbols
// style names like "bolt"/"shield"/"schedule"/"star" left over from the old
// BeerCSS icon system). Rather than force a full admin-content migration in
// this pass, map the known set to real lucide-react icons and fall back to a
// generic star for anything unrecognized.
const ICON_MAP: Record<string, LucideIcon> = {
  bolt: Zap,
  shield: Shield,
  schedule: Clock,
  star: Star,
};

export default function TrustTicker() {
  const trustItems = useSiteStore((s) => s.trustItems);
  const items = [...trustItems, ...trustItems];

  return (
    <section className="overflow-hidden py-2" id="trust-banner-section">
      <div className="overflow-hidden rounded-none border-y border-border bg-surface/90 py-1 shadow-[inset_0_1px_0_var(--accent-soft),0_2px_12px_rgba(0,0,0,0.06)] backdrop-blur-xl backdrop-saturate-150 dark:bg-surface-secondary/85">
        <div className="flex w-max animate-[ticker-scroll_28s_linear_infinite] items-center gap-0 hover:[animation-play-state:paused]">
          {items.map((t, i) => {
            const IconComponent = ICON_MAP[t.icon] || Star;

            return (
              <div
                key={i}
                className="inline-flex items-center gap-2.5 whitespace-nowrap border-r border-border px-8 py-2.5 last:border-r-0"
              >
                <IconComponent className="size-5 shrink-0 text-accent" />
                <strong className="text-[15px]">{t.label}</strong>
                <span className="text-[13px] text-muted">{t.desc}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
