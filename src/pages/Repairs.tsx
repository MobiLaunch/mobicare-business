import { useEffect } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { Accordion } from "@heroui/react";

import BookingWizard from "@/components/BookingWizard";
import PageMeta from "@/components/PageMeta";
import { useSiteStore } from "@/lib/siteStore";

const DEFAULT_REPAIR_FAQS = [
  {
    q: "How long do repairs take?",
    a: "Most screen and battery replacements are completed same-day, typically within 1–2 hours. Water damage recovery or data extraction can take 24–48 hours.",
  },
  {
    q: "Do you offer a warranty on repairs?",
    a: "Yes — every part we install is backed by a 90-day warranty. If that part fails within 90 days, we'll replace it at no charge. Physical or liquid damage after repair isn't covered.",
  },
  {
    q: "Do you fix all phone brands?",
    a: "We repair iPhones, Samsung Galaxy, Google Pixel, Motorola, LG, OnePlus, as well as iPads, Android tablets, and laptops.",
  },
  {
    q: "Is there a diagnostic fee?",
    a: "Yes — a flat $35 diagnostic bench fee covers a full hardware diagnostic on any device, and 100% of that fee is credited toward your repair if you proceed.",
  },
  {
    q: "What is your warranty & refund policy on repairs?",
    a: "Every replacement part we install carries a 90-day parts warranty — if a part is defective, we replace it free of charge. Diagnostic bench fees and completed repair labor are non-refundable.",
  },
  {
    q: "Do I need an appointment?",
    a: "Walk-ins are always welcome! However, booking ahead reserves your parts and guarantees immediate service when you arrive.",
  },
];

const BADGES = [
  "$35 Bench Fee (Credited to Repair)",
  "90-Day Parts Warranty",
  "Same-Day Repairs",
  "Walk-Ins Welcome",
];

export default function Repairs() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const repairBanner = useSiteStore((s) => s.repairBanner);
  const faqs = useSiteStore((s) => s.faqs);
  const copy = useSiteStore((s) => s.copy);
  const layout = useSiteStore((s) => s.layout);

  const hashService = location.hash
    ? decodeURIComponent(location.hash.replace(/^#/, ""))
    : "";
  const preselectedService =
    searchParams.get("service") ||
    (hashService && hashService !== "repairs-booking-section"
      ? hashService
      : null);

  useEffect(() => {
    if (preselectedService) {
      const el = document.getElementById("repairs-booking-section");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [preselectedService]);

  const faqList = faqs?.repairs?.length ? faqs.repairs : DEFAULT_REPAIR_FAQS;
  const hideFaq = Boolean(layout?.pages?.["/repairs"]?.hidden?.includes("faq"));

  return (
    <div className="mx-auto max-w-[1400px] overflow-x-hidden px-[clamp(12px,3vw,24px)] pb-16">
      <PageMeta
        description="Professional same-day phone repairs, cracked screens, dead batteries, water damage diagnostics and repairs for iPhones, iPads, Samsung and more in Fairfield, IL."
        title="Device Repair Services — Screen, Battery & More | Mobicare Fairfield IL"
      />

      {/* Hero */}
      <section className="pb-8 pt-[clamp(24px,5vw,48px)] text-center">
        <p
          className="m-0 mb-1.5 text-caption font-bold uppercase tracking-widest text-accent"
          data-edit="repairBanner.eyebrow"
        >
          {repairBanner?.eyebrow || "Device Repair Services"}
        </p>
        <h1
          className="type-display m-0 mb-3 whitespace-pre-line text-display text-foreground"
          data-edit="repairBanner.headline"
        >
          {repairBanner?.headline || "We Fix What's Broken."}
        </h1>
        <p
          className="mx-auto mb-7 max-w-[640px] text-body-lg leading-relaxed text-muted"
          data-edit="repairBanner.description"
        >
          {repairBanner?.description ||
            "Fast, honest repairs on every major device brand. $35 diagnostic bench fee — 100% credited toward your repair — plus a 90-day parts warranty."}
        </p>

        <div className="mb-8 flex flex-wrap justify-center gap-3">
          {BADGES.map((badge) => (
            <span
              key={badge}
              className="rounded-full border border-border bg-surface-secondary px-3.5 py-1.5 text-xs font-semibold text-foreground"
            >
              ✓ {badge}
            </span>
          ))}
        </div>
      </section>

      {/* Booking flow */}
      <section className="mb-14 scroll-mt-24" id="repairs-booking-section">
        <BookingWizard defaultService={preselectedService} mode="page" />
      </section>

      {/* FAQ */}
      {!hideFaq && (
        <section className="mx-auto mb-14 max-w-[840px]">
          <div className="mb-8 text-center">
            <p className="m-0 mb-1 text-caption font-bold uppercase tracking-widest text-accent">
              Got Questions?
            </p>
            <h2
              className="m-0 text-heading-lg font-extrabold text-foreground"
              data-edit="copy.repairs.faq.title"
            >
              {copy?.["repairs.faq.title"] || "Frequently Asked Questions"}
            </h2>
          </div>

          <Accordion className="flex flex-col gap-3">
            {faqList.map((faq, idx) => (
              <Accordion.Item
                key={`${faq.q}-${idx}`}
                className="surface-raised overflow-hidden rounded-card transition-all duration-200"
                id={`faq-${idx}`}
              >
                <Accordion.Heading>
                  <Accordion.Trigger className="w-full gap-3 px-5 py-4 text-left text-base font-bold text-foreground">
                    <span>{faq.q}</span>
                    <Accordion.Indicator>
                      <ChevronDown className="size-5 shrink-0 text-accent" />
                    </Accordion.Indicator>
                  </Accordion.Trigger>
                </Accordion.Heading>
                <Accordion.Panel>
                  <Accordion.Body className="px-5 pb-[18px] pt-0 text-sm leading-relaxed text-muted">
                    {faq.a}
                  </Accordion.Body>
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        </section>
      )}
    </div>
  );
}
