import type { Order } from "@/types/domain";
import ProductImage from "@/components/ProductImage";

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Elements, CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Lock, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/arc/button/button";
import { Drawer, DrawerContent } from "@/components/arc/drawer/drawer";
import { EmptyState } from "@/components/arc/empty-state/empty-state";
import { Alert } from "@/components/arc/alert/alert";
import { Input } from "@/components/arc/input/input";
import { NumberField } from "@/components/arc/number-field/number-field";
import { RadioCards } from "@/components/arc/radio-cards/radio-cards";
import { Stepper } from "@/components/arc/stepper/stepper";
import { useAuth } from "@/lib/AuthContext";
import { useCartStore, useProductStore, useToastStore } from "@/lib/store";
import { getDynamicShippingOptions } from "@/lib/shipping";
import { getStripePublishableKey } from "@/lib/config";

type Step = "cart" | "shipping" | "payment" | "success";
type ShippingInfo = { name: string; email: string; phone: string; address: string; city: string; state: string; zip: string };
// Matches the standard-shipping rule in lib/shipping.ts and the server-side pricing.
const FREE_SHIPPING_AT = 35;

type Pricing = { subtotal: number; shipping: number; tax: number; total: number };
type PaymentSession = Pricing & { id: string; clientSecret: string; idempotencyKey: string };

const stripePromise = (() => {
  const key = getStripePublishableKey();
  return key ? loadStripe(key) : null;
})();

function PaymentStep({ session, shippingInfo, items, shippingMethod, onSuccess, onBack, onNavigate }: { onNavigate: (path: string) => void; session: PaymentSession; shippingInfo: ShippingInfo; items: ReturnType<typeof useCartStore.getState>["items"]; shippingMethod: string; onSuccess: (order: Order) => void; onBack: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const addToast = useToastStore((s) => s.add);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pay = async () => {
    if (!stripe || !elements) return;
    const card = elements.getElement(CardElement);
    if (!card) return;
    setBusy(true);
    setError("");
    try {
      const result = await stripe.confirmCardPayment(session.clientSecret, {
        payment_method: {
          card,
          billing_details: {
            name: shippingInfo.name,
            email: shippingInfo.email,
            phone: shippingInfo.phone || undefined,
            address: { line1: shippingInfo.address, city: shippingInfo.city, state: shippingInfo.state, postal_code: shippingInfo.zip, country: "US" },
          },
        },
      });

      if (result.error) throw new Error(result.error.message || "Payment could not be completed.");
      if (result.paymentIntent?.status !== "succeeded") throw new Error(`Payment requires additional action (status: ${result.paymentIntent?.status || "unknown"}).`);

      const orderResponse = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": session.idempotencyKey },
        body: JSON.stringify({
          id: `ORD-${Date.now().toString(36).toUpperCase()}`,
          paymentIntentId: result.paymentIntent.id,
          items: items.map((item) => ({ id: item.id, qty: item.qty })),
          customer: shippingInfo,
          shippingMethod,
          total: session.total,
        }),
      });

      const saved = await orderResponse.json().catch(() => ({}));
      if (!orderResponse.ok || !saved.ok) throw new Error(saved.error || "Payment succeeded, but the order could not be saved.");

      const order: Order = {
        id: saved.orderId,
        status: "paid",
        createdAt: new Date().toISOString(),
        customer: shippingInfo,
        items: [...items],
        subtotal: saved.subtotal,
        shipping: saved.shipping,
        tax: saved.tax,
        total: saved.total,
      };
      onSuccess(order);
      addToast("Payment successful! Your order has been placed.", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment could not be completed.");
    } finally {
      setBusy(false);
    }
  };

  const link = (path: string, label: string) => (
    <a className="mc-link" href={path} onClick={(e) => { e.preventDefault(); onNavigate(path); }}>{label}</a>
  );

  return (
    <div className="mc-stack">
      <Alert title="Secure payment" tone="info">Your card details are handled by Stripe and never touch our servers.</Alert>
      {error && <Alert title="Payment problem" tone="danger">{error}</Alert>}
      <div className="mc-stack-sm">
        <span className="mc-gl" style={{ margin: 0 }}>Card details</span>
        <div className="mc-card" style={{ padding: "var(--space-4)" }}>
          <CardElement options={{ hidePostalCode: true, style: { base: { fontSize: "16px", color: getComputedStyle(document.documentElement).getPropertyValue("--foreground").trim() || "#111", fontFamily: "Inter Variable, system-ui, sans-serif" } } }} />
        </div>
      </div>
      <div className="mc-group">
        <div className="mc-item mc-item--between"><span className="mc-item-label">Delivering to</span><span className="mc-strong">{shippingInfo.city}, {shippingInfo.state} {shippingInfo.zip}</span></div>
        <div className="mc-item mc-item--between"><span className="mc-item-label">Total due</span><span className="mc-price">${session.total.toFixed(2)}</span></div>
      </div>
      <p className="mc-small">By paying you agree to our {link("/shipping", "shipping")}, {link("/returns", "returns and exchanges")} and {link("/refunds", "refund")} policies. All sales are final; defective items are eligible for exchange.</p>
      <div className="mc-actions" style={{ justifyContent: "space-between" }}>
        <Button disabled={busy} variant="secondary" onClick={onBack}>Back</Button>
        <Button disabled={!stripe} loading={busy} onClick={pay}><Lock aria-hidden="true" size={16} strokeWidth={1.75} />Pay ${session.total.toFixed(2)}</Button>
      </div>
    </div>
  );
}

export default function CheckoutDrawer() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const items = useCartStore((s) => s.items);
  const products = useProductStore((s) => s.products);
  const updateQty = useCartStore((s) => s.updateQty);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const open = useCartStore((s) => s.cartDrawerOpen);
  const setOpen = useCartStore((s) => s.setCartDrawerOpen);
  const [step, setStep] = useState<Step>("cart");
  const [shippingMethod, setShippingMethod] = useState<"standard" | "express" | "pickup">("standard");
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo>({ name: "", email: "", phone: "", address: "", city: "", state: "", zip: "" });
  const [session, setSession] = useState<PaymentSession | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [quoting, setQuoting] = useState(false);

  useEffect(() => {
    if (user && !shippingInfo.email) setShippingInfo((v) => ({ ...v, email: user.email || "", name: (user.user_metadata?.full_name as string) || "" }));
  }, [user, shippingInfo.email]);

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.price * item.qty, 0), [items]);
  const options = useMemo(() => getDynamicShippingOptions(subtotal), [subtotal]);
  const shipping = options.find((option) => option.id === shippingMethod) || options[0];
  const close = () => setOpen(false);
  const finish = (saved: Order) => { setOrder(saved); clearCart(); setSession(null); setStep("success"); };
  const proceedDelivery = () => { if (items.length) setStep("shipping"); };

  const proceedPayment = async () => {
    const required = [shippingInfo.name, shippingInfo.email, shippingInfo.address, shippingInfo.city, shippingInfo.state, shippingInfo.zip];
    if (required.some((value) => !value.trim())) return useToastStore.getState().add("Please complete all required delivery fields.", "error");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shippingInfo.email)) return useToastStore.getState().add("Please enter a valid email address.", "error");
    if (!items.length) return;

    setQuoting(true);
    try {
      const idempotencyKey = crypto.randomUUID();
      const response = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({ items: items.map((item) => ({ id: item.id, qty: item.qty })), shipping: shippingInfo, shippingMethod, amount: 0, idempotencyKey }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.clientSecret || !data.id) throw new Error(data.error || "Unable to prepare secure checkout.");
      setSession({ subtotal: data.subtotal, shipping: data.shipping, tax: data.tax, total: data.total, id: data.id, clientSecret: data.clientSecret, idempotencyKey });
      setStep("payment");
    } catch (error) {
      useToastStore.getState().add(error instanceof Error ? error.message : "Unable to prepare secure checkout.", "error");
    } finally {
      setQuoting(false);
    }
  };

  const stepTitle = step === "cart" ? "Your cart" : step === "shipping" ? "Delivery" : step === "payment" ? "Payment" : "Order confirmed";
  const itemCount = items.reduce((n, item) => n + item.qty, 0);
  const progressSteps = ["Cart", "Delivery", "Payment"];
  const progressIndex = step === "cart" ? 0 : step === "shipping" ? 1 : step === "payment" ? 2 : 3;

  const goTo = (path: string) => { close(); navigate(path); };
  const onBack = () => { if (step === "shipping") setStep("cart"); else if (step === "payment") { setSession(null); setStep("shipping"); } };
  const description = step === "success" ? "Thank you for your order." : `${itemCount} ${itemCount === 1 ? "item" : "items"}`;
  const link = (path: string, label: string) => (
    <a className="mc-link" href={path} onClick={(e) => { e.preventDefault(); goTo(path); }}>{label}</a>
  );

  return (
    <Drawer open={open} onOpenChange={(value) => !value && close()}>
      <DrawerContent description={description} side="right" title={stepTitle}>
        <div className="mc-stack">
          {step !== "success" && <Stepper compact current={progressIndex} label="Checkout progress" steps={progressSteps.map((label) => ({ id: label, label }))} />}

          {step === "cart" && (items.length === 0 ? (
            <EmptyState
              action={<Button onClick={() => goTo("/shop")}>Browse the shop</Button>}
              description="Find something useful for your next repair or upgrade."
              icon={<ShoppingBag aria-hidden="true" size={20} strokeWidth={1.75} />}
              title="Your cart is empty"
            />
          ) : (
            <>
              <div className="mc-group">
                {items.map((item) => {
                  const stock = products.find((p) => p.id === item.id)?.stock ?? item.stock;

                  return (
                    <div key={item.id} className="mc-item" style={{ alignItems: "start" }}>
                      <div className="mc-media" style={{ width: "4.5rem", flexShrink: 0, position: "relative" }}><ProductImage alt={item.name} src={item.images?.[0]} /></div>
                      <div className="mc-stack-sm" style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-2)" }}>
                          <div style={{ minWidth: 0 }}>
                            <strong className="mc-strong" style={{ display: "block", overflowWrap: "anywhere" }}>{item.name}</strong>
                            <span className="mc-small">${item.price.toFixed(2)} each</span>
                          </div>
                          <Button aria-label={`Remove ${item.name}`} size="sm" variant="ghost" onClick={() => removeItem(item.id)}><Trash2 aria-hidden="true" size={16} strokeWidth={1.75} /></Button>
                        </div>
                        <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: "var(--space-3)" }}>
                          <NumberField label={`Quantity of ${item.name}`} max={Math.max(1, stock)} min={1} size="sm" value={item.qty} onValueChange={(q) => updateQty(item.id, q, stock)} />
                          <span className="mc-price">${(item.price * item.qty).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mc-freeship" data-done={subtotal >= FREE_SHIPPING_AT ? "true" : "false"}>
                <p className="mc-small">
                  {subtotal >= FREE_SHIPPING_AT ? <strong>You&apos;ve unlocked free standard shipping.</strong> : <>Add <strong>${(FREE_SHIPPING_AT - subtotal).toFixed(2)}</strong> more for free standard shipping.</>}
                </p>
                <div aria-hidden="true" className="mc-freeship-bar"><span style={{ width: `${Math.min(100, Math.round((subtotal / FREE_SHIPPING_AT) * 100))}%` }} /></div>
              </div>
              <div className="mc-group">
                <div className="mc-item mc-item--between"><span className="mc-item-label">Subtotal</span><span className="mc-price">${subtotal.toFixed(2)}</span></div>
              </div>
              <p className="mc-small">All sales are final. Defective items may be exchanged. See our {link("/returns", "returns and exchanges")} policy.</p>
              <Button onClick={proceedDelivery}>Continue to delivery</Button>
            </>
          ))}

          {step === "shipping" && (
            <>
              <RadioCards
                aria-label="Delivery method"
                layout="list"
                options={options.map((o) => ({ value: o.id, label: o.name, description: `${o.description}. ${o.shortArrival}`, meta: o.formattedCost }))}
                value={shippingMethod}
                onValueChange={(v) => setShippingMethod(v as "standard" | "express" | "pickup")}
              />
              <div className="mc-form">
                <Input autoComplete="name" label="Full name" required value={shippingInfo.name} onChange={(e) => setShippingInfo((v) => ({ ...v, name: e.target.value }))} />
                <div className="mc-form-2">
                  <Input autoComplete="email" inputMode="email" label="Email" required type="email" value={shippingInfo.email} onChange={(e) => setShippingInfo((v) => ({ ...v, email: e.target.value }))} />
                  <Input autoComplete="tel" inputMode="tel" label="Phone (optional)" type="tel" value={shippingInfo.phone} onChange={(e) => setShippingInfo((v) => ({ ...v, phone: e.target.value }))} />
                </div>
                <Input autoComplete="street-address" label="Street address" required value={shippingInfo.address} onChange={(e) => setShippingInfo((v) => ({ ...v, address: e.target.value }))} />
                <div className="mc-form-2">
                  <Input autoComplete="address-level2" label="City" required value={shippingInfo.city} onChange={(e) => setShippingInfo((v) => ({ ...v, city: e.target.value }))} />
                  <Input autoComplete="address-level1" label="State" required value={shippingInfo.state} onChange={(e) => setShippingInfo((v) => ({ ...v, state: e.target.value }))} />
                </div>
                <Input autoComplete="postal-code" inputMode="numeric" label="ZIP code" required value={shippingInfo.zip} onChange={(e) => setShippingInfo((v) => ({ ...v, zip: e.target.value }))} />
              </div>
              <div className="mc-group">
                <div className="mc-item mc-item--between"><span className="mc-item-label">Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                <div className="mc-item mc-item--between"><span className="mc-item-label">Shipping</span><span>{shipping.cost ? `$${shipping.cost.toFixed(2)}` : "Free"}</span></div>
              </div>
              <p className="mc-small">Tax and your final total are calculated securely at checkout. See our {link("/shipping", "shipping")} policy.</p>
              <div className="mc-actions" style={{ justifyContent: "space-between" }}>
                <Button disabled={quoting} variant="secondary" onClick={onBack}>Back</Button>
                <Button loading={quoting} onClick={proceedPayment}>Continue to payment</Button>
              </div>
            </>
          )}

          {step === "payment" && session && (stripePromise
            ? <Elements stripe={stripePromise} options={{ appearance: { theme: "stripe" } }}><PaymentStep session={session} shippingInfo={shippingInfo} items={items} shippingMethod={shippingMethod} onSuccess={finish} onBack={onBack} onNavigate={goTo} /></Elements>
            : <EmptyState action={<Button variant="secondary" onClick={onBack}>Back</Button>} description="Please call the shop to complete your order, or try again shortly." title="Payments are temporarily unavailable" />)}

          {step === "success" && order && (
            <>
              <p className="mc-text">Your payment was processed securely. A confirmation will be sent to {order.customer.email}.</p>
              <div className="mc-group">
                <div className="mc-item mc-item--between"><span className="mc-item-label">Order</span><span className="mc-strong">#{order.id}</span></div>
                <div className="mc-item mc-item--between"><span className="mc-item-label">Ship to</span><span>{shippingInfo.name}</span></div>
                <div className="mc-item mc-item--between"><span className="mc-item-label">Delivery</span><span>{shipping.name}</span></div>
                <div className="mc-item mc-item--between"><span className="mc-item-label">Total paid</span><span className="mc-price">${order.total.toFixed(2)}</span></div>
              </div>
              <div className="mc-actions">
                <Button onClick={() => goTo("/account")}>View order</Button>
                <Button variant="secondary" onClick={() => goTo("/shop")}>Continue shopping</Button>
              </div>
            </>
          )}

          {step !== "success" && <p className="mc-small" style={{ textAlign: "center" }}><Lock aria-hidden="true" size={12} strokeWidth={1.75} style={{ verticalAlign: "-1px", marginRight: 6 }} />Secure checkout powered by Stripe</p>}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
