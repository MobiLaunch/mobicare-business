import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CircleCheck, FilterX, Layers, Search, ShoppingBag, SlidersHorizontal, X } from "lucide-react";
import { InputGroup, ListBox, Menu, Select, TextField, ToggleButton, ToggleButtonGroup } from "@heroui/react";
import { useShallow } from "zustand/react/shallow";

import { useProductStore } from "@/lib/store";
import ProductCard from "@/components/ProductCard";
import PageMeta from "@/components/PageMeta";
import CategoryIcon from "@/components/CategoryIcon";

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
  const products = useProductStore(useShallow((s) => s.products.filter((p) => p.active)));
  const categories = useProductStore((s) => s.categories);
  const [search, setSearch] = useState("");
  const [searchMenuOpen, setSearchMenuOpen] = useState(false);
  const [sort, setSort] = useState("featured");
  const [selectedCat, setSelectedCat] = useState(searchParams.get("cat") || "all");
  const [selectedSubcat, setSelectedSubcat] = useState(searchParams.get("subcat") || "all");
  const searchWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedCat(searchParams.get("cat") || "all");
    setSelectedSubcat(searchParams.get("subcat") || "all");
  }, [searchParams]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) setSearchMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Selecting a new top-level category always drops any previously-chosen
  // subcategory — there's no guarantee the old subcategory belongs to the
  // newly-selected parent.
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

  // Distinct top-level categories actually represented by products in the
  // catalog, so the pill row never shows an empty/dead category — a product
  // tagged directly to a subcategory still counts toward its parent here.
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
      return { id, name: category?.name || id, sortOrder: category?.sortOrder ?? 999 };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  // Subcategories of the currently-selected top-level category. Shown
  // unfiltered by "in use" — once a customer has drilled into a category,
  // every subcategory should be a visible, navigable option even if it's
  // momentarily out of stock, unlike the top-level row above.
  const activeSubcategories = selectedCat === "all"
    ? []
    : categories
      .filter((c) => c.parentId === selectedCat)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  // A bare top-level selection (no subcategory chosen) matches that category
  // OR any of its subcategories, not just an exact id match.
  const descendantIds = (catId: string) => [
    catId,
    ...categories.filter((c) => c.parentId === catId).map((c) => c.id),
  ];

  let filtered = products.filter((p) => {
    const matchesCat =
      selectedCat === "all"
        ? true
        : selectedSubcat !== "all"
          ? p.category === selectedSubcat
          : descendantIds(selectedCat).includes(p.category);
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q) || (p.tags || []).some((t) => t.toLowerCase().includes(q)) || p.category?.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  filtered = [...filtered].sort((a, b) => {
    if (sort === "price-asc") return a.price - b.price;
    if (sort === "price-desc") return b.price - a.price;
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "newest") return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
  });

  const searchSuggestions = filterCategories.slice(0, 3);
  const selectedSort = SORT_OPTIONS.find((option) => option.value === sort) || SORT_OPTIONS[0];
  const applySearch = (value: string) => { setSearch(value); setSearchMenuOpen(false); };
  const applyCategorySuggestion = (catId: string) => { handleCatChange(catId); setSearch(""); setSearchMenuOpen(false); };
  const categoryButtonClass = (active: boolean) => `relative flex size-10 shrink-0 items-center justify-center rounded-full border transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:size-11 ${active ? "border-accent bg-accent text-accent-foreground shadow-sm" : "border-border bg-surface-secondary text-foreground hover:-translate-y-0.5 hover:bg-surface-tertiary"}`;
  const subcatChipClass = (active: boolean) => `rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${active ? "border-accent bg-accent text-accent-foreground" : "border-border bg-surface text-foreground hover:bg-surface-secondary"}`;

  return (
    <main className="mx-auto max-w-[1400px] overflow-x-hidden px-[clamp(12px,3vw,24px)] pb-16 pt-4 sm:pt-6">
      <PageMeta description="Shop premium phone accessories at Mobicare." title="Shop — Mobicare" />
      <div className="relative py-[clamp(14px,3vw,26px)]">
        <div className="pointer-events-none absolute left-[10%] top-[30%] h-[140px] w-[clamp(200px,40vw,400px)] rounded-full bg-accent-soft/40 blur-[50px]" />
        <div className="relative z-[1] flex items-end justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-micro font-bold uppercase tracking-widest text-accent sm:px-3 sm:text-caption"><ShoppingBag aria-hidden="true" className="size-3" /> Accessories &amp; Gear</span>
            <h1 className="m-0 text-display font-extrabold leading-[1.05] tracking-tight text-foreground">Shop Catalog</h1>
          </div>
          <span aria-live="polite" className="shrink-0 rounded-full border border-border bg-surface-secondary px-3 py-1.5 text-xs font-bold shadow-sm sm:px-4 sm:text-sm">{filtered.length} Product{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2 sm:mb-5 sm:gap-2.5">
        <div ref={searchWrapRef} className="relative min-w-0 flex-1">
          <TextField aria-label="Search products" className="flex flex-col" value={search} onChange={setSearch}>
            <InputGroup className="rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
              <InputGroup.Prefix><Search aria-hidden="true" className="size-4" /></InputGroup.Prefix>
              <InputGroup.Input placeholder="Search accessories, cases, chargers…" type="search" onFocus={() => setSearchMenuOpen(true)} onKeyDown={(e) => e.key === "Enter" && applySearch(e.currentTarget.value)} />
              {search && <InputGroup.Suffix><button aria-label="Clear search" className="flex size-9 items-center justify-center rounded-full" type="button" onClick={() => applySearch("")}><X aria-hidden="true" className="size-4" /></button></InputGroup.Suffix>}
            </InputGroup>
          </TextField>
          {searchMenuOpen && searchSuggestions.length > 0 && (
            <div className="absolute inset-x-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-2xl border border-border bg-surface shadow-lg">
              <Menu aria-label="Search suggestions" className="gap-0 p-1.5" onAction={(key) => applyCategorySuggestion(String(key))}>
                {searchSuggestions.map((suggestion) => (
                  <Menu.Item key={suggestion.id} className="min-h-11 w-full gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-sm text-foreground" id={suggestion.id} textValue={`Browse ${suggestion.name}`}>
                    <Layers aria-hidden="true" className="size-4 text-muted" />
                    <span>Browse {suggestion.name}</span>
                  </Menu.Item>
                ))}
              </Menu>
            </div>
          )}
        </div>

        <Select className="shrink-0" selectedKey={sort} onSelectionChange={(key) => setSort(String(key))}>
          <Select.Trigger aria-label={`Sort products: ${selectedSort.label}`} className="flex size-10 items-center justify-center rounded-full border border-border bg-surface-secondary text-foreground transition-colors hover:bg-surface-tertiary sm:size-11">
            <SlidersHorizontal aria-hidden="true" className="size-[17px] sm:size-[18px]" />
          </Select.Trigger>
          <Select.Popover className="w-56">
            <ListBox aria-label="Sort products">
              {SORT_OPTIONS.map((option) => <ListBox.Item key={option.value} id={option.value}>{option.label}</ListBox.Item>)}
            </ListBox>
          </Select.Popover>
        </Select>
      </div>

      <ToggleButtonGroup aria-label="Product categories" className={`flex gap-2 overflow-x-auto px-0.5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-2.5 ${activeSubcategories.length > 0 ? "mb-2.5" : "mb-6 sm:mb-8"}`} disallowEmptySelection isDetached selectedKeys={[selectedCat]} selectionMode="single" onSelectionChange={(keys) => { const next = Array.from(keys)[0]; if (next != null) handleCatChange(String(next)); }}>
        <ToggleButton aria-label="All products" className={({ isSelected }) => categoryButtonClass(isSelected)} id="all">
          {({ isSelected }) => (
            <>
              <ShoppingBag aria-hidden="true" className="size-[18px]" />
              {isSelected && <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-surface text-accent shadow-sm"><CircleCheck className="size-3.5" /></span>}
            </>
          )}
        </ToggleButton>
        {filterCategories.map((cat) => (
          <ToggleButton key={cat.id} aria-label={cat.name} className={({ isSelected }) => categoryButtonClass(isSelected)} id={cat.id}>
            {({ isSelected }) => (
              <>
                <CategoryIcon className="size-[18px]" iconId={categories.find((c) => c.id === cat.id)?.icon || "Shapes"} />
                {isSelected && <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-surface text-accent shadow-sm"><CircleCheck className="size-3.5" /></span>}
              </>
            )}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {activeSubcategories.length > 0 && (
        <ToggleButtonGroup aria-label="Subcategories" className="mb-6 flex flex-wrap gap-2 sm:mb-8" disallowEmptySelection isDetached selectedKeys={[selectedSubcat]} selectionMode="single" onSelectionChange={(keys) => { const next = Array.from(keys)[0]; if (next != null) handleSubcatChange(String(next)); }}>
          <ToggleButton className={({ isSelected }) => subcatChipClass(isSelected)} id="all">
            All {filterCategories.find((c) => c.id === selectedCat)?.name}
          </ToggleButton>
          {activeSubcategories.map((sub) => (
            <ToggleButton key={sub.id} className={({ isSelected }) => subcatChipClass(isSelected)} id={sub.id}>
              {sub.name}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      )}

      {filtered.length > 0 ? <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">{filtered.map((p) => <ProductCard key={p.id} product={p} onClick={() => navigate(`/product/${p.id}`)} />)}</div> : <div className="mt-8 rounded-[28px] border border-border bg-surface-secondary p-8 text-center sm:p-12"><span className="mx-auto mb-4 flex size-[72px] items-center justify-center rounded-full bg-surface-tertiary text-accent"><Search aria-hidden="true" className="size-9" /></span><h3 className="m-0 mb-2 text-2xl font-bold text-foreground">No matching products</h3><p className="mx-auto mb-6 max-w-[360px] text-muted">We couldn&rsquo;t find anything matching your search. Try resetting your filters.</p><button className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-6 font-semibold text-accent-foreground" type="button" onClick={() => { setSearch(""); handleCatChange("all"); }}><FilterX aria-hidden="true" className="size-4" /><span>Clear Filters</span></button></div>}
    </main>
  );
}
