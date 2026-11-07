import type { ReactNode } from "react";

import { Chip } from "@heroui/react";

interface AdminPageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}

export default function AdminPageHeader({
  eyebrow,
  title,
  description,
  action,
}: AdminPageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <Chip className="mb-2" color="accent" size="sm" variant="soft">
          <Chip.Label>{eyebrow}</Chip.Label>
        </Chip>
        <h2 className="m-0 text-2xl font-extrabold text-foreground">{title}</h2>
        <p className="m-0 mt-1 text-sm text-muted">{description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
