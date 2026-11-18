import type { Order } from "@/types/domain";
import type { Stripe } from "@stripe/stripe-js";

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Elements, CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Lock, MapPin, ShoppingBag, Trash2 } from "lucide-react";

import ProductImage from "@/components/ProductImage";
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
import { getEffectiveColorScheme, useSiteStore } from "@/lib/siteStore";
import { getDynamicShippingOptions } from "@/lib/shipping";
import { getStripePublishableKey } from "@/lib/config";
import { getSession } from "@/lib/supabase";

type Step = "cart" | "shipping" | "payment" | "success";
type ShippingMethod = "standard" | "express" | "pickup";
type ShippingInfo = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
};

const FREE_SHIPPING_AT = 35;
const FAIRFIELD_SHOP_ADDRESS = "920 Commerce Drive, Suite 3, Fairfield, IL 62837";

type Pricing = { subtotal: number; shipping: number; tax: number; total: number };
type PaymentSession = Pricing & {
  id: string;
  clientSecret: string;
  idempotencyKey: string;
};

const stripeCache = new Map<string, Promise<Stripe | null>>();

function getStripeInstance(pubKey: string): Promise<Stripe | null> | null {
  if (!pubKey) return null;
  let cached = stripeCache.get(pubKey);

  if (!cached) {
    cached = loadStripe(pubKey);
    stripeCache.set(pubKey, cached);
  }

  return cached;
}

function cancelIncompletePaymentSession(active: PaymentSession | null) {
  if (!active?.id || !active?.clientSecret) return;
  void fetch("/api/cancel-payment-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      paymentIntentId: active.id,
      clientSecret: active.clientSecret,
    }),
  }).catch(() => undefined);
}

function PaymentStep({
  session,
  shippingInfo,
  items,
  shippingMethod,
  isDark,
  onSuccess,
  onBack,
  onNavigate,
}: {
  onNavigate: (path: string) => void;
  session: PaymentSession;
  shippingInfo: ShippingInfo;
  items: ReturnType<typeof useCartStore.getState>["items"];
  shippingMethod: ShippingMethod;
  isDark: boolean;
  onSuccess: (order: Order) => void;
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const addToast = useToastStore((s) => s.add);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isPickup = shippingMethod === "pickup";

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
            address: isPickup
              ? { country: "US" }
              : {
                  line1: shippingInfo.address,
                  city: shippingInfo.city,
                  state: shippingInfo.state,
                  country: "US",
                },
          },
        },
      });

      if (result.error) {
        throw new Error(result.error.message || "Payment could not be completed.");
      }
      if (result.paymentIntent?.status !== "succeeded") {
        throw new Error(
          `Payment requires additional action (status: ${result.paymentIntent?.status || "unknown"}).`,
        );
      }

      const authSession = await getSession();
      const orderResponse = await fetch("/api/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": session.idempotencyKey,
          ...(authSession?.access_token
            ? { Authorization: `Bearer ${authSession.access_token}` }
            : {}),
        },
        body: JSON.stringify({
          paymentIntentId: result.paymentIntent.id,
          items: items.map((item) => ({ id: item.id, qty: item.qty })),
          customer: shippingInfo,
          shippingMethod,
          total: session.total,
        }),
      });

      const saved = await orderResponse.json().catch(() => ({}));

      if (!orderResponse.ok || !saved.ok) {
        throw new Error(
          saved.error || "Payment succeeded, but the order could not be saved.",
        );
      }

      const orderCustomer: ShippingInfo = isPickup
        ? {
            ...shippingInfo,
            address: "Fairfield Store Pickup — 920 Commerce Drive, Suite 3",
            city: "Fairfield",
            state: "IL",
            zip: "62837",
          }
        : shippingInfo;

      const order: Order = {
        id: saved.orderId,
        status: "paid",
        createdAt: new Date().toISOString(),
        customer: orderCustomer,
        items: [...items],
        subtotal: saved.subtotal ?? session.subtotal,
        shipping: saved.shipping ?? session.shipping,
        tax: saved.tax ?? session.tax,
        total: saved.total ?? session.total,
        shippingMethod,
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
    <a
      className="mc-link"
      href={path}
      onClick={(e) => {
        e.preventDefault();
        onNavigate(path);
      }}
    >
      {label}
    </a>
  );

  return (
    <div className="mc-stack">
      <Alert title="Secure payment" tone="info">
        Your card details are handled by Stripe and never touch our servers.
      </Alert>
      {error && <Alert title="Payment problem" tone="danger">{error}</Alert>}
      <div className="mc-stack-sm">
        <span className="mc-gl" style={{ margin: 0 }}>Card details</span>
        <div className="mc-card" style={{ padding: "var(--space-4)" }}>
          <CardElement
            options={{
              hidePostalCode: false,
              style: {
                base: {
                  fontSize: "16px",
                  color: isDark ? "#eef4f0" : "#0d1a13",
                  iconColor: isDark ? "#12c887" : "#0d1a13",
                  fontFamily: "Inter Variable, system-ui, sans-serif",
                  "::placeholder": {
                    color: isDark ? "#7f9185" : "#6f7e74",
                  },
                },
                invalid: {
                  color: isDark ? "#ff7b72" : "#dc2626",
                  iconColor: isDark ? "#ff7b72" : "#dc2626",
                },
              },
            }}
          />
        </div>
      </div>
      <div className="mc-group">
        <div className="mc-item mc-item--between" style={{ alignItems: "start" }}>
          <span className="mc-item-label">{isPickup ? "Pickup at" : "Delivering to"}</span>
          <span className="mc-strong" style={{ textAlign: "right" }}>
            {isPickup
              ? FAIRFIELD_SHOP_ADDRESS
              : `${shippingInfo.address}, ${shippingInfo.city}, ${shippingInfo.state} ${shippingInfo.zip}`}
          </span>
        </div>
        <div className="mc-item mc-item--between">
          <span className="mc-item-label">Subtotal</span>
          <span className="mc-num">${session.subtotal.toFixed(2)}</span>
        </div>
        <div className="mc-item mc-item--between">
          <span className="mc-item-label">Shipping</span>
          <span className="mc-num">
            {session.shipping === 0 ? "Free" : `$${session.shipping.toFixed(2)}`}
          </span>
        </div>
        <div className="mc-item mc-item--between">
          <span className="mc-item-label">Tax</span>
          <span className="mc-num">${session.tax.toFixed(2)}</span>
        </div>
        <div className="mc-item mc-item--between">
          <span className="mc-strong">Total due</span>
          <span className="mc-price">${session.total.toFixed(2)}</span>
        </div>
      </div>
      <p className="mc-small">
        By paying you agree to our {link("/shipping", "shipping")},{" "}
        {link("/returns", "returns and exchanges")} and {link("/refunds", "refund")}{" "}
        policies. All sales are final; defective items are eligible for exchange.
      </p>
      <div className="mc-actions" style={{ justifyContent: "space-between" }}>
        <Button disabled={busy} variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button disabled={!stripe} loading={busy} onClick={pay}>
          <Lock aria-hidden="true" size={16} strokeWidth={1.75} />
          Pay ${session.total.toFixed(2)}
        </Button>
      </div>
    </div>
  );
}

export default function CheckoutDrawer() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const items = useCartStore((s) => s.items);
  const products = useProductStore((s) => s.products);
  const syncWithProducts = useCartStore((s) => s.syncWithProducts);
  const updateQty = useCartStore((s) => s.updateQty);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const open = useCartStore((s) => s.cartDrawerOpen);
  const setOpen = useCartStore((s) => s.setCartDrawerOpen);
  const appearance = useSiteStore((s) => s.appearance);
  const viewerColorScheme = useSiteStore((s) => s.viewerColorScheme);
  const isDark =
    (appearance
      ? getEffectiveColorScheme({ appearance, viewerColorScheme })
      : "light") === "dark";

  const [step, setStep] = useState<Step>("cart");
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("standard");
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo>({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
  });
  const [session, setSession] = useState<PaymentSession | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [quoting, setQuoting] = useState(false);

  const pubKey = open || step === "payment" ? getStripePublishableKey() : "";
  const stripePromise = useMemo(() => getStripeInstance(pubKey), [pubKey]);

  // Keep cached localStorage cart items synchronized with live catalog prices & stock
  useEffect(() => {
    if (open && products.length > 0) {
      syncWithProducts(products);
    }
  }, [open, products, syncWithProducts]);

  useEffect(() => {
    if (!user && !profile) return;
    setShippingInfo((v) => ({
      ...v,
      email: v.email || user?.email || "",
      name:
        v.name ||
        profile?.full_name ||
        (user?.user_metadata?.full_name as string | undefined) ||
        "",
      phone:
        v.phone ||
        profile?.phone ||
        (user?.user_metadata?.phone as string | undefined) ||
        "",
    }));
  }, [user, profile]);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.qty, 0),
    [items],
  );
  const options = useMemo(() => getDynamicShippingOptions(subtotal), [subtotal]);
  const shipping = options.find((option) => option.id === shippingMethod) || options[0];

  const close = () => {
    if (step === "payment" && session) {
      cancelIncompletePaymentSession(session);
      setSession(null);
      setStep("shipping");
    } else if (step === "success") {
      setOrder(null);
      setStep("cart");
    }
    setOpen(false);
  };

  const finish = (saved: Order) => {
    void useProductStore.getState().addOrder(saved, true);
    void useProductStore.getState().refresh();
    setOrder(saved);
    clearCart();
    setSession(null);
    setStep("success");
  };

  const proceedDelivery = () => {
    if (items.length) setStep("shipping");
  };

  const proceedPayment = async () => {
    const isPickup = shippingMethod === "pickup";
    const required = isPickup
      ? [shippingInfo.name, shippingInfo.email]
      : [
          shippingInfo.name,
          shippingInfo.email,
          shippingInfo.address,
          shippingInfo.city,
          shippingInfo.state,
          shippingInfo.zip,
        ];

    if (required.some((value) => !value.trim())) {
      return useToastStore
        .getState()
        .add(
          isPickup
            ? "Please enter your full name and email address."
            : "Please complete all required delivery fields.",
          "error",
        );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shippingInfo.email)) {
      return useToastStore
        .getState()
        .add("Please enter a valid email address.", "error");
    }
    if (!items.length) return;

    setQuoting(true);
    try {
      const idempotencyKey = crypto.randomUUID();
      const authSession = await getSession();
      const response = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
          ...(authSession?.access_token
            ? { Authorization: `Bearer ${authSession.access_token}` }
            : {}),
        },
        body: JSON.stringify({
          items: items.map((item) => ({ id: item.id, qty: item.qty })),
          shipping: shippingInfo,
          shippingMethod,
          idempotencyKey,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.clientSecret || !data.id) {
        throw new Error(data.error || "Unable to prepare secure checkout.");
      }
      setSession({
        subtotal: data.subtotal,
        shipping: data.shipping,
        tax: data.tax,
        total: data.total,
        id: data.id,
        clientSecret: data.clientSecret,
        idempotencyKey,
      });
      setStep("payment");
    } catch (error) {
      useToastStore
        .getState()
        .add(
          error instanceof Error
            ? error.message
            : "Unable to prepare secure checkout.",
          "error",
        );
    } finally {
      setQuoting(false);
    }
  };

  const stepTitle =
    step === "cart"
      ? "Your cart"
      : step === "shipping"
        ? "Delivery"
        : step === "payment"
          ? "Payment"
          : "Order confirmed";
  const itemCount = items.reduce((n, item) => n + item.qty, 0);
  const progressSteps = ["Cart", "Delivery", "Payment"];
  const progressIndex =
    step === "cart" ? 0 : step === "shipping" ? 1 : step === "payment" ? 2 : 3;

  const goTo = (path: string) => {
    close();
    navigate(path);
  };
  const onBack = () => {
    if (step === "shipping") {
      setStep("cart");
    } else if (step === "payment") {
      cancelIncompletePaymentSession(session);
      setSession(null);
      setStep("shipping");
    }
  };
  const description =
    step === "success"
      ? "Thank you for your order."
      : `${itemCount} ${itemCount === 1 ? "item" : "items"}`;
  const link = (path: string, label: string) => (
    <a
      className="mc-link"
      href={path}
      onClick={(e) => {
        e.preventDefault();
        goTo(path);
      }}
    >
      {label}
    </a>
  );

  return (
    <Drawer open={open} onOpenChange={(value) => !value && close()}>
      <DrawerContent description={description} side="right" title={stepTitle}>
        <div className="mc-stack">
          {step !== "success" && (
            <Stepper
              compact
              current={progressIndex}
              label="Checkout progress"
              steps={progressSteps.map((label) => ({ id: label, label }))}
            />
          )}

          {step === "cart" &&
            (items.length === 0 ? (
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
                    const stock =
                      products.find((p) => p.id === item.id)?.stock ?? item.stock;

                    return (
                      <div
                        key={item.id}
                        className="mc-item"
                        style={{ alignItems: "start" }}
                      >
                        <div
                          className="mc-media"
                          style={{
                            width: "4.5rem",
                            flexShrink: 0,
                            position: "relative",
                          }}
                        >
                          <ProductImage alt={item.name} src={item.images?.[0]} />
                        </div>
                        <div className="mc-stack-sm" style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: "var(--space-2)",
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <strong
                                className="mc-strong"
                                style={{
                                  display: "block",
                                  overflowWrap: "anywhere",
                                }}
                              >
                                {item.name}
                              </strong>
                              <span className="mc-small">
                                ${item.price.toFixed(2)} each
                              </span>
                            </div>
                            <Button
                              aria-label={`Remove ${item.name}`}
                              size="sm"
                              variant="ghost"
                              onClick={() => removeItem(item.id)}
                            >
                              <Trash2
                                aria-hidden="true"
                                size={16}
                                strokeWidth={1.75}
                              />
                            </Button>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "end",
                              justifyContent: "space-between",
                              gap: "var(--space-3)",
                            }}
                          >
                            <NumberField
                              label={`Quantity of ${item.name}`}
                              max={Math.max(1, stock)}
                              min={1}
                              size="sm"
                              value={item.qty}
                              onValueChange={(q) => updateQty(item.id, q, stock)}
                            />
                            <span className="mc-price">
                              ${(item.price * item.qty).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div
                  className="mc-freeship"
                  data-done={subtotal >= FREE_SHIPPING_AT ? "true" : "false"}
                >
                  <p className="mc-small">
                    {subtotal >= FREE_SHIPPING_AT ? (
                      <strong>You&apos;ve unlocked free standard shipping.</strong>
                    ) : (
                      <>
                        Add{" "}
                        <strong>${(FREE_SHIPPING_AT - subtotal).toFixed(2)}</strong>{" "}
                        more for free standard shipping.
                      </>
                    )}
                  </p>
                  <div aria-hidden="true" className="mc-freeship-bar">
                    <span
                      style={{
                        width: `${Math.min(100, Math.round((subtotal / FREE_SHIPPING_AT) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="mc-group">
                  <div className="mc-item mc-item--between">
                    <span className="mc-item-label">Subtotal</span>
                    <span className="mc-price">${subtotal.toFixed(2)}</span>
                  </div>
                </div>
                <p className="mc-small">
                  All sales are final. Defective items may be exchanged. See our{" "}
                  {link("/returns", "returns and exchanges")} policy.
                </p>
                <Button onClick={proceedDelivery}>Continue to delivery</Button>
              </>
            ))}

          {step === "shipping" && (
            <>
              <RadioCards
                aria-label="Delivery method"
                layout="list"
                options={options.map((o) => ({
                  value: o.id,
                  label: o.name,
                  description: `${o.description}. ${o.shortArrival}`,
                  meta: o.formattedCost,
                }))}
                value={shippingMethod}
                onValueChange={(v) => setShippingMethod(v as ShippingMethod)}
              />
              <div className="mc-form">
                <Input
                  autoComplete="name"
                  label="Full name"
                  required
                  value={shippingInfo.name}
                  onChange={(e) =>
                    setShippingInfo((v) => ({ ...v, name: e.target.value }))
                  }
                />
                <div className="mc-form-2">
                  <Input
                    autoComplete="email"
                    inputMode="email"
                    label="Email"
                    required
                    type="email"
                    value={shippingInfo.email}
                    onChange={(e) =>
                      setShippingInfo((v) => ({ ...v, email: e.target.value }))
                    }
                  />
                  <Input
                    autoComplete="tel"
                    inputMode="tel"
                    label="Phone (optional)"
                    type="tel"
                    value={shippingInfo.phone}
                    onChange={(e) =>
                      setShippingInfo((v) => ({ ...v, phone: e.target.value }))
                    }
                  />
                </div>
                {shippingMethod === "pickup" ? (
                  <div className="mc-card mc-card--muted" style={{ padding: "var(--space-4)" }}>
                    <p className="mc-small" style={{ display: "flex", gap: 8, alignItems: "start" }}>
                      <MapPin aria-hidden="true" size={16} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: 2 }} />
                      <span>
                        <strong className="mc-strong" style={{ display: "block" }}>
                          Fairfield Store Pickup
                        </strong>
                        {FAIRFIELD_SHOP_ADDRESS} · Bring a photo ID and your order number.
                      </span>
                    </p>
                  </div>
                ) : (
                  <>
                    <Input
                      autoComplete="street-address"
                      label="Street address"
                      required
                      value={shippingInfo.address}
                      onChange={(e) =>
                        setShippingInfo((v) => ({
                          ...v,
                          address: e.target.value,
                        }))
                      }
                    />
                    <div className="mc-form-2">
                      <Input
                        autoComplete="address-level2"
                        label="City"
                        required
                        value={shippingInfo.city}
                        onChange={(e) =>
                          setShippingInfo((v) => ({
                            ...v,
                            city: e.target.value,
                          }))
                        }
                      />
                      <Input
                        autoComplete="address-level1"
                        label="State"
                        required
                        value={shippingInfo.state}
                        onChange={(e) =>
                          setShippingInfo((v) => ({
                            ...v,
                            state: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <Input
                      autoComplete="postal-code"
                      inputMode="numeric"
                      label="ZIP code"
                      required
                      value={shippingInfo.zip}
                      onChange={(e) =>
                        setShippingInfo((v) => ({ ...v, zip: e.target.value }))
                      }
                    />
                  </>
                )}
              </div>
              <div className="mc-group">
                <div className="mc-item mc-item--between">
                  <span className="mc-item-label">Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="mc-item mc-item--between">
                  <span className="mc-item-label">Shipping</span>
                  <span>{shipping.cost ? `$${shipping.cost.toFixed(2)}` : "Free"}</span>
                </div>
              </div>
              <p className="mc-small">
                Tax and your final total are calculated securely at checkout. See our{" "}
                {link("/shipping", "shipping")} policy.
              </p>
              <div className="mc-actions" style={{ justifyContent: "space-between" }}>
                <Button disabled={quoting} variant="secondary" onClick={onBack}>
                  Back
                </Button>
                <Button loading={quoting} onClick={proceedPayment}>
                  Continue to payment
                </Button>
              </div>
            </>
          )}

          {step === "payment" &&
            session &&
            (stripePromise ? (
              <Elements
                key={isDark ? "dark" : "light"}
                options={{ appearance: { theme: isDark ? "night" : "stripe" } }}
                stripe={stripePromise}
              >
                <PaymentStep
                  isDark={isDark}
                  items={items}
                  session={session}
                  shippingInfo={shippingInfo}
                  shippingMethod={shippingMethod}
                  onBack={onBack}
                  onNavigate={goTo}
                  onSuccess={finish}
                />
              </Elements>
            ) : (
              <EmptyState
                action={
                  <Button variant="secondary" onClick={onBack}>
                    Back
                  </Button>
                }
                description="Please call the shop to complete your order, or try again shortly."
                title="Payments are temporarily unavailable"
              />
            ))}

          {step === "success" && order && (
            <>
              <p className="mc-text">
                Your payment was processed securely. A confirmation will be sent to{" "}
                {order.customer.email}.
              </p>
              <div className="mc-group">
                <div className="mc-item mc-item--between">
                  <span className="mc-item-label">Order</span>
                  <span className="mc-strong">#{order.id}</span>
                </div>
                <div className="mc-item mc-item--between">
                  <span className="mc-item-label">Customer</span>
                  <span>{order.customer.name}</span>
                </div>
                <div className="mc-item mc-item--between" style={{ alignItems: "start" }}>
                  <span className="mc-item-label">
                    {order.shippingMethod === "pickup" ? "Pickup at" : "Delivery"}
                  </span>
                  <span style={{ textAlign: "right" }}>
                    {order.shippingMethod === "pickup"
                      ? FAIRFIELD_SHOP_ADDRESS
                      : shipping.name}
                  </span>
                </div>
                <div className="mc-item mc-item--between">
                  <span className="mc-item-label">Total paid</span>
                  <span className="mc-price">${order.total.toFixed(2)}</span>
                </div>
              </div>
              <div className="mc-actions">
                <Button
                  onClick={() =>
                    goTo(`/order-success?order_id=${encodeURIComponent(order.id)}`)
                  }
                >
                  View receipt
                </Button>
                {user && (
                  <Button variant="secondary" onClick={() => goTo("/account")}>
                    My account
                  </Button>
                )}
                <Button variant="secondary" onClick={() => goTo("/shop")}>
                  Continue shopping
                </Button>
              </div>
            </>
          )}

          {step !== "success" && (
            <p className="mc-small" style={{ textAlign: "center" }}>
              <Lock
                aria-hidden="true"
                size={12}
                strokeWidth={1.75}
                style={{ verticalAlign: "-1px", marginRight: 6 }}
              />
              Secure checkout powered by Stripe
            </p>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
