import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface AdminSettingsCardProps {
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  statusChip?: ReactNode;
  children: ReactNode;
}

export default function AdminSettingsCard({
  icon: Icon,
  title,
  description,
  statusChip,
  children,
}: AdminSettingsCardProps) {
  return (
    <div className="mb-7 rounded-[28px] bg-surface-secondary p-8 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <span className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Icon className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="m-0 mb-1 text-[1.3rem] font-extrabold text-foreground">
            {title}
          </h3>
          <p className="m-0 text-sm text-muted">{description}</p>
        </div>
        {statusChip}
      </div>
      {children}
    </div>
  );
}

export function SettingsStepItem({
  number,
  title,
  description,
  children,
}: {
  number: number;
  title: string;
  description: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mb-7 flex gap-4 last:mb-0">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-extrabold text-accent">
        {number}
      </span>
      <div className="min-w-0 flex-1">
        <h4 className="m-0 mb-1.5 text-[15px] font-extrabold text-foreground">
          {title}
        </h4>
        <p className="m-0 mb-3 text-sm text-muted">{description}</p>
        {children}
      </div>
    </div>
  );
}
