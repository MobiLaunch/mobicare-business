import {
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  Phone,
  SearchCheck,
  Zap,
} from "lucide-react";
import { Link } from "@heroui/react";

import { useSiteStore, type Social } from "@/lib/siteStore";
import localLogo from "@/assets/mobicare-logo.svg";

const SHOP_LINKS = [
  { label: "All Products", copyKey: "footer.link.shop.all", to: "/shop" },
  {
    label: "Chargers",
    copyKey: "footer.link.shop.chargers",
    to: "/shop?cat=chargers",
  },
  { label: "Cases", copyKey: "footer.link.shop.cases", to: "/shop?cat=cases" },
  {
    label: "Screen Protectors",
    copyKey: "footer.link.shop.screen",
    to: "/shop?cat=screen-protectors",
  },
  {
    label: "Cables",
    copyKey: "footer.link.shop.cables",
    to: "/shop?cat=cables",
  },
];

const REPAIR_LINKS = [
  { label: "All Services", copyKey: "footer.link.rep.all", to: "/repairs" },
  {
    label: "Screen Repair",
    copyKey: "footer.link.rep.screen",
    to: "/repairs?service=screen-repair#screen-repair",
  },
  {
    label: "Battery Replacement",
    copyKey: "footer.link.rep.battery",
    to: "/repairs?service=battery-replacement#battery-replacement",
  },
  {
    label: "Water Damage",
    copyKey: "footer.link.rep.water",
    to: "/repairs?service=water-damage#water-damage",
  },
  {
    label: "Data Recovery",
    copyKey: "",
    to: "/repairs?service=data-recovery#data-recovery",
  },
  {
    label: "AKKO Device Protection",
    copyKey: "footer.link.rep.protect",
    to: "/protection",
  },
];

const COMPANY_POLICY_LINKS = [
  { label: "About Us", copyKey: "nav.about", to: "/about" },
  { label: "Track Repair / Order", copyKey: "", to: "/repair-status" },
  { label: "90-Day Warranty", copyKey: "", to: "/warranty" },
  {
    label: "Shipping Policy",
    copyKey: "footer.link.pol.shipping",
    to: "/shipping",
  },
  {
    label: "Returns & Exchanges",
    copyKey: "footer.link.pol.returns",
    to: "/returns",
  },
  { label: "Refund Policy", copyKey: "footer.link.pol.refunds", to: "/refunds" },
  {
    label: "Privacy Policy",
    copyKey: "footer.link.pol.privacy",
    to: "/privacy",
  },
  { label: "Terms of Service", copyKey: "", to: "/terms" },
];

const SOCIAL_LABELS: Record<keyof Social, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  twitter: "X",
  tiktok: "TikTok",
  youtube: "YouTube",
  yelp: "Yelp",
  google: "Google",
};

export default function Footer() {
  const brand = useSiteStore((s) => s.brand);
  const business = useSiteStore((s) => s.business);
  const appearance = useSiteStore((s) => s.appearance);
  const footer = useSiteStore((s) => s.footer);
  const social = useSiteStore((s) => s.social);
  const copy = useSiteStore((s) => s.copy);
  const pages = useSiteStore((s) => s.pages);
  const isPreview = useSiteStore((s) => s.isPreview);

  const hasCustomLogo = Boolean(appearance?.logoUrl?.trim());
  const logoSrc = hasCustomLogo ? appearance!.logoUrl : localLogo;

  const fullAddress =
    business?.address && business.address !== "Fairfield, Illinois"
      ? business.address
      : "920 Commerce Drive, Suite 3, Fairfield, IL 62837";

  const activeSocials = (Object.keys(SOCIAL_LABELS) as Array<keyof Social>)
    .map((key) => ({
      key,
      label: SOCIAL_LABELS[key],
      url: social?.[key]?.trim() || "",
    }))
    .filter((item) => Boolean(item.url));

  const builtInHrefs = new Set(COMPANY_POLICY_LINKS.map((l) => l.to));
  const extraFooterLinks = (footer?.extraLinks || []).filter(
    (l) => l.label?.trim() && l.href?.trim() && !builtInHrefs.has(l.href.trim()),
  );
  const customPages = (pages || []).filter((p) => p.published || isPreview);

  const taglineText =
    copy?.["footer.tagline"] ||
    footer?.tagline ||
    "Southern Illinois' trusted repair shop for iPhones, Androids, tablets, and more. Quality parts and honest service.";

  return (
    <footer
      className="border-t border-[var(--hairline)] bg-surface-secondary px-4 pb-28 pt-6 lg:pb-8"
      id="site-footer"
    >
      <div className="mx-auto max-w-[1400px] rounded-panel bg-surface p-6 sm:p-8">
        {/* Call Shop & Track Repair CTA */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-accent-soft p-5">
          <div className="min-w-0 flex-1">
            <div className="font-bold text-foreground">
              Need a device repair or checking on an active ticket?
            </div>
            <div className="text-sm text-accent">
              Fast turnarounds &amp; honest pricing at 920 Commerce Drive, Suite
              3, Fairfield, IL.
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-surface px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-accent hover:text-accent"
              href="/repair-status"
            >
              <SearchCheck className="size-4 text-accent" />
              <span>Track Repair / Order</span>
            </Link>
            {business?.phone && (
              <Link
                className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground"
                href={`tel:${business.phone.replace(/[^0-9+]/g, "")}`}
              >
                <Phone className="size-4" />
                <span>Call {business.phone}</span>
              </Link>
            )}
          </div>
        </div>

        {/* Columns */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-[1.8fr_1fr_1fr_1.1fr_1.6fr]">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1">
            <div className="mb-3 flex items-center gap-2.5">
              {appearance?.logoType === "image" ? (
                <img
                  alt={appearance.logoAlt || brand?.name || "Business logo"}
                  className={`h-9 w-auto max-w-[180px] object-contain ${hasCustomLogo ? "" : "dark:brightness-0 dark:invert"}`}
                  src={logoSrc}
                />
              ) : (
                <div className="flex size-9 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Zap className="size-4" />
                </div>
              )}
              <div>
                <div
                  className="font-bold text-foreground"
                  data-edit="brand.name"
                >
                  {brand?.name}
                </div>
                {brand?.subLabel && (
                  <div
                    className="text-sm text-muted"
                    data-edit="brand.subLabel"
                  >
                    {brand.subLabel}
                  </div>
                )}
              </div>
            </div>
            <p
              className="m-0 text-sm leading-relaxed text-muted"
              data-edit="footer.tagline"
            >
              {taglineText}
            </p>

            {footer?.showSocial !== false && activeSocials.length > 0 && (
              <div
                aria-label="Social media links"
                className="mt-4 flex flex-wrap gap-2"
              >
                {activeSocials.map((item) => (
                  <a
                    key={item.key}
                    aria-label={item.label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-secondary px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-accent hover:text-accent"
                    href={item.url}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <Globe aria-hidden="true" className="size-3.5 text-accent" />
                    <span>{item.label}</span>
                    <ExternalLink
                      aria-hidden="true"
                      className="size-3 text-muted"
                    />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Shop */}
          <div>
            <h6
              className="mb-3 text-sm font-semibold text-muted"
              data-edit="copy.footer.shop"
            >
              {copy?.["footer.shop"] || "Shop"}
            </h6>
            <nav aria-label="Shop" className="flex flex-col gap-2">
              {SHOP_LINKS.map((link) => (
                <Link
                  key={link.to}
                  className="text-sm text-foreground hover:text-accent hover:underline"
                  data-edit={link.copyKey ? `copy.${link.copyKey}` : undefined}
                  href={link.to}
                >
                  {(link.copyKey && copy?.[link.copyKey]) || link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Repairs */}
          <div>
            <h6
              className="mb-3 text-sm font-semibold text-muted"
              data-edit="copy.footer.repairs"
            >
              {copy?.["footer.repairs"] || "Repairs"}
            </h6>
            <nav aria-label="Repairs" className="flex flex-col gap-2">
              {REPAIR_LINKS.map((link) => (
                <Link
                  key={link.to}
                  className="text-sm text-foreground hover:text-accent hover:underline"
                  data-edit={link.copyKey ? `copy.${link.copyKey}` : undefined}
                  href={link.to}
                >
                  {(link.copyKey && copy?.[link.copyKey]) || link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Company & Policies */}
          <div>
            <h6
              className="mb-3 text-sm font-semibold text-muted"
              data-edit="copy.footer.policies"
            >
              {copy?.["footer.policies"] || "Company & Policies"}
            </h6>
            <nav
              aria-label="Company and policies"
              className="flex flex-col gap-2"
            >
              {COMPANY_POLICY_LINKS.map((link) => (
                <Link
                  key={link.to}
                  className="text-sm text-foreground hover:text-accent hover:underline"
                  data-edit={link.copyKey ? `copy.${link.copyKey}` : undefined}
                  href={link.to}
                >
                  {(link.copyKey && copy?.[link.copyKey]) || link.label}
                </Link>
              ))}
              {customPages.map((pg) => (
                <Link
                  key={pg.slug}
                  className="text-sm text-foreground hover:text-accent hover:underline"
                  href={`/p/${pg.slug}`}
                >
                  {pg.title}
                </Link>
              ))}
            </nav>
          </div>

          {/* Contact & Hours */}
          <div className="col-span-2 lg:col-span-1">
            <h6
              className="mb-3 text-sm font-semibold text-muted"
              data-edit="copy.footer.visit"
            >
              {copy?.["footer.visit"] || "Contact & Hours"}
            </h6>
            <div className="mb-4 flex flex-col gap-2">
              {business?.phone && (
                <Link
                  className="flex items-center gap-2 text-sm text-foreground hover:text-accent"
                  href={`tel:${business.phone.replace(/[^0-9+]/g, "")}`}
                >
                  <Phone className="size-4 shrink-0 text-accent" />
                  <span data-edit="business.phone">{business.phone}</span>
                </Link>
              )}
              {business?.email && (
                <Link
                  className="flex items-center gap-2 text-sm text-foreground hover:text-accent"
                  href={`mailto:${business.email}`}
                >
                  <Mail className="size-4 shrink-0 text-accent" />
                  <span className="break-all" data-edit="business.email">
                    {business.email}
                  </span>
                </Link>
              )}
              <a
                className="flex items-start gap-2 text-sm text-foreground hover:text-accent"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-accent" />
                <span data-edit="business.address">{fullAddress}</span>
              </a>
            </div>

            {footer?.showHours !== false &&
              business?.hours &&
              business.hours.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {business.hours.map((h) => (
                    <div
                      key={h.days}
                      className="flex justify-between gap-2 text-sm"
                    >
                      <span className="text-muted">{h.days}</span>
                      <span className="font-semibold text-foreground">
                        {h.hours}
                      </span>
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>

        <div className="my-6 border-t border-border" />

        {/* Bottom bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <p className="m-0">
              © {new Date().getFullYear()}{" "}
              <span data-edit="footer.copyrightName">
                {footer?.copyrightName || brand?.name}
              </span>
              .{" "}
              <span data-edit="copy.footer.rights">
                {copy?.["footer.rights"] || "All rights reserved."}
              </span>
            </p>
            {extraFooterLinks.map((link) => (
              <Link
                key={`${link.label}-${link.href}`}
                className="text-xs text-muted hover:text-accent hover:underline"
                href={link.href}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <p className="m-0">
            <span data-edit="copy.footer.place">
              {copy?.["footer.place"] || fullAddress}
            </span>
            {business?.phone && (
              <>
                {" · "}
                <Link
                  className="text-accent"
                  href={`tel:${business.phone.replace(/[^0-9+]/g, "")}`}
                >
                  {business.phone}
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </footer>
  );
}
