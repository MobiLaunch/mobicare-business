import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  Check,
  MapPin,
  Phone,
  ShoppingBag,
} from "lucide-react";

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
  const heroPoints = useSiteStore((s) => s.heroPoints);
  const business = useSiteStore((s) => s.business);
  const copy = useSiteStore((s) => s.copy);

  const hasMedia =
    hero.mediaType &&
    hero.mediaType !== "none" &&
    Boolean(hero.mediaUrl?.trim());
  const dimAlpha = Math.max(0, Math.min(100, hero.mediaDim ?? 55)) / 100;

  const bookLabel =
    copy?.["home.hero.book"] ||
    (hero.primaryCta?.toLowerCase().includes("book")
      ? hero.primaryCta
      : "Book a Repair");
  const shopLabel =
    copy?.["home.hero.shop"] ||
    (!hero.primaryCta?.toLowerCase().includes("book") && hero.primaryCta
      ? hero.primaryCta
      : "Shop Accessories");

  const phoneDigits = (business?.phone || "").replace(/[^0-9+]/g, "");

  return (
    <section
      className={`relative isolate overflow-hidden px-[clamp(4px,2vw,16px)] pb-[clamp(16px,3vw,32px)] pt-[clamp(4px,1vw,12px)] ${hasMedia ? "rounded-panel p-6 sm:p-8" : ""}`}
      id="hero-bento-section"
    >
      {hasMedia && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-panel"
        >
          {hero.mediaType === "video" ? (
            <video
              autoPlay
              loop
              muted
              playsInline
              className="size-full object-cover"
              poster={hero.mediaPoster || undefined}
              src={hero.mediaUrl}
            />
          ) : (
            <img
              alt=""
              className="size-full object-cover"
              src={hero.mediaUrl}
            />
          )}
          <div
            className="absolute inset-0 bg-background"
            style={{ opacity: dimAlpha }}
          />
        </div>
      )}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-[18%] -top-[40%] -z-10 h-[680px] w-[900px] opacity-50 blur-[90px]"
        style={{
          background:
            "radial-gradient(closest-side, var(--accent-glow), transparent 72%)",
        }}
      />

      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-7">
          <span className="inline-flex w-max max-w-full items-center gap-2 rounded-pill border border-border bg-surface/70 py-1.5 pl-2 pr-3.5 backdrop-blur-sm">
            <MapPin aria-hidden="true" className="size-4 shrink-0 text-accent" />
            <span
              className="type-eyebrow truncate text-muted"
              data-edit="hero.badgeText"
            >
              {hero.badgeText}
            </span>
          </span>

          <h1 className="type-display m-0 text-display text-foreground">
            <span data-edit="hero.headlineLine1">{hero.headlineLine1}</span>
            <br />
            <span
              className="bg-gradient-to-br from-accent-bright via-accent to-accent-dim bg-clip-text text-transparent"
              data-edit="hero.headlineAccent"
            >
              {hero.headlineAccent}
            </span>
          </h1>

          <p
            className="m-0 max-w-[48ch] text-body-lg leading-[1.65] text-muted"
            data-edit="hero.description"
          >
            {hero.description}
          </p>

          <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <button
              aria-label={bookLabel}
              className="group relative flex flex-1 items-center justify-between gap-4 overflow-hidden rounded-panel px-6 py-5 text-left text-accent-foreground shadow-[var(--elev-2),0_0_44px_-14px_var(--accent-glow)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--elev-3),0_0_56px_-12px_var(--accent-glow)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, var(--accent-bright), var(--accent) 55%, var(--accent-dim))",
              }}
              type="button"
              onClick={onBookRepair}
            >
              <span className="flex min-w-0 items-center gap-3.5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-field bg-accent-foreground/15 backdrop-blur-sm">
                  <CalendarDays aria-hidden="true" className="size-5" />
                </span>
                <span className="min-w-0">
                  <strong
                    className="block text-heading-sm font-extrabold leading-tight"
                    data-edit="copy.home.hero.book"
                  >
                    {bookLabel}
                  </strong>
                  <span className="mt-0.5 block text-label opacity-85">
                    Most jobs done same day
                  </span>
                </span>
              </span>
              <ArrowRight
                aria-hidden="true"
                className="size-5 shrink-0 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transform-none"
              />
            </button>

            <button
              aria-label={shopLabel}
              className="surface-raised lift group flex items-center justify-between gap-4 rounded-panel px-6 py-5 text-left text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:flex-1"
              type="button"
              onClick={() => navigate("/shop")}
            >
              <span className="flex min-w-0 items-center gap-3.5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-field bg-accent-soft text-accent">
                  <ShoppingBag aria-hidden="true" className="size-5" />
                </span>
                <span className="min-w-0">
                  <strong
                    className="block text-heading-sm font-bold leading-tight"
                    data-edit="hero.primaryCta"
                  >
                    {shopLabel}
                  </strong>
                  <span className="mt-0.5 block text-label text-muted">
                    Cases, chargers &amp; more
                  </span>
                </span>
              </span>
              <ArrowRight
                aria-hidden="true"
                className="size-5 shrink-0 text-accent transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transform-none"
              />
            </button>
          </div>

          {/* Hero highlight badges + Secondary CTA phone shortcut */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-xs font-semibold text-muted">
            {(heroPoints || []).map((pt, idx) => (
              <span
                key={`${pt}-${idx}`}
                className="inline-flex items-center gap-1.5 text-foreground"
                data-edit={`heroPoints.${idx}`}
              >
                <Check aria-hidden="true" className="size-3.5 text-accent" />
                <span>{pt}</span>
              </span>
            ))}
            {hero.secondaryCta?.trim() && phoneDigits && (
              <a
                className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent transition-opacity hover:opacity-90"
                data-edit="hero.secondaryCta"
                href={`tel:${phoneDigits}`}
              >
                <Phone aria-hidden="true" className="size-3.5" />
                <span>{hero.secondaryCta}</span>
              </a>
            )}
          </div>
        </div>

        <div className="min-w-0 lg:col-span-5">
          <LocationCard />
        </div>
      </div>
    </section>
  );
}
