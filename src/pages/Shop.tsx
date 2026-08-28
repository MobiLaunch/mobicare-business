import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import LogoAndroid from "@gravity-ui/icons/LogoAndroid";
import LogoApple from "@gravity-ui/icons/LogoApple";
import { Battery, Cable, CircleCheck, FilterX, Headphones, History, Layers, Search, SearchX, SlidersHorizontal, Star, Store, X, Zap } from "lucide-react";
import { InputGroup, TextField } from "@heroui/react";
import { useShallow } from "zustand/react/shallow";

import { useProductStore } from "@/lib/store";
import ProductCard from "@/components/ProductCard";
import PageMeta from "@/components/PageMeta";

const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name", label: "A–Z Name" },
  { value: "newest", label: "Newest First" },
];

const CATEGORY_ICONS = {
  chargers: Zap,
  cases: LogoApple,
  "cases--samsung": LogoAndroid,
  "screen-protectors": Layers,
  cables: Cable,
  audio: Headphones,
  power: Battery,
  accessories: Star,
} as const;

function CategoryIcon({ id }: { id: string }) {
  const Icon = CATEGORY_ICONS[id as keyof typeof CATEGORY_ICONS] || Store;
  return <Icon aria-hidden="true" className="size-[19px]" />;
}

export default function Shop() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const products = useProductStore(useShallow((s) => s.products.filter((p) => p.active)));
  const categories = useProductStore((s) => s.categories);
  const [search, setSearch] = useState("");
  const [searchMenuOpen, setSearchMenuOpen] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [sort, setSort] = useState("featured");
  const [selectedCat, setSelectedCat] = useState(searchParams.get("cat") || "all");
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const sortWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cat = searchParams.get("cat");
    setSelectedCat(cat || "all");
  }, [searchParams]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) setSearchMenuOpen(false);
      if (sortWrapRef.current && !sortWrapRef.current.contains(e.target as Node)) setSortMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleCatChange = (cat: string) => {
    setSelectedCat(cat);
    setSearchParams(cat === "all" ? {} : { cat });
  };

  let filtered = products.filter((p) => {
    const matchesCat = selectedCat === "all" || p.category === selectedCat;
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

  const searchSuggestions = categories.slice(0, 3).map((category) => ({ name: category.name, id: category.id }));
  const selectedSort = SORT_OPTIONS.find((option) => option.value === sort) || SORT_OPTIONS[0];
  const applySearch = (value: string) => { setSearch(value); setSearchMenuOpen(false); };
  const applyCategorySuggestion = (catId: string) => { handleCatChange(catId); setSearch(""); setSearchMenuOpen(false); };
  const categoryButtonClass = (active: boolean) => `relative flex size-11 shrink-0 items-center justify-center rounded-full border transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${active ? "border-accent bg-accent text-accent-foreground shadow-sm" : "border-border bg-surface-secondary text-foreground hover:-translate-y-0.5 hover:bg-surface-tertiary"}`;

  return (
    <main className="mx-auto max-w-[1400px] overflow-x-hidden px-[clamp(12px,3vw,24px)] pb-16 pt-6">
      <PageMeta description="Shop premium phone accessories at Mobicare." title="Shop — Mobicare" />
      <div className="relative py-[clamp(16px,4vw,32px)]">
        <div className="pointer-events-none absolute left-[10%] top-[30%] h-[140px] w-[clamp(200px,40vw,400px)] rounded-full bg-accent-soft/40 blur-[50px]" />
        <div className="relative z-[1] flex flex-wrap items-center gap-4">
          <div className="min-w-0">
            <span className="mb-2.5 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-accent"><Store aria-hidden="true" className="size-3.5" /> Accessories &amp; Gear</span>
            <h1 className="m-0 break-words text-[clamp(2.2rem,5vw,3.4rem)] font-extrabold leading-[1.1] tracking-tight text-foreground">Shop Catalog</h1>
          </div>
          <div className="flex-1" />
          <span aria-live="polite" className="rounded-full border border-border bg-surface-secondary px-4 py-1.5 text-sm font-bold shadow-sm">{filtered.length} Product{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      <div className="mb-5 flex items-center gap-2.5">
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
              {searchSuggestions.map((suggestion) => <button key={suggestion.id} className="flex min-h-11 w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-foreground hover:bg-surface-secondary" type="button" onClick={() => applyCategorySuggestion(suggestion.id)}><History aria-hidden="true" className="size-4 text-muted" /><span>Browse {suggestion.name}</span></button>)}
            </div>
          )}
        </div>

        <div ref={sortWrapRef} className="relative shrink-0">
          <button aria-expanded={sortMenuOpen} aria-haspopup="menu" aria-label={`Sort products: ${selectedSort.label}`} className="flex size-11 items-center justify-center rounded-full border border-border bg-surface-secondary text-foreground transition-colors hover:bg-surface-tertiary" type="button" onClick={() => { setSearchMenuOpen(false); setSortMenuOpen((o) => !o); }}>
            <SlidersHorizontal aria-hidden="true" className="size-[18px]" />
          </button>
          {sortMenuOpen && <div aria-label="Sort products" className="absolute right-0 top-[calc(100%+6px)] z-20 w-56 overflow-hidden rounded-2xl border border-border bg-surface p-1.5 shadow-lg" role="menu">{SORT_OPTIONS.map((option) => <button key={option.value} aria-checked={sort === option.value} className={`flex min-h-11 w-full items-center gap-2 rounded-xl px-4 py-2.5 text-left text-sm ${sort === option.value ? "font-semibold text-accent" : "text-foreground hover:bg-surface-secondary"}`} role="menuitemradio" type="button" onClick={() => { setSort(option.value); setSortMenuOpen(false); }}>{sort === option.value && <CircleCheck aria-hidden="true" className="size-4" />}<span>{option.label}</span></button>)}</div>}
        </div>
      </div>

      <div aria-label="Product categories" className="mb-8 flex gap-2.5 overflow-x-auto px-0.5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist">
        <button aria-label="All products" aria-selected={selectedCat === "all"} className={categoryButtonClass(selectedCat === "all")} role="tab" title="All products" type="button" onClick={() => handleCatChange("all")}>
          <Store aria-hidden="true" className="size-[19px]" />
          {selectedCat === "all" && <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-surface text-accent shadow-sm"><CircleCheck className="size-3.5" /></span>}
        </button>
        {categories.map((cat) => {
          const active = selectedCat === cat.id;
          return (
            <button key={cat.id} aria-label={cat.id === "cases" ? "iPhone Cases" : cat.id === "cases--samsung" ? "Samsung Cases" : cat.name} aria-selected={active} className={categoryButtonClass(active)} role="tab" title={cat.id === "cases" ? "iPhone Cases" : cat.id === "cases--samsung" ? "Samsung Cases" : cat.name} type="button" onClick={() => handleCatChange(cat.id)}>
              <CategoryIcon id={cat.id} />
              {active && <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-surface text-accent shadow-sm"><CircleCheck className="size-3.5" /></span>}
            </button>
          );
        })}
      </div>

      {filtered.length > 0 ? <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">{filtered.map((p) => <ProductCard key={p.id} product={p} onClick={() => navigate(`/product/${p.id}`)} />)}</div> : <div className="mt-8 rounded-[28px] border border-border bg-surface-secondary p-8 text-center sm:p-12"><span className="mx-auto mb-4 flex size-[72px] items-center justify-center rounded-full bg-surface-tertiary text-accent"><SearchX aria-hidden="true" className="size-9" /></span><h3 className="m-0 mb-2 text-2xl font-bold text-foreground">No matching products</h3><p className="mx-auto mb-6 max-w-[360px] text-muted">We couldn&rsquo;t find anything matching your search. Try resetting your filters.</p><button className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-6 font-semibold text-accent-foreground" type="button" onClick={() => { setSearch(""); handleCatChange("all"); }}><FilterX aria-hidden="true" className="size-4" /><span>Clear Filters</span></button></div>}
    </main>
  );
}
