import type { LucideIcon } from "lucide-react";

import { useMemo } from "react";
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
  Zap,
} from "lucide-react";
import { Button } from "@heroui/react";

import { useSiteStore } from "@/lib/siteStore";
import PageMeta from "@/components/PageMeta";
import CategoryIcon from "@/components/CategoryIcon";

const DEFAULT_ABOUT_SECTIONS = ["values", "story", "popular"];

export default function About() {
  const navigate = useNavigate();
  const about = useSiteStore((s) => s.about);
  const business = useSiteStore((s) => s.business);
  const repairServices = useSiteStore((s) => s.repairServices) || [];
  const copy = useSiteStore((s) => s.copy);
  const layout = useSiteStore((s) => s.layout);

  const fullAddress =
    business?.address && business.address !== "Fairfield, Illinois"
      ? business.address
      : "920 Commerce Drive, Suite 3, Fairfield, IL 62837";

  const valueProps: {
    icon: LucideIcon;
    title: string;
    desc: string;
    titleEdit: string;
    descEdit: string;
  }[] = [
    {
      icon: Shield,
      title: copy?.["about.vp.1.title"] || "90-Day Warranty",
      desc:
        copy?.["about.vp.1.desc"] ||
        "Every part we replace is covered for 90 days. If it fails, we replace it free.",
      titleEdit: "copy.about.vp.1.title",
      descEdit: "copy.about.vp.1.desc",
    },
    {
      icon: Zap,
      title: copy?.["about.vp.2.title"] || "Same-Day Service",
      desc:
        copy?.["about.vp.2.desc"] ||
        "Most screen and battery repairs are done within 1–2 hours while you wait.",
      titleEdit: "copy.about.vp.2.title",
      descEdit: "copy.about.vp.2.desc",
    },
    {
      icon: Star,
      title: copy?.["about.vp.3.title"] || "Honest Pricing",
      desc:
        copy?.["about.vp.3.desc"] ||
        "$35 diagnostic bench fee — 100% credited toward your repair. No hidden fees, and you approve the quote before we start.",
      titleEdit: "copy.about.vp.3.title",
      descEdit: "copy.about.vp.3.desc",
    },
    {
      icon: Smartphone,
      title: copy?.["about.vp.4.title"] || "All Major Brands",
      desc:
        copy?.["about.vp.4.desc"] ||
        "iPhones, Samsung, Google Pixel, iPads, tablets, and laptops — we fix them all.",
      titleEdit: "copy.about.vp.4.title",
      descEdit: "copy.about.vp.4.desc",
    },
  ];

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
    {
      icon: MapPin,
      label: "Location",
      val: fullAddress,
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`,
    },
  ];

  const visibleSections = useMemo(() => {
    const cfg = layout?.pages?.["/about"];
    const custom = (cfg?.order || []).filter((id) =>
      DEFAULT_ABOUT_SECTIONS.includes(id),
    );
    const full = [
      ...custom,
      ...DEFAULT_ABOUT_SECTIONS.filter((id) => !custom.includes(id)),
    ];
    const hidden = new Set(cfg?.hidden || []);
    return full.filter((id) => !hidden.has(id));
  }, [layout]);

  return (
    <div className="mx-auto max-w-[1400px] overflow-x-hidden px-[clamp(12px,3vw,24px)] pb-16">
      <PageMeta
        description="Learn more about Mobicare, Southern Illinois' trusted repair shop since 2019 for iPhones, Androids, and laptops. Fast turnarounds, 90-day warranty, honest pricing."
        title="About Mobicare — Local Device Repair in Fairfield, Illinois"
      />

      {/* Hero */}
      <div className="relative pb-[clamp(36px,6vw,56px)] pt-[clamp(32px,6vw,64px)] text-center">
        <div className="pointer-events-none absolute left-1/2 top-[40%] h-[200px] w-[clamp(280px,60vw,540px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-soft/60 blur-[50px]" />

        <div className="relative z-[1]">
          <span
            className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-accent"
            data-edit="about.eyebrow"
          >
            <BadgeCheck className="size-4" />
            {about?.eyebrow || "About Mobicare · Est. 2019"}
          </span>

          <h1
            className="m-0 mb-5 break-words text-display font-black leading-[1.1] tracking-tight text-foreground"
            data-edit="about.headline"
          >
            {about?.headline}
          </h1>

          <p
            className="mx-auto max-w-[680px] break-words text-body-lg leading-relaxed text-muted"
            data-edit="about.lead"
          >
            {about?.lead}
          </p>
        </div>
      </div>

      {visibleSections.map((sectionId) => {
        if (sectionId === "values") {
          return (
            <section key="values" className="pb-[clamp(32px,6vw,48px)]">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {valueProps.map((v) => (
                  <article
                    key={v.titleEdit}
                    className="surface-raised lift h-full min-w-0 rounded-card p-6"
                  >
                    <span className="mb-5 flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
                      <v.icon className="size-6" />
                    </span>
                    <h3
                      className="m-0 mb-2 break-words text-xl font-bold text-foreground"
                      data-edit={v.titleEdit}
                    >
                      {v.title}
                    </h3>
                    <p
                      className="m-0 break-words text-sm leading-relaxed text-muted"
                      data-edit={v.descEdit}
                    >
                      {v.desc}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          );
        }

        if (sectionId === "story") {
          return (
            <section
              key="story"
              className="surface-raised my-4 overflow-hidden rounded-panel"
            >
              <div className="flex w-full flex-wrap gap-10 p-[clamp(24px,5vw,56px)]">
                {/* Story */}
                <div className="min-w-0 flex-[1_1_340px] break-words">
                  <span className="mb-1.5 block text-caption font-bold uppercase tracking-widest text-accent">
                    Who We Are · Est. 2019
                  </span>
                  <h2
                    className="m-0 mb-5 text-heading-xl font-extrabold tracking-tight text-foreground"
                    data-edit="copy.about.story.title"
                  >
                    {copy?.["about.story.title"] || "Our Story"}
                  </h2>

                  {(about?.story || []).map((para, i) => (
                    <p
                      key={i}
                      className="mb-[18px] break-words text-body-lg leading-[1.75] text-muted"
                      data-edit={`about.story.${i}`}
                    >
                      {para}
                    </p>
                  ))}

                  <div className="surface-sunken my-7 grid grid-cols-1 gap-4 rounded-card p-5 sm:grid-cols-3">
                    <div>
                      <strong
                        className="block text-xl font-extrabold text-accent"
                        data-edit="copy.about.stat.1.value"
                      >
                        {copy?.["about.stat.1.value"] || "100%"}
                      </strong>
                      <span
                        className="text-xs text-muted"
                        data-edit="copy.about.stat.1.label"
                      >
                        {copy?.["about.stat.1.label"] || "Guaranteed Parts"}
                      </span>
                    </div>
                    <div>
                      <strong
                        className="block text-xl font-extrabold text-accent"
                        data-edit="copy.about.stat.2.value"
                      >
                        {copy?.["about.stat.2.value"] || "1–2 Hr"}
                      </strong>
                      <span
                        className="text-xs text-muted"
                        data-edit="copy.about.stat.2.label"
                      >
                        {copy?.["about.stat.2.label"] || "Avg Turnaround"}
                      </span>
                    </div>
                    <div>
                      <strong
                        className="block text-xl font-extrabold text-accent"
                        data-edit="copy.about.stat.3.value"
                      >
                        $35
                      </strong>
                      <span
                        className="text-xs text-muted"
                        data-edit="copy.about.stat.3.label"
                      >
                        Bench Fee — 100% Credited Toward Repair
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button
                      className="flex h-12 items-center gap-1.5 rounded-full bg-accent px-6 text-sm font-bold text-accent-foreground"
                      variant="primary"
                      onPress={() => navigate("/shop")}
                    >
                      <span>Shop Accessories</span>
                      <ArrowRight className="size-4" />
                    </Button>
                    <Button
                      className="h-12 rounded-pill border border-border bg-surface px-6 text-label font-bold text-foreground"
                      variant="outline"
                      onPress={() => navigate("/repairs")}
                    >
                      View Repair Services
                    </Button>
                  </div>
                </div>

                {/* Find Us */}
                <div className="min-w-0 flex-[1_1_280px]">
                  <article className="surface-raised rounded-card p-6">
                    <h3 className="m-0 mb-5 text-heading font-extrabold text-foreground">
                      Find Us
                    </h3>

                    <div className="flex flex-col gap-2">
                      {contactRows.map((row) => {
                        const Tag = row.href ? "a" : "div";
                        const isExternal = row.href?.startsWith("http");

                        return (
                          <Tag
                            key={row.label}
                            className="flex items-center gap-3.5 rounded-2xl p-3 no-underline transition-all hover:translate-x-1 hover:bg-surface"
                            href={row.href}
                            rel={isExternal ? "noopener noreferrer" : undefined}
                            target={isExternal ? "_blank" : undefined}
                          >
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                              <row.icon className="size-5" />
                            </span>
                            <div className="min-w-0 overflow-hidden">
                              <strong className="block text-xs uppercase tracking-wide text-muted">
                                {row.label}
                              </strong>
                              <span className="block break-words text-sm font-semibold text-foreground">
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
                              className="block text-label leading-relaxed text-muted"
                            >
                              <strong className="text-foreground">
                                {h.days}:
                              </strong>{" "}
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
          );
        }

        if (sectionId === "popular") {
          return (
            <section
              key="popular"
              className="pb-4 pt-[clamp(32px,6vw,56px)]"
            >
              <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="m-0 text-caption font-bold uppercase tracking-widest text-accent">
                    What We Do
                  </p>
                  <h2
                    className="m-0 mt-1 text-heading-xl font-extrabold text-foreground"
                    data-edit="copy.about.popular.title"
                  >
                    {copy?.["about.popular.title"] || "Popular Repairs"}
                  </h2>
                </div>
                <Button
                  className="flex h-[42px] items-center gap-1.5 rounded-full border border-border bg-surface-secondary px-5 text-sm font-bold text-foreground"
                  variant="outline"
                  onPress={() => navigate("/repairs")}
                >
                  <span>View All Services</span>
                  <ArrowRight className="size-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {repairServices.map((svc) => (
                  <Button
                    key={svc.id}
                    className="flex h-auto items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-5 py-4 text-left transition-all hover:-translate-y-0.5 hover:border-accent/40"
                    variant="ghost"
                    onPress={() =>
                      navigate(`/repairs?service=${encodeURIComponent(svc.id)}`)
                    }
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-accent">
                        <CategoryIcon
                          className="size-[18px]"
                          iconId={svc.icon}
                        />
                      </span>
                      <strong className="break-words text-body-sm font-bold text-foreground">
                        {svc.name}
                      </strong>
                    </div>
                    <span className="shrink-0 whitespace-nowrap rounded-full bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent">
                      {svc.priceRange}
                    </span>
                  </Button>
                ))}
              </div>
            </section>
          );
        }

        return null;
      })}
    </div>
  );
}
