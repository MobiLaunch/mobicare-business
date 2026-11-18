import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";

import AuthCardShell from "@/components/auth/AuthCardShell";
import { Alert } from "@/components/arc/alert/alert";
import { Button } from "@/components/arc/button/button";
import { Input } from "@/components/arc/input/input";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import { BUSINESS } from "@/lib/config";
import { useSiteStore } from "@/lib/siteStore";
import {
  sbLookupOrderStatus,
  sbLookupRepairStatus,
  type PublicOrderStatus,
  type RepairStatus as RepairStatusData,
} from "@/lib/supabase";

type LookupMode = "repair" | "order";

const REPAIR_STEPS: Array<{ stage: RepairStatusData["stage"]; label: string }> = [
  { stage: "received", label: "Checked in" },
  { stage: "in_progress", label: "Being repaired" },
  { stage: "ready", label: "Ready for pickup" },
  { stage: "done", label: "Picked up" },
];

const ORDER_STEPS: Array<{
  stage: Exclude<PublicOrderStatus["stage"], "cancelled">;
  shipLabel: string;
  pickupLabel: string;
}> = [
  { stage: "placed", shipLabel: "Order placed", pickupLabel: "Order placed" },
  { stage: "processing", shipLabel: "Processing", pickupLabel: "Preparing pickup" },
  { stage: "shipped", shipLabel: "Shipped", pickupLabel: "Ready at Fairfield shop" },
  { stage: "delivered", shipLabel: "Delivered", pickupLabel: "Picked up" },
];

const REPAIR_MESSAGES: Record<string, string> = {
  invalid:
    "Enter your ticket number and the last 4 digits of the phone number on your ticket.",
  not_found:
    "We couldn't match that ticket and phone number. Check them and try again, or call us.",
  locked:
    "Too many tries for that ticket. Please wait about 15 minutes, or call us.",
  busy: "We're getting a lot of requests right now. Please try again in a minute.",
  error: "Something went wrong looking that up. Please try again, or call us.",
};

const ORDER_MESSAGES: Record<string, string> = {
  invalid:
    "Enter your order number (for example ORD-...) and your checkout email, 5-digit ZIP, or last 4 phone digits.",
  not_found:
    "We couldn't match that order number and verification detail. Check your confirmation email or call us.",
  locked:
    "Too many tries for that order. Please wait about 15 minutes, or call us.",
  busy: "We're getting a lot of requests right now. Please try again in a minute.",
  error:
    "Online order lookup is temporarily unavailable. Sign in to your account or call the shop for an instant update.",
};

export default function RepairStatus() {
  const [params] = useSearchParams();
  const business = useSiteStore((s) => s.business);
  const phoneDisplay = business?.phone || BUSINESS.phone;

  const initialOrderParam = (params.get("order") || "").trim();
  const initialMode: LookupMode =
    initialOrderParam || params.get("tab") === "order" ? "order" : "repair";

  const [mode, setMode] = useState<LookupMode>(initialMode);

  // Repair ticket state
  const [ticket, setTicket] = useState(
    (params.get("ticket") || "").replace(/\D/g, ""),
  );
  const [phone, setPhone] = useState("");
  const [repairBusy, setRepairBusy] = useState(false);
  const [repairError, setRepairError] = useState("");
  const [repair, setRepair] = useState<RepairStatusData | null>(null);

  // Online order state
  const [orderId, setOrderId] = useState(initialOrderParam);
  const [orderContact, setOrderContact] = useState("");
  const [orderBusy, setOrderBusy] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [orderResult, setOrderResult] = useState<PublicOrderStatus | null>(null);

  const submitRepair = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRepairError("");
    setRepair(null);
    setRepairBusy(true);
    try {
      const res = await sbLookupRepairStatus(Number(ticket), phone);

      if (res.ok) setRepair(res.repair);
      else setRepairError(REPAIR_MESSAGES[res.reason] || REPAIR_MESSAGES.error);
    } finally {
      setRepairBusy(false);
    }
  };

  const submitOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setOrderError("");
    setOrderResult(null);
    setOrderBusy(true);
    try {
      const res = await sbLookupOrderStatus(orderId, orderContact);

      if (res.ok) setOrderResult(res.order);
      else setOrderError(ORDER_MESSAGES[res.reason] || ORDER_MESSAGES.error);
    } finally {
      setOrderBusy(false);
    }
  };

  const repairStep = repair
    ? repair.stage === "waiting_parts"
      ? 1
      : REPAIR_STEPS.findIndex((s) => s.stage === repair.stage)
    : -1;

  const isOrderPickup = orderResult?.shippingMethod === "pickup";
  const orderStep =
    orderResult && orderResult.stage !== "cancelled"
      ? ORDER_STEPS.findIndex((s) => s.stage === orderResult.stage)
      : -1;

  const contactValid =
    orderContact.includes("@") ||
    orderContact.replace(/\D/g, "").length >= 4;

  return (
    <AuthCardShell
      description={
        mode === "repair"
          ? "Enter your ticket number and the last 4 digits of the phone number on your ticket."
          : "Enter your online order number and the email address (or last 4 phone digits) from checkout."
      }
      metaDescription="Check the live progress of your Mobicare repair ticket or online accessory order."
      metaTitle="Track repair or order | Mobicare Device Recovery"
      title={mode === "repair" ? "Check your repair" : "Track your order"}
    >
      <SegmentedControl
        label="Lookup type"
        options={[
          { value: "repair", label: "Repair ticket" },
          { value: "order", label: "Online order" },
        ]}
        value={mode}
        onValueChange={(v) => setMode(v as LookupMode)}
      />

      {mode === "repair" ? (
        <>
          {repairError && <Alert role="alert" title={repairError} tone="danger" />}

          <form className="mc-form" onSubmit={submitRepair}>
            <Input
              disabled={repairBusy}
              inputMode="numeric"
              label="Ticket number"
              name="ticket"
              placeholder="For example, 1042"
              required
              value={ticket}
              onChange={(e) => setTicket(e.target.value.replace(/\D/g, ""))}
            />
            <Input
              autoComplete="tel"
              disabled={repairBusy}
              inputMode="numeric"
              label="Last 4 digits of your phone"
              maxLength={14}
              name="phone"
              placeholder="1234"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Button
              disabled={!ticket || phone.replace(/\D/g, "").length < 4}
              loading={repairBusy}
              size="lg"
              type="submit"
            >
              Check repair status
            </Button>
          </form>

          {repair && (
            <section aria-live="polite" className="mc-stack-sm">
              <h2 className="mc-h3">
                {repair.device || `Ticket #${repair.ticket}`}
              </h2>
              <ol
                className="mc-stack-sm"
                style={{ listStyle: "none", margin: 0, padding: 0 }}
              >
                {REPAIR_STEPS.map((s, i) => (
                  <li
                    key={s.stage}
                    aria-current={i === repairStep ? "step" : undefined}
                    style={{
                      display: "flex",
                      gap: "0.75rem",
                      alignItems: "center",
                      opacity: i > repairStep ? 0.45 : 1,
                      fontWeight: i === repairStep ? 600 : 400,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: "1.5rem",
                        height: "1.5rem",
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        fontSize: "0.8rem",
                        background:
                          i <= repairStep ? "var(--accent, #111)" : "transparent",
                        color:
                          i <= repairStep
                            ? "var(--accent-foreground, #fff)"
                            : "inherit",
                        border: "1px solid currentColor",
                      }}
                    >
                      {i < repairStep ? "✓" : i + 1}
                    </span>
                    {s.label}
                  </li>
                ))}
              </ol>
              {repair.stage === "waiting_parts" && (
                <Alert title="We're waiting on a part" tone="info">
                  Your repair is on hold until the part arrives. We&apos;ll let you
                  know as soon as it&apos;s in.
                </Alert>
              )}
              {repair.stage === "ready" && (
                <Alert title="Your device is ready" tone="success">
                  Bring your ticket number when you come in to 920 Commerce Drive,
                  Suite 3, Fairfield, IL.
                </Alert>
              )}
              <p className="mc-text">
                Current status: <strong>{repair.status}</strong> · updated{" "}
                {new Date(repair.updated_at).toLocaleDateString()}
              </p>
            </section>
          )}
        </>
      ) : (
        <>
          {orderError && <Alert role="alert" title={orderError} tone="danger" />}

          <form className="mc-form" onSubmit={submitOrder}>
            <Input
              disabled={orderBusy}
              label="Order number"
              name="order"
              placeholder="ORD-..."
              required
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
            />
            <Input
              autoComplete="email"
              disabled={orderBusy}
              label="Checkout email, ZIP code, or last 4 phone digits"
              name="contact"
              placeholder="you@example.com, 62837, or 1234"
              required
              value={orderContact}
              onChange={(e) => setOrderContact(e.target.value)}
            />
            <Button
              disabled={!orderId.trim() || orderId.trim().replace(/^#/, "").length < 4 || !contactValid}
              loading={orderBusy}
              size="lg"
              type="submit"
            >
              Check order status
            </Button>
          </form>

          {orderResult && (
            <section aria-live="polite" className="mc-stack-sm">
              <h2 className="mc-h3">Order #{orderResult.id}</h2>
              {orderResult.stage === "cancelled" ? (
                <Alert
                  title={`Order ${orderResult.status.replace(/_/g, " ")}`}
                  tone="warning"
                >
                  This order was {orderResult.status.replace(/_/g, " ")}. Call{" "}
                  {phoneDisplay} if you have any questions.
                </Alert>
              ) : (
                <ol
                  className="mc-stack-sm"
                  style={{ listStyle: "none", margin: 0, padding: 0 }}
                >
                  {ORDER_STEPS.map((s, i) => (
                    <li
                      key={s.stage}
                      aria-current={i === orderStep ? "step" : undefined}
                      style={{
                        display: "flex",
                        gap: "0.75rem",
                        alignItems: "center",
                        opacity: i > orderStep ? 0.45 : 1,
                        fontWeight: i === orderStep ? 600 : 400,
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          width: "1.5rem",
                          height: "1.5rem",
                          borderRadius: "50%",
                          display: "grid",
                          placeItems: "center",
                          fontSize: "0.8rem",
                          background:
                            i <= orderStep ? "var(--accent, #111)" : "transparent",
                          color:
                            i <= orderStep
                              ? "var(--accent-foreground, #fff)"
                              : "inherit",
                          border: "1px solid currentColor",
                        }}
                      >
                        {i < orderStep ? "✓" : i + 1}
                      </span>
                      {isOrderPickup ? s.pickupLabel : s.shipLabel}
                    </li>
                  ))}
                </ol>
              )}

              {orderResult.trackingNumber && (
                <Alert title={`Tracking: ${orderResult.trackingNumber}`} tone="info">
                  Your package has been assigned a carrier tracking number.
                </Alert>
              )}

              {orderResult.items.length > 0 && (
                <div className="mc-group">
                  {orderResult.items.map((it, idx) => (
                    <div key={idx} className="mc-item mc-item--between">
                      <span>
                        {it.name} <span className="mc-small">× {it.qty}</span>
                      </span>
                      <span className="mc-num">
                        ${(it.price * it.qty).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className="mc-item mc-item--between">
                    <span className="mc-strong">Total</span>
                    <span className="mc-price">
                      ${orderResult.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <p className="mc-text">
                Current status:{" "}
                <strong>{orderResult.status.replace(/_/g, " ")}</strong> · placed{" "}
                {new Date(orderResult.createdAt).toLocaleDateString()}
              </p>
            </section>
          )}
        </>
      )}

      <p className="mc-text">
        Questions? Call{" "}
        <a className="mc-link" href={`tel:${phoneDisplay.replace(/[^0-9+]/g, "")}`}>
          {phoneDisplay}
        </a>{" "}
        or <Link className="mc-link" to="/account">sign in to your account</Link>.
      </p>
    </AuthCardShell>
  );
}
