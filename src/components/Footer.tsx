import { Link } from "react-router-dom";

import { useSiteStore } from "@/lib/siteStore";
import { BUSINESS } from "@/lib/config";
import localLogo from "@/assets/mobicare-logo.svg";

const SHOP = [
  { label: "All products", to: "/shop" },
  { label: "Chargers", to: "/shop?cat=chargers" },
  { label: "Cases", to: "/shop?cat=cases" },
  { label: "Screen protectors", to: "/shop?cat=screen-protectors" },
  { label: "Cables", to: "/shop?cat=cables" },
];

const REPAIRS = [
  { label: "All services", to: "/repairs" },
  { label: "Screen repair", to: "/repairs#screen-repair" },
  { label: "Battery replacement", to: "/repairs#battery-replacement" },
  { label: "Water damage", to: "/repairs#water-damage" },
  { label: "Device protection", to: "/protection" },
];

const POLICIES = [
  { label: "Shipping", to: "/shipping" },
  { label: "Returns and exchanges", to: "/returns" },
  { label: "Refunds", to: "/refunds" },
  { label: "Privacy", to: "/privacy" },
];

function Column({ title, links }: { title: string; links: Array<{ label: string; to: string }> }) {
  return (
    <nav aria-label={title}>
      <h2 className="mc-gl">{title}</h2>
      <ul className="mc-stack-sm" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {links.map((l) => (
          <li key={l.to}><Link className="mc-footer-link" to={l.to}>{l.label}</Link></li>
        ))}
      </ul>
    </nav>
  );
}

export default function Footer() {
  const brand = useSiteStore((s) => s.brand);
  const business = useSiteStore((s) => s.business);
  const appearance = useSiteStore((s) => s.appearance);
  const footer = useSiteStore((s) => s.footer);
  const logo = appearance?.logoType === "image" && appearance.logoUrl ? appearance.logoUrl : localLogo;
  const phone = business?.phone || BUSINESS.phone;
  const email = business?.email || BUSINESS.email;
  const hours = business?.hours?.length ? business.hours : BUSINESS.hours;

  return (
    <footer className="mc-footer mc-band mc-band--ink" id="site-footer">
      <div className="mc-page mc-section" style={{ display: "grid", gap: "var(--space-10)" }}>
        <div className="mc-footer-grid">
          <div style={{ display: "grid", gap: "var(--space-3)", alignContent: "start" }}>
            <img alt={brand?.name || "Mobicare"} className="mc-logo" src={logo} style={{ height: "1.75rem" }} />
            <p className="mc-small" style={{ maxWidth: "34ch" }}>
              Southern Illinois&apos; repair shop for iPhones, Androids, tablets and more. Quality parts and honest service.
            </p>
          </div>
          <Column links={SHOP} title="Shop" />
          <Column links={REPAIRS} title="Repairs" />
          <Column links={POLICIES} title="Policies" />
          <div>
            <h2 className="mc-gl">Visit or call</h2>
            <div className="mc-footer-hours">
              <a className="mc-footer-link" href={`tel:${phone.replace(/[^0-9+]/g, "")}`} style={{ color: "var(--foreground)", fontSize: "var(--text-lg)" }}>{phone}</a>
              <a className="mc-footer-link" href={`mailto:${email}`}>{email}</a>
              <span>{business?.city || BUSINESS.city}</span>
              {hours.map((h) => (
                <span key={h.days}>{h.days}: {h.hours}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="mc-footer-bar"><p className="mc-small">© {new Date().getFullYear()} {footer.copyrightName || brand?.name}. All rights reserved.</p><p className="mc-small">Fairfield, Illinois</p></div>
      </div>
    </footer>
  );
}
