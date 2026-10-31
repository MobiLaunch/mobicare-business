import type { ReactNode } from "react";

import { useSiteStore } from "@/lib/siteStore";

/** A page section the admin can hide from the design studio. Shows by default. */
export default function PageBlock({ page, id, children }: { page: string; id: string; children: ReactNode }) {
  const hidden = useSiteStore((s) => s.layout)?.pages?.[page]?.hidden;

  return hidden?.includes(id) ? null : <>{children}</>;
}
