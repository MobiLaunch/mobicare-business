import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/** Inline: **bold** and [text](link). Everything else is plain text, so edited policy text can never inject markup. */
function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;

  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<strong key={`${keyBase}-${i++}`}>{m[1]}</strong>);
    else {
      const href = m[3];
      const safe = /^(https?:\/\/|\/|mailto:|tel:|#)/i.test(href);

      if (!safe) out.push(m[2]);
      else if (href.startsWith("/")) out.push(<Link key={`${keyBase}-${i++}`} className="mc-link" to={href}>{m[2]}</Link>);
      else out.push(<a key={`${keyBase}-${i++}`} className="mc-link" href={href}>{m[2]}</a>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));

  return out;
}

/** Paragraphs separated by blank lines; lines starting with "- " become a bullet list. */
export default function MiniMarkdown({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);

  return (
    <>
      {blocks.map((b, bi) => {
        const lines = b.split("\n");

        if (lines.every((l) => /^\s*[-•]\s+/.test(l))) {
          return <ul key={bi}>{lines.map((l, li) => <li key={li}>{inline(l.replace(/^\s*[-•]\s+/, ""), `${bi}-${li}`)}</li>)}</ul>;
        }

        return <p key={bi}>{inline(lines.join(" "), String(bi))}</p>;
      })}
    </>
  );
}

/** The reverse, for seeding the editor from what a page shows now. */
export function elementToMarkdown(root: Element): string {
  const inlineMd = (n: ChildNode): string => {
    if (n.nodeType === Node.TEXT_NODE) return n.textContent ?? "";
    if (!(n instanceof HTMLElement)) return "";
    const inner = Array.from(n.childNodes).map(inlineMd).join("");

    if (n.tagName === "STRONG" || n.tagName === "B") return `**${inner}**`;
    if (n.tagName === "A") { const href = n.getAttribute("href") || ""; return href ? `[${inner}](${href})` : inner; }

    return inner;
  };
  const parts: string[] = [];

  Array.from(root.children).forEach((c) => {
    if (c.tagName === "UL" || c.tagName === "OL") parts.push(Array.from(c.children).map((li) => `- ${Array.from(li.childNodes).map(inlineMd).join("").replace(/\s+/g, " ").trim()}`).join("\n"));
    else parts.push(Array.from(c.childNodes).map(inlineMd).join("").replace(/\s+/g, " ").trim());
  });

  return parts.filter(Boolean).join("\n\n");
}
