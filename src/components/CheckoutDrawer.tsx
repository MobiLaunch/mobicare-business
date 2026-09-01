import type { Order } from "@/types/domain";

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Elements, CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { ArrowLeft, ArrowRight, CheckCircle2, Lock, Minus, Plus, ShoppingBag, Trash2, Truck } from "lucide-react";
import { Button, FieldError, InputGroup, Label, Modal, TextField } from "@heroui/react";

import { useAuth } from "@/lib/AuthContext";
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

function PaymentStep({ session, shippingInfo, items, shippingMethod, onSuccess, onBack }: { session: PaymentSession; shippingInfo: ShippingInfo; items: ReturnType<typeof useCartStore.getState>["items"]; shippingMethod: string; onSuccess: (order: Order) => void; onBack: () => void }) {
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

  return (
    <>
      <Modal.Body className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3 rounded-2xl border border-accent/20 bg-accent-soft p-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground"><Lock aria-hidden="true" className="size-4" /></span>
          <div><strong className="block text-sm text-foreground">Secure payment</strong><p className="m-0 mt-0.5 text-xs leading-relaxed text-muted">Your card details are securely handled by Stripe and never stored by Mobicare.</p></div>
        </div>
        {error && <div role="alert" className="rounded-2xl border border-danger/20 bg-danger/10 p-4 text-sm font-medium text-danger">{error}</div>}
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <Label className="mb-3 block text-xs font-bold uppercase tracking-wide text-muted">Card details</Label>
          <div className="rounded-xl border border-border bg-surface-secondary/30 p-4 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
            <CardElement options={{ hidePostalCode: true }} />
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface-secondary/40 p-4">
          <div className="flex items-center justify-between gap-4 text-sm"><span className="text-muted">Delivering to</span><strong className="text-right">{shippingInfo.city}, {shippingInfo.state} {shippingInfo.zip}</strong></div>
          <div className="my-3 border-t border-border" />
          <div className="flex items-end justify-between gap-4"><span className="text-sm font-medium text-muted">Total due</span><strong className="text-2xl font-extrabold tracking-tight text-accent">${session.total.toFixed(2)}</strong></div>
        </div>
      </Modal.Body>
      <Modal.Footer className="flex flex-col gap-2 border-t border-border bg-surface px-5 py-4 sm:px-6">
        <Button fullWidth isDisabled={busy || !stripe} size="lg" variant="primary" onPress={pay}>
          <Lock aria-hidden="true" className="size-4" />{busy ? "Processing securely…" : `Pay $${session.total.toFixed(2)}`}
        </Button>
        <Button fullWidth isDisabled={busy} variant="ghost" onPress={onBack}><ArrowLeft aria-hidden="true" className="size-4" />Back to delivery</Button>
      </Modal.Footer>
    </>
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

  const stepTitle = step === "cart" ? "Shopping Cart" : step === "shipping" ? "Delivery Details" : step === "payment" ? "Secure Payment" : "Order Confirmed";
  const itemCount = items.reduce((n, item) => n + item.qty, 0);
  const progressSteps = ["Cart", "Delivery", "Payment"];
  const progressIndex = step === "cart" ? 0 : step === "shipping" ? 1 : step === "payment" ? 2 : 3;

  return (
    <Modal>
      <Modal.Backdrop isOpen={open} onOpenChange={(value) => !value && close()}>
        <Modal.Container className="w-[calc(100%-1rem)] max-w-xl" scroll="inside" size="lg">
          <Modal.Dialog className="flex max-h-[min(820px,calc(100dvh-1rem))] flex-col overflow-hidden bg-surface shadow-2xl">
            <Modal.Header className="border-b border-border bg-surface px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"><ShoppingBag className="size-5" /></span>
                <div className="min-w-0"><Modal.Heading className="font-bold">{stepTitle}</Modal.Heading>{step !== "success" && <p className="m-0 text-xs text-muted">{itemCount} {itemCount === 1 ? "item" : "items"}</p>}</div>
              </div>
              {step !== "success" && (
                <div className="mt-4 flex items-center gap-2" aria-label="Checkout progress">
                  {progressSteps.map((label, index) => (
                    <div key={label} className="flex min-w-0 flex-1 items-center gap-2">
                      <span className={`flex size-6 shrink-0 items-center justify-center rounded-full text-caption font-bold ${index <= progressIndex ? "bg-accent text-accent-foreground" : "border border-border bg-surface text-muted"}`}>{index < progressIndex ? <CheckCircle2 className="size-3.5" /> : index + 1}</span>
                      <span className={`truncate text-caption font-semibold ${index <= progressIndex ? "text-foreground" : "text-muted"}`}>{label}</span>
                      {index < progressSteps.length - 1 && <span className="h-px flex-1 bg-border" />}
                    </div>
                  ))}
                </div>
              )}
            </Modal.Header>

            {step === "cart" && <>
              <Modal.Body className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
                {items.length === 0 ? (
                  <div className="flex min-h-80 flex-col items-center justify-center px-4 text-center">
                    <span className="mb-4 flex size-16 items-center justify-center rounded-full bg-accent-soft text-accent"><ShoppingBag aria-hidden="true" className="size-7" /></span>
                    <h3 className="m-0 text-lg font-bold">Your cart is empty</h3>
                    <p className="mt-1 max-w-xs text-sm leading-relaxed text-muted">Find something useful for your next repair or upgrade.</p>
                    <Button className="mt-4" variant="primary" onPress={() => { close(); navigate("/shop"); }}>Browse shop <ArrowRight aria-hidden="true" className="size-4" /></Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {items.map((item) => {
                      const stock = products.find((p) => p.id === item.id)?.stock ?? item.stock;
                      const lineTotal = item.price * item.qty;
                      return (
                        <div key={item.id} className="group flex gap-3 rounded-2xl border border-border bg-surface p-3 shadow-sm transition-shadow hover:shadow-md sm:p-4">
                          <img src={item.images?.[0]} alt="" className="size-20 shrink-0 rounded-xl bg-surface-secondary object-cover sm:size-24" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0"><strong className="block truncate text-sm font-bold text-foreground sm:text-body-sm">{item.name}</strong><span className="mt-0.5 block text-xs text-muted">${item.price.toFixed(2)} each</span></div>
                              <button type="button" aria-label={`Remove ${item.name}`} className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-2 focus-visible:outline-accent" onClick={() => removeItem(item.id)}><Trash2 aria-hidden="true" className="size-4" /></button>
                            </div>
                            <div className="mt-3 flex items-end justify-between gap-3">
                              <div className="flex items-center rounded-full border border-border bg-surface-secondary/50 p-0.5">
                                <button type="button" className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-surface disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-accent" aria-label="Decrease quantity" onClick={() => updateQty(item.id, item.qty - 1, stock)}><Minus aria-hidden="true" className="size-3" /></button>
                                <span aria-live="polite" className="w-7 text-center text-xs font-bold">{item.qty}</span>
                                <button type="button" className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-surface disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-accent" aria-label="Increase quantity" disabled={item.qty >= stock} onClick={() => updateQty(item.id, item.qty + 1, stock)}><Plus aria-hidden="true" className="size-3" /></button>
                              </div>
                              <strong className="text-base font-extrabold text-accent">${lineTotal.toFixed(2)}</strong>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Modal.Body>
              {items.length > 0 && <Modal.Footer className="flex flex-col gap-3 border-t border-border bg-surface px-5 py-4 sm:px-6"><div className="flex items-center justify-between"><span className="text-sm text-muted">Subtotal</span><strong className="text-lg font-extrabold">${subtotal.toFixed(2)}</strong></div><Button fullWidth size="lg" variant="primary" onPress={proceedDelivery}>Continue to delivery <ArrowRight aria-hidden="true" className="size-4" /></Button></Modal.Footer>}
            </>}

            {step === "shipping" && <>
              <Modal.Body className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 py-5 sm:px-6">
                <section><div className="mb-3"><h3 className="m-0 text-sm font-bold text-foreground">How would you like to receive it?</h3><p className="m-0 mt-1 text-xs text-muted">Choose the option that works best for you.</p></div><div className="flex flex-col gap-2.5">{options.map((option) => { const selected = shippingMethod === option.id; return <button key={option.id} type="button" aria-pressed={selected} className={`relative min-h-[72px] rounded-2xl border p-3.5 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${selected ? "border-accent bg-accent-soft/40 shadow-sm" : "border-border bg-surface hover:border-accent/40 hover:bg-surface-secondary/50"}`} onClick={() => setShippingMethod(option.id)}><div className="flex items-center gap-3"><span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${selected ? "bg-accent text-accent-foreground" : "bg-surface-secondary text-muted"}`}><Truck aria-hidden="true" className="size-4" /></span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><strong className="text-sm">{option.name}</strong><span className="shrink-0 text-sm font-extrabold">{option.formattedCost}</span></div><p className="m-0 mt-0.5 text-xs text-muted">{option.description}</p></div><span className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${selected ? "border-accent" : "border-border"}`}>{selected && <span className="size-2.5 rounded-full bg-accent" />}</span></div></button>; })}</div></section>
                <section><div className="mb-3"><h3 className="m-0 text-sm font-bold text-foreground">Delivery address</h3><p className="m-0 mt-1 text-xs text-muted">Where should we send your order?</p></div><div className="rounded-2xl border border-border bg-surface-secondary/30 p-4"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{([['name','Full name','Jane Doe','text'],['email','Email','jane@example.com','email'],['phone','Phone','555-555-5555','tel'],['address','Street address','123 Main St','text'],['city','City','Fairfield','text'],['state','State','IL','text'],['zip','ZIP','62837','text']] as const).map(([key,label,placeholder,type]) => <TextField key={key} isRequired={key !== 'phone'} className={key === 'name' || key === 'email' || key === 'address' ? 'flex flex-col gap-1 sm:col-span-2' : 'flex flex-col gap-1'} type={type} value={shippingInfo[key]} onChange={(value) => setShippingInfo((v) => ({ ...v, [key]: value }))}><Label className="text-xs font-semibold text-muted">{label}</Label><InputGroup><InputGroup.Input placeholder={placeholder} /></InputGroup><FieldError /></TextField>)}</div></div></section>
                <div className="rounded-2xl border border-border bg-surface-secondary/40 p-4 text-sm"><div className="flex justify-between"><span className="text-muted">Subtotal</span><span>${subtotal.toFixed(2)}</span></div><div className="flex justify-between py-1"><span className="text-muted">Shipping</span><span>{shipping.cost ? `$${shipping.cost.toFixed(2)}` : "FREE"}</span></div><div className="my-2 border-t border-border"/><div className="flex justify-between font-bold"><span>Tax & total</span><span className="text-xs font-semibold text-muted">Calculated securely at checkout</span></div></div>
              </Modal.Body>
              <Modal.Footer className="flex flex-col gap-2 border-t border-border bg-surface px-5 py-4 sm:px-6"><Button fullWidth isDisabled={quoting} size="lg" variant="primary" onPress={proceedPayment}>{quoting ? "Preparing secure checkout…" : "Continue to payment"} {!quoting && <ArrowRight aria-hidden="true" className="size-4" />}</Button><Button fullWidth isDisabled={quoting} variant="ghost" onPress={() => setStep("cart")}><ArrowLeft aria-hidden="true" className="size-4" />Back to cart</Button></Modal.Footer>
            </>}

            {step === "payment" && session && (stripePromise
              ? <Elements stripe={stripePromise} options={{ appearance: { theme: "stripe" } }}><PaymentStep session={session} shippingInfo={shippingInfo} items={items} shippingMethod={shippingMethod} onSuccess={finish} onBack={() => { setSession(null); setStep("shipping"); }} /></Elements>
              : <Modal.Body className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center"><p className="m-0 text-sm font-semibold text-foreground">Payments are temporarily unavailable.</p><p className="m-0 text-xs text-muted">Please call the shop to complete your order, or try again shortly.</p><Button variant="outline" onPress={() => { setSession(null); setStep("shipping"); }}><ArrowLeft aria-hidden="true" className="size-4" />Back</Button></Modal.Body>)}

            {step === "success" && order && <Modal.Body className="flex flex-1 flex-col items-center gap-5 overflow-y-auto px-6 py-10 text-center"><div className="flex size-20 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg"><CheckCircle2 aria-hidden="true" className="size-10" /></div><div><span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent">Order #{order.id}</span><h2 className="mt-4 text-2xl font-extrabold tracking-tight">Order confirmed</h2><p className="mt-1 max-w-sm text-sm leading-relaxed text-muted">Your payment was processed securely. A confirmation will be sent to {order.customer.email}.</p></div><div className="w-full rounded-2xl border border-border bg-surface-secondary/50 p-4 text-left"><div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-full bg-accent-soft text-accent"><Truck aria-hidden="true" className="size-4" /></span><div><strong className="block text-sm">{shippingInfo.name}</strong><span className="text-xs text-muted">{shipping.formattedCost}</span></div></div><div className="mt-3 flex justify-between border-t border-border pt-3"><span className="text-sm text-muted">Total paid</span><strong className="text-accent">${order.total.toFixed(2)}</strong></div></div><div className="flex w-full flex-col gap-2"><Button fullWidth variant="primary" onPress={() => { close(); navigate("/account"); }}>View order <ArrowRight aria-hidden="true" className="size-4" /></Button><Button fullWidth variant="outline" onPress={() => { close(); navigate("/shop"); }}>Continue shopping</Button></div></Modal.Body>}
            {step !== "success" && <div className="flex items-center justify-center gap-2 border-t border-border bg-surface-secondary/30 px-4 py-2.5 text-caption text-muted"><Lock aria-hidden="true" className="size-3" />Secure checkout powered by Stripe</div>}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
