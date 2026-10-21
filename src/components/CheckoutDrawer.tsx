import type { Order } from "@/types/domain";
import ProductImage from "@/components/ProductImage";

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Elements, CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { ArrowLeft, ArrowRight, Check, ChevronLeft, Lock, ShoppingBag, Trash2, Truck, X } from "lucide-react";
import { Modal } from "@heroui/react";

import { useAuth } from "@/lib/AuthContext";
import { PickerPanel, QuantityStepper } from "@/components/ios/QuantityPicker";
import AppIcon from "@/components/ios/AppIcon";
import { IosChoice, IosField, IosGroup, IosNote, IosProgress, IosSheetHeader, IosSummaryRow } from "@/components/ios/Forms";
import { play } from "@/lib/sound";
import { useCartStore, useProductStore, useToastStore } from "@/lib/store";
import { getDynamicShippingOptions } from "@/lib/shipping";
import { getStripePublishableKey } from "@/lib/config";

type Step = "cart" | "shipping" | "payment" | "success";
type ShippingInfo = { name: string; email: string; phone: string; address: string; city: string; state: string; zip: string };
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
      play("success");
      addToast("Payment successful! Your order has been placed.", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment could not be completed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="ios-sheet-body">
        <IosNote><Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0" /><span><strong>Secure payment.</strong> Your card details are handled by Stripe and never touch our servers.</span></IosNote>
        {error && <div role="alert"><IosNote tone="warn"><span>{error}</span></IosNote></div>}
        <IosGroup title="Card details">
          <div className="ios-row !py-3">
            <div className="w-full">
              <CardElement options={{ hidePostalCode: true, style: { base: { fontSize: "16px", color: "#1f2430", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif", "::placeholder": { color: "#a3a8b3" } } } }} />
            </div>
          </div>
        </IosGroup>
        <IosGroup footer={<>By paying you agree to our <a className="underline" href="/shipping" onClick={(e) => { e.preventDefault(); onNavigate("/shipping"); }}>Shipping</a>, <a className="underline" href="/returns" onClick={(e) => { e.preventDefault(); onNavigate("/returns"); }}>Returns &amp; Exchanges</a> and <a className="underline" href="/refunds" onClick={(e) => { e.preventDefault(); onNavigate("/refunds"); }}>Refund</a> policies. All sales are final; defective items are eligible for exchange.</>} title="Summary">
          <IosSummaryRow label="Delivering to" value={`${shippingInfo.city}, ${shippingInfo.state} ${shippingInfo.zip}`} />
          <IosSummaryRow label="Total due" value={<span className="text-lg text-[var(--ios-blue-dark)]">${session.total.toFixed(2)}</span>} />
        </IosGroup>
      </div>
      <div className="ios-sheet-footer">
        <button className="ios-btn ios-btn--green ios-btn--lg w-full" disabled={busy || !stripe} type="button" onClick={pay}>
          <Lock aria-hidden="true" className="size-4" />{busy ? "Processing securely…" : `Pay $${session.total.toFixed(2)}`}
        </button>
        <button className="ios-btn ios-btn--gray w-full" disabled={busy} type="button" onClick={onBack}><ArrowLeft aria-hidden="true" className="size-4" />Back to delivery</button>
      </div>
    </>
  );
}

export default function CheckoutDrawer() {
  const [pickerFor, setPickerFor] = useState<string | null>(null);
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

  const stepTitle = step === "cart" ? "Shopping Cart" : step === "shipping" ? "Delivery Details" : step === "payment" ? "Secure Payment" : "Order Confirmed";
  const itemCount = items.reduce((n, item) => n + item.qty, 0);
  const progressSteps = ["Cart", "Delivery", "Payment"];
  const progressIndex = step === "cart" ? 0 : step === "shipping" ? 1 : step === "payment" ? 2 : 3;

  const goTo = (path: string) => { close(); navigate(path); };
  const showBack = step === "shipping" || step === "payment";
  const onBack = () => { if (step === "shipping") setStep("cart"); else if (step === "payment") { setSession(null); setStep("shipping"); } };

  return (
    <Modal>
      <Modal.Backdrop isOpen={open} onOpenChange={(value) => !value && close()}>
        <Modal.Container className="w-[calc(100%-1rem)] max-w-xl" scroll="inside" size="lg">
          <Modal.Dialog className="ios-dialog flex max-h-[min(820px,calc(100dvh-1rem))] flex-col">
            <IosSheetHeader
              left={showBack ? <button className="ios-bar-btn" disabled={quoting} type="button" onClick={onBack}><ChevronLeft aria-hidden="true" className="size-3.5" />Back</button> : undefined}
              right={<button className="ios-bar-btn" type="button" onClick={close}><X aria-hidden="true" className="size-3.5" />{step === "success" ? "Close" : "Cancel"}</button>}
              subtitle={step !== "success" ? `${itemCount} ${itemCount === 1 ? "item" : "items"}` : undefined}
              title={<Modal.Heading className="m-0 inline text-[16px] text-white">{stepTitle}</Modal.Heading>}
            />
            {step !== "success" && <IosProgress index={progressIndex} steps={progressSteps} />}

            {step === "cart" && <>
              <div className="ios-sheet-body">
                {items.length === 0 ? (
                  <div className="flex min-h-72 flex-col items-center justify-center gap-3 px-4 text-center">
                    <AppIcon color="orange" icon={ShoppingBag} size={72} />
                    <h3 className="letterpress m-0 text-lg font-extrabold text-[var(--ios-ink)]">Your cart is empty</h3>
                    <p className="m-0 max-w-xs text-sm text-[var(--ios-slate)]">Find something useful for your next repair or upgrade.</p>
                    <button className="ios-btn ios-btn--green" type="button" onClick={() => goTo("/shop")}>Browse shop <ArrowRight aria-hidden="true" className="size-4" /></button>
                  </div>
                ) : (
                  <IosGroup>
                    {items.map((item) => {
                      const stock = products.find((p) => p.id === item.id)?.stock ?? item.stock;
                      const lineTotal = item.price * item.qty;
                      return (
                        <div key={item.id} className="ios-row !items-start !py-3">
                          <div className="surface-sunken relative size-20 shrink-0 overflow-hidden rounded-field"><ProductImage alt={item.name} src={item.images?.[0]} /></div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0"><strong className="block truncate text-[15px]">{item.name}</strong><span className="mt-0.5 block text-xs text-muted">${item.price.toFixed(2)} each</span></div>
                              <button aria-label={`Remove ${item.name}`} className="ios-btn ios-btn--red ios-btn--sm !min-h-8 !px-2" type="button" onClick={() => removeItem(item.id)}><Trash2 aria-hidden="true" className="size-4" /></button>
                            </div>
                            <div className="mt-2.5 flex items-center justify-between gap-3">
                              <QuantityStepper max={stock} size="sm" value={item.qty} onChange={(q) => updateQty(item.id, q, stock)} onOpen={() => setPickerFor(pickerFor === item.id ? null : item.id)} />
                              <strong className="text-base font-extrabold text-[var(--ios-blue-dark)]">${lineTotal.toFixed(2)}</strong>
                            </div>
                            {pickerFor === item.id && <div className="mt-3"><PickerPanel max={stock} value={item.qty} onChange={(q) => updateQty(item.id, q, stock)} onDone={() => setPickerFor(null)} /></div>}
                          </div>
                        </div>
                      );
                    })}
                  </IosGroup>
                )}
                {items.length > 0 && (
                  <IosGroup footer={<>All sales are final. Defective items may be exchanged — see our <a className="underline" href="/returns" onClick={(e) => { e.preventDefault(); goTo("/returns"); }}>Returns &amp; Exchanges</a> policy.</>}>
                    <IosSummaryRow label="Subtotal" value={<span className="text-lg">${subtotal.toFixed(2)}</span>} />
                  </IosGroup>
                )}
              </div>
              {items.length > 0 && <div className="ios-sheet-footer"><button className="ios-btn ios-btn--lg w-full" type="button" onClick={proceedDelivery}>Continue to delivery <ArrowRight aria-hidden="true" className="size-5" /></button></div>}
            </>}

            {step === "shipping" && <>
              <div className="ios-sheet-body">
                <IosGroup footer="Choose the option that works best for you." title="How would you like to receive it?">
                  {options.map((option) => (
                    <IosChoice
                      key={option.id}
                      detail={`${option.description} · ${option.shortArrival}`}
                      icon={<AppIcon color={option.id === "express" ? "orange" : option.id === "pickup" ? "green" : "blue"} icon={Truck} size={36} />}
                      selected={shippingMethod === option.id}
                      title={option.name}
                      trailing={option.formattedCost}
                      onClick={() => setShippingMethod(option.id)}
                    />
                  ))}
                </IosGroup>
                <IosGroup footer="Where should we send your order?" title="Delivery address">
                  <IosField autoComplete="name" label="Name" placeholder="Jane Doe" required value={shippingInfo.name} onChange={(v) => setShippingInfo((s) => ({ ...s, name: v }))} />
                  <IosField autoComplete="email" inputMode="email" label="Email" placeholder="jane@example.com" required type="email" value={shippingInfo.email} onChange={(v) => setShippingInfo((s) => ({ ...s, email: v }))} />
                  <IosField autoComplete="tel" inputMode="tel" label="Phone" placeholder="Optional" type="tel" value={shippingInfo.phone} onChange={(v) => setShippingInfo((s) => ({ ...s, phone: v }))} />
                  <IosField autoComplete="street-address" label="Street" placeholder="123 Main St" required value={shippingInfo.address} onChange={(v) => setShippingInfo((s) => ({ ...s, address: v }))} />
                  <IosField autoComplete="address-level2" label="City" placeholder="Fairfield" required value={shippingInfo.city} onChange={(v) => setShippingInfo((s) => ({ ...s, city: v }))} />
                  <IosField autoComplete="address-level1" label="State" placeholder="IL" required value={shippingInfo.state} onChange={(v) => setShippingInfo((s) => ({ ...s, state: v }))} />
                  <IosField autoComplete="postal-code" inputMode="numeric" label="ZIP" placeholder="62837" required value={shippingInfo.zip} onChange={(v) => setShippingInfo((s) => ({ ...s, zip: v }))} />
                </IosGroup>
                <IosGroup footer={<>Tax and your final total are calculated securely at checkout. See our <a className="underline" href="/shipping" onClick={(e) => { e.preventDefault(); goTo("/shipping"); }}>Shipping</a> policy.</>}>
                  <IosSummaryRow label="Subtotal" value={`$${subtotal.toFixed(2)}`} />
                  <IosSummaryRow label="Shipping" value={shipping.cost ? `$${shipping.cost.toFixed(2)}` : "FREE"} />
                </IosGroup>
              </div>
              <div className="ios-sheet-footer">
                <button className="ios-btn ios-btn--lg w-full" disabled={quoting} type="button" onClick={proceedPayment}>{quoting ? "Preparing secure checkout…" : "Continue to payment"} {!quoting && <ArrowRight aria-hidden="true" className="size-5" />}</button>
              </div>
            </>}

            {step === "payment" && session && (stripePromise
              ? <Elements stripe={stripePromise} options={{ appearance: { theme: "stripe" } }}><PaymentStep session={session} shippingInfo={shippingInfo} items={items} shippingMethod={shippingMethod} onSuccess={finish} onBack={onBack} onNavigate={goTo} /></Elements>
              : <div className="ios-sheet-body flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center"><p className="m-0 text-sm font-bold">Payments are temporarily unavailable.</p><p className="m-0 text-xs text-muted">Please call the shop to complete your order, or try again shortly.</p><button className="ios-btn ios-btn--gray" type="button" onClick={onBack}><ArrowLeft aria-hidden="true" className="size-4" />Back</button></div>)}

            {step === "success" && order && (
              <>
                <div className="ios-sheet-body flex flex-col items-center gap-4 pt-8 text-center">
                  <span className="ios-bounce"><AppIcon color="green" icon={Check} size={84} /></span>
                  <div>
                    <span className="ios-pill">Order #{order.id}</span>
                    <h3 className="letterpress mt-3 text-2xl font-extrabold text-[var(--ios-ink)]">Order confirmed</h3>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--ios-slate)]">Your payment was processed securely. A confirmation will be sent to {order.customer.email}.</p>
                  </div>
                  <IosGroup className="w-full text-left">
                    <IosSummaryRow label="Ship to" value={shippingInfo.name} />
                    <IosSummaryRow label="Delivery" value={shipping.name} />
                    <IosSummaryRow label="Total paid" value={<span className="text-lg text-[var(--ios-blue-dark)]">${order.total.toFixed(2)}</span>} />
                  </IosGroup>
                </div>
                <div className="ios-sheet-footer">
                  <button className="ios-btn ios-btn--lg w-full" type="button" onClick={() => goTo("/account")}>View order <ArrowRight aria-hidden="true" className="size-5" /></button>
                  <button className="ios-btn ios-btn--gray w-full" type="button" onClick={() => goTo("/shop")}>Continue shopping</button>
                </div>
              </>
            )}
            {step !== "success" && <div className="flex items-center justify-center gap-2 bg-[#1d1f24] px-4 py-2 text-caption text-white/60"><Lock aria-hidden="true" className="size-3" />Secure checkout powered by Stripe</div>}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
