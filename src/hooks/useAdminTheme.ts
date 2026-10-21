import { useEffect } from "react";

import { applyAppearance, getEffectiveColorScheme, useSiteStore } from "@/lib/siteStore";

/**
 * The iOS 6 skin is public-site only. Admin screens call this to drop the
 * `ios6` class from <html> (restoring the original tokens) while mounted.
 */
export function useAdminTheme() {
  useEffect(() => {
    const root = document.documentElement;
    const wasIos = root.classList.contains("ios6");

    root.classList.remove("ios6");

    const state = useSiteStore.getState();

    if (state.appearance) {
      applyAppearance({ ...state.appearance, colorScheme: getEffectiveColorScheme(state) });
    }

    return () => {
      if (!wasIos) return;
      root.classList.add("ios6");

      const { appearance } = useSiteStore.getState();

      // applyAppearance pins the scheme to light while `ios6` is present.
      if (appearance) applyAppearance(appearance);
    };
  }, []);
}
