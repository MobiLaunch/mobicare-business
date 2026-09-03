import type { LucideIcon } from "lucide-react";

import {
  BatteryFull,
  Cable,
  Camera,
  Headphones,
  Layers,
  Package,
  Plug,
  Shapes,
  Shield,
  Smartphone,
  Star,
  Tag,
  Zap,
} from "lucide-react";

import { LEGACY_ICON_MAP } from "@/lib/iconNames";

// Public-facing counterpart to admin/Categories.tsx's iconFor(): that one
// eagerly imports lucide-react's full ~1,767-icon dictionary for search,
// which is fine isolated in the lazy-loaded admin chunk, but adds ~120KB
// gzipped to every visitor's bundle if a public page imports it too (this
// happened once already, then a DynamicIcon-per-name attempt made it worse
// — its ~2,000-entry dynamic-import map doesn't code-split cleanly under
// this build). A public category pill just needs *a* recognizable icon, not
// search across the full library, so this statically imports a small,
// known-safe set (the same defaults offered as "quick picks" in the admin
// picker) and falls back to a generic icon for anything outside it.
const PUBLIC_ICON_MAP: Record<string, LucideIcon> = {
  Shapes,
  Zap,
  Shield,
  Smartphone,
  Plug,
  Star,
  BatteryFull,
  Headphones,
  Camera,
  Package,
  Tag,
  Layers,
  Cable,
};

export default function CategoryIcon({
  iconId,
  className,
}: {
  iconId: string;
  className?: string;
}) {
  const Icon = PUBLIC_ICON_MAP[LEGACY_ICON_MAP[iconId] || iconId] || Shapes;

  return <Icon aria-hidden="true" className={className} />;
}
