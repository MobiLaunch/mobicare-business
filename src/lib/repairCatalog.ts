import type { RepairCatalogItem } from "@/lib/supabase";

export interface QuotedRepair {
  id: string;
  /** Repair name without brand or model, e.g. "Battery". */
  repair: string;
  /** Part quality or other qualifier, e.g. "Service Pack". */
  variant: string;
  model: string;
  brand: string;
  price: number;
  minutes: number | null;
}

const BRAND_BY_CATEGORY: Record<string, string> = {
  "Apple Repairs": "Apple",
  "Samsung Repairs": "Samsung",
  "Google Repairs": "Google",
  "Board Repairs": "Apple",
};

const norm = (s: string) => s.toLowerCase().replace(/^(apple|samsung|google)\s+/, "").replace(/[^a-z0-9]+/g, "");

/** POS service names read "Model - Repair - Variant" or "Repair - Model"; split them apart. */
export function parseRepair(item: RepairCatalogItem): QuotedRepair | null {
  const brand = BRAND_BY_CATEGORY[item.category];

  if (!brand) return null;
  const parts = item.name.split(" - ").map((p) => p.trim());

  if (parts.length < 2) return null;
  const modelFirst = /\d/.test(parts[0]);
  const strip = (s: string) => s.replace(/^(Apple Device|Google Pixel|Samsung|Google)\s+/i, "").trim();

  return modelFirst
    ? { id: item.id, brand, model: strip(parts[0]), repair: parts[1], variant: parts.slice(2).join(" - "), price: item.price, minutes: item.minutes }
    : { id: item.id, brand, model: parts[parts.length - 1], repair: strip(parts[0]), variant: "", price: item.price, minutes: item.minutes };
}

function modelAliases(model: string): string[] {
  const alts = model.split(/\s*\/\s*/);
  const family = model.match(/^[A-Za-z ]+?(?=\s*\d)/)?.[0]?.trim() ?? "";
  const out = alts.map((a, i) => (i === 0 || /^[A-Za-z]/.test(a) ? a : `${family} ${a}`));

  if (/series$/i.test(model)) out.push(model.replace(/\s*series$/i, ""));

  return out.map(norm);
}

/** Does a catalog model cover the model the customer typed? Exact, listed alternative, or a "Series" group. */
export function modelCovers(catalogModel: string, picked: string): boolean {
  const p = norm(picked);

  if (!p) return false;
  const aliases = modelAliases(catalogModel);

  if (aliases.some((a) => a === p)) return true;
  if (/series$/i.test(catalogModel)) {
    const base = norm(catalogModel.replace(/\s*series$/i, ""));

    return p.startsWith(base);
  }

  return false;
}

export function quotesForModel(items: RepairCatalogItem[], brand: string, picked: string): QuotedRepair[] {
  return items
    .map(parseRepair)
    .filter((q): q is QuotedRepair => !!q && q.brand === brand && modelCovers(q.model, picked))
    .sort((a, b) => a.repair.localeCompare(b.repair) || a.price - b.price);
}

export function modelsForBrand(items: RepairCatalogItem[], brand: string): string[] {
  const set = new Set<string>();

  items.map(parseRepair).forEach((q) => {
    if (q && q.brand === brand && !/series$|\//i.test(q.model)) set.add(q.model);
  });

  return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}
