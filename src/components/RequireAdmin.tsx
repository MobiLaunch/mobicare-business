import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Spinner } from "@heroui/react";

import { useAdminStore } from "@/lib/store";
import { checkIsAdmin, isSupabaseConfigured } from "@/lib/supabase";

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const isAuthenticated = useAdminStore((s) => s.isAuthenticated);
  const restoreSession = useAdminStore((s) => s.restoreSession);
  const [checking, setChecking] = useState(true);
  const [verifiedAdmin, setVerifiedAdmin] = useState(false);

  useEffect(() => {
    let active = true;

    const check = async () => {
      try {
        await restoreSession();
        const stateAfterRestore = useAdminStore.getState();
        if (!stateAfterRestore.isAuthenticated) {
          if (active) setVerifiedAdmin(false);
          return;
        }
        if (isSupabaseConfigured()) {
          const allowed = await checkIsAdmin();
          if (!allowed) {
            useAdminStore.setState({ isAuthenticated: false, user: null });
          }
          if (active) setVerifiedAdmin(allowed);
        } else {
          if (active) setVerifiedAdmin(true);
        }
      } finally {
        if (active) setChecking(false);
      }
    };

    void check();

    return () => {
      active = false;
    };
  }, [restoreSession]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated || !verifiedAdmin) {
    return <Navigate replace to="/admin/login" />;
  }

  return <>{children}</>;
}
