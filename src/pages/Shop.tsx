import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";

import { useProductStore } from "@/lib/store";
import ProductCard from "@/components/ProductCard";
import PageMeta from "@/components/PageMeta";
import PageIntro from "@/components/PageIntro";
import { Button } from "@/components/arc/button/button";
import { ChipGroup } from "@/components/arc/chip-group/chip-group";
import { EmptyState } from "@/components/arc/empty-state/empty-state";
import { SearchField } from "@/components/arc/search-field/search-field";
import { Select } from "@/components/arc/select/select";

const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name", label: "Name A to Z" },
  { value: "newest", label: "Newest first" },
];

export default function Shop() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const products = useProductStore(useShallow((s) => s.products.filter((p) => p.active)));
  const categories = useProductStore((s) => s.categories);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("featured");
  const [selectedCat, setSelectedCat] = useState(searchParams.get("cat") || "all");
  const [selectedSubcat, setSelectedSubcat] = useState(searchParams.get("subcat") || "all");

  useEffect(() => {
    setSelectedCat(searchParams.get("cat") || "all");
    setSelectedSubcat(searchParams.get("subcat") || "all");
  }, [searchParams]);


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

  const applySearch = (value: string) => setSearch(value);

  return (
    <>
      <PageMeta description="Shop premium phone accessories at Mobicare." title="Shop | Mobicare" />
      <PageIntro lead="Cases, chargers, cables and protection for the device we just fixed." title="Shop" />
    <div className="mc-page mc-pagebody" id="shop-page">

      <p aria-live="polite" className="mc-small" style={{ marginBottom: "var(--space-3)" }}>{filtered.length} product{filtered.length !== 1 ? "s" : ""}</p>

      <div className="mc-toolbar">
        <div className="mc-grow">
          <SearchField label="Search products" placeholder="Search accessories, cases, chargers" value={search} onValueChange={applySearch} />
        </div>
        <div style={{ minWidth: "12rem" }}>
          <Select label="Sort by" options={SORT_OPTIONS} value={sort} onValueChange={setSort} />
        </div>
      </div>

      <div className="mc-stack-sm" style={{ marginBottom: "var(--space-6)" }}>
        <ChipGroup
          label="Category"
          multiple={false}
          options={[{ value: "all", label: "All" }, ...filterCategories.map((c) => ({ value: c.id, label: c.name }))]}
          value={[selectedCat]}
          onValueChange={(v) => handleCatChange(v[0] ?? "all")}
        />
        {activeSubcategories.length > 0 && (
          <ChipGroup
            label="Subcategory"
            multiple={false}
            options={[{ value: "all", label: `All ${filterCategories.find((c) => c.id === selectedCat)?.name ?? ""}` }, ...activeSubcategories.map((c) => ({ value: c.id, label: c.name }))]}
            value={[selectedSubcat]}
            onValueChange={(v) => handleSubcatChange(v[0] ?? "all")}
          />
        )}
      </div>

      {filtered.length > 0 ? (
        <div className="mc-grid mc-grid-products">
          {filtered.map((p) => <ProductCard key={p.id} product={p} onClick={() => navigate(`/product/${p.id}`)} />)}
        </div>
      ) : (
        <EmptyState
          action={<Button variant="secondary" onClick={() => { setSearch(""); handleCatChange("all"); }}>Clear filters</Button>}
          description="We couldn't find anything matching your search. Try resetting your filters."
          title="No matching products"
        />
      )}
    </div>
    </>
  );
}
