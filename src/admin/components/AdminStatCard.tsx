import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { useNavigate } from "react-router-dom";

interface AdminStatCardProps {
  icon: LucideIcon;
  path: string;
  /** Large figure for the tile layout. */
  figure?: ReactNode;
  label?: string;
  context?: string;
  /** Compact horizontal layout for shortcuts. */
  row?: boolean;
  children?: ReactNode;
}

/** A whole-tile link: metric tiles show a figure, row tiles show a title and subtitle. */
export default function AdminStatCard({ icon: Icon, path, figure, label, context, row, children }: AdminStatCardProps) {
  const navigate = useNavigate();

  return (
    <button className={`ad-stat${row ? " ad-stat--row" : ""}`} type="button" onClick={() => navigate(path)}>
      <span className="ico"><Icon aria-hidden="true" size={18} strokeWidth={1.75} /></span>
      {row ? (
        <span className="txt"><strong>{label}</strong><small>{context}</small></span>
      ) : (
        <>
          {figure !== undefined && <span className="fig">{figure}</span>}
          {label && <span className="lbl">{label}</span>}
          {context && <span className="ctx">{context}</span>}
        </>
      )}
      {children}
    </button>
  );
}
