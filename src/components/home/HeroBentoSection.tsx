import { useNavigate } from "react-router-dom";
import { ArrowRight, BatteryFull, CalendarDays, Camera, Droplets, MapPin, ShoppingBag, Smartphone } from "lucide-react";

import { useSiteStore } from "@/lib/siteStore";
import LocationCard from "@/components/home/LocationCard";
import AppIcon from "@/components/ios/AppIcon";
import Reveal from "@/components/ios/Reveal";

interface HeroBentoSectionProps {
  onBookRepair: () => void;
}

/**
 * Hero: the one job is to get a tap on "Book a Repair". The primary button is
 * big, green, glossy, glints and pulses; shopping is a quiet second option.
 * Floating app icons add motion and colour without competing with the copy.
 */
export default function HeroBentoSection({ onBookRepair }: HeroBentoSectionProps) {
  const navigate = useNavigate();
  const hero = useSiteStore((s) => s.hero);

  return (
    <section className="relative isolate px-[clamp(4px,2vw,16px)] pb-[clamp(16px,3vw,32px)] pt-[clamp(8px,2vw,24px)]" id="hero-bento-section">
      {/* Decorative floating icons (hidden from assistive tech, behind content). */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 hidden overflow-hidden lg:block">
        <span className="ios-float absolute left-[46%] top-2" style={{ ["--r" as string]: "-8deg" }}>
          <AppIcon color="orange" icon={BatteryFull} size={58} />
        </span>
        <span className="ios-float absolute left-[3%] bottom-0" style={{ ["--r" as string]: "6deg", animationDelay: "-2s" }}>
          <AppIcon color="teal" icon={Droplets} size={52} />
        </span>
        <span className="ios-float absolute left-[52%] bottom-6" style={{ ["--r" as string]: "10deg", animationDelay: "-4s" }}>
          <AppIcon color="pink" icon={Camera} size={48} />
        </span>
      </div>

      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-7">
          <Reveal>
            <span className="ios-pill max-w-full">
              <MapPin aria-hidden="true" className="size-3.5 shrink-0 text-[var(--ios-red)]" />
              <span className="truncate">{hero.badgeText}</span>
            </span>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="type-display m-0 text-display text-[var(--ios-ink)]">
              {hero.headlineLine1}
              <br />
              <span className="ios-gradient-text">{hero.headlineAccent}</span>
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="m-0 max-w-[46ch] text-body-lg leading-[1.6] text-[var(--ios-slate)]" style={{ textShadow: "0 1px 0 rgba(255,255,255,.8)" }}>
              {hero.description}
            </p>
          </Reveal>

          <Reveal className="flex flex-col gap-3 sm:flex-row sm:items-stretch" delay={240}>
            <button
              aria-label="Book a repair"
              className="ios-btn ios-btn--green ios-btn--lg ios-pulse ios-shine group flex-1 justify-between !px-5"
              type="button"
              onClick={onBookRepair}
            >
              <span className="flex items-center gap-3">
                <CalendarDays aria-hidden="true" className="size-6" />
                <span className="text-left leading-tight">
                  <strong className="block text-lg">Book a Repair</strong>
                  <span className="block text-xs font-semibold opacity-90">Most jobs done same day</span>
                </span>
              </span>
              <ArrowRight aria-hidden="true" className="size-5 transition-transform group-hover:translate-x-1" />
            </button>

            <button
              aria-label="Shop accessories"
              className="ios-btn ios-btn--gray ios-btn--lg group justify-between !px-5 sm:flex-1"
              type="button"
              onClick={() => navigate("/shop")}
            >
              <span className="flex items-center gap-3">
                <ShoppingBag aria-hidden="true" className="size-5" />
                <span className="text-left leading-tight">
                  <strong className="block text-base">Shop Accessories</strong>
                  <span className="block text-xs font-semibold text-[#5b6577]">Cases, chargers &amp; more</span>
                </span>
              </span>
              <ArrowRight aria-hidden="true" className="size-5 text-[var(--ios-blue)] transition-transform group-hover:translate-x-1" />
            </button>
          </Reveal>

          <Reveal className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-bold text-[var(--ios-slate)]" delay={320}>
            <span className="inline-flex items-center gap-1.5"><Smartphone aria-hidden="true" className="size-4 text-[var(--ios-green-dark)]" /> iPhone · Android · iPad</span>
            <span aria-hidden="true">•</span>
            <span>90-day parts warranty</span>
            <span aria-hidden="true">•</span>
            <span>Walk-ins welcome</span>
          </Reveal>
        </div>

        <Reveal className="min-w-0 lg:col-span-5" delay={200}>
          <LocationCard />
        </Reveal>
      </div>
    </section>
  );
}
