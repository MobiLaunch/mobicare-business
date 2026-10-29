import { useState, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ArrowUpRight, BatteryFull, Camera, CalendarCheck, Droplets, HardDrive, PlugZap, ShieldCheck, Smartphone, Wrench, Zap, type LucideIcon } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { Suspense, lazy } from "react";

import PageMeta from "@/components/PageMeta";
import ProductCard from "@/components/ProductCard";
import LocationCard from "@/components/home/LocationCard";
import { AKKO_CONFIG } from "@/lib/config";
import { DEFAULT_SITE_CONTENT, useSiteStore } from "@/lib/siteStore";
import { useProductStore } from "@/lib/store";

const BookingWizard = lazy(() => import("@/components/BookingWizard"));

// Service icons are stored as admin-editable Material-style names.
const ICONS: Record<string, LucideIcon> = {
  smartphone: Smartphone,
  battery_full: BatteryFull,
  water_drop: Droplets,
  ev_station: PlugZap,
  photo_camera: Camera,
  storage: HardDrive,
};

const POINT_ICONS: LucideIcon[] = [ShieldCheck, Zap, Smartphone];

export default function Home() {
  const navigate = useNavigate();
  const hero = useSiteStore((s) => s.hero);
  const services = useSiteStore((s) => s.repairServices);
  const ctaStrip = useSiteStore((s) => s.ctaStrip);
  const trustItems = useSiteStore((s) => s.trustItems) || [];
  const heroPoints = useSiteStore((s) => s.heroPoints) || DEFAULT_SITE_CONTENT.heroPoints;
  const howItWorks = useSiteStore((s) => s.howItWorks) || DEFAULT_SITE_CONTENT.howItWorks;
  const featured = useProductStore(useShallow((s) => s.products.filter((p) => p.featured && p.active).slice(0, 4)));
  // `null` closed; `{ service: null }` open with no preselection; a name opens on that service.
  const [booking, setBooking] = useState<{ service: string | null } | null>(null);

  return (
    <div id="homepage-main-container">
      <PageMeta
        description="Southern Illinois' preferred device repair shop. Next-day repairs for almost everything. Four years of helping you love your device, longer."
        title="Mobicare Device Recovery: iPhone and phone repair in Fairfield, IL"
      />

      <div className="mc-band mc-band--tint">
        <div className="mc-page">
          <section className="mc-hero" id="hero-section">
            <div className="mc-hero-copy">
              <span className="mc-hero-pill"><i aria-hidden="true" />{hero.badgeText}</span>
              <h1 className="mc-h1">
                {hero.headlineLine1} <span className="mc-accent">{hero.headlineAccent}</span>
              </h1>
              <p className="mc-lead">{hero.description}</p>
              <div className="mc-actions">
                <button className="mc-cta mc-cta--lg" type="button" onClick={() => setBooking({ service: null })}>
                  <CalendarCheck aria-hidden="true" size={20} strokeWidth={1.75} />Book a repair
                </button>
                <button className="mc-ghost mc-ghost--lg" type="button" onClick={() => navigate("/shop")}>Shop accessories</button>
              </div>
              <div className="mc-hero-meta">
                {heroPoints.filter(Boolean).map((point, i) => {
                  const PointIcon = POINT_ICONS[i % POINT_ICONS.length];

                  return <span key={i}><PointIcon aria-hidden="true" size={16} strokeWidth={1.75} />{point}</span>;
                })}
              </div>
            </div>
            <LocationCard />
          </section>
          {trustItems.length > 0 && (
            <div className="mc-strip" style={{ "--strip-cols": trustItems.length } as CSSProperties}>
              {trustItems.map((item, i) => (
                <div key={i}><strong>{item.label}</strong><span>{item.desc}</span></div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mc-page">
        {services.length > 0 && (
          <section aria-labelledby="services-title" className="mc-section" id="services-section">
            <div className="mc-section-head">
              <h2 className="mc-h2" id="services-title">What can we fix?</h2>
              <p className="mc-lead">Choose a repair to start booking. Prices are estimates until we see the device.</p>
            </div>
            <div className="mc-grid mc-grid-cards">
              {services.map((s) => {
                const Icon = ICONS[s.icon] ?? Wrench;

                return (
                  <button key={s.id} className="mc-service" type="button" onClick={() => setBooking({ service: s.name })}>
                    <span className="mc-icon"><Icon aria-hidden="true" size={22} strokeWidth={1.75} /></span>
                    <ArrowUpRight aria-hidden="true" className="mc-service-go" size={18} strokeWidth={1.75} />
                    <strong>{s.name}</strong>
                    <small>{s.priceRange} · {s.duration}</small>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <div className="mc-band mc-band--ink">
        <div className="mc-page">
          <section aria-labelledby="how-title" className="mc-section" id="how-it-works-section">
            <div className="mc-section-head">
              <h2 className="mc-h2" id="how-title">How it works</h2>
              <p className="mc-lead">Three steps from broken to back in your pocket.</p>
            </div>
            <ol className="mc-steps">
              {howItWorks.map((s, i) => (
                <li key={i}>
                  <h3 className="mc-h3">{s.title}</h3>
                  <p className="mc-text">{s.body}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      <div className="mc-page">
        {featured.length > 0 && (
          <section aria-labelledby="featured-title" className="mc-section" id="featured-products-section">
            <div className="mc-section-head mc-section-head--row">
              <div>
                  <h2 className="mc-h2" id="featured-title">Best sellers</h2>
              </div>
              <button className="mc-ghost" type="button" onClick={() => navigate("/shop")}>All products<ArrowRight aria-hidden="true" size={16} strokeWidth={1.75} /></button>
            </div>
            <div className="mc-grid mc-grid-products">
              {featured.map((p) => (
                <ProductCard key={p.id} product={p} onClick={() => navigate(`/product/${p.id}`)} />
              ))}
            </div>
          </section>
        )}

        <section aria-labelledby="protect-title" className="mc-section" id="protection-teaser-section" style={{ paddingTop: 0 }}>
          <div className="mc-promo">
            <div className="mc-stack-sm" style={{ flex: "1 1 22rem" }}>
              <h2 className="mc-h2" id="protect-title">Never pay full price for a broken phone again</h2>
              <p className="mc-text" style={{ fontSize: "var(--text-lg)" }}>Device protection plans start at ${AKKO_CONFIG.phonePlanPrice} a month and cover drops, spills and cracked screens.</p>
            </div>
            <Link className="mc-cta mc-cta--lg mc-cta--ink" to="/protection">See plans<ArrowRight aria-hidden="true" size={18} strokeWidth={1.75} /></Link>
          </div>
        </section>

        <section aria-labelledby="cta-title" className="mc-section" id="cta-banner-section" style={{ paddingTop: 0 }}>
          <div className="mc-card mc-card--muted" style={{ display: "grid", justifyItems: "center", textAlign: "center", gap: "var(--space-5)", padding: "clamp(32px, 6vw, 72px)", background: "var(--surface)" }}>
            <h2 className="mc-h2" id="cta-title" style={{ maxWidth: "20ch" }}>{ctaStrip.headline}</h2>
            <p className="mc-lead">{ctaStrip.subtext}</p>
            <div className="mc-actions" style={{ justifyContent: "center" }}>
              <button className="mc-cta mc-cta--lg" type="button" onClick={() => setBooking({ service: null })}>Book a repair</button>
              <button className="mc-ghost mc-ghost--lg" type="button" onClick={() => navigate("/shop")}>{ctaStrip.secondaryCta}</button>
            </div>
          </div>
        </section>
      </div>

      {booking && (
        <Suspense fallback={null}>
          <BookingWizard defaultService={booking.service} onClose={() => setBooking(null)} />
        </Suspense>
      )}
    </div>
  );
}
