import { useCopy } from "@/lib/copy";
import { useNavigate } from "react-router-dom";
import { Mail, MapPin, Phone, Smartphone, Shield, Star, Zap, type LucideIcon } from "lucide-react";

import { Button } from "@/components/arc/button/button";
import PageMeta from "@/components/PageMeta";
import PageIntro from "@/components/PageIntro";
import { useSiteStore } from "@/lib/siteStore";

const VALUE_PROPS: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: Shield, title: "90-day warranty", desc: "Every part we replace is covered for 90 days. If it fails, we replace it free." },
  { icon: Zap, title: "Same-day service", desc: "Most screen and battery repairs are done within one to two hours while you wait." },
  { icon: Star, title: "Honest pricing", desc: "A $35 flat bench fee for diagnostics. No hidden fees. You approve the cost before we start." },
  { icon: Smartphone, title: "All major brands", desc: "iPhones, Samsung, Google Pixel, iPads, tablets and more. We fix them all." },
];

export default function About() {
  const c = useCopy();
  const navigate = useNavigate();
  const about = useSiteStore((s) => s.about);
  const business = useSiteStore((s) => s.business);
  const repairServices = useSiteStore((s) => s.repairServices) || [];

  const contactRows: { icon: LucideIcon; label: string; val?: string; href?: string }[] = [
    { icon: Phone, label: "Phone", val: business?.phone, href: business?.phone ? `tel:${business.phone.replace(/[^0-9+]/g, "")}` : undefined },
    { icon: Mail, label: "Email", val: business?.email, href: business?.email ? `mailto:${business.email}` : undefined },
    { icon: MapPin, label: "Location", val: business?.city },
  ];

  return (
    <>
      <PageMeta
        description="Learn more about Mobicare, southern Illinois' trusted repair shop for iPhones, Androids, and laptops. Fast turnarounds, 90-day warranty, honest pricing."
        title="About Mobicare: local device repair in Fairfield, Illinois"
      />

      <PageIntro editKicker="about.eyebrow" editLead="about.lead" editTitle="about.headline" kicker={about?.eyebrow || "About Mobicare"} lead={about?.lead} title={about?.headline} />
      <div className="mc-page mc-pagebody">

      <section aria-label="Why customers choose us" className="mc-section" style={{ paddingTop: 0 }}>
        <div className="mc-grid mc-grid-cards">
          {VALUE_PROPS.map((v, i) => (
            <div key={v.title} className="mc-stack-sm" style={{ padding: "var(--space-5)", borderTop: "1px solid var(--border)" }}>
              <span className="mc-icon"><v.icon aria-hidden="true" size={20} strokeWidth={1.75} /></span>
              <h2 className="mc-h3" style={{ fontSize: "var(--text-lg)" }} {...c.p(`about.vp.${i + 1}.title`)}>{c(`about.vp.${i + 1}.title`)}</h2>
              <p className="mc-text" {...c.p(`about.vp.${i + 1}.desc`)}>{c(`about.vp.${i + 1}.desc`)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mc-section mc-grid mc-grid-2" style={{ paddingTop: 0, gap: "clamp(24px, 5vw, 64px)", alignItems: "start" }}>
        <div className="mc-stack">
          <h2 className="mc-h2" {...c.p("about.story.title")}>{c("about.story.title")}</h2>
          {(about?.story || []).map((para, i) => <p key={i} className="mc-text" style={{ fontSize: "var(--text-lg)", lineHeight: 1.65 }} {...c.p(`about.story.${i}`)}>{para}</p>)}
          <div className="mc-stats">
            {[1, 2, 3].map((n) => <div key={n} className="mc-stat"><strong {...c.p(`about.stat.${n}.value`)}>{c(`about.stat.${n}.value`)}</strong><span {...c.p(`about.stat.${n}.label`)}>{c(`about.stat.${n}.label`)}</span></div>)}
          </div>
          <div className="mc-actions">
            <Button onClick={() => navigate("/shop")}>Shop accessories</Button>
            <Button variant="secondary" onClick={() => navigate("/repairs")}>View repair services</Button>
          </div>
        </div>

        <div className="mc-stack-sm">
          <h2 className="mc-gl">Find us</h2>
          <div className="mc-group">
            {contactRows.map((row) => {
              const Tag = row.href ? "a" : "div";

              return (
                <Tag key={row.label} className="mc-item" href={row.href} rel={row.href ? "noopener noreferrer" : undefined}>
                  <row.icon aria-hidden="true" size={18} strokeWidth={1.75} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
                  <span style={{ minWidth: 0 }}>
                    <small className="mc-small" style={{ display: "block" }}>{row.label}</small>
                    <span className="mc-strong" style={{ overflowWrap: "anywhere" }}>{row.val || "Available"}</span>
                  </span>
                </Tag>
              );
            })}
            <div className="mc-item" style={{ alignItems: "start" }}>
              <span className="mc-small" style={{ minWidth: "3.5rem" }}>Hours</span>
              <span className="mc-footer-hours">
                {(business?.hours || []).map((h) => <span key={h.days}><span className="mc-strong">{h.days}:</span> {h.hours}</span>)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {repairServices.length > 0 && (
        <section aria-labelledby="popular-title" className="mc-section" style={{ paddingTop: 0 }}>
          <div className="mc-section-head mc-section-head--row">
            <h2 className="mc-h2" id="popular-title" {...c.p("about.popular.title")}>{c("about.popular.title")}</h2>
            <Button variant="secondary" onClick={() => navigate("/repairs")}>View all services</Button>
          </div>
          <div className="mc-group">
            {repairServices.map((svc) => (
              <button key={svc.id} className="mc-item mc-item--between" style={{ width: "100%", textAlign: "left", cursor: "pointer", background: "none", border: 0, font: "inherit" }} type="button" onClick={() => navigate("/repairs")}>
                <span className="mc-strong">{svc.name}</span>
                <span className="mc-small">{svc.priceRange}</span>
              </button>
            ))}
          </div>
        </section>
      )}
      </div>
    </>
  );
}
