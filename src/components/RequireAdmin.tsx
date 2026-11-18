import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { useAdminStore } from "@/lib/store";

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const isAuthenticated = useAdminStore((s) => s.isAuthenticated);
  const restoreSession = useAdminStore((s) => s.restoreSession);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    const check = async () => {
      try {
        await restoreSession();
      } finally {
        if (active) setChecking(false);
      }
    };

    void check();

    return () => {
      active = false;
    };
  }, [restoreSession]);

  // While checking session, show nothing (avoids flash-redirect)
  if (checking) return null;

  if (!isAuthenticated) return <Navigate replace to="/admin/login" />;

  return <>{children}</>;
}
