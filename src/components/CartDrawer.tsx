import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  Lock,
  Loader2,
  Minus,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import {
  Button,
  Drawer,
  FieldError,
  InputGroup,
  Label,
  TextField,
} from "@heroui/react";

import { useCartStore, useProductStore, useToastStore } from "@/lib/store";
import { getClient } from "@/lib/supabase";

type Step = "cart" | "shipping" | "payment" | "processing";

interface ShippingInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

const STEP_LABELS: { key: Step; label: string }[] = [
  { key: "cart", label: "Cart" },
  { key: "shipping", label: "Shipping" },
  { key: "payment", label: "Payment" },
];

export default function CartDrawer() {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQty = useCartStore((s) => s.updateQty);
  const cartDrawerOpen = useCartStore((s) => s.cartDrawerOpen);
  const setCartDrawerOpen = useCartStore((s) => s.setCartDrawerOpen);
  const products = useProductStore((s) => s.products);
  const addToast = useToastStore((s) => s.add);

  const [step, setStep] = useState<Step>("cart");
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo>({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
  });
  const [payError, setPayError] = useState("");
  const checkoutRequestIdRef = useRef<string | null>(null);

  const cartCount = items.reduce((n, i) => n + i.qty, 0);
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = subtotal >= 35 ? 0 : 5.99;
  const tax = subtotal * 0.085;
  const total = subtotal + shipping + tax;

  // Reset step when drawer closes — small delay so the close animation plays first.
  useEffect(() => {
    if (!cartDrawerOpen) {
      const t = setTimeout(() => setStep("cart"), 300);

      return () => clearTimeout(t);
    }
  }, [cartDrawerOpen]);

  const closeDrawer = () => setCartDrawerOpen(false);
  const updateField = <K extends keyof ShippingInfo>(
    key: K,
    value: ShippingInfo[K],
  ) => setShippingInfo((f) => ({ ...f, [key]: value }));

  const handleProceedToShipping = () => {
    if (items.length === 0) return;
    setStep("shipping");
  };

  const handleProceedToPayment = () => {
    const { name, email, address, city, state, zip } = shippingInfo;

    if (!name || !email || !address || !city || !state || !zip) {
      addToast("Please fill in all required fields", "error");

      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      addToast("Please enter a valid email address", "error");

      return;
    }
    checkoutRequestIdRef.current = null;
    setStep("payment");
  };

  const handleStripeCheckout = async () => {
    setStep("processing");
    setPayError("");
    try {
      checkoutRequestIdRef.current ||= crypto.randomUUID();
      const sb = getClient();
      const { data: { session } = { session: null } } = sb?.auth
        ? await sb.auth.getSession()
        : { data: { session: null } };

      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({
          items: items.map((i) => ({ id: i.id, qty: i.qty })),
          shipping: shippingInfo,
          idempotencyKey: checkoutRequestIdRef.current,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.url)
        throw new Error(data.error || "Unable to start checkout");
      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      setPayError(
        err instanceof Error
          ? err.message
          : "Payment processing error. Please try again.",
      );
      setStep("payment");
    }
  };

  const stepIndex = STEP_LABELS.findIndex((s) => s.key === step);
  // Shipping/payment forms need more room than the cart line-item list.
  const contentWidthClass =
    step === "shipping" || step === "payment" ? "sm:max-w-lg" : "sm:max-w-md";

  return (
    <Drawer>
      <Drawer.Backdrop
        isOpen={cartDrawerOpen}
        onOpenChange={(open) => !open && closeDrawer()}
      >
        <Drawer.Content
          className={`flex w-full flex-col ${contentWidthClass}`}
          placement="right"
        >
          <Drawer.Dialog className="flex h-full flex-col">
            <Drawer.Header className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <ShoppingBag className="size-4" />
                </span>
                <Drawer.Heading className="text-lg font-semibold">
                  {step === "cart" && "Your Cart"}
                  {step === "shipping" && "Shipping"}
                  {step === "payment" && "Payment"}
                  {step === "processing" && "Processing"}
                </Drawer.Heading>
                {step === "cart" && cartCount > 0 && (
                  <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent">
                    {cartCount} {cartCount === 1 ? "item" : "items"}
                  </span>
                )}
              </div>
              <Drawer.CloseTrigger aria-label="Close cart" />
            </Drawer.Header>

            {/* Step indicator */}
            {step !== "processing" && items.length > 0 && (
              <div className="flex items-center gap-1.5 px-6 pb-3">
                {STEP_LABELS.map((s, i) => (
                  <div key={s.key} className="flex flex-1 items-center gap-1.5">
                    <span
                      className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                        stepIndex >= i
                          ? "bg-accent text-accent-foreground"
                          : "border border-border text-muted"
                      }`}
                    >
                      {stepIndex > i ? "✓" : i + 1}
                    </span>
                    <span
                      className={`text-xs ${stepIndex >= i ? "font-semibold text-foreground" : "text-muted"}`}
                    >
                      {s.label}
                    </span>
                    {i < STEP_LABELS.length - 1 && (
                      <div
                        className={`h-px flex-1 ${stepIndex > i ? "bg-accent" : "bg-border"}`}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ─── Step: Cart ─── */}
            {step === "cart" && (
              <Drawer.Body className="flex flex-1 flex-col overflow-y-auto">
                {items.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                    <span className="flex size-16 items-center justify-center rounded-full bg-surface-secondary text-accent">
                      <ShoppingCart className="size-7" />
                    </span>
                    <h4 className="m-0 text-lg font-semibold text-foreground">
                      Your cart is empty
                    </h4>
                    <p className="m-0 text-sm text-muted">
                      Explore our premium phone accessories and gear.
                    </p>
                    <Button
                      variant="primary"
                      onPress={() => {
                        closeDrawer();
                        navigate("/shop");
                      }}
                    >
                      Explore Catalog
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-1 flex-col gap-3">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 rounded-2xl bg-surface-secondary p-3 transition-transform hover:-translate-y-0.5"
                        >
                          <img
                            alt={item.name}
                            className="size-16 shrink-0 rounded-xl object-cover"
                            src={
                              item.images?.[0] ||
                              "https://images.unsplash.com/photo-1609592179791-5b2f37d4c6e1?w=120&q=80"
                            }
                          />
                          <div className="min-w-0 flex-1">
                            <p className="m-0 truncate text-sm font-medium text-foreground">
                              {item.name}
                            </p>
                            <p className="m-0 font-semibold text-accent">
                              ${(item.price * item.qty).toFixed(2)}
                            </p>
                            <div className="mt-1.5 flex items-center gap-2">
                              <button
                                aria-label="Decrease quantity"
                                className="flex size-6 items-center justify-center rounded-full border border-border text-foreground hover:bg-surface-tertiary"
                                type="button"
                                onClick={() =>
                                  updateQty(item.id, item.qty - 1, item.stock)
                                }
                              >
                                <Minus className="size-3" />
                              </button>
                              <span className="w-4 text-center text-sm font-semibold text-foreground">
                                {item.qty}
                              </span>
                              <button
                                aria-label="Increase quantity"
                                className="flex size-6 items-center justify-center rounded-full border border-border text-foreground hover:bg-surface-tertiary"
                                type="button"
                                onClick={() =>
                                  updateQty(
                                    item.id,
                                    item.qty + 1,
                                    products.find((p) => p.id === item.id)
                                      ?.stock ?? item.stock,
                                  )
                                }
                              >
                                <Plus className="size-3" />
                              </button>
                            </div>
                          </div>
                          <button
                            aria-label={`Remove ${item.name}`}
                            className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-tertiary hover:text-danger"
                            type="button"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </Drawer.Body>
            )}

            {step === "cart" && items.length > 0 && (
              <Drawer.Footer className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Subtotal</span>
                  <strong className="text-accent">
                    ${subtotal.toFixed(2)}
                  </strong>
                </div>
                {subtotal < 35 ? (
                  <p className="m-0 text-xs text-muted">
                    Add{" "}
                    <strong className="text-foreground">
                      ${(35 - subtotal).toFixed(2)}
                    </strong>{" "}
                    more for{" "}
                    <strong className="text-accent">FREE Shipping</strong>!
                  </p>
                ) : (
                  <p className="m-0 text-xs text-accent">
                    ✓ Qualified for FREE Shipping!
                  </p>
                )}
                <Button
                  fullWidth
                  size="lg"
                  variant="primary"
                  onPress={handleProceedToShipping}
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="size-4" />
                </Button>
                <Button fullWidth variant="outline" onPress={closeDrawer}>
                  Continue Shopping
                </Button>
              </Drawer.Footer>
            )}

            {/* ─── Step: Shipping ─── */}
            {step === "shipping" && (
              <>
                <Drawer.Body className="flex flex-1 flex-col gap-5 overflow-y-auto">
                  <div>
                    <h3 className="m-0 mb-3 text-base font-semibold text-foreground">
                      Shipping Information
                    </h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <TextField
                        isRequired
                        className="flex flex-col gap-1.5 sm:col-span-2"
                        value={shippingInfo.name}
                        onChange={(v) => updateField("name", v)}
                      >
                        <Label>Full name</Label>
                        <InputGroup>
                          <InputGroup.Input />
                        </InputGroup>
                        <FieldError />
                      </TextField>
                      <TextField
                        isRequired
                        className="flex flex-col gap-1.5"
                        type="email"
                        value={shippingInfo.email}
                        onChange={(v) => updateField("email", v)}
                      >
                        <Label>Email</Label>
                        <InputGroup>
                          <InputGroup.Input />
                        </InputGroup>
                        <FieldError />
                      </TextField>
                      <TextField
                        className="flex flex-col gap-1.5"
                        type="tel"
                        value={shippingInfo.phone}
                        onChange={(v) => updateField("phone", v)}
                      >
                        <Label>Phone</Label>
                        <InputGroup>
                          <InputGroup.Input />
                        </InputGroup>
                      </TextField>
                      <TextField
                        isRequired
                        className="flex flex-col gap-1.5 sm:col-span-2"
                        value={shippingInfo.address}
                        onChange={(v) => updateField("address", v)}
                      >
                        <Label>Street address</Label>
                        <InputGroup>
                          <InputGroup.Input />
                        </InputGroup>
                        <FieldError />
                      </TextField>
                      <TextField
                        isRequired
                        className="flex flex-col gap-1.5"
                        value={shippingInfo.city}
                        onChange={(v) => updateField("city", v)}
                      >
                        <Label>City</Label>
                        <InputGroup>
                          <InputGroup.Input />
                        </InputGroup>
                        <FieldError />
                      </TextField>
                      <TextField
                        isRequired
                        className="flex flex-col gap-1.5"
                        value={shippingInfo.state}
                        onChange={(v) => updateField("state", v)}
                      >
                        <Label>State</Label>
                        <InputGroup>
                          <InputGroup.Input />
                        </InputGroup>
                        <FieldError />
                      </TextField>
                      <TextField
                        isRequired
                        className="flex flex-col gap-1.5"
                        value={shippingInfo.zip}
                        onChange={(v) => updateField("zip", v)}
                      >
                        <Label>ZIP code</Label>
                        <InputGroup>
                          <InputGroup.Input />
                        </InputGroup>
                        <FieldError />
                      </TextField>
                    </div>
                  </div>

                  <div>
                    <h3 className="m-0 mb-3 text-base font-semibold text-foreground">
                      Order Summary
                    </h3>
                    <div className="rounded-2xl bg-surface-secondary p-4">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between py-1 text-sm"
                        >
                          <span className="text-foreground">
                            {item.name}{" "}
                            <em className="text-muted">×{item.qty}</em>
                          </span>
                          <span className="text-foreground">
                            ${(item.price * item.qty).toFixed(2)}
                          </span>
                        </div>
                      ))}
                      <div className="my-2 border-t border-border" />
                      <div className="flex items-center justify-between py-1 text-sm">
                        <span className="text-muted">Subtotal</span>
                        <span className="text-foreground">
                          ${subtotal.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1 text-sm">
                        <span className="text-muted">Shipping</span>
                        <span className="text-foreground">
                          {shipping === 0 ? (
                            <strong className="text-accent">FREE</strong>
                          ) : (
                            `$${shipping.toFixed(2)}`
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1 text-sm">
                        <span className="text-muted">Tax (8.5%)</span>
                        <span className="text-foreground">
                          ${tax.toFixed(2)}
                        </span>
                      </div>
                      <div className="my-2 border-t border-border" />
                      <div className="flex items-center justify-between py-1">
                        <strong className="text-foreground">Total</strong>
                        <strong className="text-accent">
                          ${total.toFixed(2)}
                        </strong>
                      </div>
                    </div>
                  </div>
                </Drawer.Body>

                <Drawer.Footer className="flex flex-col gap-3">
                  <Button
                    fullWidth
                    size="lg"
                    variant="primary"
                    onPress={handleProceedToPayment}
                  >
                    <span>Continue to Payment</span>
                    <ArrowRight className="size-4" />
                  </Button>
                  <Button
                    fullWidth
                    variant="outline"
                    onPress={() => setStep("cart")}
                  >
                    <ArrowLeft className="size-4" />
                    <span>Back to Cart</span>
                  </Button>
                </Drawer.Footer>
              </>
            )}

            {/* ─── Step: Payment ─── */}
            {step === "payment" && (
              <>
                <Drawer.Body className="flex flex-1 flex-col gap-4 overflow-y-auto">
                  <h3 className="m-0 text-base font-semibold text-foreground">
                    Secure Payment
                  </h3>

                  <div className="flex items-start gap-2.5 rounded-2xl bg-accent-soft p-4">
                    <Lock className="mt-0.5 size-4 shrink-0 text-accent" />
                    <p className="m-0 text-sm text-foreground">
                      You will be redirected to{" "}
                      <strong>Stripe&rsquo;s secure checkout</strong> to enter
                      card details safely.
                    </p>
                  </div>

                  {payError && (
                    <div className="flex items-start gap-2.5 rounded-2xl bg-danger/10 p-4 text-danger">
                      <CircleAlert className="mt-0.5 size-4 shrink-0" />
                      <span className="text-sm">{payError}</span>
                    </div>
                  )}

                  <div className="rounded-2xl bg-surface-secondary p-4">
                    <h4 className="m-0 mb-1 text-sm font-semibold text-accent">
                      Shipping Destination
                    </h4>
                    <p className="m-0 text-sm text-foreground">
                      <strong>{shippingInfo.name}</strong>
                      <br />
                      {shippingInfo.address}
                      <br />
                      {shippingInfo.city}, {shippingInfo.state}{" "}
                      {shippingInfo.zip}
                      <br />
                      <span className="text-muted">{shippingInfo.email}</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-surface-tertiary p-4">
                    <span className="text-sm text-foreground">Order Total</span>
                    <strong className="text-lg text-accent">
                      ${total.toFixed(2)}
                    </strong>
                  </div>
                </Drawer.Body>

                <Drawer.Footer className="flex flex-col gap-3">
                  <Button
                    fullWidth
                    size="lg"
                    variant="primary"
                    onPress={handleStripeCheckout}
                  >
                    <Lock className="size-4" />
                    <span>Pay with Stripe — ${total.toFixed(2)}</span>
                  </Button>
                  <Button
                    fullWidth
                    variant="outline"
                    onPress={() => setStep("shipping")}
                  >
                    <ArrowLeft className="size-4" />
                    <span>Back to Shipping</span>
                  </Button>
                </Drawer.Footer>
              </>
            )}

            {/* ─── Step: Processing ─── */}
            {step === "processing" && (
              <Drawer.Body className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                <Loader2 className="size-10 animate-spin text-accent" />
                <h3 className="m-0 text-base font-semibold text-foreground">
                  Redirecting to Stripe…
                </h3>
                <p className="m-0 text-sm text-muted">
                  Please don&rsquo;t close this drawer or window.
                </p>
              </Drawer.Body>
            )}

            {/* Security footer */}
            <div className="flex items-center justify-center gap-1.5 border-t border-border py-3 text-xs text-muted">
              <Lock className="size-3.5" />
              <span>Secured by Stripe · 256-bit SSL</span>
            </div>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}
