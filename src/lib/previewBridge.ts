import { applyAppearance, useSiteStore } from "@/lib/siteStore";

/**
 * Live preview for the admin's design studio. When the storefront is embedded in the POS, the POS can post
 * unsaved appearance (and hero) changes here and the page restyles instantly. Nothing is saved; a reload shows
 * the published design. Only the shop's own POS origins are listened to.
 */
const ALLOWED = [/^https:\/\/novaops-updated[a-z0-9-]*\.vercel\.app$/, /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];

export function installPreviewBridge() {
  if (typeof window === "undefined" || window.parent === window) return;
  const onMessage = (e: MessageEvent) => {
    if (!ALLOWED.some((re) => re.test(e.origin))) return;
    const d = e.data as { source?: string; appearance?: Record<string, unknown>; hero?: Record<string, unknown> } | null;

    if (!d || d.source !== "novaops-design") return;
    const state = useSiteStore.getState();

    if (d.hero) useSiteStore.setState({ hero: { ...state.hero, ...d.hero } as typeof state.hero });
    if (d.appearance) {
      const next = { ...state.appearance, ...d.appearance } as typeof state.appearance;

      useSiteStore.setState({ appearance: next });
      applyAppearance(next);
    }
  };

  window.addEventListener("message", onMessage);
  window.parent.postMessage({ source: "mobicare-site", type: "ready" }, "*");
}
