import { useNavigate } from "react-router-dom";
import { ArrowRight, CalendarDays, Phone } from "lucide-react";
import { Button, Link, buttonVariants } from "@heroui/react";

import { useSiteStore } from "@/lib/siteStore";

interface CtaStripProps {
  onBookRepair?: () => void;
}

export default function CtaStrip({ onBookRepair }: CtaStripProps) {
  const navigate = useNavigate();
  const ctaStrip = useSiteStore((s) => s.ctaStrip);
  const business = useSiteStore((s) => s.business);
  const copy = useSiteStore((s) => s.copy);

  const primaryLabel =
    copy?.["home.cta.book"] || ctaStrip.primaryCta || "Book Appointment";
  const secondaryLabel = ctaStrip.secondaryCta || "Browse Shop";
  const phoneDigits = (business?.phone || "").replace(/[^0-9+]/g, "");

  return (
    <section className="py-6 pb-12" id="cta-banner-section">
      <article className="overflow-hidden rounded-panel bg-accent text-accent-foreground">
        <div className="flex flex-wrap items-center gap-6 p-[clamp(20px,4vw,32px)]">
          <div className="min-w-0 flex-1 basis-60">
            <h2
              className="m-0 mb-1 text-heading-sm font-semibold"
              data-edit="ctaStrip.headline"
            >
              {ctaStrip.headline}
            </h2>
            <p
              className="m-0 text-body opacity-85"
              data-edit="ctaStrip.subtext"
            >
              {ctaStrip.subtext}
            </p>
          </div>

          <div className="flex flex-shrink-0 flex-wrap gap-2.5 max-sm:w-full">
            <Button
              className="bg-surface font-bold text-foreground hover:bg-surface/90 max-sm:flex-1"
              data-edit="ctaStrip.primaryCta"
              variant="secondary"
              onPress={() =>
                onBookRepair ? onBookRepair() : navigate("/repairs")
              }
            >
              <CalendarDays className="size-4 text-accent" />
              <span>{primaryLabel}</span>
            </Button>

            <Button
              className="border-accent-foreground/40 text-accent-foreground hover:bg-accent-foreground/15 max-sm:flex-1"
              data-edit="ctaStrip.secondaryCta"
              variant="outline"
              onPress={() => navigate("/shop")}
            >
              <span>{secondaryLabel}</span>
              <ArrowRight className="size-4" />
            </Button>

            {business?.phone && (
              <Link
                className={`${buttonVariants({ variant: "outline" })} border-accent-foreground/40 text-accent-foreground hover:bg-accent-foreground/15 max-sm:flex-1`}
                href={`tel:${phoneDigits}`}
              >
                <Phone className="size-4" />
                <span>{business.phone}</span>
              </Link>
            )}
          </div>
        </div>
      </article>
    </section>
  );
}
