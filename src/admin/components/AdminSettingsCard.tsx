import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface AdminSettingsCardProps {
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  statusChip?: ReactNode;
  children: ReactNode;
}

export default function AdminSettingsCard({ icon: Icon, title, description, statusChip, children }: AdminSettingsCardProps) {
  return (
    <section className="ad-setcard">
      <div className="ad-setcard-head">
        <span className="ico"><Icon aria-hidden="true" size={22} strokeWidth={1.75} /></span>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {statusChip}
      </div>
      <div className="ad-setcard-body">{children}</div>
    </section>
  );
}

export function SettingsStepItem({ number, title, description, children }: { number: number; title: string; description: ReactNode; children: ReactNode }) {
  return (
    <div className="ad-step">
      <span className="n">{number}</span>
      <div>
        <h3>{title}</h3>
        <p className="d">{description}</p>
        {children}
      </div>
    </div>
  );
}
