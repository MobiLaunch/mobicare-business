import type { Order } from "@/types/domain";

import { useState } from "react";
import { Eye, ShoppingBag, Undo2, X } from "lucide-react";
import { Button, Chip, ListBox, Modal, Select, ToggleButton } from "@heroui/react";

import { useProductStore, useToastStore } from "@/lib/store";
import AdminPageHeader from "@/admin/components/AdminPageHeader";
import AdminDataTable, { type AdminDataTableColumn } from "@/admin/components/AdminDataTable";
import AdminConfirmDialog from "@/admin/components/AdminConfirmDialog";

const STATUS_OPTIONS = ["paid", "processing", "shipped", "delivered", "cancelled", "refunded", "payment_failed"] as const;
// "refunded"/"payment_failed" are payment-driven — Stripe (via the webhook)
// and the Issue Refund button are the only things allowed to set them, so
// they're excluded from the manual status dropdown to avoid a staff member
// setting the label without an actual Stripe refund happening.
const MANUAL_STATUS_OPTIONS = ["paid", "processing", "shipped", "delivered", "cancelled"] as const;
const STATUS_STYLES: Record<string, string> = {
  paid: "bg-success/15 text-success",
  processing: "bg-accent-soft text-accent",
  shipped: "bg-surface-tertiary text-foreground",
  delivered: "bg-success/15 text-success",
  cancelled: "bg-danger/15 text-danger",
  refunded: "bg-warning/15 text-warning",
  payment_failed: "bg-danger/15 text-danger",
};
const STATUS_LABELS: Record<string, string> = { payment_failed: "Payment Failed" };
const cap = (s: string) => STATUS_LABELS[s] || s.charAt(0).toUpperCase() + s.slice(1);

function DetailRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 border-b border-border py-2 text-sm last:border-b-0"><span className="text-muted">{label}</span><strong className="text-right text-foreground">{value}</strong></div>;
}

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
    if (result.ok) {
      addToast(`Refund issued for order #${order.id.slice(0, 8).toUpperCase()}. Status updates once Stripe confirms.`, "success");
    } else {
      addToast(result.error || "Unable to issue refund.", "error");
    }
  };

  const filtered = statusFilter === "all" ? orders : orders.filter((o) => o.status === statusFilter);
  const activeOrders = orders.filter((o) => ["paid", "processing", "shipped"].includes(o.status)).length;
  const completedOrders = orders.filter((o) => o.status === "delivered").length;
  const attentionOrders = orders.filter((o) => ["cancelled", "refunded", "payment_failed"].includes(o.status)).length;
  const grossTotal = orders.filter((o) => !["cancelled", "refunded", "payment_failed"].includes(o.status)).reduce((sum, o) => sum + (o.total || 0), 0);

  const handleStatusChange = (orderId: string, status: string) => {
    updateOrderStatus(orderId, status);
    addToast(`Order #${orderId.slice(0, 8).toUpperCase()} updated to "${status}"`, "success");
    if (selected?.id === orderId) setSelected((s) => (s ? { ...s, status } : s));
  };

  const StatusSelect = ({ order }: { order: Order }) => {
    const isPaymentDriven = order.status === "refunded" || order.status === "payment_failed";
    // The current status must always be a selectable item so the trigger can
    // display it, even when it's payment-driven and the select is disabled.
    const items = isPaymentDriven ? [...MANUAL_STATUS_OPTIONS, order.status] : MANUAL_STATUS_OPTIONS;

    return (
      <Select className={`w-[150px] rounded-full text-xs font-bold ${STATUS_STYLES[order.status] || "bg-surface-tertiary"}`} isDisabled={isPaymentDriven} selectedKey={STATUS_OPTIONS.includes(order.status as (typeof STATUS_OPTIONS)[number]) ? order.status : "paid"} onSelectionChange={(key) => handleStatusChange(order.id, String(key))}>
        <Select.Trigger className="rounded-full border-0"><Select.Value /></Select.Trigger>
        <Select.Popover><ListBox>{items.map((s) => <ListBox.Item key={s} id={s}>{cap(s)}</ListBox.Item>)}</ListBox></Select.Popover>
      </Select>
    );
  };

  const MobileOrderCard = ({ order }: { order: Order }) => (
    <article className="rounded-[24px] border border-border bg-surface p-4 shadow-[0_3px_16px_rgba(0,0,0,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <code className="inline-flex rounded-lg bg-surface-tertiary px-2 py-1 text-xs font-extrabold">#{order.id.slice(0, 8).toUpperCase()}</code>
          <strong className="mt-2 block truncate text-sm text-foreground">{order.customer?.name || "Guest Customer"}</strong>
          <span className="block truncate text-xs text-muted">{order.customer?.email || "No email registered"}</span>
        </div>
        <Button isIconOnly aria-label={`View order ${order.id.slice(0, 8)}`} variant="ghost" onPress={() => setSelected(order)}><Eye className="size-4" /></Button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-surface-secondary p-3">
        <div><span className="block text-micro font-bold uppercase tracking-wider text-muted">Placed</span><span className="text-xs font-semibold text-foreground">{order.createdAt ? new Date(order.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—"}</span></div>
        <div className="text-right"><span className="block text-micro font-bold uppercase tracking-wider text-muted">Items</span><span className="text-xs font-semibold text-foreground">{order.items?.length || 0}</span></div>
        <div><span className="block text-micro font-bold uppercase tracking-wider text-muted">Total</span><strong className="text-base text-accent">${(order.total || 0).toFixed(2)}</strong></div>
        <div className="flex justify-end"><StatusSelect order={order} /></div>
      </div>
      <button type="button" className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-surface-tertiary px-3 py-2.5 text-xs font-bold text-foreground transition-colors hover:bg-accent-soft hover:text-accent" onClick={() => setSelected(order)}>
        View order details <Eye className="size-3.5" />
      </button>
    </article>
  );

  const columns: AdminDataTableColumn<Order>[] = [
    { key: "id", header: "Order Identifier", render: (o) => <code className="rounded-lg bg-surface-tertiary px-2 py-1 text-xs font-bold">#{o.id.slice(0, 8).toUpperCase()}</code> },
    { key: "customer", header: "Customer Information", render: (o) => <div><strong className="block text-sm text-foreground">{o.customer?.name || "Guest Customer"}</strong><span className="text-xs text-muted">{o.customer?.email || "No email registered"}</span></div> },
    { key: "date", header: "Order Date", render: (o) => <span className="text-label text-muted">{o.createdAt ? new Date(o.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—"}</span> },
    { key: "items", header: "Items", render: (o) => <span className="rounded-full bg-surface-tertiary px-2.5 py-1 text-xs font-semibold">{o.items?.length || 0} items</span> },
    { key: "total", header: "Grand Total", render: (o) => <strong className="text-sm text-accent">${(o.total || 0).toFixed(2)}</strong> },
    { key: "status", header: "Fulfillment Status", render: (o) => <StatusSelect order={o} /> },
    { key: "actions", header: "Actions", render: (o) => <Button isIconOnly aria-label="View order details" variant="ghost" onPress={() => setSelected(o)}><Eye className="size-4" /></Button> },
  ];

  return (
    <div>
      <AdminPageHeader description={`${orders.length} total customer orders · Real-time fulfillment & payment state tracking`} eyebrow="Sales & Transactions" title="Orders Management" />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <button type="button" onClick={() => setStatusFilter("all")} className={`rounded-2xl border p-4 text-left transition-colors ${statusFilter === "all" ? "border-accent bg-accent-soft/50" : "border-border bg-surface hover:bg-surface-secondary"}`}><span className="text-micro font-bold uppercase tracking-[0.16em] text-muted">Total orders</span><strong className="mt-1 block text-2xl font-extrabold text-foreground">{orders.length}</strong><span className="text-xs text-muted">All customer orders</span></button>
        <button type="button" onClick={() => setStatusFilter("processing")} className={`rounded-2xl border p-4 text-left transition-colors ${statusFilter === "processing" ? "border-accent bg-accent-soft/50" : "border-border bg-surface hover:bg-surface-secondary"}`}><span className="text-micro font-bold uppercase tracking-[0.16em] text-muted">In progress</span><strong className="mt-1 block text-2xl font-extrabold text-foreground">{activeOrders}</strong><span className="text-xs text-muted">Paid through shipped</span></button>
        <button type="button" onClick={() => setStatusFilter("delivered")} className={`rounded-2xl border p-4 text-left transition-colors ${statusFilter === "delivered" ? "border-accent bg-accent-soft/50" : "border-border bg-surface hover:bg-surface-secondary"}`}><span className="text-micro font-bold uppercase tracking-[0.16em] text-muted">Completed</span><strong className="mt-1 block text-2xl font-extrabold text-foreground">{completedOrders}</strong><span className="text-xs text-muted">Delivered orders</span></button>
        <div className="rounded-2xl border border-border bg-surface p-4 text-left"><span className="text-micro font-bold uppercase tracking-[0.16em] text-muted">Sales tracked</span><strong className="mt-1 block text-2xl font-extrabold text-accent">${grossTotal.toFixed(2)}</strong><span className="text-xs text-muted">Excludes cancelled/refunded</span></div>
      </div>

      {attentionOrders > 0 && <button type="button" onClick={() => setStatusFilter(orders.some((o) => o.status === "cancelled") ? "cancelled" : "refunded")} className="mb-4 flex w-full items-center justify-between rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-left text-sm"><span><strong>{attentionOrders} order{attentionOrders === 1 ? "" : "s"} need attention</strong><span className="ml-2 text-muted">Cancelled or refunded</span></span><span className="font-bold text-warning">Review</span></button>}

      <div className="mb-5 flex flex-wrap gap-2">
        <ToggleButton isSelected={statusFilter === "all"} className={`rounded-full px-3.5 py-1.5 text-sm font-bold ${statusFilter === "all" ? "bg-accent text-accent-foreground" : "bg-surface-tertiary text-foreground"}`} variant="default" onChange={() => setStatusFilter("all")}>All ({orders.length})</ToggleButton>
        {STATUS_OPTIONS.map((s) => { const count = orders.filter((o) => o.status === s).length; if (count === 0 && statusFilter !== s) return null; return <ToggleButton key={s} isSelected={statusFilter === s} className={`rounded-full px-3.5 py-1.5 text-sm font-bold ${statusFilter === s ? "bg-accent text-accent-foreground" : "bg-surface-tertiary text-foreground"}`} variant="default" onChange={() => setStatusFilter(s)}>{cap(s)} ({count})</ToggleButton>; })}
      </div>

      <div className="md:hidden">
        {filtered.length === 0 ? <div className="flex flex-col items-center gap-3 rounded-[28px] border border-border bg-surface-secondary p-10 text-center"><span className="flex size-16 items-center justify-center rounded-full bg-surface-tertiary text-muted"><ShoppingBag className="size-8" /></span><h4 className="m-0 text-lg font-bold text-foreground">No orders found</h4><p className="m-0 max-w-md text-sm text-muted">{statusFilter === "all" ? "Customer checkout orders will appear here automatically." : `No orders currently marked as "${statusFilter}".`}</p></div> : <div className="flex flex-col gap-3">{filtered.map((order) => <MobileOrderCard key={order.id} order={order} />)}</div>}
      </div>
      <div className="hidden md:block">
        <AdminDataTable columns={columns} data={filtered} emptyState={{ icon: ShoppingBag, title: "No orders found", description: statusFilter === "all" ? "Customer checkout orders will appear here automatically." : `No orders currently marked as "${statusFilter}".` }} rowKey={(o) => o.id} />
      </div>

      <Modal isOpen={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <Modal.Backdrop><Modal.Container scroll="inside" size="lg"><Modal.Dialog>{selected && <>
          <Modal.Header><div><Chip className="mb-1.5" color="accent" size="sm" variant="soft"><Chip.Label>Order Inspector</Chip.Label></Chip><Modal.Heading>Order #{selected.id.slice(0, 8).toUpperCase()}</Modal.Heading><p className="m-0 text-sm text-muted">Placed on {selected.createdAt ? new Date(selected.createdAt).toLocaleString() : "—"}</p></div><Modal.CloseTrigger><X className="size-4" /></Modal.CloseTrigger></Modal.Header>
          <Modal.Body className="flex flex-col gap-6">
            <div className="max-w-[260px]"><StatusSelect order={selected} /></div>
            <div><h6 className="m-0 mb-2.5 text-sm font-extrabold text-foreground">Customer Contact &amp; Shipping</h6><div className="rounded-2xl border border-border bg-surface-secondary p-4"><DetailRow label="Customer Name" value={selected.customer?.name || "—"} /><DetailRow label="Email Address" value={selected.customer?.email || "—"} /><DetailRow label="Phone Number" value={selected.customer?.phone || "—"} /><DetailRow label="Shipping Address" value={`${selected.customer?.address || "—"}, ${selected.customer?.city || ""}, ${selected.customer?.state || ""} ${selected.customer?.zip || ""}`} /></div></div>
            <div><h6 className="m-0 mb-2.5 text-sm font-extrabold text-foreground">Purchased Items</h6><div className="rounded-2xl border border-border bg-surface-secondary p-4">{selected.items?.map((item, i) => <div key={i} className="flex items-center justify-between gap-3 border-b border-border py-2.5 last:border-b-0"><div className="min-w-0 flex-1"><strong className="block text-sm text-foreground">{item.name}</strong><span className="text-xs text-muted">${item.price?.toFixed(2)} each</span></div><span className="shrink-0 rounded-full bg-surface-tertiary px-2.5 py-1 text-xs font-semibold">Qty: {item.qty}</span><strong className="shrink-0 text-sm text-accent">${((item.price || 0) * (item.qty || 1)).toFixed(2)}</strong></div>)}</div></div>
            <div><h6 className="m-0 mb-2.5 text-sm font-extrabold text-foreground">Payment Summary</h6><div className="rounded-2xl border border-border bg-surface-secondary p-4"><DetailRow label="Subtotal" value={`$${(selected.subtotal || 0).toFixed(2)}`} /><DetailRow label="Shipping" value={selected.shipping === 0 ? "FREE" : `$${(selected.shipping || 0).toFixed(2)}`} /><DetailRow label="Tax" value={`$${(selected.tax || 0).toFixed(2)}`} /><div className="flex items-center justify-between border-t-2 border-border pt-2.5"><span className="text-body-sm font-extrabold text-foreground">Grand Total</span><strong className="text-lg text-accent">${(selected.total || 0).toFixed(2)}</strong></div></div></div>
          </Modal.Body>
          <Modal.Footer className="justify-between">
            {["paid", "processing", "shipped", "delivered"].includes(selected.status) ? (
              <Button isDisabled={refunding} variant="outline" onPress={() => setConfirmRefund(selected)}><Undo2 className="size-4" /><span>Issue Refund</span></Button>
            ) : <span />}
            <Button variant="primary" onPress={() => setSelected(null)}>Done</Button>
          </Modal.Footer>
        </>}</Modal.Dialog></Modal.Container></Modal.Backdrop>
      </Modal>

      <AdminConfirmDialog
        confirmLabel="Issue Refund"
        description={confirmRefund ? `This will refund $${(confirmRefund.total || 0).toFixed(2)} to the customer via Stripe for order #${confirmRefund.id.slice(0, 8).toUpperCase()}. This cannot be undone.` : ""}
        isOpen={!!confirmRefund}
        onClose={() => setConfirmRefund(null)}
        onConfirm={() => confirmRefund && handleRefund(confirmRefund)}
        title="Refund this order?"
      />
    </div>
  );
}
