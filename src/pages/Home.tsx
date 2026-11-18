import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Phone, ShieldCheck } from "lucide-react";
import { Button, Link, buttonVariants } from "@heroui/react";

import PageMeta from "@/components/PageMeta";
import BackgroundCanvas from "@/components/BackgroundCanvas";
import HeroBentoSection from "@/components/home/HeroBentoSection";
import TrustTicker from "@/components/home/TrustTicker";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import CtaStrip from "@/components/home/CtaStrip";
import BookingWizard from "@/components/BookingWizard";
import CategoryIcon from "@/components/CategoryIcon";
import { useSiteStore } from "@/lib/siteStore";

const DEFAULT_HOME_ORDER = [
  "hero",
  "services",
  "how",
  "featured",
  "protect",
  "cta",
];

export default function Home() {
  const navigate = useNavigate();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingService, setBookingService] = useState<string | null>(null);

  const layout = useSiteStore((s) => s.layout);
  const copy = useSiteStore((s) => s.copy);
  const repairServices = useSiteStore((s) => s.repairServices);
  const repairBanner = useSiteStore((s) => s.repairBanner);
  const howItWorks = useSiteStore((s) => s.howItWorks);
  const business = useSiteStore((s) => s.business);

  const openBooking = (serviceId?: string) => {
    setBookingService(serviceId || null);
    setBookingOpen(true);
  };

  const orderedBlocks = useMemo(() => {
    const customOrder = (layout?.home?.order || []).filter((id) =>
      DEFAULT_HOME_ORDER.includes(id),
    );
    const fullOrder = [
      ...customOrder,
      ...DEFAULT_HOME_ORDER.filter((id) => !customOrder.includes(id)),
    ];
    const hidden = new Set(layout?.home?.hidden || []);
    return fullOrder.filter((id) => !hidden.has(id));
  }, [layout]);

  const phoneDigits = (business?.phone || "").replace(/[^0-9+]/g, "");

  return (
    <div
      className="relative min-h-screen overflow-x-hidden"
      id="homepage-main-container"
    >
      <PageMeta
        description="Southern Illinois' premier device repair shop. Est. 2019. Same-day screen repairs, battery replacements, water damage recovery, and accessories in Fairfield, IL."
        title="Mobicare Device Recovery — iPhone & Phone Repair in Fairfield, IL"
      />

      <BackgroundCanvas />

      <div
        className="relative z-[1] mx-auto max-w-[1400px] px-[clamp(12px,3vw,24px)] pb-8 pt-[clamp(24px,4vh,48px)]"
        id="homepage-content-wrapper"
      >
        {orderedBlocks.map((blockId) => {
          if (blockId === "hero") {
            return (
              <div key="hero" className="mb-6">
                <div className="mb-8">
                  <HeroBentoSection onBookRepair={() => openBooking()} />
                </div>
                <TrustTicker />
              </div>
            );
          }

          if (blockId === "services") {
            return (
              <section
                key="services"
                className="py-8"
                id="home-services-section"
              >
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3 px-1">
                  <div>
                    <p className="m-0 text-caption font-bold uppercase tracking-widest text-accent">
                      {repairBanner?.eyebrow || "Device Repair"}
                    </p>
                    <h2
                      className="m-0 mt-1 text-heading-lg font-extrabold text-foreground"
                      data-edit="copy.home.services.title"
                    >
                      {copy?.["home.services.title"] || "What can we fix?"}
                    </h2>
                    <p
                      className="m-0 mt-1 max-w-xl text-sm text-muted"
                      data-edit="copy.home.services.lead"
                    >
                      {copy?.["home.services.lead"] ||
                        "Choose a repair to start booking. $35 diagnostic bench fee — 100% credited toward your repair."}
                    </p>
                  </div>
                  <Button variant="ghost" onPress={() => navigate("/repairs")}>
                    <span>
                      {repairBanner?.primaryCta || "See Repair Services"}
                    </span>
                    <ArrowRight className="size-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                  {(repairServices || []).map((svc) => (
                    <button
                      key={svc.id}
                      className="surface-raised lift group flex flex-col justify-between gap-4 rounded-card p-5 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      type="button"
                      onClick={() => openBooking(svc.id)}
                    >
                      <div>
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <span className="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                            <CategoryIcon
                              className="size-5"
                              iconId={svc.icon}
                            />
                          </span>
                          <span className="rounded-full bg-surface-secondary px-2.5 py-1 text-caption font-bold text-accent">
                            {svc.priceRange}
                          </span>
                        </div>
                        <h3 className="m-0 text-base font-bold text-foreground">
                          {svc.name}
                        </h3>
                        <p className="m-0 mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted">
                          {svc.description}
                        </p>
                      </div>
                      <div className="flex items-center justify-between border-t border-border pt-3 text-xs font-semibold">
                        <span className="text-muted">{svc.duration}</span>
                        <span className="inline-flex items-center gap-1 text-accent group-hover:translate-x-0.5 transition-transform">
                          Book now <ArrowRight className="size-3.5" />
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                {repairBanner?.headline && (
                  <div className="surface-raised mt-6 flex flex-wrap items-center justify-between gap-4 rounded-panel p-6 sm:p-7">
                    <div className="min-w-0 max-w-2xl flex-1 basis-64">
                      <span
                        className="type-eyebrow text-accent"
                        data-edit="repairBanner.eyebrow"
                      >
                        {repairBanner.eyebrow}
                      </span>
                      <h3
                        className="m-0 mt-1 whitespace-pre-line text-heading font-extrabold text-foreground"
                        data-edit="repairBanner.headline"
                      >
                        {repairBanner.headline}
                      </h3>
                      <p
                        className="m-0 mt-1.5 text-sm leading-relaxed text-muted"
                        data-edit="repairBanner.description"
                      >
                        {repairBanner.description}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      <Button
                        variant="primary"
                        onPress={() => navigate("/repairs")}
                      >
                        <span data-edit="repairBanner.primaryCta">
                          {repairBanner.primaryCta || "See Repair Services"}
                        </span>
                        <ArrowRight className="size-4" />
                      </Button>
                      {phoneDigits && (
                        <Link
                          className={buttonVariants({ variant: "outline" })}
                          href={`tel:${phoneDigits}`}
                        >
                          <Phone className="size-4" />
                          <span data-edit="repairBanner.secondaryCta">
                            {repairBanner.secondaryCta || "Call First"}
                          </span>
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </section>
            );
          }

          if (blockId === "how") {
            return (
              <section key="how" className="py-6" id="home-how-it-works">
                <div className="mb-5 px-1">
                  <p className="m-0 text-caption font-bold uppercase tracking-widest text-accent">
                    Simple Process
                  </p>
                  <h2
                    className="m-0 mt-1 text-heading font-extrabold text-foreground"
                    data-edit="copy.home.how.title"
                  >
                    {copy?.["home.how.title"] || "How it works"}
                  </h2>
                  <p
                    className="m-0 mt-1 text-sm text-muted"
                    data-edit="copy.home.how.lead"
                  >
                    {copy?.["home.how.lead"] ||
                      "Three steps from broken to back in your pocket."}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {(howItWorks || []).map((step, i) => (
                    <div
                      key={i}
                      className="surface-raised flex flex-col gap-2 rounded-card p-6"
                    >
                      <span className="flex size-9 items-center justify-center rounded-full bg-accent text-sm font-extrabold text-accent-foreground">
                        {i + 1}
                      </span>
                      <h3
                        className="m-0 mt-1 text-base font-bold text-foreground"
                        data-edit={`howItWorks.${i}.title`}
                      >
                        {step.title}
                      </h3>
                      <p
                        className="m-0 text-sm leading-relaxed text-muted"
                        data-edit={`howItWorks.${i}.body`}
                      >
                        {step.body}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            );
          }

          if (blockId === "featured") {
            return <FeaturedProducts key="featured" />;
          }

          if (blockId === "protect") {
            return (
              <section key="protect" className="py-6" id="home-protect-promo">
                <div className="surface-accent flex flex-wrap items-center justify-between gap-5 rounded-panel p-6 sm:p-8">
                  <div className="flex min-w-0 flex-1 basis-64 items-start gap-4">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-sm">
                      <ShieldCheck className="size-6" />
                    </span>
                    <div>
                      <span className="type-eyebrow text-accent">
                        AKKO Device Protection Partner
                      </span>
                      <h2
                        className="m-0 mt-1 text-heading font-extrabold text-foreground"
                        data-edit="copy.home.protect.title"
                      >
                        {copy?.["home.protect.title"] ||
                          "Never pay full price for a broken phone again"}
                      </h2>
                      <p className="m-0 mt-1 text-sm text-muted">
                        Plans from $5/mo with $29 screen deductibles — repaired
                        locally right here at Mobicare.
                      </p>
                    </div>
                  </div>
                  <Button
                    size="lg"
                    variant="primary"
                    onPress={() => navigate("/protection")}
                  >
                    <span data-edit="copy.home.protect.button">
                      {copy?.["home.protect.button"] || "See plans"}
                    </span>
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </section>
            );
          }

          if (blockId === "cta") {
            return <CtaStrip key="cta" onBookRepair={() => openBooking()} />;
          }

          return null;
        })}
      </div>

      {bookingOpen && (
        <BookingWizard
          defaultService={bookingService}
          onClose={() => {
            setBookingOpen(false);
            setBookingService(null);
          }}
        />
      )}
    </div>
  );
}
