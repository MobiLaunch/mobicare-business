import type { LucideIcon } from "lucide-react";

import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Clock,
  Mail,
  MapPin,
  Phone,
  Shield,
  Smartphone,
  Star,
  Wrench,
  Zap,
} from "lucide-react";

import { useSiteStore } from "@/lib/siteStore";
import PageMeta from "@/components/PageMeta";

const VALUE_PROPS: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: Shield,
    title: "90-Day Warranty",
    desc: "Every repair is covered. If the same issue returns within 90 days, we fix it free.",
  },
  {
    icon: Zap,
    title: "Same-Day Service",
    desc: "Most screen and battery repairs are done within 1–2 hours while you wait.",
  },
  {
    icon: Star,
    title: "Honest Pricing",
    desc: "Free diagnostics every time. No hidden fees. You approve the cost before we start.",
  },
  {
    icon: Smartphone,
    title: "All Major Brands",
    desc: "iPhones, Samsung, Google Pixel, iPads, tablets, and more — we fix them all.",
  },
];

export default function About() {
  const navigate = useNavigate();
  const about = useSiteStore((s) => s.about);
  const business = useSiteStore((s) => s.business);
  const repairServices = useSiteStore((s) => s.repairServices) || [];

  const contactRows: {
    icon: LucideIcon;
    label: string;
    val?: string;
    href?: string;
  }[] = [
    {
      icon: Phone,
      label: "Phone",
      val: business?.phone,
      href: business?.phone
        ? `tel:${business.phone.replace(/[^0-9+]/g, "")}`
        : undefined,
    },
    {
      icon: Mail,
      label: "Email",
      val: business?.email,
      href: business?.email ? `mailto:${business.email}` : undefined,
    },
    { icon: MapPin, label: "Location", val: business?.city },
  ];

  return (
    <main className="mx-auto max-w-[1400px] overflow-x-hidden px-[clamp(12px,3vw,24px)] pb-16">
      <PageMeta
        description="Learn more about Mobicare, southern Illinois' trusted repair shop for iPhones, Androids, and laptops. Fast turnarounds, 90-day warranty, honest pricing."
        title="About Mobicare — Local Device Repair in Fairfield, Illinois"
      />

      {/* Hero */}
      <div className="relative pb-[clamp(36px,6vw,56px)] pt-[clamp(32px,6vw,64px)] text-center">
        <div className="pointer-events-none absolute left-1/2 top-[40%] h-[200px] w-[clamp(280px,60vw,540px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-soft/60 blur-[50px]" />

        <div className="relative z-[1]">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-accent">
            <BadgeCheck className="size-4" />
            {about?.eyebrow || "About Mobicare"}
          </span>

          <h1 className="m-0 mb-5 break-words text-[clamp(2.2rem,5.5vw,3.8rem)] font-black leading-[1.1] tracking-tight text-foreground">
            {about?.headline}
          </h1>

          <p className="mx-auto max-w-[680px] break-words text-[clamp(16px,2.2vw,19px)] leading-relaxed text-muted">
            {about?.lead}
          </p>
        </div>
      </div>

      {/* Value props */}
      <section className="pb-[clamp(32px,6vw,48px)]">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {VALUE_PROPS.map((v) => (
            <article
              key={v.title}
              className="h-full min-w-0 rounded-[24px] bg-surface p-6 transition-all duration-250 hover:-translate-y-1 hover:shadow-[0_12px_28px_-8px_rgba(0,0,0,0.25)]"
            >
              <span className="mb-5 flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
                <v.icon className="size-6" />
              </span>
              <h3 className="m-0 mb-2 break-words text-xl font-bold text-foreground">
                {v.title}
              </h3>
              <p className="m-0 break-words text-sm leading-relaxed text-muted">
                {v.desc}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Story & Find Us */}
      <section className="my-4 overflow-hidden rounded-[32px] bg-surface shadow-[0_8px_32px_rgba(0,0,0,0.05)]">
        <div className="flex w-full flex-wrap gap-10 p-[clamp(24px,5vw,56px)]">
          {/* Story */}
          <div className="min-w-0 flex-[1_1_340px] break-words">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-accent">
              Who We Are
            </span>
            <h2 className="m-0 mb-5 text-[clamp(1.8rem,4vw,2.5rem)] font-extrabold tracking-tight text-foreground">
              Our Story
            </h2>

            {(about?.story || []).map((para, i) => (
              <p
                key={i}
                className="mb-[18px] break-words text-[clamp(15px,2vw,16px)] leading-[1.75] text-muted"
              >
                {para}
              </p>
            ))}

            <div className="my-7 grid grid-cols-3 gap-4 rounded-2xl bg-surface-secondary p-5">
              <div>
                <strong className="block text-xl font-extrabold text-accent">
                  100%
                </strong>
                <span className="text-xs text-muted">Guaranteed Parts</span>
              </div>
              <div>
                <strong className="block text-xl font-extrabold text-accent">
                  1–2 Hr
                </strong>
                <span className="text-xs text-muted">Avg Turnaround</span>
              </div>
              <div>
                <strong className="block text-xl font-extrabold text-accent">
                  Free
                </strong>
                <span className="text-xs text-muted">Diagnostics</span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                className="flex h-12 items-center gap-1.5 rounded-full bg-accent px-6 text-sm font-bold text-accent-foreground"
                type="button"
                onClick={() => navigate("/shop")}
              >
                <span>Shop Accessories</span>
                <ArrowRight className="size-4" />
              </button>
              <button
                className="h-12 rounded-full border border-border bg-surface-secondary px-6 text-sm font-bold text-foreground"
                type="button"
                onClick={() => navigate("/repairs")}
              >
                View Repair Services
              </button>
            </div>
          </div>

          {/* Find Us */}
          <div className="min-w-0 flex-[1_1_280px]">
            <article className="rounded-[24px] bg-surface-secondary p-6 shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
              <h3 className="m-0 mb-5 text-[1.35rem] font-extrabold text-foreground">
                Find Us
              </h3>

              <div className="flex flex-col gap-2">
                {contactRows.map((row) => {
                  const Tag = row.href ? "a" : "div";

                  return (
                    <Tag
                      key={row.label}
                      className="flex items-center gap-3.5 rounded-2xl p-3 no-underline transition-all hover:translate-x-1 hover:bg-surface-tertiary"
                      href={row.href}
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                        <row.icon className="size-5" />
                      </span>
                      <div className="min-w-0 overflow-hidden">
                        <strong className="block text-xs uppercase tracking-wide text-muted">
                          {row.label}
                        </strong>
                        <span className="block break-all text-sm font-semibold text-foreground">
                          {row.val || "Available"}
                        </span>
                      </div>
                    </Tag>
                  );
                })}

                <div className="flex items-start gap-3.5 p-3">
                  <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                    <Clock className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <strong className="mb-1 block text-xs uppercase tracking-wide text-muted">
                      Hours
                    </strong>
                    {(business?.hours || []).map((h) => (
                      <span
                        key={h.days}
                        className="block text-[13px] leading-relaxed text-muted"
                      >
                        <strong className="text-foreground">{h.days}:</strong>{" "}
                        {h.hours}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Popular repairs preview */}
      <section className="pb-4 pt-[clamp(32px,6vw,56px)]">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="m-0 text-[11px] font-bold uppercase tracking-widest text-accent">
              What We Do
            </p>
            <h2 className="m-0 mt-1 text-[clamp(1.8rem,4vw,2.4rem)] font-extrabold text-foreground">
              Popular Repairs
            </h2>
          </div>
          <button
            className="flex h-[42px] items-center gap-1.5 rounded-full border border-border bg-surface-secondary px-5 text-sm font-bold text-foreground"
            type="button"
            onClick={() => navigate("/repairs")}
          >
            <span>View All Services</span>
            <ArrowRight className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {repairServices.map((svc) => (
            <button
              key={svc.id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-surface px-5 py-4 text-left transition-all hover:-translate-y-0.5"
              type="button"
              onClick={() => navigate("/repairs")}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-accent">
                  <Wrench className="size-[18px]" />
                </span>
                <strong className="break-words text-[15px] font-bold text-foreground">
                  {svc.name}
                </strong>
              </div>
              <span className="shrink-0 whitespace-nowrap rounded-full bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent">
                {svc.priceRange}
              </span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
