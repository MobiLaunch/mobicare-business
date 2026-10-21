import { useNavigate } from "react-router-dom";
import { ArrowRight, Phone } from "lucide-react";

import { useSiteStore } from "@/lib/siteStore";
import { BUSINESS } from "@/lib/config";
import Reveal from "@/components/ios/Reveal";

// Copy comes from the store's `ctaStrip`, so editing "CTA Strip" in the site
// editor changes the homepage. Button destinations: phone call / shop.
export default function CtaStrip() {
  const navigate = useNavigate();
  const ctaStrip = useSiteStore((s) => s.ctaStrip);

  return (
    <Reveal as="section" className="py-6 pb-12" id="cta-banner-section">
      <article className="ios-leather rounded-panel">
        <div className="relative flex flex-wrap items-center gap-6 p-[clamp(24px,4vw,40px)]">
          <div className="min-w-0 flex-1 basis-60">
            <h2 className="m-0 mb-1 text-heading-lg font-extrabold">{ctaStrip.headline}</h2>
            <p className="m-0 text-body opacity-90">{ctaStrip.subtext}</p>
          </div>

          <div className="flex flex-shrink-0 flex-wrap gap-2.5 max-sm:w-full">
            <a className="ios-btn ios-btn--green ios-btn--lg max-sm:flex-1" href={`tel:${BUSINESS.phone.replace(/[^0-9+]/g, "")}`}>
              <Phone aria-hidden="true" className="size-5" />
              <span>{BUSINESS.phone}</span>
            </a>
            <button className="ios-btn ios-btn--white ios-btn--lg max-sm:flex-1" type="button" onClick={() => navigate("/shop")}>
              <span>{ctaStrip.secondaryCta}</span>
              <ArrowRight aria-hidden="true" className="size-5" />
            </button>
          </div>
        </div>
      </article>
    </Reveal>
  );
}
