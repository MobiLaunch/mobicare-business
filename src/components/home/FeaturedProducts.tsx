import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Button } from "@heroui/react";
import { useShallow } from "zustand/react/shallow";

import { useProductStore } from "@/lib/store";
import ProductCard from "@/components/ProductCard";

export default function FeaturedProducts() {
  const navigate = useNavigate();
  const featured = useProductStore(
    useShallow((s) => s.products.filter((p) => p.featured && p.active)),
  );

  return (
    <section className="py-6" id="featured-products-section">
      <div className="mb-4 flex flex-wrap items-center gap-2 px-1">
        <div>
          <p className="m-0 text-[11px] font-bold uppercase tracking-widest text-accent">
            Best Sellers
          </p>
          <h2 className="m-0 text-[clamp(1.2rem,3vw,1.6rem)] font-semibold text-foreground">
            Featured Products
          </h2>
        </div>
        <div className="flex-1" />
        <Button variant="ghost" onPress={() => navigate("/shop")}>
          <span>All Products</span>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {featured.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            onClick={() => navigate(`/product/${p.id}`)}
          />
        ))}
      </div>
    </section>
  );
}
