import { useCopy } from "@/lib/copy";
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

function Column({ title, links, copyKey }: { title: string; links: Array<{ label: string; to: string }>; copyKey?: string }) {
  const c = useCopy();

  return (
    <nav aria-label={title}>
      <h2 className="mc-gl" {...(copyKey ? c.p(copyKey) : {})}>{title}</h2>
      <ul className="mc-stack-sm" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {links.map((l) => (
          <li key={l.to}><Link className="mc-footer-link" to={l.to}>{l.label}</Link></li>
        ))}
      </ul>
    </nav>
  );
}

export default function Footer() {
  const c = useCopy();
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
            <p className="mc-small" style={{ maxWidth: "34ch" }} {...c.p("footer.tagline")}>{c("footer.tagline")}</p>
          </div>
          <Column copyKey="footer.shop" links={SHOP} title={c("footer.shop")} />
          <Column copyKey="footer.repairs" links={REPAIRS} title={c("footer.repairs")} />
          <Column copyKey="footer.policies" links={POLICIES} title={c("footer.policies")} />
          <div>
            <h2 className="mc-gl" {...c.p("footer.visit")}>{c("footer.visit")}</h2>
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
        <div className="mc-footer-bar"><p className="mc-small">© {new Date().getFullYear()} <span {...c.p("footer.copyrightName")}>{footer.copyrightName || brand?.name}</span>. <span {...c.p("footer.rights")}>{c("footer.rights")}</span></p><p className="mc-small" {...c.p("footer.place")}>{c("footer.place")}</p></div>
      </div>
    </footer>
  );
}
