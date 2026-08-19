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

// A real <button>, not a clickable <div> — the original used
// `<div onClick={...}>` for every card here with no keyboard support (same
// class of bug fixed on ProductCard/BookingWizard earlier in this rebuild).
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
      className={`w-full rounded-[24px] bg-surface-secondary p-5 text-left transition-transform hover:-translate-y-0.5 ${className}`}
      type="button"
      onClick={() => navigate(path)}
    >
      <span
        className={`flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent ${iconClassName}`}
      >
        <Icon className="size-5" />
      </span>
      {children}
    </button>
  );
}
