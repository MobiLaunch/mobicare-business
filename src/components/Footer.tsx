import { Link } from "react-router-dom";
import { Mail, MapPin, Phone, Smartphone } from "lucide-react";

import { useSiteStore } from "@/lib/siteStore";
import localLogo from "@/assets/mobicare-logo.svg";
import AppIcon from "@/components/ios/AppIcon";

const SHOP_LINKS = [
  { label: "All Products", to: "/shop" },
  { label: "Chargers", to: "/shop?cat=chargers" },
  { label: "Cases", to: "/shop?cat=cases" },
  { label: "Screen Protectors", to: "/shop?cat=screen-protectors" },
  { label: "Cables", to: "/shop?cat=cables" },
];

const POLICY_LINKS = [
  { label: "Shipping", to: "/shipping" },
  { label: "Returns & Exchanges", to: "/returns" },
  { label: "Refunds", to: "/refunds" },
  { label: "Privacy", to: "/privacy" },
];

const REPAIR_LINKS = [
  { label: "All Services", to: "/repairs" },
  { label: "Screen Repair", to: "/repairs#screen-repair" },
  { label: "Battery Replacement", to: "/repairs#battery-replacement" },
  { label: "Water Damage", to: "/repairs#water-damage" },
  { label: "Data Recovery", to: "/repairs#data-recovery" },
  { label: "AKKO Device Insurance", to: "/protection" },
];

// The store also has `social` and `footer.extraLinks`, which the footer has
// never rendered; only the copyright name is wired here.
export default function Footer() {
  const brand = useSiteStore((s) => s.brand);
  const business = useSiteStore((s) => s.business);
  const appearance = useSiteStore((s) => s.appearance);
  const footer = useSiteStore((s) => s.footer);
  const logoSrc = appearance?.logoUrl || localLogo;
  const tel = business?.phone ? `tel:${business.phone.replace(/[^0-9+]/g, "")}` : undefined;

  return (
    <footer className="px-4 pb-[calc(var(--ios-tab-h)+2rem)] pt-10 lg:pb-10" id="site-footer">
      <div className="mx-auto max-w-[1400px]">
        {tel && (
          <a className="ios-btn ios-btn--green ios-btn--lg mb-8 w-full justify-between sm:w-auto" href={tel}>
            <span className="flex items-center gap-3">
              <Phone aria-hidden="true" className="size-5" />
              <span className="text-left leading-tight">
                <strong className="block text-base">Need a repair right now?</strong>
                <span className="block text-xs font-semibold opacity-90">Tap to call the shop · {business.phone}</span>
              </span>
            </span>
          </a>
        )}

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr_1.3fr]">
          <div>
            <div className="mb-3 flex items-center gap-3">
              {appearance?.logoType === "image" ? (
                <img alt={appearance.logoAlt || brand?.name || "Business logo"} className="h-9 w-auto max-w-[180px] object-contain" src={logoSrc} />
              ) : (
                <AppIcon color="green" icon={Smartphone} size={44} />
              )}
              <div>
                <div className="font-extrabold text-[var(--ios-ink)]" style={{ textShadow: "0 1px 0 #fff" }}>{brand?.name}</div>
                {brand?.subLabel && <div className="text-sm font-bold text-[var(--ios-slate)]">{brand.subLabel}</div>}
              </div>
            </div>
            <p className="m-0 text-sm leading-relaxed text-[var(--ios-slate)]" style={{ textShadow: "0 1px 0 rgba(255,255,255,.8)" }}>
              Southern Illinois&rsquo; trusted repair shop for iPhones, Androids, tablets, and more. Quality parts and expert technician service.
            </p>
          </div>

          <nav aria-label="Shop">
            <h6 className="ios-group-title">Shop</h6>
            <div className="ios-group">
              {SHOP_LINKS.map((l) => (
                <Link key={l.to} className="ios-row ios-chevron" to={l.to}>{l.label}</Link>
              ))}
            </div>
          </nav>

          <nav aria-label="Repairs">
            <h6 className="ios-group-title">Repairs</h6>
            <div className="ios-group">
              {REPAIR_LINKS.map((l) => (
                <Link key={l.to} className="ios-row ios-chevron" to={l.to}>{l.label}</Link>
              ))}
            </div>
          </nav>

          <nav aria-label="Policies">
            <h6 className="ios-group-title">Policies</h6>
            <div className="ios-group">
              {POLICY_LINKS.map((l) => (
                <Link key={l.to} className="ios-row ios-chevron" to={l.to}>{l.label}</Link>
              ))}
            </div>
          </nav>

          <div>
            <h6 className="ios-group-title">Contact &amp; Hours</h6>
            <div className="ios-group">
              {business?.phone && (
                <a className="ios-row" href={tel}>
                  <Phone aria-hidden="true" className="size-4 shrink-0 text-[var(--ios-green-dark)]" />
                  <span>{business.phone}</span>
                </a>
              )}
              {business?.email && (
                <a className="ios-row" href={`mailto:${business.email}`}>
                  <Mail aria-hidden="true" className="size-4 shrink-0 text-[var(--ios-blue)]" />
                  <span className="min-w-0 truncate">{business.email}</span>
                </a>
              )}
              {business?.city && (
                <div className="ios-row">
                  <MapPin aria-hidden="true" className="size-4 shrink-0 text-[var(--ios-red)]" />
                  <span>{business.city}</span>
                </div>
              )}
              {business?.hours?.map((h) => (
                <div key={h.days} className="ios-row justify-between text-sm">
                  <span className="text-muted">{h.days}</span>
                  <strong>{h.hours}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="ios-rainbow mt-10" />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm font-bold text-[var(--ios-slate)]" style={{ textShadow: "0 1px 0 rgba(255,255,255,.8)" }}>
          <p className="m-0">© {new Date().getFullYear()} {footer.copyrightName || brand?.name}. All rights reserved.</p>
          <p className="m-0">{business?.city || "Fairfield, Illinois"}</p>
        </div>
      </div>
    </footer>
  );
}
