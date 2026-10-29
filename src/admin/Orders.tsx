import type { Order } from "@/types/domain";

import { useState } from "react";
import { Eye, ShoppingBag, Undo2 } from "lucide-react";

import { Button } from "@/components/arc/button/button";
import { Dialog, DialogContent } from "@/components/arc/dialog/dialog";
import { useProductStore, useToastStore } from "@/lib/store";
import AdminPageHeader from "@/admin/components/AdminPageHeader";
import AdminDataTable, { type AdminDataTableColumn } from "@/admin/components/AdminDataTable";
import AdminConfirmDialog from "@/admin/components/AdminConfirmDialog";
import StatusSelect from "@/admin/components/StatusSelect";

const STATUS_OPTIONS = ["paid", "processing", "shipped", "delivered", "cancelled", "refunded", "payment_failed"] as const;
// "refunded"/"payment_failed" are payment-driven: Stripe (via the webhook) and the
// Issue refund button are the only things allowed to set them, so they stay out of
// the manual dropdown and nobody can label an order refunded without a real refund.
const MANUAL_STATUS_OPTIONS = ["paid", "processing", "shipped", "delivered", "cancelled"] as const;
const STATUS_LABELS: Record<string, string> = { payment_failed: "Payment failed" };
const cap = (s: string) => STATUS_LABELS[s] || s.charAt(0).toUpperCase() + s.slice(1);
const money = (n?: number) => `$${(n || 0).toFixed(2)}`;
const shortId = (id: string) => id.slice(0, 8).toUpperCase();
const date = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—");

export default function Orders() {
  const orders = useProductStore((s) => s.orders);
  const updateOrderStatus = useProductStore((s) => s.updateOrderStatus);
  const refundOrder = useProductStore((s) => s.refundOrder);
  const addToast = useToastStore((s) => s.add);
  const [selected, setSelected] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [confirmRefund, setConfirmRefund] = useState<Order | null>(null);
  const [refunding, setRefunding] = useState(false);

  const handleRefund = async (order: Order) => {
    setRefunding(true);

    const result = await refundOrder(order.id);

    setRefunding(false);
    if (result.ok) addToast(`Refund issued for order #${shortId(order.id)}. Status updates once Stripe confirms.`, "success");
    else addToast(result.error || "Unable to issue refund.", "error");
  };

  const filtered = statusFilter === "all" ? orders : orders.filter((o) => o.status === statusFilter);
  const activeOrders = orders.filter((o) => ["paid", "processing", "shipped"].includes(o.status)).length;
  const completedOrders = orders.filter((o) => o.status === "delivered").length;
  const attentionOrders = orders.filter((o) => ["cancelled", "refunded", "payment_failed"].includes(o.status)).length;
  const grossTotal = orders.filter((o) => !["cancelled", "refunded", "payment_failed"].includes(o.status)).reduce((sum, o) => sum + (o.total || 0), 0);

  const handleStatusChange = (orderId: string, status: string) => {
    updateOrderStatus(orderId, status);
    addToast(`Order #${shortId(orderId)} updated to "${status}"`, "success");
    if (selected?.id === orderId) setSelected((s) => (s ? { ...s, status } : s));
  };

  const statusControl = (order: Order) => (
    <StatusSelect disabled={order.status === "refunded" || order.status === "payment_failed"} format={cap} label={`Status for order ${shortId(order.id)}`} options={MANUAL_STATUS_OPTIONS} value={order.status} onChange={(v) => handleStatusChange(order.id, v)} />
  );

  const columns: AdminDataTableColumn<Order>[] = [
    { key: "id", header: "Order", render: (o) => <code className="ad-code">#{shortId(o.id)}</code> },
    { key: "customer", header: "Customer", render: (o) => <div><strong style={{ fontWeight: 500, display: "block" }}>{o.customer?.name || "Guest customer"}</strong><span className="ad-hint">{o.customer?.email || "No email"}</span></div> },
    { key: "date", header: "Placed", render: (o) => <span className="ad-hint">{date(o.createdAt)}</span> },
    { key: "items", header: "Items", render: (o) => <span className="ad-num">{o.items?.length || 0}</span> },
    { key: "total", header: "Total", render: (o) => <strong className="ad-num" style={{ fontWeight: 500 }}>{money(o.total)}</strong> },
    { key: "status", header: "Status", render: statusControl },
    { key: "actions", header: "", render: (o) => <div className="ad-row-actions"><button aria-label={`View order ${shortId(o.id)}`} className="ad-iconbtn" type="button" onClick={() => setSelected(o)}><Eye aria-hidden="true" size={16} /></button></div> },
  ];

  const filters = [{ key: "all", label: "Total orders", value: orders.length, sub: "All customer orders" }, { key: "processing", label: "In progress", value: activeOrders, sub: "Paid through shipped" }, { key: "delivered", label: "Completed", value: completedOrders, sub: "Delivered orders" }];
  const empty = { icon: ShoppingBag, title: "No orders found", description: statusFilter === "all" ? "Checkout orders will appear here automatically." : `No orders are marked "${cap(statusFilter)}".` };

  return (
    <div className="ad-stack">
      <AdminPageHeader description={`${orders.length} order${orders.length === 1 ? "" : "s"}, with live fulfillment and payment status.`} title="Orders" />

      <div className="ad-grid ad-grid-4 keep2">
        {filters.map((f) => (
          <button key={f.key} aria-pressed={statusFilter === f.key} className="ad-filter" type="button" onClick={() => setStatusFilter(f.key)}>
            <span>{f.label}</span><strong>{f.value}</strong><small>{f.sub}</small>
          </button>
        ))}
        <div className="ad-filter" style={{ cursor: "default" }}><span>Sales tracked</span><strong>{money(grossTotal)}</strong><small>Excludes cancelled and refunded</small></div>
      </div>

      {attentionOrders > 0 && (
        <button className="ad-alert-row" data-tone="warning" type="button" onClick={() => setStatusFilter(orders.some((o) => o.status === "cancelled") ? "cancelled" : "refunded")}>
          <span className="txt"><strong>{attentionOrders} order{attentionOrders === 1 ? "" : "s"} need attention</strong><small>Cancelled, refunded or payment failed</small></span>
          <span style={{ fontWeight: 500 }}>Review</span>
        </button>
      )}

      <div className="ad-chiprow" role="group" aria-label="Filter by status">
        {(["all", ...STATUS_OPTIONS] as const).map((s) => {
          const count = s === "all" ? orders.length : orders.filter((o) => o.status === s).length;

          if (s !== "all" && count === 0 && statusFilter !== s) return null;

          return <Button key={s} size="sm" variant={statusFilter === s ? "primary" : "secondary"} onClick={() => setStatusFilter(s)}>{s === "all" ? "All" : cap(s)} ({count})</Button>;
        })}
      </div>

      <div className="ad-only-narrow">
        {filtered.length === 0 ? <AdminDataTable columns={[]} data={[]} emptyState={empty} rowKey={() => ""} /> : (
          <div className="ad-cards">
            {filtered.map((o) => (
              <article key={o.id} className="ad-mcard">
                <div className="ad-mcard-top">
                  <div><code className="ad-code">#{shortId(o.id)}</code><strong style={{ display: "block", marginTop: 6, fontWeight: 500 }}>{o.customer?.name || "Guest customer"}</strong><span className="ad-hint">{o.customer?.email || "No email"}</span></div>
                  <button aria-label={`View order ${shortId(o.id)}`} className="ad-iconbtn" type="button" onClick={() => setSelected(o)}><Eye aria-hidden="true" size={16} /></button>
                </div>
                <div className="ad-mcard-grid">
                  <div><small>Placed</small>{date(o.createdAt)}</div>
                  <div><small>Items</small>{o.items?.length || 0}</div>
                  <div><small>Total</small><strong style={{ fontWeight: 500 }}>{money(o.total)}</strong></div>
                  <div>{statusControl(o)}</div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      <div className="ad-only-wide">
        <AdminDataTable caption="Orders" columns={columns} data={filtered} emptyState={empty} rowKey={(o) => o.id} />
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="ad-dialog-wide" description={selected ? `Placed ${selected.createdAt ? new Date(selected.createdAt).toLocaleString() : "—"}` : undefined} title={selected ? `Order #${shortId(selected.id)}` : "Order"}>
          {selected && (
            <div className="ad-stack">
              <div><p className="ad-label">Status</p>{statusControl(selected)}</div>
              <div>
                <p className="ad-label">Customer and shipping</p>
                <div className="ad-card ad-kv">
                  <div><span>Name</span><span>{selected.customer?.name || "—"}</span></div>
                  <div><span>Email</span><span>{selected.customer?.email || "—"}</span></div>
                  <div><span>Phone</span><span>{selected.customer?.phone || "—"}</span></div>
                  <div><span>Ship to</span><span>{`${selected.customer?.address || "—"}, ${selected.customer?.city || ""}, ${selected.customer?.state || ""} ${selected.customer?.zip || ""}`}</span></div>
                </div>
              </div>
              <div>
                <p className="ad-label">Items</p>
                <div className="ad-card ad-card--flush">
                  {selected.items?.map((item, i) => (
                    <div key={i} className="ad-card-head" style={{ borderBottom: i === selected.items.length - 1 ? 0 : undefined }}>
                      <div style={{ minWidth: 0 }}><strong style={{ fontWeight: 500, display: "block" }}>{item.name}</strong><span className="ad-hint">{money(item.price)} each · qty {item.qty}</span></div>
                      <strong className="ad-num" style={{ fontWeight: 500 }}>{money((item.price || 0) * (item.qty || 1))}</strong>
                    </div>
                  ))}
                </div>
              </div>
              <div className="ad-card ad-kv">
                <div><span>Subtotal</span><span>{money(selected.subtotal)}</span></div>
                <div><span>Shipping</span><span>{selected.shipping === 0 ? "Free" : money(selected.shipping)}</span></div>
                <div><span>Tax</span><span>{money(selected.tax)}</span></div>
                <div style={{ paddingTop: "var(--space-2)", borderTop: "1px solid var(--border)" }}><strong>Total</strong><strong>{money(selected.total)}</strong></div>
              </div>
              <div className="ad-actions" style={{ justifyContent: "space-between" }}>
                {["paid", "processing", "shipped", "delivered"].includes(selected.status) ? <Button disabled={refunding} variant="secondary" onClick={() => setConfirmRefund(selected)}><Undo2 aria-hidden="true" size={16} strokeWidth={1.75} />Issue refund</Button> : <span />}
                <Button onClick={() => setSelected(null)}>Done</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AdminConfirmDialog
        confirmLabel="Issue refund"
        description={confirmRefund ? `This refunds ${money(confirmRefund.total)} to the customer through Stripe for order #${shortId(confirmRefund.id)}. It cannot be undone.` : ""}
        isOpen={!!confirmRefund}
        title="Refund this order?"
        onClose={() => setConfirmRefund(null)}
        onConfirm={() => confirmRefund && handleRefund(confirmRefund)}
      />
    </div>
  );
}
