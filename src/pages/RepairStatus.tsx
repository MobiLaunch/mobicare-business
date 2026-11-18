import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  Package,
  Phone,
  Search,
  ShieldCheck,
  Truck,
  Wrench,
} from "lucide-react";
import {
  Alert,
  Button,
  Card,
  Chip,
  Form,
  InputGroup,
  Label,
  Spinner,
  TextField,
  ToggleButton,
} from "@heroui/react";

import {
  isSupabaseConfigured,
  sbLookupOrderStatus,
  sbLookupTicketStatus,
} from "@/lib/supabase";
import { useSiteStore } from "@/lib/siteStore";
import PageMeta from "@/components/PageMeta";

type LookupKind = "ticket" | "order";

const TICKET_STEPS = [
  "Checked In",
  "Diagnosing",
  "Waiting for Parts",
  "In Repair",
  "Ready for Pickup",
  "Completed",
];

const ORDER_STEPS = ["Paid", "Processing", "Shipped", "Delivered"];

function resolveTicketStepIndex(rawStatus: string): {
  stepIndex: number;
  cancelled: boolean;
} {
  const s = (rawStatus || "").trim().toLowerCase();
  if (s.includes("cancel") || s.includes("decline")) {
    return { stepIndex: -1, cancelled: true };
  }
  if (s.includes("deliver") || s === "completed" || s === "closed" || s === "picked up") {
    return { stepIndex: 5, cancelled: false };
  }
  if (s.includes("ready")) {
    return { stepIndex: 4, cancelled: false };
  }
  if (s.includes("in progress") || s.includes("in repair") || s.includes("repairing") || s.includes("testing")) {
    return { stepIndex: 3, cancelled: false };
  }
  if (s.includes("part") || s.includes("hold") || s.includes("vendor")) {
    return { stepIndex: 2, cancelled: false };
  }
  if (s.includes("diagnos") || s.includes("quote") || s.includes("bench")) {
    return { stepIndex: 1, cancelled: false };
  }
  return { stepIndex: 0, cancelled: false };
}

function resolveOrderStepIndex(rawStatus: string): {
  stepIndex: number;
  terminalAlert: string | null;
} {
  const s = (rawStatus || "").trim().toLowerCase();
  if (s === "cancelled") {
    return { stepIndex: -1, terminalAlert: "This order was cancelled." };
  }
  if (s === "refunded") {
    return {
      stepIndex: -1,
      terminalAlert: "This order has been refunded to the original payment method.",
    };
  }
  if (s === "payment_failed") {
    return {
      stepIndex: -1,
      terminalAlert: "Payment failed for this order — no charge was captured.",
    };
  }
  if (s === "delivered") return { stepIndex: 3, terminalAlert: null };
  if (s === "shipped") return { stepIndex: 2, terminalAlert: null };
  if (s === "processing") return { stepIndex: 1, terminalAlert: null };
  return { stepIndex: 0, terminalAlert: null };
}

function buildCarrierTrackingUrl(
  trackingNumber?: string | null,
  explicitUrl?: string | null,
): string | null {
  if (explicitUrl && /^https?:\/\//i.test(explicitUrl.trim())) {
    return explicitUrl.trim();
  }
  const num = (trackingNumber || "").trim();
  if (!num) return null;
  if (/^1Z[A-Z0-9]{16}$/i.test(num)) {
    return `https://www.ups.com/track?tracknum=${encodeURIComponent(num)}`;
  }
  if (/^(94|93|92|95)\d{18,22}$/.test(num)) {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(num)}`;
  }
  if (/^\d{12,15}$/.test(num)) {
    return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(num)}`;
  }
  return `https://parcelsapp.com/en/tracking/${encodeURIComponent(num)}`;
}

export default function RepairStatus() {
  const [searchParams] = useSearchParams();
  const business = useSiteStore((s) => s.business);

  const initialOrderParam = searchParams.get("order") || searchParams.get("order_id");
  const initialTicketParam = searchParams.get("ticket") || searchParams.get("id");

  const [kind, setKind] = useState<LookupKind>(
    initialOrderParam ? "order" : "ticket",
  );
  const [ticketId, setTicketId] = useState(initialTicketParam || "");
  const [phoneLast4, setPhoneLast4] = useState("");
  const [orderId, setOrderId] = useState(initialOrderParam || "");
  const [orderVerify, setOrderVerify] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ticketResult, setTicketResult] = useState<Record<string, any> | null>(
    null,
  );
  const [orderResult, setOrderResult] = useState<Record<string, any> | null>(
    null,
  );

  useEffect(() => {
    setError("");
  }, [kind]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setTicketResult(null);
    setOrderResult(null);

    if (!isSupabaseConfigured()) {
      setError(
        "Live status lookup requires the shop database connection. Please call 618-204-1497 for an instant status check.",
      );
      return;
    }

    // Smart auto-detection if someone pastes ORD-... into the Repair Ticket tab
    if (kind === "ticket" && /^ord-/i.test(ticketId.trim())) {
      setKind("order");
      setOrderId(ticketId.trim());
      setError(
        "Switched to Online Order lookup — enter your checkout email or ZIP code and press Check Status.",
      );
      return;
    }

    setLoading(true);
    try {
      if (kind === "ticket") {
        const res = await sbLookupTicketStatus(ticketId, phoneLast4);
        if (res.error || !res.data) {
          setError(res.error || "Ticket not found.");
        } else {
          setTicketResult(res.data);
        }
      } else {
        const res = await sbLookupOrderStatus(orderId, orderVerify);
        if (res.error || !res.data) {
          setError(res.error || "Order not found.");
        } else {
          setOrderResult(res.data);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const fullAddress =
    business?.address && business.address !== "Fairfield, Illinois"
      ? business.address
      : "920 Commerce Drive, Suite 3, Fairfield, IL 62837";
  const phoneDigits = (business?.phone || "618-204-1497").replace(
    /[^0-9+]/g,
    "",
  );

  // Extract normalized fields from RPC ticket result
  const tStatus = String(ticketResult?.status || "Checked In");
  const tProgress = resolveTicketStepIndex(tStatus);
  const tNumber = ticketResult?.ticket_id ?? ticketResult?.id ?? ticketId;
  const tDevice = [ticketResult?.device, ticketResult?.device_model]
    .filter(Boolean)
    .join(" — ");
  const tPrice = Number(ticketResult?.price ?? ticketResult?.total ?? 0);
  const tPaid = Number(ticketResult?.amount_paid ?? ticketResult?.paid ?? 0);
  const tBalance =
    ticketResult?.balance_due != null
      ? Number(ticketResult.balance_due)
      : Math.max(0, tPrice - tPaid);
  const tTrackingNum = String(
    ticketResult?.tracking_number ||
      ticketResult?.tracking?.number ||
      ticketResult?.tracking?.trackingNumber ||
      "",
  );
  const tTrackingUrl = buildCarrierTrackingUrl(
    tTrackingNum,
    ticketResult?.tracking_url || ticketResult?.tracking?.url,
  );
  const tWarrantyDays = Number(ticketResult?.warranty_days ?? 90);
  const tWarrantyRemaining =
    ticketResult?.warranty_days_remaining != null
      ? Number(ticketResult.warranty_days_remaining)
      : null;

  // Extract normalized fields from RPC order result
  const oStatus = String(orderResult?.status || "paid");
  const oProgress = resolveOrderStepIndex(oStatus);
  const oTrackingNum = String(
    orderResult?.tracking_number || orderResult?.trackingNumber || "",
  );
  const oTrackingUrl = buildCarrierTrackingUrl(
    oTrackingNum,
    orderResult?.tracking_url || orderResult?.trackingUrl,
  );
  const oItems = Array.isArray(orderResult?.items || orderResult?.order_items)
    ? (orderResult?.items || orderResult?.order_items)
    : [];
  const isOrderPickup =
    orderResult?.shipping_method === "pickup" ||
    String(orderResult?.shipping_address || "")
      .toLowerCase()
      .includes("pickup");

  return (
    <div className="mx-auto max-w-3xl px-[clamp(14px,3vw,24px)] py-10 pb-24">
      <PageMeta
        description="Track your Mobicare repair ticket or online accessory order in real time without signing in."
        title="Track Repair or Order Status — Mobicare Fairfield IL"
      />

      <div className="mb-8 text-center">
        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-accent">
          <Clock className="size-3.5" />
          <span>Live Guest Status Tracker</span>
        </span>
        <h1 className="type-display m-0 text-heading-xl font-extrabold text-foreground sm:text-display">
          Track Your Repair or Order
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
          Check live technician progress, balance due, tracking numbers, and
          warranty coverage — no account login required.
        </p>
      </div>

      <Card className="surface-raised rounded-panel p-5 sm:p-8">
        {/* Switcher */}
        <div
          aria-label="Lookup type"
          className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-surface-secondary p-1.5"
        >
          <ToggleButton
            className={`flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all ${
              kind === "ticket"
                ? "bg-accent text-accent-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
            isSelected={kind === "ticket"}
            variant="default"
            onChange={() => setKind("ticket")}
          >
            <Wrench className="size-4" />
            <span>Repair Ticket</span>
          </ToggleButton>
          <ToggleButton
            className={`flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all ${
              kind === "order"
                ? "bg-accent text-accent-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
            isSelected={kind === "order"}
            variant="default"
            onChange={() => setKind("order")}
          >
            <Package className="size-4" />
            <span>Online Order</span>
          </ToggleButton>
        </div>

        <Form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {kind === "ticket" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                isRequired
                className="flex flex-col gap-1.5"
                value={ticketId}
                onChange={setTicketId}
              >
                <Label>Ticket Number</Label>
                <InputGroup>
                  <InputGroup.Input placeholder="e.g. #1042 or TKT-1042" />
                </InputGroup>
              </TextField>
              <TextField
                isRequired
                className="flex flex-col gap-1.5"
                value={phoneLast4}
                onChange={(v) =>
                  setPhoneLast4(v.replace(/\D/g, "").slice(0, 4))
                }
              >
                <Label>Last 4 Digits of Phone Number</Label>
                <InputGroup>
                  <InputGroup.Input
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="e.g. 1497"
                  />
                </InputGroup>
              </TextField>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                isRequired
                className="flex flex-col gap-1.5"
                value={orderId}
                onChange={setOrderId}
              >
                <Label>Order ID</Label>
                <InputGroup>
                  <InputGroup.Input placeholder="e.g. ORD-M8K2P9" />
                </InputGroup>
              </TextField>
              <TextField
                isRequired
                className="flex flex-col gap-1.5"
                value={orderVerify}
                onChange={setOrderVerify}
              >
                <Label>Checkout Email or ZIP Code</Label>
                <InputGroup>
                  <InputGroup.Input placeholder="you@example.com or 62837" />
                </InputGroup>
              </TextField>
            </div>
          )}

          <Button
            fullWidth
            isDisabled={loading}
            size="lg"
            type="submit"
            variant="primary"
          >
            {loading ? (
              <>
                <Spinner size="sm" />
                <span>Looking up status…</span>
              </>
            ) : (
              <>
                <Search className="size-4" />
                <span>Check Status</span>
              </>
            )}
          </Button>
        </Form>

        {error && (
          <Alert className="mt-5" role="alert" status="danger">
            <Alert.Indicator>
              <AlertTriangle className="size-4" />
            </Alert.Indicator>
            <Alert.Content>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert>
        )}
      </Card>

      {/* Repair Ticket Result */}
      {ticketResult && (
        <section
          aria-live="polite"
          className="surface-raised mt-6 overflow-hidden rounded-panel p-6 sm:p-8"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted">
                Repair Ticket
              </span>
              <h2 className="m-0 mt-0.5 font-mono text-2xl font-black text-foreground">
                #{String(tNumber).replace(/^#/, "")}
              </h2>
              {tDevice && (
                <p className="m-0 mt-1 text-sm font-semibold text-foreground">
                  {tDevice}
                </p>
              )}
            </div>
            <Chip
              color={
                tProgress.cancelled
                  ? "danger"
                  : tProgress.stepIndex >= 4
                    ? "success"
                    : "accent"
              }
              size="md"
              variant="soft"
            >
              <Chip.Label className="font-bold capitalize">{tStatus}</Chip.Label>
            </Chip>
          </div>

          {/* Step progress bar */}
          {!tProgress.cancelled ? (
            <div className="my-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
                {TICKET_STEPS.map((label, idx) => {
                  const completed = idx < tProgress.stepIndex;
                  const current = idx === tProgress.stepIndex;
                  return (
                    <div
                      key={label}
                      className={`flex flex-col items-start gap-1.5 rounded-2xl border p-3 sm:items-center sm:text-center ${
                        current
                          ? "border-accent bg-accent-soft shadow-sm"
                          : completed
                            ? "border-accent/35 bg-surface"
                            : "border-border bg-surface-secondary/50 opacity-60"
                      }`}
                    >
                      <span
                        className={`flex size-7 items-center justify-center rounded-full text-xs font-extrabold ${
                          completed || current
                            ? "bg-accent text-accent-foreground"
                            : "border border-border text-muted"
                        }`}
                      >
                        {completed ? <Check className="size-3.5" /> : idx + 1}
                      </span>
                      <span
                        className={`text-xs font-semibold leading-tight ${
                          current ? "text-accent" : "text-foreground"
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <Alert className="my-5" status="danger">
              <Alert.Content>
                <Alert.Description>
                  This repair ticket is marked as {tStatus}. Please call the
                  shop if you have questions.
                </Alert.Description>
              </Alert.Content>
            </Alert>
          )}

          {/* Ticket details grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {ticketResult.issue && (
              <div className="surface-sunken rounded-card p-4 sm:col-span-2">
                <span className="block text-micro font-bold uppercase tracking-wider text-muted">
                  Service / Reported Issue
                </span>
                <p className="m-0 mt-1 text-sm font-medium text-foreground">
                  {String(ticketResult.issue)}
                </p>
              </div>
            )}

            <div className="surface-sunken rounded-card p-4">
              <span className="block text-micro font-bold uppercase tracking-wider text-muted">
                Billing Summary
              </span>
              <div className="mt-2 flex flex-col gap-1 text-sm">
                {tPrice > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted">Estimated Total</span>
                    <span className="font-semibold text-foreground">
                      ${tPrice.toFixed(2)}
                    </span>
                  </div>
                )}
                {tPaid > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted">Paid</span>
                    <span className="font-semibold text-success">
                      -${tPaid.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-1.5">
                  <span className="font-bold text-foreground">Balance Due</span>
                  <strong className="text-accent">
                    {tPrice > 0 ? `$${tBalance.toFixed(2)}` : "Quote pending"}
                  </strong>
                </div>
              </div>
            </div>

            <div className="surface-sunken rounded-card p-4">
              <span className="block text-micro font-bold uppercase tracking-wider text-muted">
                Warranty Coverage
              </span>
              <div className="mt-2 flex items-start gap-2.5 text-sm">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-accent" />
                <div>
                  <strong className="block text-foreground">
                    {tWarrantyDays > 0
                      ? `${tWarrantyDays}-Day Parts Warranty`
                      : "90-Day Parts Warranty"}
                  </strong>
                  <span className="text-xs text-muted">
                    {tWarrantyRemaining != null
                      ? tWarrantyRemaining > 0
                        ? `Active · ${tWarrantyRemaining} days remaining`
                        : "Warranty period expired"
                      : tProgress.stepIndex >= 4
                        ? "Active upon pickup"
                        : "Starts automatically once repair is completed"}
                  </span>
                </div>
              </div>
            </div>

            {tTrackingNum && (
              <div className="surface-sunken flex flex-wrap items-center justify-between gap-3 rounded-card p-4 sm:col-span-2">
                <div className="flex items-center gap-2.5">
                  <Truck className="size-5 text-accent" />
                  <div>
                    <span className="block text-micro font-bold uppercase tracking-wider text-muted">
                      Return Shipment Tracking
                    </span>
                    <strong className="font-mono text-sm text-foreground">
                      {tTrackingNum}
                    </strong>
                  </div>
                </div>
                {tTrackingUrl && (
                  <a
                    className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-bold text-accent-foreground no-underline"
                    href={tTrackingUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <span>Track Package</span>
                    <ExternalLink className="size-3.5" />
                  </a>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Online Order Result */}
      {orderResult && (
        <section
          aria-live="polite"
          className="surface-raised mt-6 overflow-hidden rounded-panel p-6 sm:p-8"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted">
                Online Order
              </span>
              <h2 className="m-0 mt-0.5 font-mono text-2xl font-black text-foreground">
                #{String(orderResult.id || orderResult.order_id || orderId)}
              </h2>
              {orderResult.created_at && (
                <p className="m-0 mt-1 text-xs text-muted">
                  Placed on{" "}
                  {new Date(String(orderResult.created_at)).toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric", year: "numeric" },
                  )}
                </p>
              )}
            </div>
            <Chip
              color={
                oProgress.terminalAlert
                  ? "danger"
                  : oProgress.stepIndex === 3
                    ? "success"
                    : "accent"
              }
              size="md"
              variant="soft"
            >
              <Chip.Label className="font-bold capitalize">
                {oStatus.replace(/_/g, " ")}
              </Chip.Label>
            </Chip>
          </div>

          {oProgress.terminalAlert ? (
            <Alert className="my-5" status="danger">
              <Alert.Content>
                <Alert.Description>{oProgress.terminalAlert}</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : (
            <div className="my-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {ORDER_STEPS.map((label, idx) => {
                const completed = idx < oProgress.stepIndex;
                const current = idx === oProgress.stepIndex;
                return (
                  <div
                    key={label}
                    className={`flex flex-col items-start gap-1.5 rounded-2xl border p-3.5 sm:items-center sm:text-center ${
                      current
                        ? "border-accent bg-accent-soft shadow-sm"
                        : completed
                          ? "border-accent/35 bg-surface"
                          : "border-border bg-surface-secondary/50 opacity-60"
                    }`}
                  >
                    <span
                      className={`flex size-7 items-center justify-center rounded-full text-xs font-extrabold ${
                        completed || current
                          ? "bg-accent text-accent-foreground"
                          : "border border-border text-muted"
                      }`}
                    >
                      {completed ? (
                        <CheckCircle2 className="size-4" />
                      ) : (
                        idx + 1
                      )}
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        current ? "text-accent" : "text-foreground"
                      }`}
                    >
                      {idx === 2 && isOrderPickup
                        ? "Ready for Pickup"
                        : idx === 3 && isOrderPickup
                          ? "Picked Up"
                          : label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {oTrackingNum && (
            <div className="surface-sunken mb-4 flex flex-wrap items-center justify-between gap-3 rounded-card p-4">
              <div className="flex items-center gap-2.5">
                <Truck className="size-5 text-accent" />
                <div>
                  <span className="block text-micro font-bold uppercase tracking-wider text-muted">
                    Carrier Tracking Number
                  </span>
                  <strong className="font-mono text-sm text-foreground">
                    {oTrackingNum}
                  </strong>
                </div>
              </div>
              {oTrackingUrl && (
                <a
                  className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-bold text-accent-foreground no-underline"
                  href={oTrackingUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <span>Track Shipment</span>
                  <ExternalLink className="size-3.5" />
                </a>
              )}
            </div>
          )}

          {oItems.length > 0 && (
            <div className="surface-sunken mb-4 rounded-card p-4">
              <span className="mb-2 block text-micro font-bold uppercase tracking-wider text-muted">
                Items
              </span>
              <div className="flex flex-col divide-y divide-border">
                {oItems.map((it: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <span className="text-foreground">
                      {it.name}{" "}
                      <span className="text-muted">× {it.qty || 1}</span>
                    </span>
                    {it.price != null && (
                      <strong className="text-foreground">
                        ${(Number(it.price) * Number(it.qty || 1)).toFixed(2)}
                      </strong>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="surface-sunken flex flex-wrap items-center justify-between gap-4 rounded-card p-4 text-sm">
            <div className="flex items-center gap-2 text-muted">
              <MapPin className="size-4 shrink-0 text-accent" />
              <span>
                {isOrderPickup
                  ? `In-Store Pickup · ${fullAddress}`
                  : [
                      orderResult.shipping_city,
                      orderResult.shipping_state,
                      orderResult.shipping_zip,
                    ]
                      .filter(Boolean)
                      .join(", ") || "Standard Delivery"}
              </span>
            </div>
            {orderResult.total != null && (
              <div>
                <span className="mr-2 text-muted">Total Paid:</span>
                <strong className="text-base text-accent">
                  ${Number(orderResult.total).toFixed(2)}
                </strong>
              </div>
            )}
          </div>
        </section>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="size-3.5 text-accent" />
          {fullAddress}
        </span>
        <a
          className="inline-flex items-center gap-1.5 font-semibold text-accent hover:underline"
          href={`tel:${phoneDigits}`}
        >
          <Phone className="size-3.5" />
          <span>Questions? Call {business?.phone || "618-204-1497"}</span>
        </a>
      </div>
    </div>
  );
}
