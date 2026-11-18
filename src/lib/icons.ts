import type { LucideIcon } from "lucide-react";

import { Shapes, icons } from "lucide-react";

import { LEGACY_ICON_MAP, readableIconName } from "@/lib/iconNames";

export { LEGACY_ICON_MAP, readableIconName };

export const QUICK_ICON_IDS = [
  "Shapes",
  "Zap",
  "Shield",
  "ShieldCheck",
  "Smartphone",
  "Plug",
  "Star",
  "BatteryFull",
  "Battery",
  "Headphones",
  "Camera",
  "Package",
  "Tag",
  "Layers",
  "Cable",
  "Apple",
  "Tablet",
  "Laptop",
  "Watch",
  "Wrench",
];

const ICON_DICT = icons as Record<string, LucideIcon>;
const LOWER_ICON_MAP: Record<string, string> = Object.fromEntries(
  Object.keys(ICON_DICT).map((key) => [key.toLowerCase(), key]),
);

function toPascalCase(raw: string): string {
  return raw
    .trim()
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export const iconFor = (id?: string | null): LucideIcon => {
  if (!id) return Shapes;
  const trimmed = id.trim();
  if (!trimmed) return Shapes;

  const mapped =
    LEGACY_ICON_MAP[trimmed] ||
    LEGACY_ICON_MAP[trimmed.toLowerCase()] ||
    trimmed;

  if (ICON_DICT[mapped]) return ICON_DICT[mapped];

  const pascal = toPascalCase(mapped);
  if (ICON_DICT[pascal]) return ICON_DICT[pascal];

  const byLower =
    LOWER_ICON_MAP[mapped.toLowerCase()] ||
    LOWER_ICON_MAP[pascal.toLowerCase()];
  if (byLower && ICON_DICT[byLower]) return ICON_DICT[byLower];

  return Shapes;
};

export const allIconNames = Object.keys(icons).sort();

export function searchIcons(query: string, limit = 120): string[] {
  const q = query.trim().toLowerCase();

  if (!q) return QUICK_ICON_IDS;

  return allIconNames
    .filter(
      (name) =>
        readableIconName(name).toLowerCase().includes(q) ||
        name.toLowerCase().includes(q),
    )
    .slice(0, limit);
}
