import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Clock, Minus, PackageX, Plus, RotateCcw, Shield, ShoppingCart, Tag, TriangleAlert, Truck } from "lucide-react";
import { Button } from "@heroui/react";
import { useShallow } from "zustand/react/shallow";
import { useCartStore, useProductStore, useToastStore } from "@/lib/store";
import { getEstimatedArrivalWindow, getDispatchCutoff } from "@/lib/shipping";
import PageMeta from "@/components/PageMeta";
import ProductCard from "@/components/ProductCard";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const product = useProductStore((s) => s.getProduct(id || ""));
  const related = useProductStore(useShallow((s) => s.products.filter((p) => p.active && p.category === product?.category && p.id !== id).slice(0, 4)));
  const addItem = useCartStore((s) => s.addItem);
  const addToast = useToastStore((s) => s.add);
  const [qty, setQty] = useState(1);

  useEffect(() => setQty(1), [id]);

  if (!product || !product.active) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12 text-center">
        <PageMeta description="The requested product was not found." title="Product Not Found | Mobicare" />
        <span aria-hidden="true" className="mb-5 flex size-20 items-center justify-center rounded-full bg-surface-secondary text-accent"><PackageX className="size-10" /></span>
        <h2 className="m-0 mb-2 text-[clamp(1.8rem,4vw,2.5rem)] font-extrabold">Product Not Found</h2>
        <p className="m-0 mb-6 max-w-[400px] text-base text-muted">The item you are looking for may have been removed or is unavailable.</p>
        <Button variant="primary" onPress={() => navigate("/shop")}><span>Back to Shop</span><ArrowRight aria-hidden="true" className="size-4" /></Button>
      </div>
    );
  }

  const arrival = getEstimatedArrivalWindow(product.shippingDays?.min || 3, product.shippingDays?.max || 5);
  const cutoff = getDispatchCutoff();
  const discount = product.comparePrice ? Math.round((1 - product.price / product.comparePrice) * 100) : null;
  const handleAddToCart = () => {
    const added = addItem(product, qty);
    if (added) addToast(`${product.name} added to cart`, "success");
    else addToast(`Only ${product.stock} available in stock`, "error");
  };
  const trustRows = [
    { icon: Truck, title: "Estimated Delivery", sub: arrival.formatted },
    { icon: Shield, title: "Direct Stripe Checkout", sub: "256-bit SSL encrypted & secure" },
    { icon: RotateCcw, title: "30-Day Guarantee", sub: "Unopened items returnable within 30 days." },
  ];

  return (
    <main className="mx-auto max-w-[1400px] overflow-x-hidden px-[clamp(12px,3vw,24px)] py-4 pb-16 sm:py-6">
      <PageMeta description={`${product.name} - ${(product.description || "").slice(0, 150)}... Buy electronic accessories at Mobicare.`} title={`${product.name} | Mobicare Shop`} />
      <button aria-label="Go back" className="mb-4 inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 py-2 font-semibold text-foreground transition-colors hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:mb-5" type="button" onClick={() => navigate(-1)}>
        <ArrowLeft aria-hidden="true" className="size-4" /><span>Back</span>
      </button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-10">
        <div className="relative min-w-0">
          <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-4/5 w-4/5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-soft/50 blur-[60px]" />
          <div className="relative z-[1] overflow-hidden rounded-[24px] border border-border bg-surface-secondary shadow-[0_8px_32px_rgba(0,0,0,0.08)] sm:rounded-[28px]">
            <img alt={product.name} className="aspect-square w-full object-cover" decoding="async" fetchPriority="high" src={product.images[0]} />
            {discount && <span className="absolute right-3 top-3 rounded-xl bg-accent px-3 py-1.5 font-extrabold text-accent-foreground sm:right-4 sm:top-4">{discount}% OFF</span>}
          </div>
        </div>

        <div className="flex min-w-0 flex-col">
          <span className="mb-3 inline-flex w-max items-center gap-1.5 self-start rounded-full bg-accent-soft px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-accent"><Tag aria-hidden="true" className="size-3.5" />{product.category.replace("-", " ")}</span>
          <h1 className="m-0 mb-3 break-words text-[clamp(2rem,7vw,2.8rem)] font-extrabold leading-[1.12] tracking-tight text-foreground sm:mb-4">{product.name}</h1>
          <div className="mb-4 flex flex-wrap items-center gap-2.5 sm:mb-5 sm:gap-3">
            <strong className="text-[clamp(1.8rem,7vw,2.2rem)] font-extrabold leading-none text-accent">${product.price.toFixed(2)}</strong>
            {product.comparePrice && <><span className="text-lg text-muted line-through">${product.comparePrice.toFixed(2)}</span><span className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-bold text-emerald-600 dark:text-emerald-400">Save ${(product.comparePrice - product.price).toFixed(2)}</span></>}
          </div>
          <p className="mb-5 break-words text-[15px] leading-relaxed text-muted sm:mb-6 sm:text-base">{product.description}</p>
          {product.tags?.length > 0 && <div className="mb-5 flex flex-wrap gap-2 sm:mb-6">{product.tags.map((t) => <span key={t} className="rounded-full border border-border bg-surface-secondary px-3 py-1 text-sm font-semibold">#{t}</span>)}</div>}
          <div className="my-1 mb-4 border-t border-border" />
          <div className="mb-5 flex items-start gap-2.5 rounded-2xl bg-accent-soft p-3 text-sm text-foreground" role="status"><Clock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent" /><div className="min-w-0"><span className="font-semibold text-accent">{cutoff.text}</span><span className="text-muted"> — estimated delivery by </span><strong>{arrival.formatted}</strong></div></div>

          {product.stock > 0 ? (
            <div className="mb-3 flex w-full flex-col gap-3 min-[420px]:flex-row min-[420px]:items-center">
              <div aria-label="Quantity" className="flex h-[52px] w-full items-center justify-between rounded-full border border-border bg-surface-secondary px-2 min-[420px]:w-auto min-[420px]:justify-start">
                <button aria-label="Decrease quantity" className="flex size-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40" disabled={qty <= 1} type="button" onClick={() => setQty((q) => Math.max(1, q - 1))}><Minus aria-hidden="true" className="size-4" /></button>
                <span aria-live="polite" className="w-10 text-center text-base font-bold text-foreground">{qty}</span>
                <button aria-label="Increase quantity" className="flex size-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40" disabled={qty >= product.stock} type="button" onClick={() => setQty((q) => Math.min(product.stock, q + 1))}><Plus aria-hidden="true" className="size-4" /></button>
              </div>
              <Button className="h-[52px] w-full min-w-0 sm:min-w-[220px]" variant="primary" onPress={handleAddToCart}><ShoppingCart aria-hidden="true" className="size-[18px]" /><span className="truncate">Add to Cart — ${(product.price * qty).toFixed(2)}</span></Button>
            </div>
          ) : <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-center font-bold text-rose-600 dark:text-rose-400">Out of Stock — Check Back Soon</div>}

          {product.stock > 0 && product.stock < 5 && <p className="mb-4 flex items-center gap-1.5 text-[13px] font-bold text-amber-600 dark:text-amber-400"><TriangleAlert aria-hidden="true" className="size-[18px]" />Only {product.stock} left in stock — order soon</p>}
          <article className="mb-5 mt-4 overflow-hidden rounded-[22px] border border-border bg-surface-secondary shadow-[0_4px_16px_rgba(0,0,0,0.04)] sm:mt-6 sm:rounded-[24px]">
            {trustRows.map((row, i) => <div key={row.title} className={`flex items-center gap-3.5 p-[14px_16px] sm:p-[14px_20px] ${i < trustRows.length - 1 ? "border-b border-border" : ""}`}><span aria-hidden="true" className="flex size-[42px] shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"><row.icon className="size-5" /></span><div className="min-w-0"><strong className="block break-words text-sm font-bold text-foreground">{row.title}</strong><span className="break-words text-[13px] text-muted">{row.sub}</span></div></div>)}
          </article>
          <p className="m-0 text-xs font-semibold text-muted">SKU: {product.sku}</p>
        </div>
      </div>

      {related.length > 0 && <div className="mt-12 sm:mt-16"><div className="mb-5 flex items-end justify-between sm:mb-6"><div><p className="m-0 text-[11px] font-bold uppercase tracking-widest text-accent">Explore More</p><h3 className="m-0 mt-1 text-[clamp(1.6rem,6vw,2.2rem)] font-extrabold text-foreground">More in {product.category.replace("-", " ")}</h3></div></div><div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">{related.map((p) => <ProductCard key={p.id} product={p} onClick={() => navigate(`/product/${p.id}`)} />)}</div></div>}
    </main>
  );
}
