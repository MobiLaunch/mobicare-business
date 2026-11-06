import type { Product } from "@/types/domain";
import ProductImage from "@/components/ProductImage";

import { ShoppingCart, Tag } from "lucide-react";
import { Button, Chip } from "@heroui/react";

import { useCartStore, useProductStore, useToastStore } from "@/lib/store";

interface ProductCardProps {
  product: Product;
  onClick?: () => void;
}

export default function ProductCard({ product, onClick }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem);
  const addToast = useToastStore((s) => s.add);
  const categoryName = useProductStore(
    (s) => s.categories.find((c) => c.id === product.category)?.name,
  );

  const handleAddToCart = () => {
    if (product.stock < 1) return;

    const added = addItem(product);

    if (added) {
      addToast(`${product.name} added to cart`, "success");
    } else {
      addToast(`Only ${product.stock} available in stock`, "error");
    }
  };

  const discount = product.comparePrice
    ? Math.round((1 - product.price / product.comparePrice) * 100)
    : null;

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onClick || event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <article
      className="surface-raised lift group flex h-full cursor-pointer flex-col gap-3 rounded-panel p-3.5 sm:p-4"
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={handleCardKeyDown}
    >
      <div className="surface-sunken relative aspect-square overflow-hidden rounded-card">
        <ProductImage
          alt={product.name}
          className="transition-transform duration-300 group-hover:scale-105"
          src={product.images?.[0]}
        />

        {discount && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-pill bg-highlight px-2 py-1 text-caption font-extrabold text-background shadow-[var(--elev-1)]">
            <Tag aria-hidden="true" className="size-3" />
            {discount}% OFF
          </span>
        )}

        {product.stock > 0 && product.stock < 5 && (
          <Chip className="absolute bottom-2 left-2" color="danger" size="sm">
            <Chip.Label>Only {product.stock} left</Chip.Label>
          </Chip>
        )}

        {product.stock === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/78 backdrop-blur-[2px]">
            <span className="type-eyebrow rounded-pill border border-border bg-surface px-3 py-1.5 text-foreground">
              Sold Out
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1">
        <p className="type-eyebrow m-0 text-accent-bright">
          {categoryName || product.category.split("-").join(" ")}
        </p>

        <h3 className="type-heading m-0 line-clamp-2 text-base font-bold text-foreground">
          {product.name}
        </h3>

        <p className="m-0 line-clamp-2 text-sm leading-relaxed text-muted">
          {product.description}
        </p>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <div className="min-w-0 flex-1">
          <strong className="text-heading-sm font-extrabold tabular-nums tracking-[var(--tracking-heading)] text-foreground">
            ${product.price?.toFixed(2)}
          </strong>

          {product.comparePrice && (
            <span className="ml-2 text-label tabular-nums text-muted line-through">
              ${product.comparePrice.toFixed(2)}
            </span>
          )}
        </div>

        <Button
          isIconOnly
          aria-label={`Add ${product.name} to cart`}
          className="shrink-0 rounded-full"
          isDisabled={product.stock === 0}
          variant="primary"
          onPress={() => handleAddToCart()}
        >
          <ShoppingCart className="size-4" />
        </Button>
      </div>
    </article>
  );
}
