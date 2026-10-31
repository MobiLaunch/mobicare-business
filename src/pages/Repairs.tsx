import { useSiteStore } from "@/lib/siteStore";
import PageMeta from "@/components/PageMeta";
import PageIntro from "@/components/PageIntro";
import BookingWizard from "@/components/BookingWizard";
import { useCopy } from "@/lib/copy";
import { Accordion } from "@/components/arc/accordion/accordion";

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
    q: "Do you offer refunds?",
    a: "We don't offer refunds. Every part we install is covered by a 90-day parts warranty — if the part fails, we replace it at no charge. Labor and the bench fee are non-refundable. See our Refund policy for details.",
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
  const c = useCopy();
  const banner = useSiteStore((s) => s.repairBanner);
  const trustItems = useSiteStore((s) => s.trustItems) || [];
  const badges = trustItems.length ? trustItems.map((t) => t.label) : BADGES;

  return (
    <>
      <PageMeta
        description="Professional same-day phone repairs, cracked screens, dead batteries, water damage diagnostics and repairs for iPhones, iPads, Samsung and more in Fairfield, IL."
        title="Device repair services: screen, battery and more | Mobicare Fairfield IL"
      />

      <PageIntro lead={banner?.description || "Fast, honest repairs on every major device brand."} title={banner?.headline ? banner.headline.split("\n").map((line, i) => <span key={i} style={{ display: "block" }}>{line}</span>) : <>We fix what&apos;s broken.</>}>
        <div className="mc-hero-meta">
          {badges.map((badge) => <span key={badge}>{badge}</span>)}
        </div>
      </PageIntro>
      <div className="mc-page mc-pagebody mc-split">

      {/* The wizard itself is the service picker, so there is one continuous
          path from "what needs fixing" through confirmation. */}
      <section aria-label="Book a repair" id="repairs-booking-section">
        <BookingWizard mode="page" />
      </section>

      <section aria-labelledby="faq-title" className="mc-faq">
        <div className="mc-section-head"><h2 className="mc-h2" id="faq-title" {...c.p("repairs.faq.title")}>{c("repairs.faq.title")}</h2></div>
        <Accordion items={FAQS.map((f) => ({ title: f.q, content: f.a }))} />
      </section>
      </div>
    </>
  );
}
