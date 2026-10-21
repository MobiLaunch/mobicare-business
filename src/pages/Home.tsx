import { useState } from "react";

import PageMeta from "@/components/PageMeta";
import HeroBentoSection from "@/components/home/HeroBentoSection";
import TrustTicker from "@/components/home/TrustTicker";
import ServiceGrid from "@/components/home/ServiceGrid";
import HowItWorks from "@/components/home/HowItWorks";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import ProtectionTeaser from "@/components/home/ProtectionTeaser";
import CtaStrip from "@/components/home/CtaStrip";
import BookingWizard from "@/components/LazyBookingWizard";

export default function Home() {
  // `true` = open with no preselected service; a string = open on that service.
  const [booking, setBooking] = useState<{ service: string | null } | null>(null);

  return (
    <div className="relative min-h-screen overflow-x-hidden" id="homepage-main-container">
      <PageMeta
        description="Southern Illinois' preferred device repair shop. Next-Day Repairs for almost everything.* EST. 2022. Four years of helping you love your device, longer."
        title="Mobicare Device Recovery — iPhone & Phone Repair in Fairfield, IL"
      />

      <div className="relative z-[1] mx-auto max-w-[1400px] px-[clamp(12px,3vw,24px)] pb-8 pt-4" id="homepage-content-wrapper">
        <HeroBentoSection onBookRepair={() => setBooking({ service: null })} />
        <TrustTicker />
        <ServiceGrid onSelect={(service) => setBooking({ service })} />
        <HowItWorks />
        <FeaturedProducts />
        <ProtectionTeaser />
        <CtaStrip />
      </div>

      {booking && <BookingWizard defaultService={booking.service} onClose={() => setBooking(null)} />}
    </div>
  );
}
