import PageBlock from "@/components/PageBlock";
import { useSiteStore } from "@/lib/siteStore";
import { useState } from "react";
import { Check, Droplet, ExternalLink, Gamepad2, Laptop, ShieldAlert, Smartphone, Zap } from "lucide-react";

import PageMeta from "@/components/PageMeta";
import PageIntro from "@/components/PageIntro";
import { AKKO_CONFIG } from "@/lib/config";
import { Accordion } from "@/components/arc/accordion/accordion";
import { Badge } from "@/components/arc/badge/badge";
import { Button } from "@/components/arc/button/button";
import BookingWizard from "@/components/BookingWizard";
import { useCopy } from "@/lib/copy";

interface PlanTier {
  id: string;
  name: string;
  price: string;
  period: string;
  badge?: string;
  description: string;
  devicesCovered: string;
  features: string[];
  ctaLabel: string;
  popular?: boolean;
}

const PLANS: PlanTier[] = [
  {
    id: "phone-only",
    name: "Phone-Only Plan",
    price: "$5 – $12",
    period: "per month",
    description:
      "Comprehensive protection for your smartphone. Covers accidental damage, drops, spills, hardware failure, and theft.",
    devicesCovered: "1 Phone (Any make/model)",
    features: [
      "Cracked screen & back glass repairs",
      "Liquid damage & submersion recovery",
      "Theft & break-in coverage (tracking enabled)",
      "Mechanical & electrical breakdown",
      "Low $29 – $99 deductibles",
      "Repairs completed locally at Mobicare",
      "No lock-in contract — cancel anytime",
    ],
    ctaLabel: "Get Phone Coverage",
  },
  {
    id: "everything",
    name: "Everything Protected",
    price: "$15",
    period: "per month ($12 for students)",
    badge: "Most Popular",
    popular: true,
    description:
      "The ultimate tech protection plan. Covers your phone PLUS up to 25 other personal electronic devices under one subscription.",
    devicesCovered: "1 Phone + 25 Personal Electronics",
    features: [
      "Everything in Phone-Only Plan",
      "Laptops (MacBook, Windows, Chromebooks)",
      "iPads & Android tablets",
      "AirPods, headphones & speakers",
      "Smartwatches (Apple Watch, Galaxy Watch)",
      "Gaming consoles (PlayStation, Xbox, Switch)",
      "Cameras, lenses & electronic accessories",
      "Shared household item coverage",
    ],
    ctaLabel: "Protect Everything",
  },
  {
    id: "family",
    name: "Family Plan",
    price: "From $25",
    period: "per month",
    badge: "Best for Families",
    description:
      "Cover all phones, tablets, school laptops, and gaming consoles for everyone in your household with custom bundled savings.",
    devicesCovered: "Multiple Phones & Household Devices",
    features: [
      "All benefits of the Everything Plan",
      "Multiple phones & tablets covered",
      "Family dashboard to manage all devices",
      "Priority claims routing to Mobicare",
      "Consolidated single monthly invoice",
      "Dedicated account onboarding support",
    ],
    ctaLabel: "Explore Family Plans",
  },
];

const COMPARISON_ROWS = [
  {
    feature: "Monthly Cost",
    akko: "$5 – $15 / mo",
    applecare: "$13.49 – $19.99 / mo",
    carrier: "$17 – $25 / mo",
    retail: "$8.99 – $14.99 / mo",
  },
  {
    feature: "Screen Repair Deductible",
    akko: "$29",
    applecare: "$29",
    carrier: "$29 – $49",
    retail: "$99 – $149",
  },
  {
    feature: "Accidental Damage Deductible",
    akko: "$29 – $99",
    applecare: "$99",
    carrier: "$99 – $249",
    retail: "$149",
  },
  {
    feature: "Theft Protection",
    akko: "Included",
    applecare: "+$4.50/mo Extra",
    carrier: "Included",
    retail: "Rarely Available",
  },
  {
    feature: "Electronics Covered",
    akko: "1 Phone + 25 Devices",
    applecare: "1 Device Only",
    carrier: "1 Device Only",
    retail: "1 Device Only",
  },
  {
    feature: "Used / Refurbished / Unlocked",
    akko: "100% Covered",
    applecare: "New within 60 days only",
    carrier: "Carrier-locked only",
    retail: "Restricted",
  },
  {
    feature: "Local Same-Day Repairs",
    akko: "Yes (at Mobicare)",
    applecare: "Apple Store only",
    carrier: "Mail-in / 3-5 days",
    retail: "Mail-in only",
  },
];

const COVERAGE_ITEMS = [
  {
    icon: Smartphone,
    title: "Cracked Screens & OLEDs",
    desc: "Shattered glass, black bleeding pixels, and unresponsive touch screens.",
  },
  {
    icon: Droplet,
    title: "Liquid & Spill Damage",
    desc: "Submersion in water, soda, or coffee. Ultrasonic board recovery covered.",
  },
  {
    icon: ShieldAlert,
    title: "Theft & Break-ins",
    desc: "Stolen devices replaced fast when location tracking is enabled in the app.",
  },
  {
    icon: Zap,
    title: "Hardware & Battery Failure",
    desc: "Dead batteries, faulty charging ports, failing cameras, and power glitches.",
  },
  {
    icon: Laptop,
    title: "Laptops & Computers",
    desc: "MacBook keyboards, broken displays, spilled liquids on laptops up to $2,000.",
  },
  {
    icon: Gamepad2,
    title: "Gaming & Accessories",
    desc: "PlayStation, Xbox, Nintendo Switch, pro audio gear, tablets, and smartwatches.",
  },
];

const FAQS = [
  {
    q: "Can I protect older, used, or unlocked phones?",
    a: "Yes! Unlike AppleCare or carrier insurance that must be purchased within 30–60 days of buying a brand new phone, AKKO covers new, used, refurbished, and unlocked phones regardless of when you bought them.",
  },
  {
    q: "How does theft coverage work?",
    a: "Theft coverage is fully included in AKKO plans. To maintain theft eligibility, you simply need to download the AKKO app and ensure location services are enabled on your covered device.",
  },
  {
    q: "How do repairs work at Mobicare?",
    a: "When your phone breaks, file a quick 60-second claim on the AKKO app. Select Mobicare Device Recovery as your authorized service provider. Bring your device to our Fairfield shop (or book a home visit), and AKKO pays us directly for the repair while you only pay your low deductible ($29–$99).",
  },
  {
    q: "What devices can I add to the 'Everything Protected' plan?",
    a: "You can cover 1 phone plus up to 25 other personal electronics: laptops, tablets, iPads, smartwatches, AirPods, headphones, TVs, gaming consoles, cameras, lenses, and e-readers.",
  },
  {
    q: "Is there a long-term contract?",
    a: "No. All AKKO plans are month-to-month subscriptions. You can upgrade, downgrade, or cancel at any time with no penalties.",
  },
  {
    q: "How do I sign up?",
    a: "You can sign up online in under 2 minutes through our partner portal or ask our technicians at Mobicare during your next repair visit.",
  },
];

export default function Protection() {
  const c = useCopy();
  const faqs = useSiteStore((s) => s.faqs);
  const [bookingOpen, setBookingOpen] = useState(false);

  const handleEnroll = () => {
    window.open(AKKO_CONFIG.partnerUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <PageMeta
        description="Protect your phone, laptop, and personal electronics with AKKO Device Insurance at Mobicare in Fairfield, IL. Low $29 deductibles, theft coverage, and same-day local repairs."
        title="AKKO phone and device protection plans | Mobicare Fairfield IL"
      />

      <PageIntro
        kicker={<Badge tone="info"><span {...c.p("protection.kicker")}>{c("protection.kicker")}</span></Badge>}
        lead="Protect your phone and up to 25 personal electronics from drops, spills, cracked screens and theft. Lower monthly rates, $29 deductibles, and claims repaired right here at Mobicare."
        title={<>Full tech protection. <span className="mc-accent">Zero headaches.</span></>}
      >
        <div className="mc-actions">
          <button className="mc-cta mc-cta--lg" type="button" onClick={handleEnroll}>Enroll with AKKO<ExternalLink aria-hidden="true" size={18} strokeWidth={1.75} /></button>
          <a className="mc-ghost mc-ghost--lg" href="#plans">Compare plans</a>
        </div>
        <div className="mc-hero-meta">
          {["Low $29 to $99 deductibles", "Covers new, used and unlocked", "Local repairs at Mobicare", "Cancel anytime"].map((t) => (
            <span key={t}><Check aria-hidden="true" size={16} strokeWidth={1.75} />{t}</span>
          ))}
        </div>
      </PageIntro>
      <div className="mc-page mc-pagebody">

      <PageBlock id="plans" page="/protection">
      <section aria-labelledby="plans-title" className="mc-section" id="plans" style={{ paddingTop: 0, scrollMarginTop: "5rem" }}>
        <div className="mc-section-head">
          <h2 className="mc-h2" id="plans-title">Choose your protection plan</h2>
          <p className="mc-lead">Save up to 60% compared with AppleCare+ and carrier insurance.</p>
        </div>
        <div className="mc-grid mc-grid-cards">
          {PLANS.map((plan) => (
            <article key={plan.id} className="mc-card mc-stack" style={plan.popular ? { borderColor: "var(--accent)" } : undefined}>
              <div className="mc-stack-sm">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-2)" }}>
                  <h3 className="mc-h3">{plan.name}</h3>
                  {plan.badge && <Badge tone={plan.popular ? "success" : "neutral"} size="sm">{plan.badge}</Badge>}
                </div>
                <p className="mc-price" style={{ fontSize: "var(--text-2xl)" }}>{plan.price} <span className="mc-small">{plan.period}</span></p>
                <p className="mc-text">{plan.description}</p>
                <p className="mc-small">{plan.devicesCovered}</p>
              </div>
              <ul className="mc-glance">
                {plan.features.map((f) => (
                  <li key={f} className="mc-text"><Check aria-hidden="true" className="y" size={16} strokeWidth={2} /><span>{f}</span></li>
                ))}
              </ul>
              <Button variant={plan.popular ? "primary" : "secondary"} onClick={handleEnroll}>{plan.ctaLabel}</Button>
            </article>
          ))}
        </div>
      </section>
      </PageBlock>

      <PageBlock id="coverage" page="/protection">
      <section aria-labelledby="coverage-title" className="mc-section" style={{ paddingTop: 0 }}>
        <div className="mc-section-head">
          <h2 className="mc-h2" id="coverage-title">What&apos;s covered</h2>
          <p className="mc-lead">The things that actually break, and the accidents that happen to everyone.</p>
        </div>
        <div className="mc-grid mc-grid-cards">
          {COVERAGE_ITEMS.map((item) => (
            <div key={item.title} className="mc-stack-sm" style={{ padding: "var(--space-5)", borderTop: "1px solid var(--border)" }}>
              <span className="mc-icon"><item.icon aria-hidden="true" size={20} strokeWidth={1.75} /></span>
              <h3 className="mc-h3" style={{ fontSize: "var(--text-lg)" }}>{item.title}</h3>
              <p className="mc-text">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
      </PageBlock>

      <PageBlock id="compare" page="/protection">
      <section aria-labelledby="compare-title" className="mc-section" style={{ paddingTop: 0 }}>
        <div className="mc-section-head">
          <h2 className="mc-h2" id="compare-title">How AKKO compares</h2>
        </div>
        <div className="mc-group" style={{ overflowX: "auto" }}>
          <table className="mc-prose" style={{ minWidth: "40rem", margin: 0 }}>
            <thead>
              <tr><th scope="col">Feature</th><th scope="col">AKKO at Mobicare</th><th scope="col">AppleCare+</th><th scope="col">Carrier</th><th scope="col">Retail</th></tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((r) => (
                <tr key={r.feature}>
                  <th scope="row" style={{ color: "var(--foreground)" }}>{r.feature}</th>
                  <td style={{ color: "var(--foreground)", fontWeight: 500 }}>{r.akko}</td>
                  <td>{r.applecare}</td>
                  <td>{r.carrier}</td>
                  <td>{r.retail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      </PageBlock>

      <PageBlock id="faq" page="/protection">
      <section aria-labelledby="faq-title" className="mc-section mc-narrow" style={{ paddingTop: 0, marginInline: 0 }}>
        <div className="mc-section-head"><h2 className="mc-h2" id="faq-title">Questions</h2></div>
        <Accordion items={(faqs?.protection ?? FAQS).map((f) => ({ title: f.q, content: f.a }))} />
      </section>
      </PageBlock>

      <section className="mc-section" style={{ paddingTop: 0 }}>
        <div className="mc-card mc-card--muted" style={{ display: "grid", justifyItems: "start", gap: "var(--space-4)", padding: "clamp(24px, 5vw, 56px)" }}>
          <h2 className="mc-h2">Ready to protect your devices?</h2>
          <p className="mc-lead">Save hundreds each year on cracked screens and accidental tech disasters.</p>
          <div className="mc-actions">
            <Button size="lg" onClick={handleEnroll}>Sign up with AKKO<ExternalLink aria-hidden="true" size={16} strokeWidth={1.75} /></Button>
            <Button size="lg" variant="secondary" onClick={() => setBookingOpen(true)}>Book a repair</Button>
          </div>
        </div>
      </section>

      {bookingOpen && <BookingWizard onClose={() => setBookingOpen(false)} />}
      </div>
    </>
  );
}
