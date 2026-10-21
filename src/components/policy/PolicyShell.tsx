import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Mail, MapPin, Phone, type LucideIcon } from "lucide-react";

import PageMeta from "@/components/PageMeta";
import HeroBadge from "@/components/ios/HeroBadge";
import Reveal from "@/components/ios/Reveal";
import type { IconColor } from "@/components/ios/AppIcon";
import { BUSINESS } from "@/lib/config";
import { useSiteStore } from "@/lib/siteStore";

export const POLICY_UPDATED = "October 21, 2026";

const POLICIES = [
  { to: "/shipping", label: "Shipping" },
  { to: "/returns", label: "Returns & Exchanges" },
  { to: "/refunds", label: "Refunds" },
  { to: "/privacy", label: "Privacy" },
];

export interface PolicySection {
  id: string;
  title: string;
  body: ReactNode;
}

interface PolicyShellProps {
  path: string;
  icon: LucideIcon;
  color: IconColor;
  eyebrow: string;
  title: string;
  lead: string;
  metaDescription: string;
  /** The short, scannable version shown first. */
  glance?: ReactNode;
  sections: PolicySection[];
}

/** Shared layout for the legal/policy pages so they read as one set. */
export default function PolicyShell({ path, icon, color, eyebrow, title, lead, metaDescription, glance, sections }: PolicyShellProps) {
  const business = useSiteStore((s) => s.business);
  const phone = business?.phone || BUSINESS.phone;
  const email = business?.email || BUSINESS.email;
  const city = business?.city || BUSINESS.city;

  return (
    <div className="mx-auto max-w-[1100px] px-[clamp(12px,3vw,24px)] pb-16">
      <PageMeta description={metaDescription} title={`${title} | Mobicare Device Recovery`} />

      <header className="pb-8 pt-[clamp(24px,5vw,48px)] text-center">
        <HeroBadge color={color} icon={icon} label={eyebrow} />
        <h1 className="type-display m-0 mb-3 text-display text-foreground">{title}</h1>
        <p className="mx-auto mb-3 max-w-[60ch] text-body-lg leading-relaxed text-muted">{lead}</p>
        <p className="m-0 text-xs font-bold text-[var(--ios-slate)]">Last updated {POLICY_UPDATED}</p>
      </header>

      {glance && (
        <Reveal className="mb-8">
          <div className="ios-leather rounded-panel">
            <div className="relative p-[clamp(20px,4vw,32px)]">
              <h2 className="m-0 mb-3 text-lg font-extrabold">At a glance</h2>
              {glance}
            </div>
          </div>
        </Reveal>
      )}

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <nav aria-label="On this page" className="lg:sticky lg:top-16 lg:self-start">
          <h2 className="ios-group-title">On this page</h2>
          <div className="ios-group">
            {sections.map((s, i) => (
              <a key={s.id} className="ios-row ios-chevron !min-h-11 text-sm" href={`#${s.id}`}>
                <span className="font-extrabold text-[var(--ios-blue)]">{i + 1}.</span>
                <span className="min-w-0">{s.title}</span>
              </a>
            ))}
          </div>
        </nav>

        <article className="min-w-0">
          {sections.map((s, i) => (
            <Reveal key={s.id} className="mb-4" id={s.id}>
              <section className="ios-card-gloss surface-raised scroll-mt-20 rounded-panel p-[clamp(18px,3vw,28px)]">
                <h2 className="m-0 mb-3 flex items-center gap-3 text-xl font-extrabold text-[var(--ios-ink)]">
                  <span className="ios-badge !border-0 !text-sm">{i + 1}</span>
                  <span>{s.title}</span>
                </h2>
                <div className="policy-prose">{s.body}</div>
              </section>
            </Reveal>
          ))}

          <Reveal>
            <section className="mb-4">
              <h2 className="ios-group-title">Questions? Talk to a person.</h2>
              <div className="ios-group">
                <a className="ios-row" href={`tel:${phone.replace(/[^0-9+]/g, "")}`}><Phone aria-hidden="true" className="size-4 text-[var(--ios-green-dark)]" />{phone}</a>
                <a className="ios-row" href={`mailto:${email}`}><Mail aria-hidden="true" className="size-4 text-[var(--ios-blue)]" /><span className="min-w-0 truncate">{email}</span></a>
                <div className="ios-row"><MapPin aria-hidden="true" className="size-4 text-[var(--ios-red)]" />{city}</div>
              </div>
            </section>

            <section>
              <h2 className="ios-group-title">Our policies</h2>
              <div className="ios-group">
                {POLICIES.filter((p) => p.to !== path).map((p) => (
                  <Link key={p.to} className="ios-row ios-chevron" to={p.to}>{p.label}</Link>
                ))}
              </div>
            </section>
          </Reveal>
        </article>
      </div>
    </div>
  );
}

/** ✓ / ✗ list used in the "at a glance" box. */
export function Glance({ items }: { items: Array<{ ok: boolean; text: ReactNode }> }) {
  return (
    <ul className="m-0 grid list-none gap-2 p-0">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-3 text-[15px] leading-snug">
          <span aria-hidden="true" className={`mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-sm font-black text-white ${it.ok ? "bg-[var(--ios-green)]" : "bg-[var(--ios-red)]"}`} style={{ textShadow: "0 -1px 0 rgba(0,0,0,.4)" }}>
            {it.ok ? "✓" : "✕"}
          </span>
          <span><span className="sr-only">{it.ok ? "Yes: " : "No: "}</span>{it.text}</span>
        </li>
      ))}
    </ul>
  );
}
