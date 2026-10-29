import type { ReactNode } from "react";

interface AdminPageHeaderProps {
  title: string;
  description: string;
  action?: ReactNode;
  /** Kept for existing call sites; the console no longer shows eyebrow labels. */
  eyebrow?: string;
}

export default function AdminPageHeader({ title, description, action }: AdminPageHeaderProps) {
  return (
    <header className="ad-head">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action ? <div className="ad-head-actions">{action}</div> : null}
    </header>
  );
}
