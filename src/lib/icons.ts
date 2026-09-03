import type { LucideIcon } from "lucide-react";

import { Shapes, icons } from "lucide-react";

import { LEGACY_ICON_MAP, readableIconName } from "@/lib/iconNames";

export { LEGACY_ICON_MAP, readableIconName };

// A handful of sensible defaults shown before a search is typed — not an
// exhaustive list (that's what search is for), just familiar starting
// points pulled from the old curated set.
export const QUICK_ICON_IDS = [
  "Shapes", "Zap", "Shield", "Smartphone", "Plug", "Star",
  "BatteryFull", "Headphones", "Camera", "Package", "Tag", "Layers", "Cable",
];

export const iconFor = (id: string): LucideIcon =>
  (icons as Record<string, LucideIcon>)[LEGACY_ICON_MAP[id] || id] || Shapes;

export const allIconNames = Object.keys(icons).sort();

export function searchIcons(query: string, limit = 120): string[] {
  const q = query.trim().toLowerCase();

  if (!q) return QUICK_ICON_IDS;

  return allIconNames
    .filter((name) => readableIconName(name).toLowerCase().includes(q))
    .slice(0, limit);
}
