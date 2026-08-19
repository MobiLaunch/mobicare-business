import { useNavigate } from "react-router-dom";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { Button, Chip } from "@heroui/react";

import { useSiteStore } from "@/lib/siteStore";
import LocationCard from "@/components/home/LocationCard";

interface HeroBentoSectionProps {
  onBookRepair: () => void;
}

export default function HeroBentoSection({
  onBookRepair,
}: HeroBentoSectionProps) {
  const navigate = useNavigate();
  const hero = useSiteStore((s) => s.hero);

  return (
    <section
      className="relative overflow-hidden rounded-[32px] bg-surface/88 p-[clamp(24px,5vw,48px)] shadow-[0_4px_20px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-250 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_var(--accent-soft)]"
      id="hero-bento-section"
    >
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
        {/* Left: headline & CTAs */}
        <div className="relative z-[1] flex min-w-0 flex-col gap-5 lg:col-span-7">
          <Chip className="w-max max-w-full gap-1.5" color="default" size="sm">
            <MapPin className="size-[18px] text-accent" />
            <Chip.Label className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-bold tracking-wide">
              {hero.badgeText}
            </Chip.Label>
          </Chip>

          <h1 className="m-0 text-[clamp(2.2rem,5.5vw,3.8rem)] font-extrabold leading-[1.08] tracking-tight text-foreground">
            {hero.headlineLine1}
            <br />
            <span className="text-accent">{hero.headlineAccent}</span>
          </h1>

          <p className="m-0 max-w-[520px] text-[clamp(15px,2vw,18px)] leading-relaxed text-muted">
            {hero.description}
          </p>

          <div className="mt-2 flex flex-wrap gap-3">
            <Button
              className="gap-2 px-6 py-3"
              size="lg"
              variant="primary"
              onPress={onBookRepair}
            >
              <CalendarDays className="size-[18px]" />
              <span>Book a Repair</span>
            </Button>
            <Button
              className="gap-2 px-6 py-3"
              size="lg"
              variant="outline"
              onPress={() => navigate("/shop")}
            >
              <span>Shop Accessories</span>
              <ArrowRight className="size-[18px]" />
            </Button>
          </div>
        </div>

        {/* Right: location / directions widget */}
        <div className="relative z-[1] min-w-0 lg:col-span-5">
          <LocationCard />
        </div>
      </div>
    </section>
  );
}
