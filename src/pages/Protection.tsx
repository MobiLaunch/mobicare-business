import { useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Droplet,
  ExternalLink,
  Gamepad2,
  Laptop,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Zap,
} from "lucide-react";
import { Button } from "@heroui/react";

import PageMeta from "@/components/PageMeta";
import { AKKO_CONFIG } from "@/lib/config";
import BookingWizard from "@/components/BookingWizard";

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
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);

  const handleEnroll = () => {
    window.open(AKKO_CONFIG.partnerUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <main
      className="mx-auto max-w-[1400px] overflow-x-hidden px-[clamp(12px,3vw,24px)] pb-20 pt-8"
      id="protection-page"
    >
      <PageMeta
        description="Protect your phone, laptop, and personal electronics with AKKO Device Insurance at Mobicare in Fairfield, IL. Low $29 deductibles, theft coverage, and same-day local repairs."
        title="AKKO Phone & Device Protection Plans — Mobicare Fairfield IL"
      />

      {/* ─── Hero Section ─── */}
      <section
        className="relative pb-12 pt-[clamp(24px,5vw,56px)] text-center"
        id="protection-hero"
      >
        <div className="pointer-events-none absolute left-1/2 top-[40%] h-[240px] w-[clamp(300px,65vw,600px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-soft/60 blur-[60px]" />

        <div className="relative z-[1]">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface-secondary px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-accent shadow-sm">
            <ShieldCheck className="size-4 text-accent" />
            <span>Official AKKO Protection Partner</span>
          </div>

          <h1 className="m-0 mb-4 text-[clamp(2.4rem,5.5vw,4.2rem)] font-extrabold leading-[1.12] tracking-tight text-foreground">
            Full Tech Protection.
            <br />
            <span className="text-accent">Zero Headaches.</span>
          </h1>

          <p className="mx-auto mb-8 max-w-[680px] text-[clamp(15px,2vw,19px)] leading-relaxed text-muted">
            Protect your phone and up to 25 personal electronics from drops,
            spills, cracked screens, and theft. Lower monthly rates, $29
            deductibles, and claims repaired right here at Mobicare.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <Button
              className="gap-2 px-7 py-3 text-base shadow-md"
              size="lg"
              variant="primary"
              onPress={handleEnroll}
            >
              <span>Enroll with AKKO</span>
              <ExternalLink className="size-4" />
            </Button>
            <Button
              className="gap-2 px-7 py-3 text-base"
              size="lg"
              variant="outline"
              onPress={() => {
                const el = document.getElementById("plans-comparison-section");

                el?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <span>Compare Plans</span>
              <ArrowRight className="size-4" />
            </Button>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-6 text-xs font-semibold text-muted">
            <span className="flex items-center gap-1.5 text-foreground">
              <Check className="size-4 text-accent" /> Low $29 – $99 Deductibles
            </span>
            <span className="flex items-center gap-1.5 text-foreground">
              <Check className="size-4 text-accent" /> Covers New, Used &amp;
              Unlocked
            </span>
            <span className="flex items-center gap-1.5 text-foreground">
              <Check className="size-4 text-accent" /> Local Repairs at Mobicare
            </span>
            <span className="flex items-center gap-1.5 text-foreground">
              <Check className="size-4 text-accent" /> Cancel Anytime
            </span>
          </div>
        </div>
      </section>

      {/* ─── Plan Cards ─── */}
      <section className="mb-20 pt-6" id="plans-comparison-section">
        <div className="mb-10 text-center">
          <p className="m-0 mb-1 text-[11px] font-bold uppercase tracking-widest text-accent">
            Simple, Transparent Pricing
          </p>
          <h2 className="m-0 text-[clamp(1.8rem,4vw,2.6rem)] font-extrabold text-foreground">
            Choose Your Protection Plan
          </h2>
          <p className="mx-auto mt-2 max-w-[560px] text-sm text-muted">
            Save up to 60% compared to AppleCare+, Verizon, and AT&amp;T
            insurance.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col justify-between rounded-[32px] border bg-surface p-7 transition-all duration-250 hover:-translate-y-1 hover:shadow-xl ${
                plan.popular
                  ? "border-2 border-accent shadow-[0_12px_36px_var(--accent-soft)]"
                  : "border-border shadow-sm"
              }`}
              id={`plan-card-${plan.id}`}
            >
              {plan.badge && (
                <span className="absolute -top-3.5 right-6 rounded-full bg-accent px-3.5 py-1 text-xs font-bold text-accent-foreground shadow-sm">
                  {plan.badge}
                </span>
              )}

              <div>
                <div className="mb-4">
                  <h3 className="m-0 text-xl font-extrabold text-foreground">
                    {plan.name}
                  </h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-[2.2rem] font-black text-foreground">
                      {plan.price}
                    </span>
                    <span className="text-xs text-muted">{plan.period}</span>
                  </div>
                </div>

                <div className="mb-5 rounded-2xl bg-surface-secondary p-3 text-xs font-bold text-accent">
                  📱 Covers: {plan.devicesCovered}
                </div>

                <p className="m-0 mb-6 text-sm leading-relaxed text-muted">
                  {plan.description}
                </p>

                <div className="mb-6 border-t border-border" />

                <ul className="m-0 flex flex-col gap-3 p-0 list-none">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-xs font-medium text-foreground"
                    >
                      <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                        <Check className="size-2.5" />
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                <Button
                  fullWidth
                  className="gap-2 font-bold"
                  size="lg"
                  variant={plan.popular ? "primary" : "outline"}
                  onPress={handleEnroll}
                >
                  <span>{plan.ctaLabel}</span>
                  <ExternalLink className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Deductible & Savings Comparison Table ─── */}
      <section
        className="mb-20 overflow-hidden rounded-[32px] border border-border bg-surface p-6 sm:p-10 shadow-sm"
        id="savings-comparison-table"
      >
        <div className="mb-8 text-center sm:text-left">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-accent">
            Industry Comparison
          </span>
          <h2 className="m-0 text-[clamp(1.6rem,3.5vw,2.2rem)] font-extrabold text-foreground">
            How AKKO Beats Carrier &amp; Retail Insurance
          </h2>
          <p className="m-0 mt-2 text-sm text-muted">
            Direct comparison based on standard iPhone 15 Pro protection tiers.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-4 pt-2 font-bold text-muted">
                  Feature / Plan
                </th>
                <th className="pb-4 pt-2 font-extrabold text-accent">
                  <span className="rounded-full bg-accent-soft px-3 py-1 text-xs">
                    ⭐ Mobicare + AKKO
                  </span>
                </th>
                <th className="pb-4 pt-2 font-semibold text-muted">
                  AppleCare+
                </th>
                <th className="pb-4 pt-2 font-semibold text-muted">
                  Carrier (AT&amp;T/Verizon)
                </th>
                <th className="pb-4 pt-2 font-semibold text-muted">
                  SquareTrade / Allstate
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row, i) => (
                <tr
                  key={row.feature}
                  className={`border-b border-border/60 transition-colors hover:bg-surface-secondary/40 ${
                    i % 2 === 0 ? "bg-surface" : "bg-surface-secondary/20"
                  }`}
                >
                  <td className="py-4 font-semibold text-foreground">
                    {row.feature}
                  </td>
                  <td className="py-4 font-bold text-accent">{row.akko}</td>
                  <td className="py-4 text-muted">{row.applecare}</td>
                  <td className="py-4 text-muted">{row.carrier}</td>
                  <td className="py-4 text-muted">{row.retail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── What's Covered Bento Grid ─── */}
      <section className="mb-20" id="coverage-grid-section">
        <div className="mb-10 text-center">
          <p className="m-0 mb-1 text-[11px] font-bold uppercase tracking-widest text-accent">
            Comprehensive Protection
          </p>
          <h2 className="m-0 text-[clamp(1.8rem,4vw,2.5rem)] font-extrabold text-foreground">
            What Is Covered?
          </h2>
          <p className="mx-auto mt-2 max-w-[560px] text-sm text-muted">
            Accidental damage happens. AKKO takes the financial stress out of
            repairs.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {COVERAGE_ITEMS.map((item) => (
            <div
              key={item.title}
              className="flex flex-col justify-between rounded-[24px] border border-border bg-surface p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div>
                <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <item.icon className="size-6" />
                </span>
                <h3 className="m-0 mb-2 text-base font-bold text-foreground">
                  {item.title}
                </h3>
                <p className="m-0 text-sm leading-relaxed text-muted">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── How Claims Work (3-Step Timeline) ─── */}
      <section
        className="mb-20 rounded-[32px] bg-surface-secondary/70 p-8 sm:p-12"
        id="how-claims-work"
      >
        <div className="mb-10 text-center">
          <p className="m-0 mb-1 text-[11px] font-bold uppercase tracking-widest text-accent">
            Frictionless Process
          </p>
          <h2 className="m-0 text-[clamp(1.8rem,4vw,2.5rem)] font-extrabold text-foreground">
            How Claims Work at Mobicare
          </h2>
          <p className="mx-auto mt-2 max-w-[560px] text-sm text-muted">
            Get your device repaired locally without waiting weeks for mail-in
            claims.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="flex flex-col rounded-[24px] border border-border bg-surface p-6 shadow-sm">
            <span className="mb-4 flex size-10 items-center justify-center rounded-full bg-accent text-sm font-extrabold text-accent-foreground">
              1
            </span>
            <h3 className="m-0 mb-2 text-base font-bold text-foreground">
              File in 60 Seconds
            </h3>
            <p className="m-0 text-xs leading-relaxed text-muted">
              Submit photos and a brief description of the damage directly
              inside the AKKO mobile app.
            </p>
          </div>

          <div className="flex flex-col rounded-[24px] border border-border bg-surface p-6 shadow-sm">
            <span className="mb-4 flex size-10 items-center justify-center rounded-full bg-accent text-sm font-extrabold text-accent-foreground">
              2
            </span>
            <h3 className="m-0 mb-2 text-base font-bold text-foreground">
              Bring to Mobicare
            </h3>
            <p className="m-0 text-xs leading-relaxed text-muted">
              Select Mobicare as your service provider. Walk in or book an
              appointment for same-day repair.
            </p>
          </div>

          <div className="flex flex-col rounded-[24px] border border-border bg-surface p-6 shadow-sm">
            <span className="mb-4 flex size-10 items-center justify-center rounded-full bg-accent text-sm font-extrabold text-accent-foreground">
              3
            </span>
            <h3 className="m-0 mb-2 text-base font-bold text-foreground">
              Fixed &amp; Paid Direct
            </h3>
            <p className="m-0 text-xs leading-relaxed text-muted">
              We fix your device on the spot. AKKO pays us directly — you only
              cover your low $29 deductible!
            </p>
          </div>
        </div>
      </section>

      {/* ─── FAQ Accordion ─── */}
      <section className="mx-auto mb-20 max-w-[840px]" id="protection-faq">
        <div className="mb-8 text-center">
          <p className="m-0 mb-1 text-[11px] font-bold uppercase tracking-widest text-accent">
            Got Questions?
          </p>
          <h2 className="m-0 text-[clamp(1.6rem,3.5vw,2.2rem)] font-extrabold text-foreground">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="flex flex-col gap-3">
          {FAQS.map((faq, index) => {
            const isOpen = openFaq === index;

            return (
              <div
                key={faq.q}
                className="overflow-hidden rounded-[18px] border border-border bg-surface shadow-sm transition-all duration-200"
              >
                <button
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left font-bold text-foreground"
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`size-5 shrink-0 text-accent transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-250 ease-in-out ${
                    isOpen
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="px-5 pb-[18px] text-sm leading-relaxed text-muted">
                      {faq.a}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Bottom CTA Strip ─── */}
      <section className="relative overflow-hidden rounded-[32px] border border-border bg-surface p-8 text-center sm:p-12 shadow-md">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[200px] w-4/5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-soft/70 blur-[50px]" />

        <div className="relative z-[1]">
          <h2 className="m-0 mb-3 text-[clamp(1.8rem,4vw,2.6rem)] font-black text-foreground">
            Ready to Protect Your Devices?
          </h2>
          <p className="mx-auto mb-7 max-w-[580px] text-sm leading-relaxed text-muted">
            Join thousands of customers who save hundreds each year on cracked
            screens and accidental tech disasters.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <Button
              className="gap-2 px-8 py-3 font-bold"
              size="lg"
              variant="primary"
              onPress={handleEnroll}
            >
              <span>Sign Up with AKKO</span>
              <ExternalLink className="size-4" />
            </Button>
            <Button
              className="gap-2 px-8 py-3 font-bold"
              size="lg"
              variant="outline"
              onPress={() => setBookingOpen(true)}
            >
              <span>Book a Repair</span>
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </section>

      {bookingOpen && <BookingWizard onClose={() => setBookingOpen(false)} />}
    </main>
  );
}
