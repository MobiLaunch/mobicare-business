import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { RotateCcw, Shield, ShoppingCart, Truck } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { useCartStore, useProductStore, useToastStore } from "@/lib/store";
import { useCopy } from "@/lib/copy";
import { getEstimatedArrivalWindow, getDispatchCutoff } from "@/lib/shipping";
import PageMeta from "@/components/PageMeta";
import ProductCard from "@/components/ProductCard";
import ProductImage from "@/components/ProductImage";
import { Alert } from "@/components/arc/alert/alert";
import { Badge } from "@/components/arc/badge/badge";
import { Breadcrumb } from "@/components/arc/breadcrumb/breadcrumb";
import { Button } from "@/components/arc/button/button";
import { EmptyState } from "@/components/arc/empty-state/empty-state";
import { NumberField } from "@/components/arc/number-field/number-field";

export default function ProductDetail() {
  const c = useCopy();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const product = useProductStore((s) => s.getProduct(id || ""));
  const related = useProductStore(useShallow((s) => s.products.filter((p) => p.active && p.category === product?.category && p.id !== id).slice(0, 4)));
  const categoryName = useProductStore((s) => s.categories.find((c) => c.id === product?.category)?.name);
  const addItem = useCartStore((s) => s.addItem);
  const addToast = useToastStore((s) => s.add);
  const [qty, setQty] = useState(1);

  useEffect(() => setQty(1), [id]);

  if (!product || !product.active) {
    return (
      <div className="mc-page mc-section">
        <PageMeta description="The requested product was not found." title="Product not found | Mobicare" />
        <EmptyState
          action={<Button onClick={() => navigate("/shop")}>Back to the shop</Button>}
          description="The item you are looking for may have been removed or is unavailable."
          title="Product not found"
        />
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
    { icon: Truck, k: "product.trust.delivery", title: c("product.trust.delivery"), sub: arrival.formatted },
    { icon: Shield, k: "product.trust.secure.title", sk: "product.trust.secure.sub", title: c("product.trust.secure.title"), sub: c("product.trust.secure.sub") },
    { icon: RotateCcw, k: "product.trust.exchange.title", sk: "product.trust.exchange.sub", title: c("product.trust.exchange.title"), sub: c("product.trust.exchange.sub") },
  ];

  return (
    <div className="mc-page mc-section" id="product-page" style={{ paddingTop: "var(--space-6)" }}>
      <PageMeta description={`${product.name} - ${(product.description || "").slice(0, 150)}... Buy electronic accessories at Mobicare.`} title={`${product.name} | Mobicare Shop`} />

      <div style={{ marginBottom: "var(--space-6)" }}>
        <Breadcrumb items={[{ label: "Shop", href: "/shop", onClick: (e) => { e.preventDefault(); navigate("/shop"); } }, { label: product.name }]} />
      </div>

      <div className="mc-grid mc-grid-2" style={{ gap: "clamp(24px, 5vw, 64px)", alignItems: "start" }}>
        <div className="mc-media" style={{ position: "relative", borderRadius: "var(--radius-panel)" }}>
          <ProductImage alt={product.name} src={product.images?.[0]} />
        </div>

        <div className="mc-stack">
          <div className="mc-stack-sm">
            <p className="mc-small">{categoryName || product.category.replace("-", " ")}</p>
            <h1 className="mc-h1" style={{ fontSize: "clamp(1.75rem, 4vw, var(--text-3xl))" }}>{product.name}</h1>
          </div>

          <p className="mc-price" style={{ fontSize: "var(--text-2xl)" }}>
            ${product.price.toFixed(2)}
            {product.comparePrice ? <s>${product.comparePrice.toFixed(2)}</s> : null}
            {discount ? <span style={{ marginLeft: "var(--space-3)" }}><Badge tone="success">Save {discount}%</Badge></span> : null}
          </p>

          <p className="mc-text">{product.description}</p>
          {product.tags?.length > 0 && <div className="mc-badge-row">{product.tags.map((t) => <Badge key={t}>{t}</Badge>)}</div>}

          <Alert title={cutoff.text} tone="info">Estimated delivery by {arrival.formatted}.</Alert>

          {product.stock > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "end", gap: "var(--space-3)" }}>
              <NumberField label="Quantity" max={Math.min(product.stock, 99)} min={1} value={qty} onValueChange={setQty} />
              <Button size="lg" onClick={handleAddToCart}>
                <ShoppingCart aria-hidden="true" size={16} strokeWidth={1.75} />
                Add to cart, ${(product.price * qty).toFixed(2)}
              </Button>
            </div>
          ) : (
            <Alert title="Out of stock" tone="warning">Check back soon.</Alert>
          )}
          {product.stock > 0 && product.stock < 5 && <p className="mc-small" style={{ color: "var(--warning)" }}>Only {product.stock} left in stock.</p>}

          <div className="mc-group">
            {trustRows.map((row) => (
              <div key={row.title} className="mc-item" style={{ alignItems: "start" }}>
                <span className="mc-icon" style={{ flexShrink: 0 }}><row.icon aria-hidden="true" size={18} strokeWidth={1.75} /></span>
                <div>
                  <strong className="mc-strong" style={{ display: "block" }} {...c.p(row.k)}>{row.title}</strong>
                  <span className="mc-small" {...(row.sk ? c.p(row.sk) : {})}>{row.sub}</span>
                </div>
              </div>
            ))}
          </div>

          <p className="mc-small">
            SKU {product.sku}. <Link className="mc-link" to="/returns">Returns and exchanges</Link>, <Link className="mc-link" to="/shipping">shipping</Link>, <Link className="mc-link" to="/refunds">refunds</Link>.
          </p>
        </div>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-title" style={{ marginTop: "var(--space-16)" }}>
          <h2 className="mc-h2" id="related-title" style={{ marginBottom: "var(--space-6)" }}>More in {categoryName || product.category.replace("-", " ")}</h2>
          <div className="mc-grid mc-grid-products">
            {related.map((p) => <ProductCard key={p.id} product={p} onClick={() => navigate(`/product/${p.id}`)} />)}
          </div>
        </section>
      )}
    </div>
  );
}
