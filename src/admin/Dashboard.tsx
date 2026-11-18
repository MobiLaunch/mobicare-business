import type { Order } from "@/types/domain";

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Boxes, Eye, PackageX, Plus, ShoppingBag, SlidersHorizontal, Tag, TrendingUp, Wand2 } from "lucide-react";

import { Button } from "@/components/arc/button/button";
import { useProductStore } from "@/lib/store";
import AdminPageHeader from "@/admin/components/AdminPageHeader";
import AdminDataTable, { type AdminDataTableColumn } from "@/admin/components/AdminDataTable";
import AdminStatCard from "@/admin/components/AdminStatCard";
import StatusPill from "@/admin/components/StatusPill";

const QUICK_ACTIONS = [
  { icon: Boxes, title: "Add product", sub: "Create a catalog item", path: "/admin/products?action=add" },
  { icon: Tag, title: "Categories", sub: "Organize the catalog", path: "/admin/categories" },
  { icon: Wand2, title: "Site editor", sub: "Hero, brand and copy", path: "/admin/content" },
  { icon: SlidersHorizontal, title: "Settings", sub: "Keys and integrations", path: "/admin/settings" },
];

const ACTIVE_STATUSES = ["paid", "processing", "shipped"];
const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
  const alerts = [
    outOfStock > 0 && { tone: "danger", icon: PackageX, title: `${outOfStock} out of stock`, sub: "Restock or hide these products.", path: "/admin/products" },
    lowStock > 0 && { tone: "warning", icon: PackageX, title: `${lowStock} low-stock ${lowStock === 1 ? "item" : "items"}`, sub: "Five or fewer units left.", path: "/admin/products" },
    attentionOrders > 0 && { tone: "danger", icon: ShoppingBag, title: `${attentionOrders} order${attentionOrders === 1 ? "" : "s"} to review`, sub: "Cancelled or refunded.", path: "/admin/orders" },
  ].filter(Boolean) as { tone: string; icon: typeof PackageX; title: string; sub: string; path: string }[];

  const columns: AdminDataTableColumn<Order>[] = [
    { key: "id", header: "Order", render: (o) => <code className="ad-code">#{o.id?.slice(0, 8).toUpperCase()}</code> },
    { key: "customer", header: "Customer", render: (o) => <strong style={{ fontWeight: 500 }}>{o.customer?.name || "Guest customer"}</strong> },
    { key: "items", header: "Items", render: (o) => <span className="ad-num">{o.items?.length || 0}</span> },
    { key: "total", header: "Total", render: (o) => <span className="ad-num">{money(o.total || 0)}</span> },
    { key: "status", header: "Status", render: (o) => <StatusPill status={o.status} /> },
    { key: "date", header: "Date", render: (o) => <span className="ad-hint">{o.createdAt ? new Date(o.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—"}</span> },
    { key: "actions", header: "", render: () => <div className="ad-row-actions"><button aria-label="View orders" className="ad-iconbtn" type="button" onClick={() => navigate("/admin/orders")}><Eye aria-hidden="true" size={16} /></button></div> },
  ];

  return (
    <div className="ad-stack">
      <AdminPageHeader
        action={<Button onClick={() => navigate("/admin/products?action=add")}><Plus aria-hidden="true" size={16} strokeWidth={1.75} />Add product</Button>}
        description="What needs attention across the store today."
        title="Dashboard"
      />

      {alerts.length > 0 && (
        <section aria-label="Needs attention">
          <div className="ad-grid ad-grid-3">
            {alerts.map((a) => (
              <button key={a.title} className="ad-alert-row" data-tone={a.tone} type="button" onClick={() => navigate(a.path)}>
                <a.icon aria-hidden="true" size={20} strokeWidth={1.75} />
                <span className="txt"><strong>{a.title}</strong><small>{a.sub}</small></span>
                <ArrowRight aria-hidden="true" size={16} />
              </button>
            ))}
          </div>
        </section>
      )}

      <section aria-label="Store metrics">
        <div className="ad-grid ad-grid-4 keep2">
          <AdminStatCard context={`${activeProducts} active in store`} figure={products.length} icon={Boxes} label="Products" path="/admin/products" />
          <AdminStatCard context="Paid through shipped" figure={activeOrders} icon={ShoppingBag} label="Open orders" path="/admin/orders" />
          <AdminStatCard context={`${completedOrders} orders completed`} figure={categories.length} icon={Tag} label="Categories" path="/admin/categories" />
          <AdminStatCard context="Excludes cancelled and refunded" figure={money(totalRevenue)} icon={TrendingUp} label="Net sales" path="/admin/orders" />
        </div>
      </section>

      <section>
        <div className="ad-section-title">
          <div><h2>Recent orders</h2><p>The latest purchases from customers.</p></div>
          <Button variant="ghost" onClick={() => navigate("/admin/orders")}>View all<ArrowRight aria-hidden="true" size={16} strokeWidth={1.75} /></Button>
        </div>
        <AdminDataTable caption="Recent orders" columns={columns} data={recentOrders} emptyState={{ icon: ShoppingBag, title: "No orders yet", description: "Orders appear here as customers check out." }} rowKey={(o) => o.id} />
      </section>

      <section>
        <div className="ad-section-title"><div><h2>Shortcuts</h2><p>Common tasks, one tap away.</p></div></div>
        <div className="ad-grid ad-grid-4 keep2">
          {QUICK_ACTIONS.map((qa) => <AdminStatCard key={qa.title} row context={qa.sub} icon={qa.icon} label={qa.title} path={qa.path} />)}
        </div>
      </section>
    </div>
  );
}
