import { Link, Navigate, useParams } from "react-router-dom";

import PageIntro from "@/components/PageIntro";
import PageMeta from "@/components/PageMeta";
import MiniMarkdown from "@/components/policy/MiniMarkdown";
import { useCopy, inPreview } from "@/lib/copy";
import { useSiteStore } from "@/lib/siteStore";

export interface PageBlock { type: "heading" | "text" | "image" | "video" | "button" | "spacer"; text?: string; size?: string; url?: string; alt?: string; caption?: string; poster?: string; label?: string; link?: string }
export interface CustomPageData { slug: string; title: string; description?: string; published?: boolean; inMenu?: boolean; blocks: PageBlock[] }

const SPACE: Record<string, string> = { s: "var(--space-4)", m: "var(--space-8)", l: "var(--space-16, 5rem)" };

/** A page built from simple blocks in the POS design studio, served at /p/<slug>. */
export default function CustomPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const pages = useSiteStore((s) => s.pages) as CustomPageData[] | undefined;
  const c = useCopy();
  const page = pages?.find((p) => p.slug === slug);

  // Nothing to show: unknown, or not published (the design preview still shows drafts).
  if (!page || (!page.published && !inPreview())) return pages === undefined ? null : <Navigate replace to="/" />;
  const p = (i: number, f: string) => c.p(`page:${slug}:b.${i}.${f}`);

  return (
    <>
      <PageMeta description={page.description || page.title} title={`${page.title} | Mobicare`} />
      <PageIntro editLead={`page:${slug}:description`} editTitle={`page:${slug}:title`} lead={page.description} title={page.title} />
      <div className="mc-page mc-pagebody">
        <div className="mc-stack" style={{ maxWidth: "46rem", gap: "var(--space-6)" }}>
          {page.blocks.map((b, i) => {
            switch (b.type) {
              case "heading": return b.size === "medium" ? <h3 key={i} className="mc-h3" {...p(i, "text")}>{b.text}</h3> : <h2 key={i} className="mc-h2" {...p(i, "text")}>{b.text}</h2>;
              case "text": return <div key={i} className="mc-prose" {...p(i, "text")}><MiniMarkdown text={b.text || ""} /></div>;
              case "image": return b.url ? <figure key={i} style={{ margin: 0 }}><img alt={b.alt || ""} loading="lazy" src={b.url} style={{ width: "100%", height: "auto", borderRadius: "var(--radius-panel)", display: "block" }} />{b.caption && <figcaption className="mc-small" style={{ marginTop: "var(--space-2)" }} {...p(i, "caption")}>{b.caption}</figcaption>}</figure> : null;
              case "video": return b.url ? <video key={i} controls playsInline poster={b.poster || undefined} preload="metadata" src={b.url} style={{ width: "100%", borderRadius: "var(--radius-panel)", display: "block" }} /> : null;
              case "button": {
                const internal = (b.link || "").startsWith("/");

                return b.label ? <div key={i}>{internal ? <Link className="mc-cta" to={b.link || "/"} {...p(i, "label")}>{b.label}</Link> : <a className="mc-cta" href={b.link || "#"} rel="noopener noreferrer" {...p(i, "label")}>{b.label}</a>}</div> : null;
              }
              case "spacer": return <div key={i} aria-hidden="true" style={{ height: SPACE[b.size || "m"] }} />;
              default: return null;
            }
          })}
        </div>
      </div>
    </>
  );
}
