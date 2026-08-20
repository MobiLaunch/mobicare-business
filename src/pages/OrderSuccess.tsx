import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Mail,
  Package,
  Phone,
  Printer,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { Button } from "@heroui/react";

import { useProductStore } from "@/lib/store";
import { useSiteStore } from "@/lib/siteStore";
import { getEstimatedArrivalWindow } from "@/lib/shipping";
import PageMeta from "@/components/PageMeta";

export default function OrderSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderIdParam = searchParams.get("order_id") || searchParams.get("id");

  const orders = useProductStore((s) => s.orders);
  const business = useSiteStore((s) => s.business);

  // Find order from query param or fallback to the most recent placed order
  const order = orderIdParam
    ? orders.find((o) => o.id === orderIdParam) || orders[0]
    : orders[0];

  const arrival = getEstimatedArrivalWindow(3, 5);

  const handlePrint = () => {
    window.print();
  };

  return (
    <main
      className="mx-auto max-w-[1000px] px-4 py-12 pb-24"
      id="order-success-page"
    >
      <PageMeta
        description="Your order has been received and is being processed by Mobicare."
        title="Order Confirmation | Mobicare"
      />

      <div className="flex flex-col items-center text-center">
        {/* Animated celebration icon */}
        <div className="mb-6 flex size-24 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-xl shadow-accent/25">
          <CheckCircle2 className="size-12 animate-pulse" />
        </div>

        <span className="rounded-full bg-accent-soft px-4 py-1 text-xs font-bold uppercase tracking-wider text-accent">
          Payment Confirmed
        </span>

        <h1 className="m-0 mt-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
          Thank you for your order!
        </h1>

        <p className="m-0 mt-2 max-w-md text-base text-muted">
          Your order has been received and is now being prepped at our
          Fairfield, IL shop.
        </p>

        {order && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface-secondary px-4 py-1.5 text-sm font-semibold text-foreground">
            <span>Order ID:</span>
            <span className="font-mono text-accent">{order.id}</span>
          </div>
        )}
      </div>

      {/* Dynamic Delivery Timeline */}
      <section
        className="mt-10 overflow-hidden rounded-[28px] border border-border bg-surface p-6 shadow-sm sm:p-8"
        id="delivery-timeline"
      >
        <h3 className="m-0 mb-6 text-lg font-bold text-foreground">
          Delivery Status &amp; Timeline
        </h3>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="flex items-start gap-3.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <CheckCircle2 className="size-5" />
            </span>
            <div>
              <strong className="block text-sm font-bold text-foreground">
                1. Order Placed
              </strong>
              <span className="text-xs text-muted">
                Payment authorized via Stripe
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Package className="size-5" />
            </span>
            <div>
              <strong className="block text-sm font-bold text-foreground">
                2. Quality Check
              </strong>
              <span className="text-xs text-muted">
                Packaging at Fairfield facility
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Truck className="size-5" />
            </span>
            <div>
              <strong className="block text-sm font-bold text-foreground">
                3. Estimated Delivery
              </strong>
              <span className="text-xs font-bold text-accent">
                {arrival.formatted}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Order Details & Summary */}
      {order ? (
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
          {/* Items Summary */}
          <section
            className="rounded-[28px] border border-border bg-surface p-6 sm:p-8"
            id="order-items"
          >
            <h3 className="m-0 mb-4 text-base font-bold text-foreground">
              Order Items ({order.items.length})
            </h3>
            <div className="flex flex-col divide-y divide-border">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-3.5"
                >
                  <div className="flex items-center gap-3.5">
                    <img
                      alt={item.name}
                      className="size-14 rounded-xl object-cover"
                      src={
                        item.images?.[0] ||
                        "https://images.unsplash.com/photo-1609592179791-5b2f37d4c6e1?w=120&q=80"
                      }
                    />
                    <div>
                      <h4 className="m-0 text-sm font-semibold text-foreground">
                        {item.name}
                      </h4>
                      <span className="text-xs text-muted">
                        Qty: {item.qty}
                      </span>
                    </div>
                  </div>
                  <strong className="text-sm text-accent">
                    ${(item.price * item.qty).toFixed(2)}
                  </strong>
                </div>
              ))}
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <div className="flex justify-between py-1 text-sm text-muted">
                <span>Subtotal</span>
                <span className="text-foreground">
                  ${order.subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between py-1 text-sm text-muted">
                <span>Shipping</span>
                <span className="text-foreground">
                  {order.shipping === 0
                    ? "FREE"
                    : `$${order.shipping.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between py-1 text-sm text-muted">
                <span>Tax</span>
                <span className="text-foreground">${order.tax.toFixed(2)}</span>
              </div>
              <div className="my-2 border-t border-border" />
              <div className="flex justify-between text-base">
                <strong className="text-foreground">Total Paid</strong>
                <strong className="text-lg font-bold text-accent">
                  ${order.total.toFixed(2)}
                </strong>
              </div>
            </div>
          </section>

          {/* Delivery & Customer Info */}
          <section className="flex flex-col gap-6" id="delivery-info">
            <div className="rounded-[28px] border border-border bg-surface p-6">
              <h3 className="m-0 mb-3 text-sm font-bold text-foreground">
                Shipping Destination
              </h3>
              <p className="m-0 text-sm leading-relaxed text-foreground">
                <strong>{order.customer.name}</strong>
                <br />
                {order.customer.address}
                <br />
                {order.customer.city}, {order.customer.state}{" "}
                {order.customer.zip}
                <br />
                <span className="text-xs text-muted">
                  {order.customer.email}
                </span>
              </p>
            </div>

            <div className="rounded-[28px] border border-border bg-accent-soft p-6">
              <h3 className="m-0 mb-2 text-sm font-bold text-accent">
                Need Help with Your Order?
              </h3>
              <p className="m-0 text-xs text-foreground">
                Contact our shop anytime. We’re open Monday through Saturday in
                Fairfield.
              </p>
              <div className="mt-3 flex flex-col gap-2 text-xs font-semibold">
                {business.phone && (
                  <a
                    className="inline-flex items-center gap-2 text-foreground hover:text-accent"
                    href={`tel:${business.phone}`}
                  >
                    <Phone className="size-3.5 text-accent" />
                    <span>{business.phone}</span>
                  </a>
                )}
                {business.email && (
                  <a
                    className="inline-flex items-center gap-2 text-foreground hover:text-accent"
                    href={`mailto:${business.email}`}
                  >
                    <Mail className="size-3.5 text-accent" />
                    <span>{business.email}</span>
                  </a>
                )}
              </div>
            </div>
          </section>
        </div>
      ) : (
        <div className="mt-8 text-center">
          <Button variant="primary" onPress={() => navigate("/shop")}>
            <ShoppingBag className="size-4" />
            <span>Explore Products</span>
          </Button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Button variant="primary" onPress={() => navigate("/shop")}>
          <span>Continue Shopping</span>
          <ArrowRight className="size-4" />
        </Button>
        <Button variant="outline" onPress={() => navigate("/account")}>
          View in My Account
        </Button>
        <Button variant="ghost" onPress={handlePrint}>
          <Printer className="size-4" />
          <span>Print Receipt</span>
        </Button>
      </div>
    </main>
  );
}
