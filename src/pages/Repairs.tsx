import type { LucideIcon } from "lucide-react";

import { useState } from "react";
import {
  BatteryFull,
  CalendarPlus,
  Camera,
  ChevronDown,
  Droplet,
  HardDrive,
  Layers,
  Plug,
  Smartphone,
  Tablet,
} from "lucide-react";

import { Accordion, Button } from "@heroui/react";

import BookingWizard from "@/components/BookingWizard";
import PageMeta from "@/components/PageMeta";

// NOTE (HeroUI v3 rebuild): this page has always kept its own richer, more
// detailed copy for repair categories here (REPAIR_CATEGORIES_BENTO) instead
// of reading useSiteStore's `repairServices` field — the same field
// BookingWizard's Service step actually uses. The two lists mostly overlap
// (same 6 core service ids/icons), but this page advertises 2 extra
// categories ("iPad & Tablet Repair", "Laser Back Glass Repair") that don't
// exist in the site-content store at all. That means clicking "Book Repair"
// on those two specific cards opens the wizard with no service
// pre-selected, and neither is actually choosable in the wizard's Service
// step, since it only lists what's in the store. This is a pre-existing
// content-model gap (admin content edits to "Repair Services" were never
// fully in sync with this page), not something introduced by this rebuild —
// preserved as-is rather than silently dropping the 2 extra categories or
// unilaterally rewriting the site store's content. Worth a real decision on
// whether to move this page's copy into the site-content store as the
// single source of truth for both.
const REPAIR_CATEGORIES_BENTO: {
  id: string;
  name: string;
  icon: LucideIcon;
  price: string;
  time: string;
  desc: string;
}[] = [
  {
    id: "screen-repair",
    name: "Screen Repair",
    icon: Smartphone,
    price: "$49 – $249",
    time: "1–2 hrs",
    desc: "Cracked glass, shattered OLED, touch issues, or black display lines. OEM-quality displays backed by a 90-day warranty.",
  },
  {
    id: "battery-replacement",
    name: "Battery Replacement",
    icon: BatteryFull,
    price: "$39 – $89",
    time: "30–60 mins",
    desc: "Fast battery drain, overheating, swollen cell, or phone shutting off at 20%. Premium high-capacity battery replacements.",
  },
  {
    id: "water-damage",
    name: "Water Damage Recovery",
    icon: Droplet,
    price: "$59 – $149",
    time: "Same Day",
    desc: "Ultrasonic logic board cleaning, corrosion removal, & multi-point liquid damage diagnostics for submerged electronics.",
  },
  {
    id: "charging-port",
    name: "Charging Port Repair",
    icon: Plug,
    price: "$29 – $79",
    time: "30–45 mins",
    desc: "Loose cable connection, dirty port, or phone won't charge. Debris cleaning or complete port assembly swap.",
  },
  {
    id: "camera-repair",
    name: "Camera & Lens Repair",
    icon: Camera,
    price: "$39 – $119",
    time: "45–60 mins",
    desc: "Cracked camera lens glass, blurry autofocus, black rear/front camera preview screen, or lens vibration.",
  },
  {
    id: "data-recovery",
    name: "Data Recovery & Transfer",
    icon: HardDrive,
    price: "$69 – $199",
    time: "1–2 Days",
    desc: "Extract photos, contacts, texts, and documents from dead, locked, water-damaged, or broken smartphones.",
  },
  {
    id: "tablet-repair",
    name: "iPad & Tablet Repair",
    icon: Tablet,
    price: "$59 – $199",
    time: "Same Day",
    desc: "Glass digitizer, LCD display, charging port, and battery replacement for all iPad Air, Pro, & Mini models.",
  },
  {
    id: "back-glass",
    name: "Laser Back Glass Repair",
    icon: Layers,
    price: "$49 – $129",
    time: "2–3 hrs",
    desc: "Precision laser rear glass removal and housing replacement for iPhone 12, 13, 14, and 15 series.",
  },
];

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
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);

  const handleBook = (serviceName: string | null = null) => {
    setSelectedService(serviceName);
    setBookingOpen(true);
  };

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

      {/* Repair category grid */}
      <section className="mb-14" id="repairs-grid-section">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {REPAIR_CATEGORIES_BENTO.map((svc) => (
            <div
              key={svc.id}
              className="flex h-full min-w-0 flex-col justify-between gap-5 rounded-[24px] border border-border bg-surface p-6 shadow-sm transition-all duration-250 hover:-translate-y-0.5 hover:shadow-md"
              id={`repair-card-${svc.id}`}
            >
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                    <svc.icon className="size-6" />
                  </span>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="rounded-full bg-accent-soft px-2.5 py-1 text-caption font-bold text-accent">
                      {svc.price}
                    </span>
                    <span className="text-caption font-semibold text-muted">
                      ⏱ {svc.time}
                    </span>
                  </div>
                </div>

                <h3 className="m-0 mb-2 break-words text-lg font-bold text-foreground">
                  {svc.name}
                </h3>
                <p className="m-0 break-words text-label leading-relaxed text-muted">
                  {svc.desc}
                </p>
              </div>

              <Button
                className="flex w-full items-center justify-center gap-1.5 rounded-full bg-accent px-3 py-2.5 text-xs font-semibold text-accent-foreground transition-opacity hover:opacity-90"
                id={`repairs-page-book-btn-${svc.id}`}
                variant="primary"
                onPress={() => handleBook(svc.name)}
              >
                <CalendarPlus className="size-3.5" />
                <span>Book Repair</span>
              </Button>
            </div>
          ))}
        </div>
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

      {bookingOpen && (
        <BookingWizard
          defaultService={selectedService}
          onClose={() => setBookingOpen(false)}
        />
      )}
    </main>
  );
}
