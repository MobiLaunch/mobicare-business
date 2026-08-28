import { useNavigate } from "react-router-dom";
import { ArrowRight, CalendarDays, MapPin, ShoppingBag } from "lucide-react";
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
      className="relative overflow-hidden rounded-[32px] bg-surface/88 p-[clamp(20px,4vw,40px)] shadow-[0_4px_20px_rgba(0,0,0,0.04)] backdrop-blur-xl"
      id="hero-bento-section"
    >
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
        <div className="relative z-[1] flex min-w-0 flex-col gap-5 lg:col-span-7">
          <Chip className="w-max max-w-full gap-1.5" color="default" size="sm">
            <MapPin aria-hidden="true" className="size-[18px] text-accent" />
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

          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button
              className="group min-h-[132px] justify-between rounded-[24px] border border-accent p-5 text-left shadow-sm transition-transform hover:-translate-y-0.5"
              variant="primary"
              size="lg"
              onPress={onBookRepair}
            >
              <span className="flex w-full flex-col items-start justify-between gap-5">
                <span className="flex size-10 items-center justify-center rounded-full bg-accent-foreground/12">
                  <CalendarDays aria-hidden="true" className="size-5" />
                </span>
                <span>
                  <strong className="block text-lg font-bold">Book a Repair</strong>
                  <span className="mt-0.5 block text-sm opacity-80">Schedule your device service</span>
                </span>
                <ArrowRight aria-hidden="true" className="size-5 transition-transform group-hover:translate-x-1" />
              </span>
            </Button>

            <Button
              className="group min-h-[132px] justify-between rounded-[24px] border border-border bg-surface-secondary p-5 text-left text-foreground shadow-sm transition-transform hover:-translate-y-0.5"
              variant="outline"
              size="lg"
              onPress={() => navigate("/shop")}
            >
              <span className="flex w-full flex-col items-start justify-between gap-5">
                <span className="flex size-10 items-center justify-center rounded-full bg-surface-tertiary text-accent">
                  <ShoppingBag aria-hidden="true" className="size-5" />
                </span>
                <span>
                  <strong className="block text-lg font-bold">Shop Accessories</strong>
                  <span className="mt-0.5 block text-sm text-muted">Cases, chargers &amp; more</span>
                </span>
                <ArrowRight aria-hidden="true" className="size-5 text-accent transition-transform group-hover:translate-x-1" />
              </span>
            </Button>
          </div>
        </div>

        <div className="relative z-[1] min-w-0 lg:col-span-5">
          <LocationCard />
        </div>
      </div>
    </section>
  );
}
