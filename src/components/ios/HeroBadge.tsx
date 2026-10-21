import type { LucideIcon } from "lucide-react";

import AppIcon, { type IconColor } from "@/components/ios/AppIcon";
import Reveal from "@/components/ios/Reveal";

interface HeroBadgeProps {
  icon: LucideIcon;
  color?: IconColor;
  label: string;
  /** Centre it (pages with centred heroes) or leave it left-aligned. */
  center?: boolean;
}

/** Page-hero opener: a glossy app icon with a pill label underneath. */
export default function HeroBadge({ icon, color = "blue", label, center = true }: HeroBadgeProps) {
  return (
    <Reveal className={`mb-4 flex flex-col gap-3 ${center ? "items-center" : "items-start"}`}>
      <AppIcon color={color} icon={icon} size={72} />
      <span className="ios-pill max-w-full">
        <span className="truncate">{label}</span>
      </span>
    </Reveal>
  );
}
