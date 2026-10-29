import type { ReactNode } from "react";

import { AuthProvider } from "@/lib/AuthContext";

// App-level context. Must render inside <BrowserRouter> (see main.tsx).
export function Provider({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
