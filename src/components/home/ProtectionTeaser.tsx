import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";

import { AKKO_CONFIG } from "@/lib/config";
import AppIcon from "@/components/ios/AppIcon";
import Reveal from "@/components/ios/Reveal";

/** Upsell: a repair customer is the best prospect for protection. */
export default function ProtectionTeaser() {
  return (
    <Reveal as="section" className="py-6" id="protection-teaser-section">
      <Link
        className="ios-card-gloss surface-raised lift group flex flex-wrap items-center gap-4 rounded-panel p-5 sm:p-6"
        to="/protection"
      >
        <AppIcon color="purple" icon={ShieldCheck} size={64} />
        <div className="min-w-0 flex-1 basis-60">
          <p className="type-eyebrow m-0">Device Protection</p>
          <h2 className="m-0 text-xl font-extrabold text-[var(--ios-ink)]" style={{ textShadow: "0 1px 0 #fff" }}>
            Never pay full price for a broken phone again
          </h2>
          <p className="m-0 mt-1 text-sm text-muted">Plans from ${AKKO_CONFIG.phonePlanPrice}/mo cover drops, spills and cracked screens.</p>
        </div>
        <span className="ios-btn ios-btn--orange">
          See plans <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" />
        </span>
      </Link>
    </Reveal>
  );
}
