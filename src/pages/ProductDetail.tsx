import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { addDays, format } from "date-fns";
import {
  ArrowLeft,
  ArrowRight,
  Minus,
  PackageX,
  Plus,
  RotateCcw,
  Shield,
  ShoppingCart,
  Tag,
  TriangleAlert,
  Truck,
} from "lucide-react";
import { Button } from "@heroui/react";
import { useShallow } from "zustand/react/shallow";

import { useCartStore, useProductStore, useToastStore } from "@/lib/store";
import PageMeta from "@/components/PageMeta";
import ProductCard from "@/components/ProductCard";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const product = useProductStore((s) => s.getProduct(id || ""));
  const related = useProductStore(
    useShallow((s) =>
      s.products
        .filter(
          (p) => p.active && p.category === product?.category && p.id !== id,
        )
        .slice(0, 4),
    ),
  );
  const addItem = useCartStore((s) => s.addItem);
  const addToast = useToastStore((s) => s.add);
  const [qty, setQty] = useState(1);

  if (!product || !product.active) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12 text-center">
        <PageMeta
          description="The requested product was not found."
          title="Product Not Found | Mobicare"
        />
        <span className="mb-5 flex size-20 items-center justify-center rounded-full bg-surface-secondary text-accent">
          <PackageX className="size-10" />
        </span>
        <h2 className="m-0 mb-2 text-[clamp(1.8rem,4vw,2.5rem)] font-extrabold">
          Product Not Found
        </h2>
        <p className="m-0 mb-6 max-w-[400px] text-base text-muted">
          The item you are looking for may have been removed or is unavailable.
        </p>
        <Button variant="primary" onPress={() => navigate("/shop")}>
          <span>Back to Shop</span>
          <ArrowRight className="size-4" />
        </Button>
      </div>
    );
  }

  const minArrival = format(
    addDays(new Date(), product.shippingDays.min + 1),
    "MMM d",
  );
  const maxArrival = format(
    addDays(new Date(), product.shippingDays.max + 1),
    "MMM d",
  );
  const discount = product.comparePrice
    ? Math.round((1 - product.price / product.comparePrice) * 100)
    : null;

  const handleAddToCart = () => {
    const added = addItem(product, qty);

    if (added) addToast(`${product.name} added to cart`, "success");
    else addToast(`Only ${product.stock} available in stock`, "error");
  };

  const trustRows = [
    {
      icon: Truck,
      title: "Estimated Arrival",
      sub: `${minArrival} – ${maxArrival}`,
    },
    {
      icon: Shield,
      title: "Secure Checkout",
      sub: "256-bit SSL encryption via Stripe",
    },
    {
      icon: RotateCcw,
      title: "30-Day Guarantee",
      sub: "Unopened items returnable within 30 days.",
    },
  ];

  return (
    <main className="mx-auto max-w-[1400px] overflow-x-hidden px-[clamp(12px,3vw,24px)] py-6 pb-16">
      <PageMeta
        description={`${product.name} - ${product.description.slice(0, 150)}... Buy electronic accessories at Mobicare.`}
        title={`${product.name} | Mobicare Shop`}
      />

      <button
        className="mb-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold text-foreground hover:bg-surface-secondary"
        type="button"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="size-4" />
        <span>Back</span>
      </button>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Left: image */}
        <div className="relative min-w-0">
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-4/5 w-4/5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-soft/50 blur-[60px]" />

          <div className="relative z-[1] overflow-hidden rounded-[28px] border border-border bg-surface-secondary shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
            <img
              alt={product.name}
              className="aspect-square w-full object-cover"
              src={product.images[0]}
            />
            {discount && (
              <span className="absolute right-4 top-4 rounded-xl bg-accent px-3 py-1.5 font-extrabold text-accent-foreground">
                {discount}% OFF
              </span>
            )}
          </div>
        </div>

        {/* Right: details */}
        <div className="flex min-w-0 flex-col">
          <span className="mb-3 inline-flex w-max items-center gap-1.5 self-start rounded-full bg-accent-soft px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-accent">
            <Tag className="size-3.5" />
            {product.category.replace("-", " ")}
          </span>

          <h1 className="m-0 mb-4 break-words text-[clamp(2rem,4.5vw,2.8rem)] font-extrabold leading-[1.15] tracking-tight text-foreground">
            {product.name}
          </h1>

          <div className="mb-5 flex flex-wrap items-center gap-3">
            <strong className="text-[clamp(1.8rem,3vw,2.2rem)] font-extrabold leading-none text-accent">
              ${product.price.toFixed(2)}
            </strong>
            {product.comparePrice && (
              <>
                <span className="text-[clamp(1.1rem,2vw,1.3rem)] text-muted line-through">
                  ${product.comparePrice.toFixed(2)}
                </span>
                <span className="rounded-full bg-success/15 px-3 py-1 text-sm font-bold text-success">
                  Save ${(product.comparePrice - product.price).toFixed(2)}
                </span>
              </>
            )}
          </div>

          <p className="mb-6 break-words text-[clamp(15px,2vw,16px)] leading-relaxed text-muted">
            {product.description}
          </p>

          {product.tags?.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {product.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-border bg-surface-secondary px-3 py-1 text-sm font-semibold"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}

          <div className="my-2 mb-6 border-t border-border" />

          {/* Add to cart */}
          {product.stock > 0 ? (
            <div className="mb-3 flex flex-wrap items-center gap-3.5">
              <div className="flex h-[52px] items-center gap-1 rounded-full border border-border bg-surface-secondary px-2">
                <button
                  className="flex size-9 items-center justify-center rounded-full text-foreground disabled:opacity-40"
                  disabled={qty <= 1}
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                >
                  <Minus className="size-4" />
                </button>
                <span className="w-9 text-center text-base font-bold text-foreground">
                  {qty}
                </span>
                <button
                  className="flex size-9 items-center justify-center rounded-full text-foreground disabled:opacity-40"
                  disabled={qty >= product.stock}
                  type="button"
                  onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                >
                  <Plus className="size-4" />
                </button>
              </div>
              <Button
                className="h-[52px] min-w-[220px] flex-1"
                variant="primary"
                onPress={handleAddToCart}
              >
                <ShoppingCart className="size-[18px]" />
                <span className="truncate">
                  Add to Cart — ${(product.price * qty).toFixed(2)}
                </span>
              </Button>
            </div>
          ) : (
            <div className="mb-4 rounded-2xl bg-danger/10 p-4 text-center font-bold text-danger">
              Out of Stock — Check Back Soon
            </div>
          )}

          {product.stock > 0 && product.stock < 5 && (
            <p className="mb-4 flex items-center gap-1.5 text-[13px] font-bold text-warning">
              <TriangleAlert className="size-[18px]" />
              Only {product.stock} left in stock — order soon
            </p>
          )}

          {/* Trust badges */}
          <article className="mb-5 mt-6 overflow-hidden rounded-[24px] border border-border bg-surface-secondary shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
            {trustRows.map((row, i) => (
              <div
                key={row.title}
                className={`flex items-center gap-3.5 p-[14px_20px] ${i < trustRows.length - 1 ? "border-b border-border" : ""}`}
              >
                <span className="flex size-[42px] shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <row.icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <strong className="block break-words text-sm font-bold text-foreground">
                    {row.title}
                  </strong>
                  <span className="break-words text-[13px] text-muted">
                    {row.sub}
                  </span>
                </div>
              </div>
            ))}
          </article>

          <p className="m-0 text-xs font-semibold text-muted">
            SKU: {product.sku}
          </p>
        </div>
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <div className="mt-16">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="m-0 text-[11px] font-bold uppercase tracking-widest text-accent">
                Explore More
              </p>
              <h3 className="m-0 mt-1 text-[clamp(1.6rem,3.5vw,2.2rem)] font-extrabold text-foreground">
                More in {product.category.replace("-", " ")}
              </h3>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onClick={() => navigate(`/product/${p.id}`)}
              />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
