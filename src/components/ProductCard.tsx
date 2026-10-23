import type { Product } from "@/types/domain";

import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Plus } from "lucide-react";

import ProductImage from "@/components/ProductImage";
import { Badge } from "@/components/arc/badge/badge";
import { useCartStore, useProductStore, useToastStore } from "@/lib/store";

interface ProductCardProps {
  product: Product;
  onClick?: () => void;
}

export default function ProductCard({ product, onClick }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem);
  const addToast = useToastStore((s) => s.add);
  const categoryName = useProductStore((s) => s.categories.find((c) => c.id === product.category)?.name);

  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    if (product.stock < 1) return;

    if (addItem(product)) {
      addToast(`${product.name} added to cart`, "success");
      setAdded(true);
      setTimeout(() => setAdded(false), 1400);
    }
    else addToast(`Only ${product.stock} available in stock`, "error");
  };

  const discount = product.comparePrice ? Math.round((1 - product.price / product.comparePrice) * 100) : null;

  return (
    // The whole card is clickable for pointer users; the product name is the keyboard-accessible link.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <article className="mc-product" onClick={onClick}>
      <div className="mc-media" style={{ position: "relative" }}>
        <ProductImage alt={product.name} src={product.images?.[0]} />
        {product.stock === 0 && (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "color-mix(in oklab, var(--background) 70%, transparent)" }}>
            <Badge>Sold out</Badge>
          </div>
        )}
      </div>

      {discount ? <span className="mc-flag"><Badge tone="success" size="sm">{discount}% off</Badge></span> : null}

      <div className="mc-product-body">
        <span className="mc-product-cat">{categoryName || product.category.split("-").join(" ")}</span>
        <h3 className="mc-product-name">
          <Link
            style={{ color: "inherit", textDecoration: "none" }}
            to={`/product/${product.id}`}
            onClick={(e) => e.stopPropagation()}
          >
            {product.name}
          </Link>
        </h3>
        <p className="mc-small" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{product.description}</p>
        {product.stock > 0 && product.stock < 5 && <span className="mc-small" style={{ color: "var(--warning)" }}>Only {product.stock} left</span>}
      </div>

      <div className="mc-product-foot">
        <span className="mc-price">
          ${product.price?.toFixed(2)}
          {product.comparePrice ? <s>${product.comparePrice.toFixed(2)}</s> : null}
        </span>
        <button
          aria-label={added ? `${product.name} added` : `Add ${product.name} to cart`}
          className={`mc-add${added ? " is-added" : ""}`}
          disabled={product.stock === 0}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleAdd();
          }}
        >
          {added ? <Check aria-hidden="true" size={18} strokeWidth={2} /> : <Plus aria-hidden="true" size={18} strokeWidth={2} />}
        </button>
      </div>
    </article>
  );
}
