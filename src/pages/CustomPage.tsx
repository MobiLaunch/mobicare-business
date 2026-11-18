import type { ReactNode } from "react";

import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowRight, ExternalLink, FileQuestion } from "lucide-react";
import { Button, Link, buttonVariants } from "@heroui/react";

import { useSiteStore } from "@/lib/siteStore";
import { useAdminStore } from "@/lib/store";
import PageMeta from "@/components/PageMeta";

/**
 * Safely parses lightweight inline markdown (**bold** and [label](href))
 * from NovaOps PagesEditor text blocks into React nodes with zero HTML injection.
 */
function renderInlineFormatted(text: string): ReactNode[] {
  const tokens: ReactNode[] = [];
  const regex = /(\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(text.slice(lastIndex, match.index));
    }
    if (match[2] !== undefined) {
      tokens.push(
        <strong key={`b-${keyIdx++}`} className="font-bold text-foreground">
          {match[2]}
        </strong>,
      );
    } else if (match[3] !== undefined && match[4] !== undefined) {
      const href = match[4].trim();
      const isExternal = /^https?:\/\//i.test(href);
      tokens.push(
        <Link
          key={`l-${keyIdx++}`}
          className="font-semibold text-accent underline underline-offset-2 hover:opacity-85"
          href={href}
          target={isExternal ? "_blank" : undefined}
        >
          {match[3]}
        </Link>,
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push(text.slice(lastIndex));
  }

  return tokens;
}

function renderTextBlock(raw: string, dataEdit?: string) {
  const chunks = raw.split(/\n\s*\n/).filter((c) => c.trim().length > 0);

  return (
    <div className="flex flex-col gap-4" data-edit={dataEdit}>
      {chunks.map((chunk, i) => {
        const lines = chunk.split("\n");
        const isList = lines.every((l) => /^\s*[-*]\s+/.test(l));
        if (isList) {
          return (
            <ul
              key={i}
              className="m-0 flex list-disc flex-col gap-2 pl-5 text-base leading-relaxed text-muted"
            >
              {lines.map((line, li) => (
                <li key={li}>
                  {renderInlineFormatted(line.replace(/^\s*[-*]\s+/, ""))}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p
            key={i}
            className="m-0 whitespace-pre-line text-base leading-relaxed text-muted"
          >
            {renderInlineFormatted(chunk)}
          </p>
        );
      })}
    </div>
  );
}

export default function CustomPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pages = useSiteStore((s) => s.pages) || [];
  const isPreview = useSiteStore((s) => s.isPreview);
  const isAdmin = useAdminStore((s) => s.isAuthenticated);

  const canSeeDraft =
    isPreview || searchParams.get("preview") === "1" || isAdmin;
  const page = pages.find(
    (p) => p.slug === slug && (p.published || canSeeDraft),
  );

  if (!page) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
        <PageMeta
          description="The requested page could not be found."
          title="Page Not Found | Mobicare"
        />
        <span className="mb-4 flex size-16 items-center justify-center rounded-full bg-surface-secondary text-accent">
          <FileQuestion className="size-8" />
        </span>
        <h1 className="m-0 mb-2 text-2xl font-extrabold text-foreground">
          Page Not Found
        </h1>
        <p className="m-0 mb-6 text-sm text-muted">
          This page doesn&rsquo;t exist or hasn&rsquo;t been published yet.
        </p>
        <Button variant="primary" onPress={() => navigate("/")}>
          <span>Back to Home</span>
          <ArrowRight className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-[clamp(16px,4vw,32px)] py-10 pb-20">
      <PageMeta
        description={page.description || `${page.title} — Mobicare Device Recovery`}
        title={`${page.title} — Mobicare`}
      />

      {!page.published && (
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-warning/40 bg-warning/15 px-3.5 py-1 text-xs font-bold text-warning">
          Draft Preview — Not yet published to visitors
        </div>
      )}

      <header className="mb-8 border-b border-border pb-6">
        <h1
          className="type-display m-0 text-display text-foreground"
          data-edit={`page:${page.slug}:title`}
        >
          {page.title}
        </h1>
        {page.description && (
          <p
            className="m-0 mt-3 max-w-2xl text-body-lg leading-relaxed text-muted"
            data-edit={`page:${page.slug}:description`}
          >
            {page.description}
          </p>
        )}
      </header>

      <div className="flex flex-col gap-6">
        {(page.blocks || []).map((block, idx) => {
          if (block.type === "heading") {
            const isMedium = block.size === "medium";
            return isMedium ? (
              <h3
                key={idx}
                className="m-0 pt-2 text-heading font-bold text-foreground"
                data-edit={`page:${page.slug}:b.${idx}.text`}
              >
                {block.text}
              </h3>
            ) : (
              <h2
                key={idx}
                className="m-0 pt-3 text-heading-lg font-extrabold text-foreground"
                data-edit={`page:${page.slug}:b.${idx}.text`}
              >
                {block.text}
              </h2>
            );
          }

          if (block.type === "text") {
            return (
              <div key={idx}>
                {renderTextBlock(
                  String(block.text || ""),
                  `page:${page.slug}:b.${idx}.text`,
                )}
              </div>
            );
          }

          if (block.type === "image" && block.url) {
            return (
              <figure
                key={idx}
                className="surface-raised m-0 overflow-hidden rounded-panel"
              >
                <img
                  alt={String(block.alt || page.title)}
                  className="max-h-[540px] w-full object-cover"
                  loading="lazy"
                  src={String(block.url)}
                />
                {block.caption && (
                  <figcaption className="border-t border-border bg-surface px-4 py-3 text-xs text-muted">
                    {String(block.caption)}
                  </figcaption>
                )}
              </figure>
            );
          }

          if (block.type === "video" && block.url) {
            return (
              <div
                key={idx}
                className="surface-raised overflow-hidden rounded-panel"
              >
                <video
                  controls
                  playsInline
                  className="max-h-[540px] w-full bg-black"
                  poster={block.poster ? String(block.poster) : undefined}
                  src={String(block.url)}
                />
              </div>
            );
          }

          if (block.type === "button" && block.label) {
            const href = String(block.link || "/");
            const isExternal = /^https?:\/\//i.test(href);
            return (
              <div key={idx} className="pt-1">
                {isExternal ? (
                  <a
                    className={`${buttonVariants({ variant: "primary", size: "lg" })} inline-flex items-center gap-2 no-underline`}
                    data-edit={`page:${page.slug}:b.${idx}.label`}
                    href={href}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <span>{String(block.label)}</span>
                    <ExternalLink className="size-4" />
                  </a>
                ) : (
                  <Button
                    size="lg"
                    variant="primary"
                    onPress={() => navigate(href)}
                  >
                    <span data-edit={`page:${page.slug}:b.${idx}.label`}>
                      {String(block.label)}
                    </span>
                    <ArrowRight className="size-4" />
                  </Button>
                )}
              </div>
            );
          }

          if (block.type === "spacer") {
            const h =
              block.size === "l"
                ? "h-12"
                : block.size === "s"
                  ? "h-3"
                  : "h-7";
            return <div key={idx} aria-hidden="true" className={h} />;
          }

          return null;
        })}
      </div>
    </div>
  );
}
