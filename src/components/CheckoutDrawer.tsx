import type { Order } from "@/types/domain";

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Elements,
  CardElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Lock,
  MapPin,
  Minus,
  Plus,
  Printer,
  ShoppingBag,
  Trash2,
  Truck,
} from "lucide-react";
import {
  Button,
  FieldError,
  InputGroup,
  Label,
  Modal,
  TextField,
} from "@heroui/react";

import ProductImage from "@/components/ProductImage";
import { useAuth } from "@/lib/AuthContext";
import { useCartStore, useProductStore, useToastStore } from "@/lib/store";
import { getEffectiveColorScheme, useSiteStore } from "@/lib/siteStore";
import { getDynamicShippingOptions } from "@/lib/shipping";
import { getStripePublishableKey, useRuntimeShopConfig } from "@/lib/config";
import { getSession } from "@/lib/supabase";

type Step = "cart" | "shipping" | "payment" | "success";
type ShippingInfo = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
};
type Pricing = {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
};
type PaymentSession = Pricing & {
  id: string;
  clientSecret: string;
  idempotencyKey: string;
};

const stripePromiseCache = new Map<string, Promise<Stripe | null>>();
function getCachedStripePromise(publishableKey: string): Promise<Stripe | null> | null {
  const key = publishableKey.trim();
  if (!key) return null;
  let existing = stripePromiseCache.get(key);
  if (!existing) {
    existing = loadStripe(key);
    stripePromiseCache.set(key, existing);
  }
  return existing;
}

async function cancelIncompletePaymentIntent(session: PaymentSession | null) {
  if (!session?.id) return;
  try {
    await fetch("/api/cancel-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentIntentId: session.id,
        clientSecret: session.clientSecret,
      }),
    });
  } catch {
    // Non-fatal best-effort cleanup
  }
}

function PaymentStep({
  session,
  shippingInfo,
  items,
  shippingMethod,
  isDark,
  onSuccess,
  onBack,
}: {
  session: PaymentSession;
  shippingInfo: ShippingInfo;
  items: ReturnType<typeof useCartStore.getState>["items"];
  shippingMethod: "standard" | "express" | "pickup";
  isDark: boolean;
  onSuccess: (order: Order) => void;
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const addToast = useToastStore((s) => s.add);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const cardOptions = useMemo(
    () => ({
      style: {
        base: {
          color: isDark ? "#F3F7F4" : "#111B14",
          fontSize: "16px",
          fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
          "::placeholder": {
            color: isDark ? "#95A99D" : "#5D7266",
          },
          iconColor: isDark ? "#4ADE80" : "#15803D",
        },
        invalid: {
          color: "#EF4444",
          iconColor: "#EF4444",
        },
      },
      hidePostalCode: false,
    }),
    [isDark],
  );

  const pay = async () => {
    if (!stripe || !elements) return;
    const card = elements.getElement(CardElement);
    if (!card) return;
    setBusy(true);
    setError("");
    try {
      const addressDetails =
        shippingMethod === "pickup"
          ? { country: "US" as const }
          : {
              line1: shippingInfo.address || undefined,
              city: shippingInfo.city || undefined,
              state: shippingInfo.state || undefined,
              postal_code: shippingInfo.zip || undefined,
              country: "US" as const,
            };

      const result = await stripe.confirmCardPayment(session.clientSecret, {
        payment_method: {
          card,
          billing_details: {
            name: shippingInfo.name,
            email: shippingInfo.email,
            phone: shippingInfo.phone || undefined,
            address: addressDetails,
          },
        },
      });

      if (result.error)
        throw new Error(
          result.error.message || "Payment could not be completed.",
        );
      if (result.paymentIntent?.status !== "succeeded")
        throw new Error(
          `Payment requires additional action (status: ${result.paymentIntent?.status || "unknown"}).`,
        );

      const authSession = await getSession();
      const orderHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        "Idempotency-Key": session.idempotencyKey,
      };
      if (authSession?.access_token) {
        orderHeaders.Authorization = `Bearer ${authSession.access_token}`;
      }

      const customerPayload: ShippingInfo =
        shippingMethod === "pickup"
          ? {
              ...shippingInfo,
              address: "In-Store Pickup · 920 Commerce Dr, Suite 3",
              city: "Fairfield",
              state: "IL",
              zip: "62837",
            }
          : shippingInfo;

      const orderResponse = await fetch("/api/create-order", {
        method: "POST",
        headers: orderHeaders,
        body: JSON.stringify({
          id: `ORD-${Date.now().toString(36).toUpperCase()}`,
          paymentIntentId: result.paymentIntent.id,
          items: items.map((item) => ({ id: item.id, qty: item.qty })),
          customer: customerPayload,
          shippingMethod,
          total: session.total,
        }),
      });

      const saved = await orderResponse.json().catch(() => ({}));
      if (!orderResponse.ok || !saved.ok)
        throw new Error(
          saved.error || "Payment succeeded, but the order could not be saved.",
        );

      const order: Order = {
        id: saved.orderId,
        status: "paid",
        createdAt: new Date().toISOString(),
        shippingMethod,
        customer: customerPayload,
        items: [...items],
        subtotal: saved.subtotal ?? session.subtotal,
        shipping: saved.shipping ?? session.shipping,
        tax: saved.tax ?? session.tax,
        total: saved.total ?? session.total,
      };
      await useProductStore.getState().addOrder(order, true);
      onSuccess(order);
      addToast("Payment successful! Your order has been placed.", "success");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Payment could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Modal.Body className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3 rounded-2xl border border-accent/20 bg-accent-soft p-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Lock aria-hidden="true" className="size-4" />
          </span>
          <div>
            <strong className="block text-sm text-foreground">
              Secure payment
            </strong>
            <p className="m-0 mt-0.5 text-xs leading-relaxed text-muted">
              Your card details are securely handled by Stripe and never stored
              by Mobicare.
            </p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-danger/20 bg-danger/10 p-4 text-sm font-medium text-danger"
          >
            {error}
          </div>
        )}

        <div className="surface-raised rounded-card p-4">
          <Label className="mb-3 block text-xs font-bold uppercase tracking-wide text-muted">
            Card details &amp; billing ZIP
          </Label>
          <div className="surface-sunken rounded-field p-4 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
            <CardElement options={cardOptions} />
          </div>
        </div>

        <div className="surface-sunken rounded-card p-4">
          <div className="flex items-start justify-between gap-4 text-sm">
            <span className="text-muted">
              {shippingMethod === "pickup" ? "Fulfillment" : "Delivering to"}
            </span>
            <strong className="text-right text-foreground">
              {shippingMethod === "pickup"
                ? "In-Store Pickup · 920 Commerce Dr, Suite 3, Fairfield, IL"
                : `${shippingInfo.address}, ${shippingInfo.city}, ${shippingInfo.state} ${shippingInfo.zip}`}
            </strong>
          </div>

          <div className="my-3 border-t border-border" />

          <div className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Subtotal</span>
              <span className="font-medium text-foreground">
                ${session.subtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Shipping</span>
              <span className="font-medium text-foreground">
                {session.shipping === 0
                  ? "Free"
                  : `$${session.shipping.toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Tax</span>
              <span className="font-medium text-foreground">
                ${session.tax.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="my-3 border-t border-border" />

          <div className="flex items-end justify-between gap-4">
            <span className="text-sm font-bold text-foreground">Total due</span>
            <strong className="text-2xl font-extrabold tracking-tight text-accent">
              ${session.total.toFixed(2)}
            </strong>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer className="flex flex-col gap-2 border-t border-border bg-surface px-5 py-4 sm:px-6">
        <Button
          fullWidth
          isDisabled={busy || !stripe}
          size="lg"
          variant="primary"
          onPress={pay}
        >
          <Lock aria-hidden="true" className="size-4" />
          {busy
            ? "Processing securely…"
            : `Pay $${session.total.toFixed(2)}`}
        </Button>
        <Button fullWidth isDisabled={busy} variant="ghost" onPress={onBack}>
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to delivery
        </Button>
      </Modal.Footer>
    </>
  );
}

export default function CheckoutDrawer() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const items = useCartStore((s) => s.items);
  const syncWithCatalog = useCartStore((s) => s.syncWithCatalog);
  const products = useProductStore((s) => s.products);
  const updateQty = useCartStore((s) => s.updateQty);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const open = useCartStore((s) => s.cartDrawerOpen);
  const setOpen = useCartStore((s) => s.setCartDrawerOpen);

  const appearance = useSiteStore((s) => s.appearance);
  const viewerColorScheme = useSiteStore((s) => s.viewerColorScheme);
  const isPreview = useSiteStore((s) => s.isPreview);
  const isDark =
    getEffectiveColorScheme({ appearance, viewerColorScheme, isPreview }) ===
    "dark";

  // Subscribe to shop-config updates so Stripe key loaded from Supabase works reactively
  useRuntimeShopConfig();
  const stripeKey = getStripePublishableKey();
  const stripePromise = useMemo(
    () => getCachedStripePromise(stripeKey),
    [stripeKey],
  );

  const [step, setStep] = useState<Step>("cart");
  const [shippingMethod, setShippingMethod] = useState<
    "standard" | "express" | "pickup"
  >("standard");
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

  // Sync persisted cart items against live product prices, stock, and active status
  useEffect(() => {
    if (open && products.length > 0) {
      syncWithCatalog(products);
    }
  }, [open, products, syncWithCatalog]);

  useEffect(() => {
    if (user || profile) {
      setShippingInfo((v) => ({
        ...v,
        email: v.email || user?.email || "",
        name:
          v.name ||
          profile?.full_name ||
          (user?.user_metadata?.full_name as string) ||
          "",
        phone:
          v.phone ||
          profile?.phone ||
          (user?.user_metadata?.phone as string) ||
          "",
      }));
    }
  }, [user, profile]);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.qty, 0),
    [items],
  );
  const options = useMemo(
    () => getDynamicShippingOptions(subtotal),
    [subtotal],
  );
  const shipping =
    options.find((option) => option.id === shippingMethod) || options[0];

  const close = () => {
    if (step === "payment" && session) {
      void cancelIncompletePaymentIntent(session);
      setSession(null);
      setStep("shipping");
    } else if (step === "success") {
      setStep("cart");
      setOrder(null);
    }
    setOpen(false);
  };

  const handleBackFromPayment = () => {
    if (session) {
      void cancelIncompletePaymentIntent(session);
      setSession(null);
    }
    setStep("shipping");
  };

  const finish = (saved: Order) => {
    setOrder(saved);
    clearCart();
    setSession(null);
    setStep("success");
  };

  const proceedDelivery = () => {
    if (items.length) setStep("shipping");
  };

  const proceedPayment = async () => {
    const required =
      shippingMethod === "pickup"
        ? [shippingInfo.name, shippingInfo.email]
        : [
            shippingInfo.name,
            shippingInfo.email,
            shippingInfo.address,
            shippingInfo.city,
            shippingInfo.state,
            shippingInfo.zip,
          ];

    if (required.some((value) => !value.trim()))
      return useToastStore
        .getState()
        .add("Please complete all required delivery fields.", "error");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shippingInfo.email))
      return useToastStore
        .getState()
        .add("Please enter a valid email address.", "error");
    if (!items.length) return;

    setQuoting(true);
    try {
      const idempotencyKey = crypto.randomUUID();
      const authSession = await getSession();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      };
      if (authSession?.access_token) {
        headers.Authorization = `Bearer ${authSession.access_token}`;
      }

      const response = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers,
        body: JSON.stringify({
          items: items.map((item) => ({ id: item.id, qty: item.qty })),
          shippingAddress: shippingInfo,
          shipping: shippingInfo,
          shippingMethod,
          idempotencyKey,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.clientSecret || !data.id)
        throw new Error(
          data.error || "Unable to prepare secure checkout.",
        );
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
      ? "Shopping Cart"
      : step === "shipping"
        ? "Delivery Details"
        : step === "payment"
          ? "Secure Payment"
          : "Order Confirmed";
  const itemCount = items.reduce((n, item) => n + item.qty, 0);
  const progressSteps = ["Cart", "Delivery", "Payment"];
  const progressIndex =
    step === "cart"
      ? 0
      : step === "shipping"
        ? 1
        : step === "payment"
          ? 2
          : 3;

  return (
    <Modal isOpen={open} onOpenChange={(value) => !value && close()}>
      <Modal.Backdrop className="z-[100]">
        <Modal.Container
          className="w-[calc(100%-1rem)] max-w-xl pb-24 lg:pb-0"
          scroll="inside"
          size="lg"
        >
          <Modal.Dialog className="flex max-h-[min(820px,calc(100dvh-2rem))] flex-col overflow-hidden bg-surface shadow-2xl">
            <Modal.Header className="border-b border-border bg-surface px-5 py-4 sm:px-6">
              <div className="flex w-full items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"
                  >
                    <ShoppingBag className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <Modal.Heading className="font-bold">
                      {stepTitle}
                    </Modal.Heading>
                    {step !== "success" && (
                      <p className="m-0 text-xs text-muted">
                        {itemCount} {itemCount === 1 ? "item" : "items"}
                      </p>
                    )}
                  </div>
                </div>
                <Modal.CloseTrigger />
              </div>

              {step !== "success" && (
                <div
                  aria-label="Checkout progress"
                  className="mt-4 flex items-center gap-2"
                >
                  {progressSteps.map((label, index) => (
                    <div
                      key={label}
                      className="flex min-w-0 flex-1 items-center gap-2"
                    >
                      <span
                        className={`flex size-6 shrink-0 items-center justify-center rounded-full text-caption font-bold ${index <= progressIndex ? "bg-accent text-accent-foreground" : "border border-border bg-surface text-muted"}`}
                      >
                        {index < progressIndex ? (
                          <CheckCircle2 className="size-3.5" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <span
                        className={`truncate text-caption font-semibold ${index <= progressIndex ? "text-foreground" : "text-muted"}`}
                      >
                        {label}
                      </span>
                      {index < progressSteps.length - 1 && (
                        <span className="h-px flex-1 bg-border" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Modal.Header>

            {step === "cart" && (
              <>
                <Modal.Body className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
                  {items.length === 0 ? (
                    <div className="flex min-h-80 flex-col items-center justify-center px-4 text-center">
                      <span className="mb-4 flex size-16 items-center justify-center rounded-full bg-accent-soft text-accent">
                        <ShoppingBag aria-hidden="true" className="size-7" />
                      </span>
                      <h3 className="m-0 text-lg font-bold">
                        Your cart is empty
                      </h3>
                      <p className="mt-1 max-w-xs text-sm leading-relaxed text-muted">
                        Find something useful for your next repair or upgrade.
                      </p>
                      <Button
                        className="mt-4"
                        variant="primary"
                        onPress={() => {
                          close();
                          navigate("/shop");
                        }}
                      >
                        Browse shop{" "}
                        <ArrowRight aria-hidden="true" className="size-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {items.map((item) => {
                        const stock =
                          products.find((p) => p.id === item.id)?.stock ??
                          item.stock;
                        const lineTotal = item.price * item.qty;
                        return (
                          <div
                            key={item.id}
                            className="group flex gap-3 rounded-2xl border border-border bg-surface p-3 shadow-sm transition-shadow hover:shadow-md sm:p-4"
                          >
                            <div className="surface-sunken relative size-20 shrink-0 overflow-hidden rounded-field sm:size-24">
                              <ProductImage
                                alt={item.name}
                                src={item.images?.[0]}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <strong className="block truncate text-sm font-bold text-foreground sm:text-body-sm">
                                    {item.name}
                                  </strong>
                                  <span className="mt-0.5 block text-xs text-muted">
                                    ${item.price.toFixed(2)} each
                                  </span>
                                </div>
                                <button
                                  aria-label={`Remove ${item.name}`}
                                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-2 focus-visible:outline-accent"
                                  type="button"
                                  onClick={() => removeItem(item.id)}
                                >
                                  <Trash2
                                    aria-hidden="true"
                                    className="size-4"
                                  />
                                </button>
                              </div>
                              <div className="mt-3 flex items-end justify-between gap-3">
                                <div className="flex items-center rounded-full border border-border bg-surface-secondary/50 p-0.5">
                                  <button
                                    aria-label="Decrease quantity"
                                    className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-30"
                                    type="button"
                                    onClick={() =>
                                      updateQty(item.id, item.qty - 1, stock)
                                    }
                                  >
                                    <Minus
                                      aria-hidden="true"
                                      className="size-3"
                                    />
                                  </button>
                                  <span
                                    aria-live="polite"
                                    className="w-7 text-center text-xs font-bold"
                                  >
                                    {item.qty}
                                  </span>
                                  <button
                                    aria-label="Increase quantity"
                                    className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-30"
                                    disabled={item.qty >= stock}
                                    type="button"
                                    onClick={() =>
                                      updateQty(item.id, item.qty + 1, stock)
                                    }
                                  >
                                    <Plus
                                      aria-hidden="true"
                                      className="size-3"
                                    />
                                  </button>
                                </div>
                                <strong className="text-base font-extrabold text-accent">
                                  ${lineTotal.toFixed(2)}
                                </strong>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Modal.Body>
                {items.length > 0 && (
                  <Modal.Footer className="flex flex-col gap-3 border-t border-border bg-surface px-5 py-4 sm:px-6">
                    <div className="flex w-full items-center justify-between">
                      <span className="text-label text-muted">Subtotal</span>
                      <strong className="text-heading-sm font-extrabold tabular-nums">
                        ${subtotal.toFixed(2)}
                      </strong>
                    </div>
                    <Button
                      fullWidth
                      size="lg"
                      variant="primary"
                      onPress={proceedDelivery}
                    >
                      Continue to delivery{" "}
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </Button>
                  </Modal.Footer>
                )}
              </>
            )}

            {step === "shipping" && (
              <>
                <Modal.Body className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 py-5 sm:px-6">
                  <section>
                    <div className="mb-3">
                      <h3 className="m-0 text-sm font-bold text-foreground">
                        How would you like to receive it?
                      </h3>
                      <p className="m-0 mt-1 text-xs text-muted">
                        Choose shipping or free Fairfield store pickup.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2.5">
                      {options.map((option) => {
                        const selected = shippingMethod === option.id;
                        return (
                          <button
                            key={option.id}
                            aria-pressed={selected}
                            className={`relative min-h-[72px] rounded-2xl border p-3.5 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${selected ? "border-accent bg-accent-soft ring-1 ring-accent shadow-[var(--elev-1)]" : "border-border bg-surface hover:border-accent/40 hover:bg-surface-secondary"}`}
                            type="button"
                            onClick={() => setShippingMethod(option.id)}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`flex size-10 shrink-0 items-center justify-center rounded-full ${selected ? "bg-accent text-accent-foreground" : "bg-surface-secondary text-muted"}`}
                              >
                                {option.id === "pickup" ? (
                                  <MapPin aria-hidden="true" className="size-4" />
                                ) : (
                                  <Truck aria-hidden="true" className="size-4" />
                                )}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-3">
                                  <strong className="text-sm text-foreground">
                                    {option.name}
                                  </strong>
                                  <span className="shrink-0 text-sm font-extrabold text-accent">
                                    {option.formattedCost}
                                  </span>
                                </div>
                                <p className="m-0 mt-0.5 text-xs text-muted">
                                  {option.description}
                                </p>
                              </div>
                              <span
                                className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${selected ? "border-accent" : "border-border"}`}
                              >
                                {selected && (
                                  <span className="size-2.5 rounded-full bg-accent" />
                                )}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section>
                    <div className="mb-3">
                      <h3 className="m-0 text-sm font-bold text-foreground">
                        {shippingMethod === "pickup"
                          ? "Pickup contact details"
                          : "Delivery address"}
                      </h3>
                      <p className="m-0 mt-1 text-xs text-muted">
                        {shippingMethod === "pickup"
                          ? "Pickup at 920 Commerce Dr, Suite 3, Fairfield, IL — we'll notify you when ready."
                          : "Where should we send your order?"}
                      </p>
                    </div>
                    <div className="surface-sunken rounded-card p-4">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {(
                          [
                            ["name", "Full name", "Jane Doe", "text"],
                            ["email", "Email", "jane@example.com", "email"],
                            ["phone", "Phone", "618-555-0199", "tel"],
                            [
                              "address",
                              "Street address",
                              "123 Main St",
                              "text",
                            ],
                            ["city", "City", "Fairfield", "text"],
                            ["state", "State", "IL", "text"],
                            ["zip", "ZIP", "62837", "text"],
                          ] as const
                        )
                          .filter(
                            ([key]) =>
                              shippingMethod !== "pickup" ||
                              key === "name" ||
                              key === "email" ||
                              key === "phone",
                          )
                          .map(([key, label, placeholder, type]) => (
                            <TextField
                              key={key}
                              className={
                                key === "name" ||
                                key === "email" ||
                                key === "address"
                                  ? "flex flex-col gap-1 sm:col-span-2"
                                  : "flex flex-col gap-1"
                              }
                              isRequired={key !== "phone"}
                              type={type}
                              value={shippingInfo[key]}
                              onChange={(value) =>
                                setShippingInfo((v) => ({
                                  ...v,
                                  [key]: value,
                                }))
                              }
                            >
                              <Label className="text-xs font-semibold text-muted">
                                {label}
                              </Label>
                              <InputGroup>
                                <InputGroup.Input placeholder={placeholder} />
                              </InputGroup>
                              <FieldError />
                            </TextField>
                          ))}
                      </div>
                    </div>
                  </section>

                  <div className="surface-sunken rounded-card p-4 text-label">
                    <div className="flex justify-between">
                      <span className="text-muted">Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted">Shipping</span>
                      <span>
                        {shipping.cost
                          ? `$${shipping.cost.toFixed(2)}`
                          : "Free"}
                      </span>
                    </div>
                    <div className="my-2 border-t border-border" />
                    <div className="flex justify-between font-bold">
                      <span>Tax &amp; total</span>
                      <span className="text-xs font-semibold text-muted">
                        Calculated securely on next step
                      </span>
                    </div>
                  </div>
                </Modal.Body>
                <Modal.Footer className="flex flex-col gap-2 border-t border-border bg-surface px-5 py-4 sm:px-6">
                  <Button
                    fullWidth
                    isDisabled={quoting}
                    size="lg"
                    variant="primary"
                    onPress={proceedPayment}
                  >
                    {quoting
                      ? "Preparing secure checkout…"
                      : "Continue to payment"}{" "}
                    {!quoting && (
                      <ArrowRight aria-hidden="true" className="size-4" />
                    )}
                  </Button>
                  <Button
                    fullWidth
                    isDisabled={quoting}
                    variant="ghost"
                    onPress={() => setStep("cart")}
                  >
                    <ArrowLeft aria-hidden="true" className="size-4" />
                    Back to cart
                  </Button>
                </Modal.Footer>
              </>
            )}

            {step === "payment" &&
              session &&
              (stripePromise ? (
                <Elements
                  options={{
                    appearance: { theme: isDark ? "night" : "stripe" },
                  }}
                  stripe={stripePromise}
                >
                  <PaymentStep
                    isDark={isDark}
                    items={items}
                    session={session}
                    shippingInfo={shippingInfo}
                    shippingMethod={shippingMethod}
                    onBack={handleBackFromPayment}
                    onSuccess={finish}
                  />
                </Elements>
              ) : (
                <Modal.Body className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
                  <p className="m-0 text-sm font-semibold text-foreground">
                    Payments are temporarily unavailable.
                  </p>
                  <p className="m-0 text-xs text-muted">
                    Configure your Stripe publishable key in Shop Settings, or
                    call the shop at 618-204-1497 to complete your order.
                  </p>
                  <Button variant="outline" onPress={handleBackFromPayment}>
                    <ArrowLeft aria-hidden="true" className="size-4" />
                    Back
                  </Button>
                </Modal.Body>
              ))}

            {step === "success" && order && (
              <Modal.Body className="flex flex-1 flex-col items-center gap-5 overflow-y-auto px-6 py-8 text-center">
                <div className="flex size-20 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg">
                  <CheckCircle2 aria-hidden="true" className="size-10" />
                </div>
                <div>
                  <span className="rounded-full bg-accent-soft px-3 py-1 font-mono text-xs font-bold text-accent">
                    Order #{order.id}
                  </span>
                  <h2 className="mt-4 text-2xl font-extrabold tracking-tight">
                    Order confirmed
                  </h2>
                  <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted">
                    Your payment was processed securely. A confirmation will be
                    sent to {order.customer.email}.
                  </p>
                </div>

                <div className="surface-sunken w-full rounded-card p-4 text-left">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-full bg-accent-soft text-accent">
                      {order.shippingMethod === "pickup" ? (
                        <MapPin aria-hidden="true" className="size-4" />
                      ) : (
                        <Truck aria-hidden="true" className="size-4" />
                      )}
                    </span>
                    <div>
                      <strong className="block text-sm text-foreground">
                        {order.customer.name}
                      </strong>
                      <span className="text-xs text-muted">
                        {order.shippingMethod === "pickup"
                          ? "In-Store Pickup · 920 Commerce Dr, Suite 3, Fairfield, IL"
                          : `${order.customer.city}, ${order.customer.state} ${order.customer.zip}`}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-col gap-1 border-t border-border pt-3 text-xs text-muted">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="text-foreground">
                        ${order.subtotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span className="text-foreground">
                        {order.shipping === 0
                          ? "Free"
                          : `$${order.shipping.toFixed(2)}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span className="text-foreground">
                        ${order.tax.toFixed(2)}
                      </span>
                    </div>
                    <div className="mt-1.5 flex justify-between border-t border-border pt-2 text-sm">
                      <span className="font-bold text-foreground">
                        Total paid
                      </span>
                      <strong className="text-accent">
                        ${order.total.toFixed(2)}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="flex w-full flex-col gap-2">
                  <Button
                    fullWidth
                    variant="primary"
                    onPress={() => {
                      const savedOrder = order;
                      close();
                      navigate(
                        `/order-success?order_id=${encodeURIComponent(savedOrder.id)}`,
                        { state: { order: savedOrder } },
                      );
                    }}
                  >
                    <Printer aria-hidden="true" className="size-4" />
                    <span>View Printable Receipt</span>
                  </Button>
                  {user && (
                    <Button
                      fullWidth
                      variant="outline"
                      onPress={() => {
                        close();
                        navigate("/account");
                      }}
                    >
                      View in My Account{" "}
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </Button>
                  )}
                  <Button
                    fullWidth
                    variant="ghost"
                    onPress={() => {
                      close();
                      navigate("/shop");
                    }}
                  >
                    Continue shopping
                  </Button>
                </div>
              </Modal.Body>
            )}

            {step !== "success" && (
              <div className="flex items-center justify-center gap-2 border-t border-border bg-surface-secondary/30 px-4 py-2.5 text-caption text-muted">
                <Lock aria-hidden="true" className="size-3" />
                Secure checkout powered by Stripe
              </div>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
