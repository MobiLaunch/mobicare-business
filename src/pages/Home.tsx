import { useState } from "react";

import PageMeta from "@/components/PageMeta";
import BackgroundCanvas from "@/components/BackgroundCanvas";
import HeroBentoSection from "@/components/home/HeroBentoSection";
import TrustTicker from "@/components/home/TrustTicker";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import CtaStrip from "@/components/home/CtaStrip";
import BookingWizard from "@/components/BookingWizard";
import { useFadeIn } from "@/hooks/useFadeIn";

// NOTE (HeroUI v3 rebuild): the original Home.jsx also defined REPAIR_VISUALS
// and a `popularRepairs` computed list that were never actually rendered
// anywhere in the page — dead code left over from what looks like an
// unfinished "Popular Repairs" showcase section. Not carried forward here;
// happy to build that section for real if it's still wanted.
export default function Home() {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [productsRef, productsVisible] = useFadeIn<HTMLDivElement>();
  const [ctaRef, ctaVisible] = useFadeIn<HTMLDivElement>();

  return (
    <div
      className="relative min-h-screen overflow-x-hidden"
      id="homepage-main-container"
    >
      <PageMeta
        description="Southern Illinois' preferred device repair shop. Next-Day Repairs for almost everything.* EST. 2022. Four years of helping you love your device, longer."
        title="Mobicare Device Recovery — iPhone & Phone Repair in Fairfield, IL"
      />

      <BackgroundCanvas />

      <div
        className="relative z-[1] mx-auto max-w-[1400px] px-[clamp(12px,3vw,24px)] pb-8 pt-24"
        id="homepage-content-wrapper"
      >
        <div className="mb-8">
          <HeroBentoSection onBookRepair={() => setBookingOpen(true)} />
        </div>

        <TrustTicker />

        <div
          ref={productsRef}
          className={`transition-all duration-500 ${productsVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
        >
          <FeaturedProducts />
        </div>

        <div
          ref={ctaRef}
          className={`transition-all duration-500 ${ctaVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
        >
          <CtaStrip />
        </div>
      </div>

      {bookingOpen && <BookingWizard onClose={() => setBookingOpen(false)} />}
    </div>
  );
}
