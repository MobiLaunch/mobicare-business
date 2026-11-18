import type { ReactNode } from "react";

import { useEffect } from "react";

import { AuthProvider } from "@/lib/AuthContext";
import { syncShopConfig } from "@/lib/shopConfig";

// App-level context. Must render inside <BrowserRouter> (see main.tsx).
export function Provider({ children }: { children: ReactNode }) {
  useEffect(() => {
    void syncShopConfig();
  }, []);

  return <AuthProvider>{children}</AuthProvider>;
}
