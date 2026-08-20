import { Mail, MapPin, Phone, Zap } from "lucide-react";
import { Link } from "@heroui/react";

import { useSiteStore } from "@/lib/siteStore";
import localLogo from "@/assets/mobicare-logo.svg";

const SHOP_LINKS = [
  { label: "All Products", to: "/shop" },
  { label: "Chargers", to: "/shop?cat=chargers" },
  { label: "Cases", to: "/shop?cat=cases" },
  { label: "Screen Protectors", to: "/shop?cat=screen-protectors" },
  { label: "Cables", to: "/shop?cat=cables" },
];

const REPAIR_LINKS = [
  { label: "All Services", to: "/repairs" },
  { label: "Screen Repair", to: "/repairs#screen-repair" },
  { label: "Battery Replacement", to: "/repairs#battery-replacement" },
  { label: "Water Damage", to: "/repairs#water-damage" },
  { label: "Data Recovery", to: "/repairs#data-recovery" },
  { label: "AKKO Device Insurance", to: "/protection" },
];

// NOTE (HeroUI v3 rebuild): the site-content store also has `footer` (tagline,
// showHours, showSocial, copyrightName, extraLinks) and `social` (facebook,
// instagram, etc.) fields with their own admin-editable defaults, but the
// original Footer never read most of them — no social links were ever
// rendered, `showHours` didn't gate anything (hours always showed
// regardless), and `extraLinks` (Privacy Policy / Terms of Service by
// default) was never rendered. That's a bigger gap than a one-line rewire —
// it's essentially an unbuilt part of the footer — so rather than invent that
// UI unilaterally, this rebuild only fixes the direct one-to-one case
// (copyright name) and leaves the rest as-is. Happy to build out the social
// links / extra links row for real if wanted.
export default function Footer() {
  const brand = useSiteStore((s) => s.brand);
  const business = useSiteStore((s) => s.business);
  const appearance = useSiteStore((s) => s.appearance);
  const footer = useSiteStore((s) => s.footer);
  const logoSrc = appearance?.logoUrl || localLogo;

  return (
    <footer className="bg-surface-secondary px-4 pb-8 pt-6" id="site-footer">
      <div className="mx-auto max-w-[1400px] rounded-[28px] bg-surface p-6 sm:p-8">
        {/* Call Shop CTA */}
        {business?.phone && (
          <div className="mb-8 flex flex-wrap items-center gap-4 rounded-2xl bg-accent-soft p-5">
            <div className="min-w-0 flex-1">
              <div className="font-bold text-foreground">
                Need a device repair right now?
              </div>
              <div className="text-sm text-accent">
                Fast turnarounds &amp; honest pricing in Southern Illinois.
              </div>
            </div>
            <Link
              className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 font-semibold text-accent-foreground"
              href={`tel:${business.phone.replace(/[^0-9+]/g, "")}`}
            >
              <Phone className="size-4" />
              <span>Call Shop</span>
            </Link>
          </div>
        )}

        {/* Columns */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-[2fr_1fr_1fr_2fr]">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1">
            <div className="mb-3 flex items-center gap-2.5">
              {appearance?.logoType === "image" ? (
                <img
                  alt={appearance.logoAlt || brand?.name || "Business logo"}
                  className="h-9 w-auto max-w-[180px] object-contain dark:brightness-0 dark:invert"
                  src={logoSrc}
                />
              ) : (
                <div className="flex size-9 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Zap className="size-4" />
                </div>
              )}
              <div>
                <div className="font-bold text-foreground">{brand?.name}</div>
                {brand?.subLabel && (
                  <div className="text-sm text-muted">{brand.subLabel}</div>
                )}
              </div>
            </div>
            <p className="text-sm text-muted">
              Southern Illinois&rsquo; trusted repair shop for iPhones,
              Androids, tablets, and more. Quality parts and expert technician
              service.
            </p>
          </div>

          {/* Shop */}
          <div>
            <h6 className="mb-3 text-sm font-semibold text-muted">Shop</h6>
            <nav aria-label="Shop" className="flex flex-col gap-2">
              {SHOP_LINKS.map((link) => (
                <Link
                  key={link.to}
                  className="text-sm text-foreground hover:text-accent hover:underline"
                  href={link.to}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Repairs */}
          <div>
            <h6 className="mb-3 text-sm font-semibold text-muted">Repairs</h6>
            <nav aria-label="Repairs" className="flex flex-col gap-2">
              {REPAIR_LINKS.map((link) => (
                <Link
                  key={link.to}
                  className="text-sm text-foreground hover:text-accent hover:underline"
                  href={link.to}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Contact & Hours */}
          <div className="col-span-2 lg:col-span-1">
            <h6 className="mb-3 text-sm font-semibold text-muted">
              Contact &amp; Hours
            </h6>
            <div className="mb-4 flex flex-col gap-2">
              {business?.phone && (
                <Link
                  className="flex items-center gap-2 text-sm text-foreground hover:text-accent"
                  href={`tel:${business.phone.replace(/[^0-9+]/g, "")}`}
                >
                  <Phone className="size-4 shrink-0" />
                  <span>{business.phone}</span>
                </Link>
              )}
              {business?.email && (
                <Link
                  className="flex items-center gap-2 text-sm text-foreground hover:text-accent"
                  href={`mailto:${business.email}`}
                >
                  <Mail className="size-4 shrink-0" />
                  <span>{business.email}</span>
                </Link>
              )}
              {business?.city && (
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <MapPin className="size-4 shrink-0" />
                  <span>{business.city}</span>
                </div>
              )}
            </div>

            {business?.hours && business.hours.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {business.hours.map((h) => (
                  <div key={h.days} className="flex justify-between text-sm">
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
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
          <p className="m-0">
            © {new Date().getFullYear()} {footer.copyrightName || brand?.name}.
            All rights reserved.
          </p>
          <p className="m-0">
            {business?.city || "Fairfield, Illinois"}
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
