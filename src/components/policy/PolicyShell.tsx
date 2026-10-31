import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Check, X } from "lucide-react";

import PageMeta from "@/components/PageMeta";
import PageIntro from "@/components/PageIntro";
import { BUSINESS } from "@/lib/config";
import { useEffect, useRef } from "react";

import { useCopy, inPreview } from "@/lib/copy";
import { useSiteStore } from "@/lib/siteStore";
import MiniMarkdown, { elementToMarkdown } from "@/components/policy/MiniMarkdown";

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
export default function PolicyShell({ path, title: defaultTitle, lead: defaultLead, metaDescription, glance, sections }: PolicyShellProps) {
  const c = useCopy();
  const override = useSiteStore((s) => s.policies)?.[path];
  const title = override?.title || defaultTitle;
  const lead = override?.lead || defaultLead;
  const articleRef = useRef<HTMLElement>(null);
  const shown: PolicySection[] = override?.sections ? override.sections.map((s, i) => ({ id: `s${i + 1}`, title: s.title, body: <MiniMarkdown text={s.body} /> })) : sections;
  const business = useSiteStore((s) => s.business);

  // In the design studio, tell the POS what this page says now, so the first edit starts from the real text.
  useEffect(() => {
    if (!inPreview() || !articleRef.current) return;
    const secs = Array.from(articleRef.current.querySelectorAll(":scope > section[id]")).map((el) => ({ title: el.querySelector("h2")?.textContent || "", body: elementToMarkdown(el.querySelector(".mc-prose") || el) }));

    window.parent.postMessage({ source: "mobicare-site", type: "policy-outline", path, outline: { title: defaultTitle, lead: defaultLead, sections: override?.sections ? undefined : secs } }, "*");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);
  const phone = business?.phone || BUSINESS.phone;
  const email = business?.email || BUSINESS.email;

  return (
    <>
      <PageMeta description={metaDescription} title={`${title} | Mobicare Device Recovery`} />
      <PageIntro editLead={`policy:${path}:lead`} editTitle={`policy:${path}:title`} kicker={`Last updated ${POLICY_UPDATED}`} lead={lead} title={title} />
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
          {shown.map((s) => (
            <a key={s.id} href={`#${s.id}`}>{s.title}</a>
          ))}
        </nav>

        <article ref={articleRef} className="mc-stack" style={{ gap: "var(--space-10)", maxWidth: "46rem" }}>
          {shown.map((s, i) => (
            <section key={s.id} className="mc-stack-sm" id={s.id} style={{ scrollMarginTop: "5rem" }}>
              <h2 className="mc-h2" style={{ fontSize: "var(--text-2xl)" }} {...c.p(`policy:${path}:s.${i}.title`)}>{s.title}</h2>
              <div className="mc-prose" {...c.p(`policy:${path}:s.${i}.body`)}>{s.body}</div>
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
