import type { Category } from "@/types/domain";

/** Demo/offline categories used when Supabase is not configured. */
export const SEED_CATEGORIES: Category[] = [
  { id: "chargers", name: "Chargers", icon: "Zap", description: "Fast charging solutions", sortOrder: 0 },
  { id: "cases", name: "Cases", icon: "Shield", description: "Protection for every style", sortOrder: 1 },
  { id: "screen-protectors", name: "Screen Protectors", icon: "Layers", description: "Guard your display", sortOrder: 2 },
  { id: "cables", name: "Cables", icon: "Cable", description: "Connect everything", sortOrder: 3 },
  { id: "audio", name: "Audio", icon: "Headphones", description: "Sound without wires", sortOrder: 4 },
  { id: "power", name: "Power Banks", icon: "Battery", description: "Power on the go", sortOrder: 5 },
  { id: "accessories", name: "Accessories", icon: "Star", description: "Desk & lifestyle gear", sortOrder: 6 },
];
