import { ChevronDown } from "lucide-react";
import { Accordion } from "@heroui/react";

import BookingWizard from "@/components/BookingWizard";
import PageMeta from "@/components/PageMeta";

const FAQS = [
  {
    q: "How long do repairs take?",
    a: "Most screen and battery replacements are completed same-day, typically within 1–2 hours. Water damage recovery or data extraction can take 24–48 hours.",
  },
  {
    q: "Do you offer a warranty on repairs?",
    a: "Yes — every part we install is backed by a 90-day warranty. If that part fails within 90 days, we'll replace it at no charge. Labor for unrelated issues isn't covered.",
  },
  {
    q: "Do you fix all phone brands?",
    a: "We repair iPhones, Samsung Galaxy, Google Pixel, Motorola, LG, OnePlus, as well as iPads and Android tablets.",
  },
  {
    q: "Is there a diagnostic fee?",
    a: "Yes, a flat $35 bench fee covers a full diagnostic on any device. We'll give you a clear, no-obligation quote before starting any work.",
  },
  {
    q: "What is your refund policy?",
    a: "Refunds require a valid receipt and are limited to the cost of parts — labor charges are non-refundable.",
  },
  {
    q: "Do I need an appointment?",
    a: "Walk-ins are always welcome! However, booking ahead reserves your parts and guarantees immediate service when you arrive.",
  },
];

const BADGES = [
  "$35 Bench Fee",
  "90-Day Parts Warranty",
  "Same-Day Repairs",
  "Walk-Ins Welcome",
];

export default function Repairs() {
  return (
    <main className="mx-auto max-w-[1400px] overflow-x-hidden px-[clamp(12px,3vw,24px)] pb-16">
      <PageMeta
        description="Professional same-day phone repairs, cracked screens, dead batteries, water damage diagnostics and repairs for iPhones, iPads, Samsung and more in Fairfield, IL."
        title="Device Repair Services — Screen, Battery & More | Mobicare Fairfield IL"
      />

      {/* Hero */}
      <section className="pb-8 pt-[clamp(24px,5vw,48px)] text-center">
        <p className="m-0 mb-1.5 text-caption font-bold uppercase tracking-widest text-accent">
          Device Repair Services
        </p>
        <h1 className="m-0 mb-3 text-display font-extrabold leading-[1.15] text-foreground">
          We Fix What&rsquo;s Broken.
        </h1>
        <p className="mx-auto mb-7 max-w-[640px] text-body-lg leading-relaxed text-muted">
          Fast, honest repairs on every major device brand. $35 bench fee,
          90-day parts warranty, same-day turnaround on most jobs.
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

      {/* Booking flow — the wizard itself is the service picker, so there's
          one continuous path from "what needs fixing" through confirmation
          instead of a card grid that opens a second, separate flow. */}
      <section className="mb-14" id="repairs-booking-section">
        <BookingWizard mode="page" />
      </section>

      {/* FAQ */}
      <section className="mx-auto mb-14 max-w-[840px]">
        <div className="mb-8 text-center">
          <p className="m-0 mb-1 text-caption font-bold uppercase tracking-widest text-accent">
            Got Questions?
          </p>
          <h2 className="m-0 text-heading-lg font-extrabold text-foreground">
            Frequently Asked Questions
          </h2>
        </div>

        <Accordion className="flex flex-col gap-3">
          {FAQS.map((faq) => (
            <Accordion.Item
              key={faq.q}
              className="overflow-hidden rounded-[18px] border border-border bg-surface shadow-sm transition-all duration-200"
              id={faq.q}
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
    </main>
  );
}
