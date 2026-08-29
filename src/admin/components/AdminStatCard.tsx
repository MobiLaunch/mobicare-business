import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { useNavigate } from "react-router-dom";

interface AdminStatCardProps {
  icon: LucideIcon;
  path: string;
  children: ReactNode;
  className?: string;
  iconClassName?: string;
}

export default function AdminStatCard({
  icon: Icon,
  path,
  children,
  className = "",
  iconClassName = "mb-4",
}: AdminStatCardProps) {
  const navigate = useNavigate();

  return (
    <button
      className={`group w-full rounded-[22px] border border-border bg-surface p-5 text-left shadow-sm outline-none transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 ${className}`}
      type="button"
      onClick={() => navigate(path)}
    >
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground ${iconClassName}`}
      >
        <Icon className="size-[18px]" />
      </span>
      {children}
    </button>
  );
}
