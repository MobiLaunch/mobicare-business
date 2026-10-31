import { applyAppearance, useSiteStore } from "@/lib/siteStore";
import { originalOf } from "@/lib/textOverrides";

/**
 * Live preview for the admin's design studio. When the storefront is embedded in the POS, the POS can post
 * unsaved appearance (and hero) changes here and the page restyles instantly. Nothing is saved; a reload shows
 * the published design. Only the shop's own POS origins are listened to.
 */
const ALLOWED = [/^https:\/\/novaops-updated[a-z0-9-]*\.vercel\.app$/, /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];

let editMode = true;

export function installPreviewBridge() {
  if (typeof window === "undefined" || window.parent === window) return;
  const onMessage = (e: MessageEvent) => {
    if (!ALLOWED.some((re) => re.test(e.origin))) return;
    const d = e.data as { source?: string; mode?: string; appearance?: Record<string, unknown>; hero?: Record<string, unknown>; copy?: Record<string, string>; policies?: unknown; layout?: unknown; announcement?: unknown; meta?: unknown; menu?: unknown; pages?: unknown; textMap?: Record<string, string>; sections?: Record<string, unknown> } | null;

    if (!d || d.source !== "novaops-design") return;
    const state = useSiteStore.getState();

    if (d.copy) useSiteStore.setState({ copy: d.copy } as never);
    if (d.mode) { editMode = d.mode !== "browse"; document.documentElement.setAttribute("data-preview-mode", editMode ? "edit" : "browse"); }
    if (d.layout) useSiteStore.setState({ layout: d.layout } as never);
    if (d.meta) useSiteStore.setState({ meta: d.meta } as never);
    if (d.menu) useSiteStore.setState({ menu: d.menu } as never);
    if (d.announcement) useSiteStore.setState({ announcement: d.announcement } as never);
    if (d.pages) useSiteStore.setState({ pages: d.pages } as never);
    if (d.textMap) useSiteStore.setState({ textMap: d.textMap } as never);
    if (d.policies) useSiteStore.setState({ policies: d.policies } as never);
    if (d.sections) useSiteStore.setState(d.sections as never);
    if (d.hero) useSiteStore.setState({ hero: { ...state.hero, ...d.hero } as typeof state.hero });
    if (d.appearance) {
      const next = { ...state.appearance, ...d.appearance } as typeof state.appearance;

      useSiteStore.setState({ appearance: next });
      applyAppearance(next);
    }
  };

  window.addEventListener("message", onMessage);
  document.documentElement.setAttribute("data-preview", "1");
  // Clicking any marked text asks the POS to edit it, instead of following the link or button underneath.
  document.addEventListener("click", (e) => {
    if (!editMode) return;
    const el = (e.target as HTMLElement | null)?.closest?.("[data-edit]") as HTMLElement | null;

    if (el) {
      e.preventDefault();
      e.stopPropagation();
      window.parent.postMessage({ source: "mobicare-site", type: "edit", path: el.getAttribute("data-edit"), text: el.textContent }, "*");

      return;
    }
    // Any other text: find the exact words under the pointer and offer to replace them everywhere they appear.
    const doc = document as Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node } | null; caretRangeFromPoint?: (x: number, y: number) => Range | null };
    const node = doc.caretPositionFromPoint?.(e.clientX, e.clientY)?.offsetNode ?? doc.caretRangeFromPoint?.(e.clientX, e.clientY)?.startContainer;

    if (!node || node.nodeType !== Node.TEXT_NODE) return;
    const original = originalOf(node);

    if (!original || original.length > 400 || /^[\d\s$.,:%/+-]+$/.test(original)) return;
    e.preventDefault();
    e.stopPropagation();
    window.parent.postMessage({ source: "mobicare-site", type: "edit", path: `text:${original}`, text: node.textContent }, "*");
  }, true);
  window.parent.postMessage({ source: "mobicare-site", type: "ready" }, "*");
}
