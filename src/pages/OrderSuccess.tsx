import type { Order } from "@/types/domain";

import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Printer } from "lucide-react";

import { useAuth } from "@/lib/AuthContext";
import { useProductStore } from "@/lib/store";
import { useSiteStore } from "@/lib/siteStore";
import { getEstimatedArrivalWindow } from "@/lib/shipping";
import { sbFetchCustomerOrders } from "@/lib/supabase";
import PageMeta from "@/components/PageMeta";
import ProductImage from "@/components/ProductImage";
import { Button } from "@/components/arc/button/button";
import { Stepper } from "@/components/arc/stepper/stepper";

const FAIRFIELD_SHOP_ADDRESS = "920 Commerce Drive, Suite 3, Fairfield, IL 62837";

export default function OrderSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderIdParam = searchParams.get("order_id") || searchParams.get("id");
  const { user } = useAuth();

  const orders = useProductStore((s) => s.orders);
  const business = useSiteStore((s) => s.business);
  const [fetchedOrder, setFetchedOrder] = useState<Order | null>(null);

  const localOrder = orderIdParam
    ? orders.find((o) => o.id === orderIdParam)
    : orders[0];
  const order = localOrder || fetchedOrder;

  // If the customer refreshes /order-success?order_id=... while signed in, load from their account orders
  useEffect(() => {
    if (localOrder || !orderIdParam || !user?.id) return;
    let active = true;

    void sbFetchCustomerOrders(user.id).then(({ data }) => {
      if (!active || !data) return;
      const match = data.find((o) => o.id === orderIdParam);

      if (match) setFetchedOrder(match);
    });

    return () => {
      active = false;
    };
  }, [localOrder, orderIdParam, user?.id]);

  const isPickup =
    order?.shippingMethod === "pickup" ||
    Boolean(order?.customer?.address?.includes("Fairfield Store Pickup")) ||
    (order != null && !order.customer?.address);

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
          {(order?.id || orderIdParam) && (
            <p className="mc-text">
              Order <span className="mc-strong mc-num">{order?.id || orderIdParam}</span>
            </p>
          )}
        </header>

        <section aria-labelledby="timeline-title" id="delivery-timeline">
          <h2 className="mc-h3" id="timeline-title" style={{ marginBottom: "var(--space-4)" }}>
            {isPickup ? "Pickup timeline" : "Delivery timeline"}
          </h2>
          <Stepper
            current={1}
            label="Order progress"
            steps={
              isPickup
                ? [
                    { id: "placed", label: "Order placed", description: "Payment authorized via Stripe" },
                    { id: "packed", label: "Preparing pickup", description: "Pulled at our Fairfield shop" },
                    { id: "pickup", label: "Ready for pickup", description: FAIRFIELD_SHOP_ADDRESS },
                  ]
                : [
                    { id: "placed", label: "Order placed", description: "Payment authorized via Stripe" },
                    { id: "packed", label: "Quality check", description: "Packed at our Fairfield shop" },
                    { id: "delivery", label: "Estimated delivery", description: arrival.formatted },
                  ]
            }
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
              <h2 className="mc-h3" id="ship-title" style={{ marginBottom: "var(--space-3)" }}>
                {isPickup ? "Pickup location" : "Shipping to"}
              </h2>
              {isPickup ? (
                <p className="mc-text">
                  <strong className="mc-strong">Mobicare Device Recovery</strong><br />
                  920 Commerce Drive, Suite 3<br />
                  Fairfield, IL 62837
                </p>
              ) : (
                <p className="mc-text">
                  <strong className="mc-strong">{order.customer?.name || "Customer"}</strong><br />
                  {order.customer?.address}<br />
                  {order.customer?.city}, {order.customer?.state} {order.customer?.zip}
                </p>
              )}
            </section>
          </>
        ) : (
          <p className="mc-text">
            Check your confirmation email for full receipt details, or{" "}
            <Link
              className="mc-link"
              to={
                orderIdParam
                  ? `/repair-status?order=${encodeURIComponent(orderIdParam)}`
                  : "/repair-status?tab=order"
              }
            >
              track your order status online
            </Link>
            .
          </p>
        )}

        <p className="mc-small">
          Questions about your order? {phone ? <>Call <a className="mc-link" href={`tel:${phone.replace(/[^0-9+]/g, "")}`}>{phone}</a>. </> : null}
          All sales are final; defective items may be exchanged. See <Link className="mc-link" to="/returns">returns and exchanges</Link>.
        </p>

        <div className="mc-actions">
          <Button onClick={() => navigate("/shop")}>Continue shopping</Button>
          <Button variant="secondary" onClick={handlePrint}><Printer aria-hidden="true" size={16} strokeWidth={1.75} />Print receipt</Button>
        </div>
      </div>
    </div>
  );
}
