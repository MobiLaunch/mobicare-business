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
            <Chip.Label className="overflow-hidden text-ellipsis whitespace-nowrap text-caption font-bold tracking-wide">
              {hero.badgeText}
            </Chip.Label>
          </Chip>

          <h1 className="m-0 text-display font-extrabold leading-[1.08] tracking-tight text-foreground">
            {hero.headlineLine1}
            <br />
            <span className="text-accent">{hero.headlineAccent}</span>
          </h1>

          <p className="m-0 max-w-[520px] text-body-lg leading-relaxed text-muted">
            {hero.description}
          </p>

          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button
              aria-label="Book a repair"
              className="group flex min-h-[160px] w-full flex-col justify-between rounded-[24px] border border-accent bg-accent p-5 text-left text-accent-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:translate-y-0"
              variant="primary"
              onPress={onBookRepair}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-foreground/12">
                <CalendarDays aria-hidden="true" className="size-5" />
              </span>
              <span className="block min-w-0">
                <strong className="block text-lg font-bold">Book a Repair</strong>
                <span className="mt-0.5 block text-sm opacity-80">Schedule your device service</span>
              </span>
              <span className="flex items-center justify-between">
                <span className="text-sm font-semibold">Get started</span>
                <ArrowRight aria-hidden="true" className="size-5 transition-transform group-hover:translate-x-1" />
              </span>
            </Button>

            <Button
              aria-label="Shop accessories"
              className="group flex min-h-[160px] w-full flex-col justify-between rounded-[24px] border border-border bg-surface-secondary p-5 text-left text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:translate-y-0"
              variant="ghost"
              onPress={() => navigate("/shop")}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-tertiary text-accent">
                <ShoppingBag aria-hidden="true" className="size-5" />
              </span>
              <span className="block min-w-0">
                <strong className="block text-lg font-bold">Shop Accessories</strong>
                <span className="mt-0.5 block text-sm text-muted">Cases, chargers &amp; more</span>
              </span>
              <span className="flex items-center justify-between">
                <span className="text-sm font-semibold text-accent">Browse the shop</span>
                <ArrowRight aria-hidden="true" className="size-5 text-accent transition-transform group-hover:translate-x-1" />
              </span>
            </Button>
          </div>
        </div>

        <div className="relative z-[1] hidden min-w-0 lg:col-span-5 lg:block">
          <LocationCard />
        </div>
      </div>
    </section>
  );
}
