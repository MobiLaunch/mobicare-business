import type { Order } from "@/types/domain";

import { useState } from "react";
import { Eye, ShoppingBag, X } from "lucide-react";
import { Button, Chip, ListBox, Modal, Select } from "@heroui/react";

import { useProductStore, useToastStore } from "@/lib/store";
import AdminPageHeader from "@/admin/components/AdminPageHeader";
import AdminDataTable, {
  type AdminDataTableColumn,
} from "@/admin/components/AdminDataTable";

const STATUS_OPTIONS = [
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-success/15 text-success",
  processing: "bg-accent-soft text-accent",
  shipped: "bg-surface-tertiary text-foreground",
  delivered: "bg-success/15 text-success",
  cancelled: "bg-danger/15 text-danger",
  refunded: "bg-warning/15 text-warning",
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2 text-sm last:border-b-0">
      <span className="text-muted">{label}</span>
      <strong className="text-right text-foreground">{value}</strong>
    </div>
  );
}

export default function Orders() {
  const orders = useProductStore((s) => s.orders);
  const updateOrderStatus = useProductStore((s) => s.updateOrderStatus);
  const addToast = useToastStore((s) => s.add);
  const [selected, setSelected] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered =
    statusFilter === "all"
      ? orders
      : orders.filter((o) => o.status === statusFilter);

  const handleStatusChange = (orderId: string, status: string) => {
    updateOrderStatus(orderId, status);
    addToast(
      `Order #${orderId.slice(0, 8).toUpperCase()} updated to "${status}"`,
      "success",
    );
    if (selected?.id === orderId)
      setSelected((s) => (s ? { ...s, status } : s));
  };

  const StatusSelect = ({ order }: { order: Order }) => (
    <Select
      className={`w-[150px] rounded-full text-xs font-bold ${STATUS_STYLES[order.status] || "bg-surface-tertiary"}`}
      selectedKey={order.status || "paid"}
      onSelectionChange={(key) => handleStatusChange(order.id, String(key))}
    >
      <Select.Trigger className="rounded-full border-0">
        <Select.Value />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {STATUS_OPTIONS.map((s) => (
            <ListBox.Item key={s} id={s}>
              {cap(s)}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );

  const columns: AdminDataTableColumn<Order>[] = [
    {
      key: "id",
      header: "Order Identifier",
      render: (o) => (
        <code className="rounded-lg bg-surface-tertiary px-2 py-1 text-xs font-bold">
          #{o.id.slice(0, 8).toUpperCase()}
        </code>
      ),
    },
    {
      key: "customer",
      header: "Customer Information",
      render: (o) => (
        <div>
          <strong className="block text-sm text-foreground">
            {o.customer?.name || "Guest Customer"}
          </strong>
          <span className="text-xs text-muted">
            {o.customer?.email || "No email registered"}
          </span>
        </div>
      ),
    },
    {
      key: "date",
      header: "Order Date",
      render: (o) => (
        <span className="text-[13px] text-muted">
          {o.createdAt
            ? new Date(o.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "—"}
        </span>
      ),
    },
    {
      key: "items",
      header: "Items",
      render: (o) => (
        <span className="rounded-full bg-surface-tertiary px-2.5 py-1 text-xs font-semibold">
          {o.items?.length || 0} items
        </span>
      ),
    },
    {
      key: "total",
      header: "Grand Total",
      render: (o) => (
        <strong className="text-sm text-accent">
          ${(o.total || 0).toFixed(2)}
        </strong>
      ),
    },
    {
      key: "status",
      header: "Fulfillment Status",
      render: (o) => <StatusSelect order={o} />,
    },
    {
      key: "actions",
      header: "Actions",
      render: (o) => (
        <Button
          isIconOnly
          aria-label="View order details"
          variant="ghost"
          onPress={() => setSelected(o)}
        >
          <Eye className="size-4" />
        </Button>
      ),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        description={`${orders.length} total customer orders · Real-time fulfillment & payment state tracking`}
        eyebrow="Sales & Transactions"
        title="Orders Management"
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          className={`rounded-full px-3.5 py-1.5 text-sm font-bold ${statusFilter === "all" ? "bg-accent text-accent-foreground" : "bg-surface-tertiary text-foreground"}`}
          type="button"
          onClick={() => setStatusFilter("all")}
        >
          All ({orders.length})
        </button>
        {STATUS_OPTIONS.map((s) => {
          const count = orders.filter((o) => o.status === s).length;

          if (count === 0 && statusFilter !== s) return null;

          return (
            <button
              key={s}
              className={`rounded-full px-3.5 py-1.5 text-sm font-bold ${statusFilter === s ? "bg-accent text-accent-foreground" : "bg-surface-tertiary text-foreground"}`}
              type="button"
              onClick={() => setStatusFilter(s)}
            >
              {cap(s)} ({count})
            </button>
          );
        })}
      </div>

      <AdminDataTable
        columns={columns}
        data={filtered}
        emptyState={{
          icon: ShoppingBag,
          title: "No orders found",
          description:
            statusFilter === "all"
              ? "Customer checkout orders will appear here automatically."
              : `No orders currently marked as "${statusFilter}".`,
        }}
        rowKey={(o) => o.id}
      />

      {/* Order inspector modal */}
      <Modal
        isOpen={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <Modal.Backdrop>
          <Modal.Container scroll="inside" size="lg">
            <Modal.Dialog>
              {selected && (
                <>
                  <Modal.Header>
                    <div>
                      <Chip
                        className="mb-1.5"
                        color="accent"
                        size="sm"
                        variant="soft"
                      >
                        <Chip.Label>Order Inspector</Chip.Label>
                      </Chip>
                      <Modal.Heading>
                        Order #{selected.id.slice(0, 8).toUpperCase()}
                      </Modal.Heading>
                      <p className="m-0 text-sm text-muted">
                        Placed on{" "}
                        {selected.createdAt
                          ? new Date(selected.createdAt).toLocaleString()
                          : "—"}
                      </p>
                    </div>
                    <Modal.CloseTrigger>
                      <X className="size-4" />
                    </Modal.CloseTrigger>
                  </Modal.Header>

                  <Modal.Body className="flex flex-col gap-6">
                    <div className="max-w-[260px]">
                      <StatusSelect order={selected} />
                    </div>

                    <div>
                      <h6 className="m-0 mb-2.5 text-sm font-extrabold text-foreground">
                        Customer Contact &amp; Shipping
                      </h6>
                      <div className="rounded-2xl border border-border bg-surface-secondary p-4">
                        <DetailRow
                          label="Customer Name"
                          value={selected.customer?.name || "—"}
                        />
                        <DetailRow
                          label="Email Address"
                          value={selected.customer?.email || "—"}
                        />
                        <DetailRow
                          label="Phone Number"
                          value={selected.customer?.phone || "—"}
                        />
                        <DetailRow
                          label="Shipping Address"
                          value={`${selected.customer?.address || "—"}, ${selected.customer?.city || ""}, ${selected.customer?.state || ""} ${selected.customer?.zip || ""}`}
                        />
                      </div>
                    </div>

                    <div>
                      <h6 className="m-0 mb-2.5 text-sm font-extrabold text-foreground">
                        Purchased Items
                      </h6>
                      <div className="rounded-2xl border border-border bg-surface-secondary p-4">
                        {selected.items?.map((item, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between gap-3 border-b border-border py-2.5 last:border-b-0"
                          >
                            <div className="min-w-0 flex-1">
                              <strong className="block text-sm text-foreground">
                                {item.name}
                              </strong>
                              <span className="text-xs text-muted">
                                ${item.price?.toFixed(2)} each
                              </span>
                            </div>
                            <span className="shrink-0 rounded-full bg-surface-tertiary px-2.5 py-1 text-xs font-semibold">
                              Qty: {item.qty}
                            </span>
                            <strong className="shrink-0 text-sm text-accent">
                              $
                              {((item.price || 0) * (item.qty || 1)).toFixed(2)}
                            </strong>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h6 className="m-0 mb-2.5 text-sm font-extrabold text-foreground">
                        Payment Summary
                      </h6>
                      <div className="rounded-2xl border border-border bg-surface-secondary p-4">
                        <DetailRow
                          label="Subtotal"
                          value={`$${(selected.subtotal || 0).toFixed(2)}`}
                        />
                        <DetailRow
                          label="Shipping"
                          value={
                            selected.shipping === 0
                              ? "FREE"
                              : `$${(selected.shipping || 0).toFixed(2)}`
                          }
                        />
                        <DetailRow
                          label="Tax"
                          value={`$${(selected.tax || 0).toFixed(2)}`}
                        />
                        <div className="flex items-center justify-between border-t-2 border-border pt-2.5">
                          <span className="text-[15px] font-extrabold text-foreground">
                            Grand Total
                          </span>
                          <strong className="text-lg text-accent">
                            ${(selected.total || 0).toFixed(2)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </Modal.Body>

                  <Modal.Footer className="justify-end">
                    <Button variant="primary" onPress={() => setSelected(null)}>
                      Done
                    </Button>
                  </Modal.Footer>
                </>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
