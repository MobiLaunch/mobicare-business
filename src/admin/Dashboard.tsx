import type { Order } from "@/types/domain";

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Boxes,
  Eye,
  PackageX,
  Plus,
  ShoppingBag,
  SlidersHorizontal,
  Tag,
  TrendingUp,
  TriangleAlert,
  Wand2,
} from "lucide-react";
import { Button } from "@heroui/react";

import { useProductStore } from "@/lib/store";
import AdminPageHeader from "@/admin/components/AdminPageHeader";
import AdminDataTable, { type AdminDataTableColumn } from "@/admin/components/AdminDataTable";
import AdminStatCard from "@/admin/components/AdminStatCard";

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-success/15 text-success",
  delivered: "bg-success/15 text-success",
  processing: "bg-accent-soft text-accent",
  shipped: "bg-surface-tertiary text-foreground",
  cancelled: "bg-danger/15 text-danger",
  refunded: "bg-danger/15 text-danger",
};

const QUICK_ACTIONS = [
  { icon: Boxes, title: "Add Product", sub: "Create new catalog item", path: "/admin/products?action=add" },
  { icon: Tag, title: "Manage Taxonomies", sub: "Organize categories & tags", path: "/admin/categories" },
  { icon: Wand2, title: "Site Content Editor", sub: "Customize hero & brand text", path: "/admin/content" },
  { icon: SlidersHorizontal, title: "Store Settings", sub: "Configure API keys & integrations", path: "/admin/settings" },
];

const ACTIVE_STATUSES = ["paid", "processing", "shipped"];
const CLOSED_STATUSES = ["delivered", "cancelled", "refunded"];

export default function Dashboard() {
  const navigate = useNavigate();
  const products = useProductStore((s) => s.products);
  const orders = useProductStore((s) => s.orders);
  const categories = useProductStore((s) => s.categories);

  const activeProducts = products.filter((p) => p.active).length;
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 5).length;
  const outOfStock = products.filter((p) => p.stock === 0).length;
  const activeOrders = orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length;
  const completedOrders = orders.filter((o) => o.status === "delivered").length;
  const attentionOrders = orders.filter((o) => ["cancelled", "refunded"].includes(o.status)).length;
  const totalRevenue = orders.filter((o) => !["cancelled", "refunded"].includes(o.status)).reduce((s, o) => s + (o.total || 0), 0);
  const recentOrders = useMemo(() => orders.slice(0, 5), [orders]);

  const columns: AdminDataTableColumn<Order>[] = [
    { key: "id", header: "Order", render: (o) => <code className="rounded-lg bg-surface-tertiary px-2 py-1 text-xs font-bold">#{o.id?.slice(0, 8).toUpperCase()}</code> },
    { key: "customer", header: "Customer", render: (o) => <strong className="text-sm text-foreground">{o.customer?.name || "Guest Customer"}</strong> },
    { key: "items", header: "Items", render: (o) => <span className="text-sm text-muted">{o.items?.length || 0} item{o.items?.length !== 1 ? "s" : ""}</span> },
    { key: "total", header: "Total", render: (o) => <strong className="text-sm text-accent">${(o.total || 0).toFixed(2)}</strong> },
    { key: "status", header: "Status", render: (o) => <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${STATUS_STYLES[o.status] || "bg-surface-tertiary"}`}>{o.status || "pending"}</span> },
    { key: "date", header: "Date", render: (o) => <span className="text-[13px] text-muted">{o.createdAt ? new Date(o.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—"}</span> },
    { key: "actions", header: "", render: () => <Button isIconOnly aria-label="View orders" variant="ghost" onPress={() => navigate("/admin/orders")}><Eye className="size-4" /></Button> },
  ];

  return (
    <div className="space-y-7">
      <AdminPageHeader
        action={<Button variant="primary" onPress={() => navigate("/admin/products?action=add")}><Plus className="size-4" /><span>Add New Product</span></Button>}
        description="A quick view of what needs attention across your store today."
        eyebrow="Store Operations"
        title="Dashboard"
      />

      {(outOfStock > 0 || lowStock > 0 || attentionOrders > 0) && (
        <section aria-label="Store alerts" className="rounded-[24px] border border-border bg-surface p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-xl bg-warning/10 text-warning"><TriangleAlert className="size-4" /></span>
            <div><h2 className="m-0 text-sm font-bold text-foreground">Needs attention</h2><p className="m-0 text-xs text-muted">A few store conditions may need action.</p></div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {outOfStock > 0 && <button type="button" onClick={() => navigate("/admin/products")} className="flex min-h-14 items-center gap-3 rounded-2xl border border-danger/20 bg-danger/5 p-3 text-left transition-colors hover:bg-danger/10"><PackageX className="size-5 shrink-0 text-danger" /><span className="min-w-0 flex-1"><strong className="block text-sm text-foreground">{outOfStock} out of stock</strong><span className="text-xs text-muted">Restock or update these products.</span></span><ArrowRight className="size-4 shrink-0 text-muted" /></button>}
            {lowStock > 0 && <button type="button" onClick={() => navigate("/admin/products")} className="flex min-h-14 items-center gap-3 rounded-2xl border border-warning/20 bg-warning/5 p-3 text-left transition-colors hover:bg-warning/10"><PackageX className="size-5 shrink-0 text-warning" /><span className="min-w-0 flex-1"><strong className="block text-sm text-foreground">{lowStock} low-stock {lowStock === 1 ? "item" : "items"}</strong><span className="text-xs text-muted">Five or fewer units remaining.</span></span><ArrowRight className="size-4 shrink-0 text-muted" /></button>}
            {attentionOrders > 0 && <button type="button" onClick={() => navigate("/admin/orders")} className="flex min-h-14 items-center gap-3 rounded-2xl border border-danger/20 bg-danger/5 p-3 text-left transition-colors hover:bg-danger/10"><ShoppingBag className="size-5 shrink-0 text-danger" /><span className="min-w-0 flex-1"><strong className="block text-sm text-foreground">{attentionOrders} order{attentionOrders === 1 ? "" : "s"} need review</strong><span className="text-xs text-muted">Cancelled or refunded orders.</span></span><ArrowRight className="size-4 shrink-0 text-muted" /></button>}
          </div>
        </section>
      )}

      <section aria-label="Store metrics">
        <div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="m-0 text-lg font-extrabold text-foreground">Store at a glance</h2><p className="m-0 mt-0.5 text-xs text-muted">Current catalog, fulfillment, and sales totals.</p></div></div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <AdminStatCard icon={Boxes} path="/admin/products"><p className="m-0 mb-1 text-[clamp(1.7rem,3vw,2.25rem)] font-extrabold leading-none tracking-tight text-foreground">{products.length}</p><p className="m-0 mb-0.5 text-sm font-bold text-foreground">Products</p><p className="m-0 text-xs text-muted">{activeProducts} active in store</p></AdminStatCard>
          <AdminStatCard icon={ShoppingBag} path="/admin/orders"><p className="m-0 mb-1 text-[clamp(1.7rem,3vw,2.25rem)] font-extrabold leading-none tracking-tight text-foreground">{activeOrders}</p><p className="m-0 mb-0.5 text-sm font-bold text-foreground">Open Orders</p><p className="m-0 text-xs text-muted">Paid through shipped</p></AdminStatCard>
          <AdminStatCard icon={Tag} path="/admin/categories"><p className="m-0 mb-1 text-[clamp(1.7rem,3vw,2.25rem)] font-extrabold leading-none tracking-tight text-foreground">{categories.length}</p><p className="m-0 mb-0.5 text-sm font-bold text-foreground">Categories</p><p className="m-0 text-xs text-muted">{completedOrders} orders completed</p></AdminStatCard>
          <AdminStatCard icon={TrendingUp} path="/admin/orders"><p className="m-0 mb-1 text-[clamp(1.45rem,2.5vw,2rem)] font-extrabold leading-none tracking-tight text-foreground">${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p><p className="m-0 mb-0.5 text-sm font-bold text-foreground">Net Sales Tracked</p><p className="m-0 text-xs text-muted">Excludes cancelled &amp; refunded</p></AdminStatCard>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="m-0 text-lg font-extrabold text-foreground">Recent orders</h2><p className="m-0 mt-0.5 text-xs text-muted">The latest purchases placed by customers.</p></div><Button variant="ghost" onPress={() => navigate("/admin/orders")}><span>View all</span><ArrowRight className="size-4" /></Button></div>
        <AdminDataTable columns={columns} data={recentOrders} emptyState={{ icon: ShoppingBag, title: "No orders recorded yet", description: "Orders will appear here as customers complete checkout." }} rowKey={(o) => o.id} />
      </section>

      <section>
        <div className="mb-3"><h2 className="m-0 text-lg font-extrabold text-foreground">Management shortcuts</h2><p className="m-0 mt-0.5 text-xs text-muted">Common tasks, one tap away.</p></div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {QUICK_ACTIONS.map((qa) => <AdminStatCard key={qa.title} className="flex items-center gap-3 p-4" icon={qa.icon} iconClassName="" path={qa.path}><div className="min-w-0 flex-1"><strong className="block truncate text-sm text-foreground">{qa.title}</strong><span className="block truncate text-xs text-muted">{qa.sub}</span></div><ArrowRight className="size-[18px] shrink-0 text-muted" /></AdminStatCard>)}
        </div>
      </section>
    </div>
  );
}
