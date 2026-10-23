import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Check, X } from "lucide-react";

import PageMeta from "@/components/PageMeta";
import PageIntro from "@/components/PageIntro";
import { BUSINESS } from "@/lib/config";
import { useSiteStore } from "@/lib/siteStore";

export const POLICY_UPDATED = "October 21, 2026";

const POLICIES = [
  { to: "/shipping", label: "Shipping" },
  { to: "/returns", label: "Returns and exchanges" },
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
  title: string;
  lead: string;
  metaDescription: string;
  /** The short, scannable version shown first. */
  glance?: ReactNode;
  sections: PolicySection[];
}

/** Shared layout for the policy pages so they read as one set. */
export default function PolicyShell({ path, title, lead, metaDescription, glance, sections }: PolicyShellProps) {
  const business = useSiteStore((s) => s.business);
  const phone = business?.phone || BUSINESS.phone;
  const email = business?.email || BUSINESS.email;

  return (
    <>
      <PageMeta description={metaDescription} title={`${title} | Mobicare Device Recovery`} />
      <PageIntro kicker={`Last updated ${POLICY_UPDATED}`} lead={lead} title={title} />
      <div className="mc-page mc-pagebody">

      {glance && (
        <section aria-labelledby="glance-title" className="mc-card mc-card--muted" style={{ marginBottom: "var(--space-10)" }}>
          <h2 className="mc-h3" id="glance-title" style={{ marginBottom: "var(--space-4)" }}>At a glance</h2>
          {glance}
        </section>
      )}

      <div className="mc-policy">
        <nav aria-label="On this page" className="mc-toc">
          <h2 className="mc-gl">On this page</h2>
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`}>{s.title}</a>
          ))}
        </nav>

        <article className="mc-stack" style={{ gap: "var(--space-10)", maxWidth: "46rem" }}>
          {sections.map((s) => (
            <section key={s.id} className="mc-stack-sm" id={s.id} style={{ scrollMarginTop: "5rem" }}>
              <h2 className="mc-h2" style={{ fontSize: "var(--text-2xl)" }}>{s.title}</h2>
              <div className="mc-prose">{s.body}</div>
            </section>
          ))}

          <section className="mc-card mc-card--muted mc-stack-sm">
            <h2 className="mc-h3">Questions? Talk to a person.</h2>
            <p className="mc-text">
              Call <a className="mc-link" href={`tel:${phone.replace(/[^0-9+]/g, "")}`}>{phone}</a> or email{" "}
              <a className="mc-link" href={`mailto:${email}`}>{email}</a>.
            </p>
            <p className="mc-small">
              Related:{" "}
              {POLICIES.filter((p) => p.to !== path).map((p, i, arr) => (
                <span key={p.to}><Link className="mc-link" to={p.to}>{p.label}</Link>{i < arr.length - 1 ? ", " : ""}</span>
              ))}
            </p>
          </section>
        </article>
      </div>
      </div>
    </>
  );
}

/** Yes / no list used in the "at a glance" box. */
export function Glance({ items }: { items: Array<{ ok: boolean; text: ReactNode }> }) {
  return (
    <ul className="mc-glance">
      {items.map((it, i) => (
        <li key={i}>
          {it.ok
            ? <Check aria-label="Yes" className="y" size={18} strokeWidth={2} />
            : <X aria-label="No" className="n" size={18} strokeWidth={2} />}
          <span>{it.text}</span>
        </li>
      ))}
    </ul>
  );
}
