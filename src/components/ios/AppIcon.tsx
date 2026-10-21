import type { LucideIcon } from "lucide-react";

export type IconColor = "blue" | "green" | "red" | "orange" | "yellow" | "teal" | "purple" | "pink" | "gray";

interface AppIconProps {
  icon: LucideIcon;
  color?: IconColor;
  size?: number;
  className?: string;
  /** Red notification badge, like an unread count on the Springboard. */
  badge?: number | string;
}

/** A glossy iOS 6 app icon. Decorative — the label next to it does the talking. */
export default function AppIcon({ icon: Icon, color = "blue", size = 64, className = "", badge }: AppIconProps) {
  return (
    <span className={`relative inline-block ${className}`} style={{ width: size, height: size }}>
      <span
        aria-hidden="true"
        className={`ios-icon ios-icon--${color}`}
        style={{ ["--ios-icon-size" as string]: `${size}px` }}
      >
        <Icon />
      </span>
      {badge !== undefined && badge !== 0 && (
        <span className="ios-badge absolute -right-2 -top-2 z-10" style={{ animation: "ios-pop 0.4s var(--ios-ease) both" }}>
          {badge}
        </span>
      )}
    </span>
  );
}
