import type { ReactNode } from "react";

import { useHref, useNavigate } from "react-router-dom";
import { RouterProvider } from "react-aria-components";

import { AuthProvider } from "@/lib/AuthContext";

// HeroUI v3 needs no provider (see HEROUI_V3_MIGRATION.md) — this file's job
// is app-level context instead.
//
// RouterProvider (from react-aria-components, which HeroUI's Link/Menu/Tabs/
// etc. are built on) hands React Router's navigate() to every React-Aria-based
// link in the app, so <Link href="/shop"> does a real client-side route change
// instead of a full page reload — without every individual component needing
// to know about React Router. Must render inside <BrowserRouter> (see main.tsx).
export function Provider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  return (
    <RouterProvider navigate={navigate} useHref={useHref}>
      <AuthProvider>{children}</AuthProvider>
    </RouterProvider>
  );
}
