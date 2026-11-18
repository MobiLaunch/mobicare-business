import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Button } from "@heroui/react";
import { useShallow } from "zustand/react/shallow";

import { useProductStore } from "@/lib/store";
import { useSiteStore } from "@/lib/siteStore";
import ProductCard from "@/components/ProductCard";

export default function FeaturedProducts() {
  const navigate = useNavigate();
  const loading = useProductStore((s) => s.loading);
  const copy = useSiteStore((s) => s.copy);
  const featured = useProductStore(
    useShallow((s) => s.products.filter((p) => p.featured && p.active)),
  );

  // Hide completely when catalog finished loading and there are zero featured items
  if (!loading && featured.length === 0) {
    return null;
  }

  return (
    <section className="py-6" id="featured-products-section">
      <div className="mb-4 flex flex-wrap items-center gap-2 px-1">
        <div>
          <p
            className="m-0 text-caption font-bold uppercase tracking-widest text-accent"
            data-edit="copy.home.featured.title"
          >
            {copy?.["home.featured.title"] || "Best Sellers"}
          </p>
          <h2 className="m-0 text-heading font-semibold text-foreground">
            Featured Products
          </h2>
        </div>
        <div className="flex-1" />
        <Button variant="ghost" onPress={() => navigate("/shop")}>
          <span>All Products</span>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {loading && featured.length === 0 ? (
        <div
          aria-busy="true"
          aria-label="Loading featured products"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="surface-raised flex flex-col gap-3 rounded-panel p-4"
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
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onClick={() => navigate(`/product/${p.id}`)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
