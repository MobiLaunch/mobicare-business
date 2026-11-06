import { useNavigate } from "react-router-dom";
import { ArrowRight, CalendarDays, MapPin, ShoppingBag } from "lucide-react";

import { useSiteStore } from "@/lib/siteStore";
import LocationCard from "@/components/home/LocationCard";

interface HeroBentoSectionProps {
  onBookRepair: () => void;
}

/**
 * The hero used to sit inside one big rounded surface with everything else
 * nested in it, which read as a card containing a website rather than a page
 * opening. It is now set directly on the page: the only things that are
 * surfaces are the things you can act on, so the eye goes to them instead of
 * to a container.
 */
export default function HeroBentoSection({ onBookRepair }: HeroBentoSectionProps) {
  const navigate = useNavigate();
  const hero = useSiteStore((s) => s.hero);

  return (
    <section
      className="relative isolate px-[clamp(4px,2vw,16px)] pb-[clamp(16px,3vw,32px)] pt-[clamp(4px,1vw,12px)]"
      id="hero-bento-section"
    >
      {/* A soft bloom behind the headline. Purely atmospheric, so it is
          hidden from assistive tech and sits under everything. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-[18%] -top-[40%] -z-10 h-[680px] w-[900px] opacity-50 blur-[90px]"
        style={{ background: "radial-gradient(closest-side, var(--accent-glow), transparent 72%)" }}
      />

      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-7">
          <span className="inline-flex w-max max-w-full items-center gap-2 rounded-pill border border-border bg-surface/70 py-1.5 pl-2 pr-3.5 backdrop-blur-sm">
            <MapPin aria-hidden="true" className="size-4 shrink-0 text-accent" />
            <span className="type-eyebrow truncate text-muted">{hero.badgeText}</span>
          </span>

          <h1 className="type-display m-0 text-display text-foreground">
            {hero.headlineLine1}
            <br />
            {/* A gradient across the accent line gives the largest type on
                the page somewhere to travel, instead of one flat fill. */}
            <span className="bg-gradient-to-br from-accent-bright via-accent to-accent-dim bg-clip-text text-transparent">
              {hero.headlineAccent}
            </span>
          </h1>

          <p className="m-0 max-w-[46ch] text-body-lg leading-[1.65] text-muted">{hero.description}</p>

          {/* Two actions, deliberately not equal. The primary carries fill,
              glow and the arrow; the secondary is a quiet surface. Making
              them the same size and weight, as before, meant neither led. */}
          <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <button
              aria-label="Book a repair"
              className="group relative flex flex-1 items-center justify-between gap-4 overflow-hidden rounded-panel px-6 py-5 text-left text-accent-foreground shadow-[var(--elev-2),0_0_44px_-14px_var(--accent-glow)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--elev-3),0_0_56px_-12px_var(--accent-glow)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none"
              style={{ backgroundImage: "linear-gradient(135deg, var(--accent-bright), var(--accent) 55%, var(--accent-dim))" }}
              type="button"
              onClick={onBookRepair}
            >
              <span className="flex min-w-0 items-center gap-3.5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-field bg-accent-foreground/15 backdrop-blur-sm">
                  <CalendarDays aria-hidden="true" className="size-5" />
                </span>
                <span className="min-w-0">
                  <strong className="block text-heading-sm font-extrabold leading-tight">Book a Repair</strong>
                  <span className="mt-0.5 block text-label opacity-80">Most jobs done same day</span>
                </span>
              </span>
              <ArrowRight
                aria-hidden="true"
                className="size-5 shrink-0 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transform-none"
              />
            </button>

            <button
              aria-label="Shop accessories"
              className="surface-raised lift group flex items-center justify-between gap-4 rounded-panel px-6 py-5 text-left text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:flex-1"
              type="button"
              onClick={() => navigate("/shop")}
            >
              <span className="flex min-w-0 items-center gap-3.5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-field bg-accent-soft text-accent">
                  <ShoppingBag aria-hidden="true" className="size-5" />
                </span>
                <span className="min-w-0">
                  <strong className="block text-heading-sm font-bold leading-tight">Shop Accessories</strong>
                  <span className="mt-0.5 block text-label text-muted">Cases, chargers &amp; more</span>
                </span>
              </span>
              <ArrowRight
                aria-hidden="true"
                className="size-5 shrink-0 text-accent transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transform-none"
              />
            </button>
          </div>
        </div>

        <div className="min-w-0 lg:col-span-5">
          <LocationCard />
        </div>
      </div>
    </section>
  );
}
