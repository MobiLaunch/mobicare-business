import { useNavigate } from "react-router-dom";
import { ArrowRight, Phone } from "lucide-react";
import { Button, Link, buttonVariants } from "@heroui/react";

import { useSiteStore } from "@/lib/siteStore";
import { BUSINESS } from "@/lib/config";

// NOTE (HeroUI v3 rebuild): the original Home.jsx hardcoded this section's
// copy ("Ready to get started?" / "Walk in or book ahead...") instead of
// reading useSiteStore's `ctaStrip` field, even though that field exists
// specifically for this section and has its own admin-editable defaults.
// Wired to the real store here, so editing "CTA Strip" content in the site
// editor actually changes the homepage. The two action buttons' destinations
// (phone call / shop) are unchanged — only their labels now come from the
// store's ctaStrip.primaryCta / secondaryCta.
export default function CtaStrip() {
  const navigate = useNavigate();
  const ctaStrip = useSiteStore((s) => s.ctaStrip);

  return (
    <section className="py-6 pb-12" id="cta-banner-section">
      <article className="overflow-hidden rounded-[28px] bg-accent text-accent-foreground">
        <div className="flex flex-wrap items-center gap-6 p-[clamp(20px,4vw,32px)]">
          <div className="min-w-0 flex-1 basis-60">
            <h2 className="m-0 mb-1 text-[clamp(1.1rem,2.5vw,1.4rem)] font-semibold">
              {ctaStrip.headline}
            </h2>
            <p className="m-0 text-[clamp(13px,2vw,15px)] opacity-85">
              {ctaStrip.subtext}
            </p>
          </div>

          <div className="flex flex-shrink-0 flex-wrap gap-2.5 max-sm:w-full">
            <Link
              className={`${buttonVariants({ variant: "outline" })} max-sm:flex-1`}
              href={`tel:${BUSINESS.phone.replace(/[^0-9+]/g, "")}`}
            >
              <Phone className="size-4" />
              <span>{BUSINESS.phone}</span>
            </Link>
            <Button
              className="max-sm:flex-1"
              variant="secondary"
              onPress={() => navigate("/shop")}
            >
              <span>{ctaStrip.secondaryCta}</span>
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </article>
    </section>
  );
}
