import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { Link } from "@heroui/react";

import {
  postDesignStudioMessage,
  useSiteStore,
  type PolicyContent,
} from "@/lib/siteStore";
import PageMeta from "@/components/PageMeta";

const DEFAULT_POLICIES: Record<string, PolicyContent> = {
  "/warranty": {
    title: "90-Day Parts & Workmanship Warranty",
    lead: "Every replacement part installed by Mobicare Device Recovery is backed by our 90-day limited warranty.",
    sections: [
      {
        title: "What Is Covered",
        body: "If a replacement screen, battery, charging port, camera, or internal component installed by Mobicare develops a manufacturing defect or fails under normal everyday use within 90 calendar days of your completed repair, we will replace that part at no charge for parts or labor.",
      },
      {
        title: "What Is Not Covered",
        body: "Our warranty covers part defects and our installation workmanship only. It does not cover new accidental drops, cracked glass, bent frames, liquid exposure, tampering or third-party opening after service, software/OS issues, or unrelated components that were not part of the original repair.",
      },
      {
        title: "Water Resistance Notice",
        body: "Opening any mobile device compromises factory adhesive seals. While we install fresh frame adhesive on supported models, repaired devices should never be considered waterproof or submerged.",
      },
      {
        title: "How to Make a Warranty Claim",
        body: "Bring your device and ticket number (or phone number on file) to 920 Commerce Drive, Suite 3, Fairfield, IL 62837 during business hours, or call 618-204-1497 so we can reserve your replacement part right away.",
      },
    ],
  },
  "/terms": {
    title: "Terms of Service & Repair Intake Waiver",
    lead: "Clear, honest terms governing in-store repairs, house calls, and online accessory purchases at Mobicare Device Recovery.",
    sections: [
      {
        title: "Diagnostic Bench Fee",
        body: "A flat $35 diagnostic bench fee applies to hardware troubleshooting and liquid-damage evaluations. 100% of this $35 bench fee is credited toward your repair total when you approve the quoted service. If you decline repair or a device is beyond economical repair, the $35 fee covers technician bench time.",
      },
      {
        title: "Data Backup & Privacy Responsibility",
        body: "While our technicians take great care to preserve customer data, electronic repairs carry an inherent risk of data loss. Please back up photos, contacts, and files before dropping off your device whenever possible. Mobicare is not liable for lost or corrupted data.",
      },
      {
        title: "Pre-Existing Damage & Liquid Intrusion",
        body: "Devices with severe impact or liquid damage may exhibit additional hidden board or component failures during disassembly or ultrasonic cleaning. We will always contact you for approval before performing any work beyond your authorized quote.",
      },
      {
        title: "Unclaimed Devices (60-Day Policy)",
        body: "We notify customers promptly when a repair or diagnostic is ready for pickup. Devices left unclaimed for more than 60 days after completion notice may be recycled or sold to recover parts and storage costs in accordance with Illinois law.",
      },
    ],
  },
  "/shipping": {
    title: "Shipping & Store Pickup Policy",
    lead: "Fast dispatch directly from our Fairfield, Illinois shop — plus free local pickup.",
    sections: [
      {
        title: "Same-Day Dispatch Cutoff (2:00 PM CT)",
        body: "In-stock accessory orders placed before 2:00 PM Central Time (Monday through Saturday, excluding holidays) are packed and dispatched the same business day from our Fairfield, IL facility. Orders placed after 2:00 PM CT or on Sundays ship the next business day.",
      },
      {
        title: "Shipping Rates & Transit Estimates",
        body: "Standard Shipping (USPS/UPS Ground, 3–5 business days) is FREE on orders of $35 or more, and $5.99 on orders under $35. Priority Express Shipping (1–2 business days) is available for $12.99.",
      },
      {
        title: "Free Fairfield In-Store Pickup",
        body: "Select Fairfield Store Pickup at checkout for $0 shipping. Most pickup orders placed during open hours (Mon–Fri 9 AM – 6 PM, Sat 10 AM – 4 PM) are ready within ~1 hour at 920 Commerce Drive, Suite 3, Fairfield, IL 62837.",
      },
      {
        title: "Order Tracking",
        body: "Track any online order anytime on our Track Repair / Order page using your Order ID (ORD-...) and checkout email or ZIP code.",
      },
    ],
  },
  "/returns": {
    title: "Returns & Exchanges Policy",
    lead: "Straightforward exchanges for defective gear and hassle-free unopened accessory returns.",
    sections: [
      {
        title: "Unopened Retail Accessories (30 Days)",
        body: "Unopened, unused retail accessories in original sealed packaging may be returned or exchanged within 30 days of purchase with your order ID or store receipt.",
      },
      {
        title: "Defective Items Exchange",
        body: "If an accessory arrives damaged or develops a manufacturer defect within 30 days, bring it to our Fairfield shop or contact us with your Order ID for an immediate like-for-like replacement.",
      },
      {
        title: "Opened Screen Protectors, Cables & Cases",
        body: "Installed screen protectors and opened clearance items are final sale unless defective upon arrival.",
      },
    ],
  },
  "/refunds": {
    title: "Refund Policy",
    lead: "How refunds and warranty replacements are handled for repairs and accessory orders.",
    sections: [
      {
        title: "Repair Services & Parts",
        body: "Completed repair labor and the $35 diagnostic bench fee are non-refundable once work has been performed. Every replacement part we install is protected by our 90-Day Parts Warranty — if an installed part fails due to a defect, we replace it free of charge.",
      },
      {
        title: "Online & In-Store Accessory Refunds",
        body: "Approved returns of unopened accessories within 30 days are refunded to the original payment method via Stripe. Please allow 5–10 business days for your card issuer to post the credit.",
      },
      {
        title: "Questions or Billing Support",
        body: "If you ever spot an issue with a charge or order, reach out to Mobicarehello@gmail.com or call 618-204-1497 and we will make it right promptly.",
      },
    ],
  },
  "/privacy": {
    title: "Privacy Policy",
    lead: "We respect your privacy and collect only the information needed to repair your devices and fulfill your orders.",
    sections: [
      {
        title: "Information We Collect",
        body: "When you book a repair, place an order, or create a Mobicare account, we collect your name, email address, phone number, device details, and shipping or house-call address solely to complete your service and communicate status updates.",
      },
      {
        title: "Secure Payment Processing",
        body: "Online card payments are encrypted and processed directly by Stripe (PCI-DSS Level 1 certified). Mobicare never sees or stores your full credit card number or CVV.",
      },
      {
        title: "Device Privacy During Repair",
        body: "Technicians access device functions only as needed to test repairs (such as touch response, cameras, speakers, charging, and cellular signal). We never browse personal photos, messages, or private files.",
      },
      {
        title: "No Sale of Personal Data",
        body: "We never sell, rent, or trade customer contact lists to third-party marketers. You can update your profile or request account deletion anytime by contacting us.",
      },
    ],
  },
};

const POLICY_LINKS = [
  { to: "/warranty", label: "90-Day Warranty" },
  { to: "/terms", label: "Terms & Waiver" },
  { to: "/shipping", label: "Shipping" },
  { to: "/returns", label: "Returns" },
  { to: "/refunds", label: "Refunds" },
  { to: "/privacy", label: "Privacy" },
];

export default function PolicyPage() {
  const { pathname } = useLocation();
  const policies = useSiteStore((s) => s.policies);
  const business = useSiteStore((s) => s.business);

  const fallback = DEFAULT_POLICIES[pathname] || DEFAULT_POLICIES["/terms"];
  const custom = policies?.[pathname];
  const policy: PolicyContent = {
    title: custom?.title || fallback.title,
    lead: custom?.lead ?? fallback.lead,
    sections: custom?.sections?.length ? custom.sections : fallback.sections,
  };

  const fullAddress =
    business?.address && business.address !== "Fairfield, Illinois"
      ? business.address
      : "920 Commerce Drive, Suite 3, Fairfield, IL 62837";

  // Notify NovaOps DesignStudio of policy outline when previewed in iframe
  useEffect(() => {
    postDesignStudioMessage({
      type: "policy-outline",
      path: pathname,
      outline: policy,
    });
  }, [pathname, policy]);

  return (
    <div className="mx-auto max-w-4xl px-[clamp(16px,4vw,32px)] py-10 pb-20">
      <PageMeta
        description={policy.lead || `${policy.title} — Mobicare Device Recovery`}
        title={`${policy.title} — Mobicare`}
      />

      {/* Policy quick-switcher tabs */}
      <nav
        aria-label="Store policies"
        className="mb-8 flex flex-wrap gap-2"
      >
        {POLICY_LINKS.map((item) => {
          const active = pathname === item.to;
          return (
            <Link
              key={item.to}
              aria-current={active ? "page" : undefined}
              className={`rounded-pill border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? "border-accent bg-accent text-accent-foreground shadow-sm"
                  : "border-border bg-surface text-muted hover:border-accent/40 hover:text-foreground"
              }`}
              href={item.to}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <header className="mb-8">
        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-accent">
          <ShieldCheck className="size-3.5" />
          <span>Mobicare Policy</span>
        </span>
        <h1
          className="type-display m-0 text-heading-xl font-extrabold text-foreground sm:text-display"
          data-edit={`policy:${pathname}:title`}
        >
          {policy.title}
        </h1>
        {policy.lead && (
          <p
            className="m-0 mt-3 max-w-2xl text-body-lg leading-relaxed text-muted"
            data-edit={`policy:${pathname}:lead`}
          >
            {policy.lead}
          </p>
        )}
      </header>

      <div className="flex flex-col gap-4">
        {policy.sections.map((sec, idx) => (
          <section
            key={`${sec.title}-${idx}`}
            className="surface-raised rounded-card p-6 sm:p-7"
          >
            <h2
              className="m-0 mb-2.5 text-lg font-bold text-foreground"
              data-edit={`policy:${pathname}:s.${idx}.title`}
            >
              {sec.title}
            </h2>
            <p
              className="m-0 whitespace-pre-line text-sm leading-relaxed text-muted sm:text-body-sm"
              data-edit={`policy:${pathname}:s.${idx}.body`}
            >
              {sec.body}
            </p>
          </section>
        ))}
      </div>

      <footer className="surface-sunken mt-8 flex flex-wrap items-center justify-between gap-4 rounded-card p-5 text-xs text-muted">
        <div className="flex items-center gap-2">
          <MapPin className="size-4 shrink-0 text-accent" />
          <span>{fullAddress}</span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {business?.phone && (
            <a
              className="inline-flex items-center gap-1.5 font-semibold text-foreground hover:text-accent"
              href={`tel:${business.phone.replace(/[^0-9+]/g, "")}`}
            >
              <Phone className="size-3.5 text-accent" />
              <span>{business.phone}</span>
            </a>
          )}
          {business?.email && (
            <a
              className="inline-flex items-center gap-1.5 font-semibold text-foreground hover:text-accent"
              href={`mailto:${business.email}`}
            >
              <Mail className="size-3.5 text-accent" />
              <span>{business.email}</span>
            </a>
          )}
        </div>
      </footer>
    </div>
  );
}
