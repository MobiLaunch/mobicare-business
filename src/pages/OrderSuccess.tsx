import { useNavigate, useSearchParams } from "react-router-dom";
import { Printer } from "lucide-react";

import { useProductStore } from "@/lib/store";
import { useSiteStore } from "@/lib/siteStore";
import { getEstimatedArrivalWindow } from "@/lib/shipping";
import PageMeta from "@/components/PageMeta";
import ProductImage from "@/components/ProductImage";
import { Button } from "@/components/arc/button/button";
import { Stepper } from "@/components/arc/stepper/stepper";

export default function OrderSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderIdParam = searchParams.get("order_id") || searchParams.get("id");

  const orders = useProductStore((s) => s.orders);
  const business = useSiteStore((s) => s.business);

  // Find order from query param. Only fall back to the most recent order
  // when no explicit id was supplied — never show a different order for an
  // unknown id.
  const order = orderIdParam
    ? orders.find((o) => o.id === orderIdParam)
    : orders[0];

  const arrival = getEstimatedArrivalWindow(3, 5);

  const handlePrint = () => {
    window.print();
  };

  const phone = business?.phone;

  return (
    <div className="mc-page mc-section mc-narrow" id="order-success-page" style={{ marginInline: "auto" }}>
      <PageMeta description="Your order has been received and is being processed by Mobicare." title="Order confirmation | Mobicare" />

      <div className="mc-stack" style={{ gap: "var(--space-8)" }}>
        <header className="mc-stack-sm">
          <p className="mc-small" style={{ color: "var(--success)" }}>Payment confirmed</p>
          <h1 className="mc-h1" style={{ fontSize: "clamp(2rem, 5vw, var(--text-3xl))" }}>Thank you for your order</h1>
          <p className="mc-lead">Your order has been received and is being prepared at our Fairfield, IL shop.</p>
          {order && <p className="mc-text">Order <span className="mc-strong mc-num">{order.id}</span></p>}
        </header>

        <section aria-labelledby="timeline-title" id="delivery-timeline">
          <h2 className="mc-h3" id="timeline-title" style={{ marginBottom: "var(--space-4)" }}>Delivery timeline</h2>
          <Stepper
            current={1}
            label="Order progress"
            steps={[
              { id: "placed", label: "Order placed", description: "Payment authorized via Stripe" },
              { id: "packed", label: "Quality check", description: "Packed at our Fairfield shop" },
              { id: "delivery", label: "Estimated delivery", description: arrival.formatted },
            ]}
          />
        </section>

        {order ? (
          <>
            <section aria-labelledby="items-title" id="order-items">
              <h2 className="mc-h3" id="items-title" style={{ marginBottom: "var(--space-4)" }}>Order items ({order.items.length})</h2>
              <div className="mc-group">
                {order.items.map((item) => (
                  <div key={item.id} className="mc-item mc-item--between">
                    <span style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", minWidth: 0 }}>
                      <span className="mc-media" style={{ width: "3.5rem", flexShrink: 0, position: "relative" }}><ProductImage alt={item.name} src={item.images?.[0]} /></span>
                      <span style={{ minWidth: 0 }}>
                        <strong className="mc-strong" style={{ display: "block", overflowWrap: "anywhere" }}>{item.name}</strong>
                        <span className="mc-small">Qty {item.qty}</span>
                      </span>
                    </span>
                    <span className="mc-num">${(item.price * item.qty).toFixed(2)}</span>
                  </div>
                ))}
                <div className="mc-item mc-item--between"><span className="mc-item-label">Subtotal</span><span className="mc-num">${order.subtotal.toFixed(2)}</span></div>
                <div className="mc-item mc-item--between"><span className="mc-item-label">Shipping</span><span className="mc-num">{order.shipping === 0 ? "Free" : `$${order.shipping.toFixed(2)}`}</span></div>
                <div className="mc-item mc-item--between"><span className="mc-item-label">Tax</span><span className="mc-num">${order.tax.toFixed(2)}</span></div>
                <div className="mc-item mc-item--between"><span className="mc-strong">Total paid</span><span className="mc-price">${order.total.toFixed(2)}</span></div>
              </div>
            </section>

            <section aria-labelledby="ship-title" id="delivery-info">
              <h2 className="mc-h3" id="ship-title" style={{ marginBottom: "var(--space-3)" }}>Shipping to</h2>
              <p className="mc-text">
                <strong className="mc-strong">{order.customer?.name || "Customer"}</strong><br />
                {order.customer?.address}<br />
                {order.customer?.city}, {order.customer?.state} {order.customer?.zip}
              </p>
            </section>
          </>
        ) : (
          <p className="mc-text">We couldn&apos;t find that order. Check your confirmation email for the details.</p>
        )}

        <p className="mc-small">
          Questions about your order? {phone ? <>Call <a className="mc-link" href={`tel:${phone.replace(/[^0-9+]/g, "")}`}>{phone}</a>. </> : null}
          All sales are final; defective items may be exchanged. See <a className="mc-link" href="/returns" onClick={(e) => { e.preventDefault(); navigate("/returns"); }}>returns and exchanges</a>.
        </p>

        <div className="mc-actions">
          <Button onClick={() => navigate("/shop")}>Continue shopping</Button>
          <Button variant="secondary" onClick={handlePrint}><Printer aria-hidden="true" size={16} strokeWidth={1.75} />Print receipt</Button>
        </div>
      </div>
    </div>
  );
}
