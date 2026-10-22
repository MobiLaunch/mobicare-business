import { useEffect } from "react";

import { ToastStack, ToastStackProvider, useToastStack } from "@/components/arc/toast-stack/toast-stack";
import { registerToastApi } from "@/lib/store";

function Bridge() {
  const { toast, update, dismiss } = useToastStack();

  useEffect(() => {
    registerToastApi({ toast, update, dismiss });

    return () => registerToastApi(null);
  }, [toast, update, dismiss]);

  return null;
}

/** Mounts Arc's toast stack once and connects it to useToastStore. */
export default function ToastBridge({ children }: { children: React.ReactNode }) {
  return (
    <ToastStackProvider>
      {children}
      <Bridge />
      <ToastStack position="bottom-center" />
    </ToastStackProvider>
  );
}
