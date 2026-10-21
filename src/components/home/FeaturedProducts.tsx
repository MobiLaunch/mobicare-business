import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { useProductStore } from "@/lib/store";
import ProductCard from "@/components/ProductCard";
import Reveal from "@/components/ios/Reveal";

export default function FeaturedProducts() {
  const navigate = useNavigate();
  const featured = useProductStore(useShallow((s) => s.products.filter((p) => p.featured && p.active)));

  return (
    <section className="py-6" id="featured-products-section">
      <Reveal className="mb-5 flex flex-wrap items-end gap-2 px-1">
        <div>
          <p className="type-eyebrow m-0">Best Sellers</p>
          <h2 className="ios-section-title">Featured Products</h2>
          <div className="ios-rainbow mt-2 w-24" />
        </div>
        <div className="flex-1" />
        <button className="ios-btn ios-btn--gray ios-btn--sm" type="button" onClick={() => navigate("/shop")}>
          <span>All Products</span>
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>
      </Reveal>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {featured.map((p, i) => (
          <Reveal key={p.id} className="h-full" delay={(i % 4) * 90}>
            <ProductCard product={p} onClick={() => navigate(`/product/${p.id}`)} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
