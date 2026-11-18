import type { Category } from "@/types/domain";

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FilterX,
  Layers,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  InputGroup,
  ListBox,
  Select,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from "@heroui/react";
import { useShallow } from "zustand/react/shallow";

import { useProductStore } from "@/lib/store";
import ProductCard from "@/components/ProductCard";
import ProductImage from "@/components/ProductImage";
import PageMeta from "@/components/PageMeta";
import CategoryIcon from "@/components/CategoryIcon";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const LEGACY_CAT_ALIASES: Record<string, string[]> = {
  chargers: ["charging"],
  cables: ["charging"],
  cases: ["protection"],
  "screen-protectors": ["protection"],
};

function resolveCategoryParam(
  param: string | null,
  categories: Category[],
): string {
  if (!param) return "all";

  const raw = param.trim().toLowerCase();
  if (raw === "all") return "all";
  if (categories.some((c) => c.id === param)) return param;

  const bySlug = categories.find((c) => slugify(c.name) === slugify(param));
  if (bySlug) return bySlug.id;

  const byName = categories.find((c) => c.name.toLowerCase() === raw);
  if (byName) return byName.id;

  for (const alias of LEGACY_CAT_ALIASES[slugify(param)] ?? []) {
    const match = categories.find((c) => slugify(c.name) === alias);
    if (match) return match.id;
  }

  return "all";
}

const normalizeSearchText = (value: string) =>
  value.toLowerCase().replace(/\bcse\b/g, "case");

const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name", label: "A–Z Name" },
  { value: "newest", label: "Newest First" },
];

export default function Shop() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const loading = useProductStore((s) => s.loading);
  const products = useProductStore(
    useShallow((s) => s.products.filter((p) => p.active)),
  );
  const categories = useProductStore((s) => s.categories);
  const [search, setSearch] = useState("");
  const [searchMenuOpen, setSearchMenuOpen] = useState(false);
  const [sort, setSort] = useState("featured");
  const [selectedCat, setSelectedCat] = useState(() =>
    resolveCategoryParam(searchParams.get("cat"), categories),
  );
  const [selectedSubcat, setSelectedSubcat] = useState(
    searchParams.get("subcat") || "all",
  );
  const searchWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedCat(resolveCategoryParam(searchParams.get("cat"), categories));
    setSelectedSubcat(searchParams.get("subcat") || "all");
  }, [searchParams, categories]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        searchWrapRef.current &&
        !searchWrapRef.current.contains(e.target as Node)
      ) {
        setSearchMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleCatChange = (cat: string) => {
    setSelectedCat(cat);
    setSelectedSubcat("all");
    const next: Record<string, string> = {};
    if (cat !== "all") next.cat = cat;
    setSearchParams(next);
  };
  const handleSubcatChange = (subcat: string) => {
    setSelectedSubcat(subcat);
    const next: Record<string, string> = {};
    if (selectedCat !== "all") next.cat = selectedCat;
    if (subcat !== "all") next.subcat = subcat;
    setSearchParams(next);
  };

  const filterCategories = Array.from(
    new Set(
      products.map((p) => {
        const cat = categories.find((c) => c.id === p.category);
        return cat?.parentId ?? p.category;
      }),
    ),
  )
    .filter(Boolean)
    .map((id) => {
      const category = categories.find((item) => item.id === id);
      return {
        id,
        name: category?.name || id,
        sortOrder: category?.sortOrder ?? 999,
      };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  const activeSubcategories =
    selectedCat === "all"
      ? []
      : categories
          .filter((c) => c.parentId === selectedCat)
          .sort(
            (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
          );

  const descendantIds = (catId: string) => [
    catId,
    ...categories.filter((c) => c.parentId === catId).map((c) => c.id),
  ];

  const normalizedQuery = normalizeSearchText(search.trim());

  let filtered = products.filter((p) => {
    const matchesCat =
      selectedCat === "all"
        ? true
        : selectedSubcat !== "all"
          ? p.category === selectedSubcat
          : descendantIds(selectedCat).includes(p.category);

    const category = categories.find((c) => c.id === p.category);
    const parentCategory = category?.parentId
      ? categories.find((c) => c.id === category.parentId)
      : undefined;
    const haystack = normalizeSearchText(
      [
        p.name,
        p.description ?? "",
        ...(p.tags || []),
        p.category ?? "",
        category?.name ?? "",
        parentCategory?.name ?? "",
      ].join(" "),
    );
    const matchesSearch = !normalizedQuery || haystack.includes(normalizedQuery);
    return matchesCat && matchesSearch;
  });

  filtered = [...filtered].sort((a, b) => {
    if (sort === "price-asc") return a.price - b.price;
    if (sort === "price-desc") return b.price - a.price;
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "newest")
      return (
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
      );
    return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
  });

  // Dynamic search autocomplete (only shown when user has typed a non-empty query)
  const matchingCategories = useMemo(() => {
    if (!normalizedQuery) return [];
    return filterCategories
      .filter((c) => normalizeSearchText(c.name).includes(normalizedQuery))
      .slice(0, 3);
  }, [filterCategories, normalizedQuery]);

  const matchingProducts = useMemo(() => {
    if (!normalizedQuery) return [];
    return products
      .filter((p) => {
        const cat = categories.find((c) => c.id === p.category);
        const hay = normalizeSearchText(
          `${p.name} ${p.sku || ""} ${cat?.name || ""} ${(p.tags || []).join(" ")}`,
        );
        return hay.includes(normalizedQuery);
      })
      .slice(0, 5);
  }, [products, categories, normalizedQuery]);

  const showAutocomplete =
    searchMenuOpen &&
    normalizedQuery.length > 0 &&
    (matchingCategories.length > 0 || matchingProducts.length > 0);

  const selectedSort =
    SORT_OPTIONS.find((option) => option.value === sort) || SORT_OPTIONS[0];
  const applySearch = (value: string) => {
    setSearch(value);
    setSearchMenuOpen(false);
  };
  const applyCategorySuggestion = (catId: string) => {
    handleCatChange(catId);
    setSearch("");
    setSearchMenuOpen(false);
  };
  const categoryButtonClass = (active: boolean) =>
    `relative flex shrink-0 items-center gap-2 rounded-pill border px-3.5 py-2 text-label font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${active ? "border-accent bg-accent text-accent-foreground shadow-[var(--elev-1)]" : "border-border bg-surface text-muted hover:border-accent/40 hover:bg-surface-secondary hover:text-foreground"}`;
  const subcatChipClass = (active: boolean) =>
    `rounded-pill border px-3.5 py-1.5 text-label font-medium transition-colors ${active ? "border-accent bg-accent-soft text-accent-soft-foreground" : "border-border bg-surface text-muted hover:text-foreground"}`;

  return (
    <div className="mx-auto max-w-[1400px] overflow-x-hidden px-[clamp(12px,3vw,24px)] pb-16 pt-4 sm:pt-6">
      <PageMeta
        description="Shop premium phone accessories at Mobicare."
        title="Shop — Mobicare"
      />
      <div className="relative py-[clamp(14px,3vw,26px)]">
        <div className="pointer-events-none absolute left-[10%] top-[30%] h-[140px] w-[clamp(200px,40vw,400px)] rounded-full bg-accent-soft/40 blur-[50px]" />
        <div className="relative z-[1] flex items-end justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <span className="type-eyebrow mb-2 inline-flex items-center gap-1.5 rounded-pill bg-accent-soft px-2.5 py-1 text-accent-soft-foreground sm:px-3">
              <ShoppingBag aria-hidden="true" className="size-3" /> Accessories
              &amp; Gear
            </span>
            <h1 className="type-display m-0 text-display text-foreground">
              Shop Catalog
            </h1>
          </div>
          {!loading && (
            <span
              aria-live="polite"
              className="shrink-0 rounded-pill border border-border bg-surface px-3 py-1.5 text-label font-bold tabular-nums shadow-[var(--elev-1)] sm:px-4"
            >
              {filtered.length} Product{filtered.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2 sm:mb-5 sm:gap-2.5">
        <div ref={searchWrapRef} className="relative min-w-0 flex-1">
          <TextField
            aria-label="Search products"
            className="flex flex-col"
            value={search}
            onChange={(val) => {
              setSearch(val);
              setSearchMenuOpen(val.trim().length > 0);
            }}
          >
            <InputGroup className="rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
              <InputGroup.Prefix>
                <Search aria-hidden="true" className="size-4" />
              </InputGroup.Prefix>
              <InputGroup.Input
                placeholder="Search accessories, cases, chargers…"
                type="search"
                onFocus={() => {
                  if (search.trim().length > 0) setSearchMenuOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.stopPropagation();
                    setSearchMenuOpen(false);
                  } else if (e.key === "Enter") {
                    applySearch(e.currentTarget.value);
                  }
                }}
              />
              {search && (
                <InputGroup.Suffix>
                  <button
                    aria-label="Clear search"
                    className="flex size-9 items-center justify-center rounded-full"
                    type="button"
                    onClick={() => applySearch("")}
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                </InputGroup.Suffix>
              )}
            </InputGroup>
          </TextField>

          {showAutocomplete && (
            <div
              role="listbox"
              aria-label="Search suggestions"
              className="absolute inset-x-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-2xl border border-border bg-surface p-1.5 shadow-xl"
            >
              {matchingCategories.map((cat) => (
                <button
                  key={`cat-${cat.id}`}
                  className="flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-surface-secondary"
                  type="button"
                  onClick={() => applyCategorySuggestion(cat.id)}
                >
                  <Layers aria-hidden="true" className="size-4 text-accent" />
                  <span>Browse {cat.name}</span>
                </button>
              ))}
              {matchingProducts.map((p) => (
                <button
                  key={`prod-${p.id}`}
                  className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-surface-secondary"
                  type="button"
                  onClick={() => {
                    setSearchMenuOpen(false);
                    navigate(`/product/${p.id}`);
                  }}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="relative size-9 shrink-0 overflow-hidden rounded-lg bg-surface-secondary">
                      <ProductImage alt={p.name} src={p.images?.[0]} />
                    </div>
                    <span className="truncate font-semibold text-foreground">
                      {p.name}
                    </span>
                  </div>
                  <strong className="shrink-0 text-sm text-accent">
                    ${p.price.toFixed(2)}
                  </strong>
                </button>
              ))}
            </div>
          )}
        </div>

        <Select
          className="shrink-0"
          selectedKey={sort}
          onSelectionChange={(key) => setSort(String(key))}
        >
          <Select.Trigger
            aria-label={`Sort products: ${selectedSort.label}`}
            className="flex size-10 items-center justify-center rounded-full border border-border bg-surface-secondary text-foreground transition-colors hover:bg-surface-tertiary sm:size-11"
          >
            <SlidersHorizontal
              aria-hidden="true"
              className="size-[17px] sm:size-[18px]"
            />
          </Select.Trigger>
          <Select.Popover className="w-56">
            <ListBox aria-label="Sort products">
              {SORT_OPTIONS.map((option) => (
                <ListBox.Item key={option.value} id={option.value}>
                  {option.label}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </div>

      {!loading && filterCategories.length > 0 && (
        <ToggleButtonGroup
          aria-label="Product categories"
          className={`flex gap-2 overflow-x-auto px-0.5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-2.5 ${activeSubcategories.length > 0 ? "mb-2.5" : "mb-6 sm:mb-8"}`}
          disallowEmptySelection
          isDetached
          selectedKeys={[selectedCat]}
          selectionMode="single"
          onSelectionChange={(keys) => {
            const next = Array.from(keys)[0];
            if (next != null) handleCatChange(String(next));
          }}
        >
          <ToggleButton
            aria-label="All products"
            className={({ isSelected }) => categoryButtonClass(isSelected)}
            id="all"
          >
            <>
              <ShoppingBag aria-hidden="true" className="size-4 shrink-0" />
              <span>All</span>
            </>
          </ToggleButton>
          {filterCategories.map((cat) => (
            <ToggleButton
              key={cat.id}
              aria-label={cat.name}
              className={({ isSelected }) => categoryButtonClass(isSelected)}
              id={cat.id}
            >
              <>
                <CategoryIcon
                  className="size-4 shrink-0"
                  iconId={
                    categories.find((c) => c.id === cat.id)?.icon || "Shapes"
                  }
                />
                <span>{cat.name}</span>
              </>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      )}

      {activeSubcategories.length > 0 && (
        <ToggleButtonGroup
          aria-label="Subcategories"
          className="mb-6 flex flex-wrap gap-2 sm:mb-8"
          disallowEmptySelection
          isDetached
          selectedKeys={[selectedSubcat]}
          selectionMode="single"
          onSelectionChange={(keys) => {
            const next = Array.from(keys)[0];
            if (next != null) handleSubcatChange(String(next));
          }}
        >
          <ToggleButton
            className={({ isSelected }) => subcatChipClass(isSelected)}
            id="all"
          >
            All {filterCategories.find((c) => c.id === selectedCat)?.name}
          </ToggleButton>
          {activeSubcategories.map((sub) => (
            <ToggleButton
              key={sub.id}
              className={({ isSelected }) => subcatChipClass(isSelected)}
              id={sub.id}
            >
              {sub.name}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      )}

      {loading && products.length === 0 ? (
        <div
          aria-busy="true"
          aria-label="Loading catalog"
          className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4"
        >
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              className="surface-raised flex flex-col gap-3 rounded-panel p-3.5 sm:p-4"
            >
              <div className="aspect-square w-full animate-pulse rounded-card bg-surface-tertiary" />
              <div className="h-3 w-1/3 animate-pulse rounded-full bg-surface-tertiary" />
              <div className="h-5 w-4/5 animate-pulse rounded-lg bg-surface-tertiary" />
              <div className="h-4 w-full animate-pulse rounded-lg bg-surface-tertiary" />
              <div className="mt-2 flex items-center justify-between">
                <div className="h-6 w-20 animate-pulse rounded-lg bg-surface-tertiary" />
                <div className="size-9 animate-pulse rounded-full bg-surface-tertiary" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onClick={() => navigate(`/product/${p.id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-panel border border-border bg-surface-secondary p-8 text-center sm:p-12">
          <span className="mx-auto mb-4 flex size-[72px] items-center justify-center rounded-full bg-surface-tertiary text-accent">
            <Search aria-hidden="true" className="size-9" />
          </span>
          <h3 className="m-0 mb-2 text-2xl font-bold text-foreground">
            No matching products
          </h3>
          <p className="mx-auto mb-6 max-w-[360px] text-muted">
            We couldn&rsquo;t find anything matching your search. Try resetting
            your filters.
          </p>
          <button
            className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-6 font-semibold text-accent-foreground"
            type="button"
            onClick={() => {
              setSearch("");
              handleCatChange("all");
            }}
          >
            <FilterX aria-hidden="true" className="size-4" />
            <span>Clear Filters</span>
          </button>
        </div>
      )}
    </div>
  );
}
