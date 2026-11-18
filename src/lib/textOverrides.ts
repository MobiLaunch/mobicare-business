import { useSiteStore } from "@/lib/siteStore";

/**
 * Wording overrides for any text on the site, matched by the exact original string. The admin picks a piece of text in the
 * POS design preview, types a replacement, and it is saved as `textMap` in the site content. This runs after React renders,
 * so every static string (form labels, buttons, cart and checkout wording, messages) is editable without touching each page.
 */
const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "NOSCRIPT", "SELECT", "OPTION", "CODE"]);
const ATTRS = ["placeholder", "aria-label", "title"] as const;

/** What a node said before we replaced it, so the editor can show the original and a removed override restores it. */
const originals = new WeakMap<Node, string>();
const applied = new WeakMap<Node, string>();
const attrOriginals = new WeakMap<Element, Record<string, string>>();

let map: Record<string, string> = {};

function applyText(node: Text) {
  const cur = node.data;
  const prev = applied.get(node);

  if (prev !== undefined && prev === cur) {
    // Already shows our replacement; re-check in case the map changed.
    const orig = originals.get(node)!;

    return setText(node, orig);
  }
  originals.set(node, cur);
  setText(node, cur);
}

function setText(node: Text, orig: string) {
  const trimmed = orig.trim();
  const rep = trimmed ? map[trimmed] : undefined;
  const next = rep !== undefined && rep !== "" ? orig.replace(trimmed, rep) : orig;

  if (node.data !== next) node.data = next;
  if (next !== orig) applied.set(node, next); else applied.delete(node);
}

function applyAttrs(el: Element) {
  const store = attrOriginals.get(el) ?? {};

  for (const a of ATTRS) {
    const v = el.getAttribute(a);

    if (v == null) continue;
    const cur = store[a] !== undefined && el.getAttribute(`data-mc-${a}`) === v ? store[a] : v;

    store[a] = cur;
    const rep = map[cur.trim()];

    if (rep !== undefined && rep !== "") { el.setAttribute(a, rep); el.setAttribute(`data-mc-${a}`, rep); } else if (el.hasAttribute(`data-mc-${a}`)) { el.setAttribute(a, cur); el.removeAttribute(`data-mc-${a}`); }
  }
  attrOriginals.set(el, store);
}

function walk(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) {
    const p = (root as Text).parentElement;

    if (p && !SKIP.has(p.tagName)) applyText(root as Text);

    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const el = root as Element;

  if (SKIP.has(el.tagName)) return;
  applyAttrs(el);
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n: Node | null = w.nextNode();

  while (n) {
    if (n.nodeType === Node.TEXT_NODE) { const p = (n as Text).parentElement; if (p && !SKIP.has(p.tagName)) applyText(n as Text); } else applyAttrs(n as Element);
    n = w.nextNode();
  }
}

/** The text that was on the page before any override, for a text node. */
export function originalOf(node: Node): string {
  return (originals.get(node) ?? node.textContent ?? "").trim();
}

export function installTextOverrides() {
  if (typeof window === "undefined" || (window as unknown as { __mcText?: boolean }).__mcText) return;
  (window as unknown as { __mcText?: boolean }).__mcText = true;
  let scheduled = false;
  const pending = new Set<Node>();
  const flush = () => {
    scheduled = false;
    if (!Object.keys(map).length && !document.documentElement.hasAttribute("data-preview") && !hasApplied) { pending.clear(); return; }
    observer.disconnect();
    pending.forEach((n) => { if (n.isConnected) walk(n); });
    pending.clear();
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  };
  const queue = (n: Node) => { pending.add(n); if (!scheduled) { scheduled = true; requestAnimationFrame(flush); } };
  let hasApplied = false;
  const observer = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === "characterData") queue(m.target);
      else m.addedNodes.forEach((n) => queue(n));
    }
  });

  const set = (next: Record<string, string> | undefined) => {
    map = { ...(next || {}) };
    hasApplied = hasApplied || Object.keys(map).length > 0;
    queue(document.body);
  };

  set(useSiteStore.getState().textMap);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  useSiteStore.subscribe((s, prev) => { if (s.textMap !== prev.textMap) set(s.textMap); });
}
