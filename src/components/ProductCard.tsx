import type { Product } from "@/types/domain";

import { ShoppingCart, Tag } from "lucide-react";
import { Button, Chip } from "@heroui/react";

import { useCartStore, useToastStore } from "@/lib/store";

interface ProductCardProps {
  product: Product;
  onClick?: () => void;
}

export default function ProductCard({ product, onClick }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem);
  const addToast = useToastStore((s) => s.add);

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

  return (
    <div
      className="group flex h-full flex-col gap-3 rounded-3xl bg-surface p-4 transition-transform duration-200 hover:-translate-y-0.5"
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-surface-secondary">
        <img
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          src={product.images?.[0]}
        />

        {discount && (
          <Chip
            className="absolute left-2 top-2 gap-1"
            color="accent"
            size="sm"
          >
            <Tag className="size-3" />
            <Chip.Label>{discount}% OFF</Chip.Label>
          </Chip>
        )}

        {product.stock > 0 && product.stock < 5 && (
          <Chip className="absolute bottom-2 left-2" color="danger" size="sm">
            <Chip.Label>Only {product.stock} left</Chip.Label>
          </Chip>
        )}

        {product.stock === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <span className="font-bold text-white">Sold Out</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1">
        <p className="m-0 text-xs font-bold uppercase text-accent">
          {product.category?.replace("-", " ")}
        </p>

        <h3 className="m-0 text-base font-semibold text-foreground">
          {product.name}
        </h3>

        <p className="m-0 line-clamp-2 text-sm text-muted">
          {product.description}
        </p>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <div className="flex-1">
          <strong className="text-lg text-foreground">
            ${product.price?.toFixed(2)}
          </strong>

          {product.comparePrice && (
            <span className="ml-2 text-sm text-muted line-through">
              ${product.comparePrice.toFixed(2)}
            </span>
          )}
        </div>

        <Button
          isIconOnly
          aria-label={`Add ${product.name} to cart`}
          className="rounded-full"
          isDisabled={product.stock === 0}
          variant="primary"
          onPress={handleAddToCart}
        >
          <ShoppingCart className="size-4" />
        </Button>
      </div>
    </div>
  );
}
