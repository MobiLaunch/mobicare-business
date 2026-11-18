import type { ReactNode } from "react";

import { useSiteStore } from "@/lib/siteStore";

/** A page section the admin can hide or move from the design studio. Shows in its normal place by default. */
export default function PageBlock({ page, id, children }: { page: string; id: string; children: ReactNode }) {
  const cfg = useSiteStore((s) => s.layout)?.pages?.[page];

  if (cfg?.hidden?.includes(id)) return null;
  const pos = cfg?.order?.indexOf(id) ?? -1;

  // With a saved order, sections sit in a flex column and take their place by `order`; without one nothing changes.
  return cfg?.order?.length ? <div className="mc-pb" style={{ order: pos < 0 ? 99 : pos }}>{children}</div> : <>{children}</>;
}
