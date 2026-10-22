import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BatteryFull, Camera, CalendarCheck, Droplets, HardDrive, PlugZap, ShieldCheck, Smartphone, Wrench, Zap, type LucideIcon } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { Suspense, lazy } from "react";

import PageMeta from "@/components/PageMeta";
import ProductCard from "@/components/ProductCard";
import LocationCard from "@/components/home/LocationCard";
import { Button } from "@/components/arc/button/button";
import { AKKO_CONFIG } from "@/lib/config";
import { useSiteStore } from "@/lib/siteStore";
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

const STEPS = [
  { icon: CalendarCheck, title: "Tell us what's wrong", body: "Book online in about a minute, or walk in. The $35 bench fee covers a full diagnostic." },
  { icon: Zap, title: "Fixed fast", body: "Most screens and batteries are done the same day, often in one to two hours." },
  { icon: ShieldCheck, title: "Backed for 90 days", body: "Every part we install carries a 90-day warranty. We quote before we start." },
];

export default function Home() {
  const navigate = useNavigate();
  const hero = useSiteStore((s) => s.hero);
  const services = useSiteStore((s) => s.repairServices);
  const ctaStrip = useSiteStore((s) => s.ctaStrip);
  const featured = useProductStore(useShallow((s) => s.products.filter((p) => p.featured && p.active)));
  // `null` closed; `{ service: null }` open with no preselection; a name opens on that service.
  const [booking, setBooking] = useState<{ service: string | null } | null>(null);

  return (
    <div id="homepage-main-container">
      <PageMeta
        description="Southern Illinois' preferred device repair shop. Next-day repairs for almost everything. Four years of helping you love your device, longer."
        title="Mobicare Device Recovery: iPhone and phone repair in Fairfield, IL"
      />

      <div className="mc-page">
        <section className="mc-hero" id="hero-section">
          <div className="mc-hero-copy">
            <p className="mc-small">{hero.badgeText}</p>
            <h1 className="mc-h1">
              {hero.headlineLine1} <span style={{ color: "var(--accent-strong)" }}>{hero.headlineAccent}</span>
            </h1>
            <p className="mc-lead">{hero.description}</p>
            <div className="mc-actions">
              <Button size="lg" onClick={() => setBooking({ service: null })}>Book a repair</Button>
              <Button size="lg" variant="secondary" onClick={() => navigate("/shop")}>Shop accessories</Button>
            </div>
            <div className="mc-hero-meta">
              <span><ShieldCheck aria-hidden="true" size={16} strokeWidth={1.75} />90-day parts warranty</span>
              <span><Zap aria-hidden="true" size={16} strokeWidth={1.75} />Same-day on most repairs</span>
              <span><Smartphone aria-hidden="true" size={16} strokeWidth={1.75} />iPhone, Android and iPad</span>
            </div>
          </div>
          <LocationCard />
        </section>

        {services.length > 0 && (
          <section aria-labelledby="services-title" className="mc-section" id="services-section" style={{ paddingTop: 0 }}>
            <div className="mc-section-head">
              <h2 className="mc-h2" id="services-title">What can we fix?</h2>
              <p className="mc-lead">Choose a repair to start booking. Prices are estimates until we see the device.</p>
            </div>
            <div className="mc-grid mc-grid-cards">
              {services.map((s) => {
                const Icon = ICONS[s.icon] ?? Wrench;

                return (
                  <button key={s.id} className="mc-service" type="button" onClick={() => setBooking({ service: s.name })}>
                    <span className="mc-icon"><Icon aria-hidden="true" size={20} strokeWidth={1.75} /></span>
                    <strong>{s.name}</strong>
                    <small>{s.priceRange} · {s.duration}</small>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section aria-labelledby="how-title" className="mc-section" id="how-it-works-section" style={{ paddingTop: 0 }}>
          <div className="mc-section-head"><h2 className="mc-h2" id="how-title">How it works</h2></div>
          <ol className="mc-steps">
            {STEPS.map((s) => (
              <li key={s.title}>
                <h3 className="mc-h3">{s.title}</h3>
                <p className="mc-text">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {featured.length > 0 && (
          <section aria-labelledby="featured-title" className="mc-section" id="featured-products-section" style={{ paddingTop: 0 }}>
            <div className="mc-section-head mc-section-head--row">
              <h2 className="mc-h2" id="featured-title">Best sellers</h2>
              <Button variant="secondary" onClick={() => navigate("/shop")}>All products<ArrowRight aria-hidden="true" size={16} strokeWidth={1.75} /></Button>
            </div>
            <div className="mc-grid mc-grid-products">
              {featured.map((p) => (
                <ProductCard key={p.id} product={p} onClick={() => navigate(`/product/${p.id}`)} />
              ))}
            </div>
          </section>
        )}

        <section aria-labelledby="protect-title" className="mc-section" id="protection-teaser-section" style={{ paddingTop: 0 }}>
          <div className="mc-card" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-6)", padding: "var(--space-8)" }}>
            <div className="mc-stack-sm" style={{ flex: "1 1 20rem" }}>
              <h2 className="mc-h2" id="protect-title">Never pay full price for a broken phone again</h2>
              <p className="mc-text">Device protection plans start at ${AKKO_CONFIG.phonePlanPrice} a month and cover drops, spills and cracked screens.</p>
            </div>
            <Link style={{ textDecoration: "none" }} to="/protection"><Button tabIndex={-1}>See plans</Button></Link>
          </div>
        </section>

        <section aria-labelledby="cta-title" className="mc-section" id="cta-banner-section" style={{ paddingTop: 0 }}>
          <div className="mc-card mc-card--muted" style={{ display: "grid", justifyItems: "start", gap: "var(--space-4)", padding: "clamp(24px, 5vw, 56px)" }}>
            <h2 className="mc-h2" id="cta-title">{ctaStrip.headline}</h2>
            <p className="mc-lead">{ctaStrip.subtext}</p>
            <div className="mc-actions">
              <Button size="lg" onClick={() => setBooking({ service: null })}>Book a repair</Button>
              <Button size="lg" variant="secondary" onClick={() => navigate("/shop")}>{ctaStrip.secondaryCta}</Button>
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
