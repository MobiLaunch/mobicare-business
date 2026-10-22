import { useLayoutEffect } from "react";

import { applyAppearance, getEffectiveColorScheme, useSiteStore } from "@/lib/siteStore";

/**
 * The public site uses Arc's design tokens. Admin screens call this to switch
 * <html> into `.admin-mode` (restoring the HeroUI tokens in globals.css) and to
 * drop Arc's accent preset while mounted.
 */
export function useAdminTheme() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const accent = root.getAttribute("data-accent");
    const wasAdmin = root.classList.contains("admin-mode");

    root.classList.add("admin-mode");
    root.removeAttribute("data-accent");

    const state = useSiteStore.getState();

    if (state.appearance) {
      applyAppearance({ ...state.appearance, colorScheme: getEffectiveColorScheme(state) });
    }

    return () => {
      if (wasAdmin) return;
      root.classList.remove("admin-mode");
      if (accent) root.setAttribute("data-accent", accent);
    };
  }, []);
}
