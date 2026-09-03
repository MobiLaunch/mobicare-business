// Lightweight half of the icon-resolution logic — deliberately has NO
// import of lucide-react's `icons` dictionary (~1,767 components, ~120KB
// gzipped). Split out from lib/icons.ts so public pages (e.g. Shop.tsx,
// via components/CategoryIcon.tsx) can resolve a legacy icon id without
// any possibility of pulling that dictionary into their bundle — the two
// earlier attempts at this both leaked it through a shared module that
// merely *offered* the heavy exports, even when unused. This file
// physically cannot: nothing here references lucide-react at all.

// NOTE (HeroUI v3 rebuild): the icon field used to be a plain <select>
// listing raw Material-Symbols-style name strings (e.g. "battery_full")
// with no visual preview, later rebuilt as a searchable grid over
// lucide-react's full icon set (see lib/icons.ts) keyed by each icon's
// PascalCase component name. New selections store that PascalCase name
// directly (e.g. "BatteryFull") so no lookup table is needed going
// forward — LEGACY_ICON_MAP only exists to translate ids saved before
// that change.
export const LEGACY_ICON_MAP: Record<string, string> = {
  bolt: "Zap",
  shield: "Shield",
  smartphone: "Smartphone",
  power: "Plug",
  star: "Star",
  battery_full: "BatteryFull",
  headphones: "Headphones",
  photo_camera: "Camera",
  inventory_2: "Package",
  label: "Tag",
  layers: "Layers",
  cable: "Cable",
  category: "Shapes",
};

export const readableIconName = (name: string) =>
  name.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
