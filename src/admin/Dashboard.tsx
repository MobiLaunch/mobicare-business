import type { Order } from "@/types/domain";

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
import AdminDataTable, {
  type AdminDataTableColumn,
} from "@/admin/components/AdminDataTable";
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
  {
    icon: Boxes,
    title: "Add Product",
    sub: "Create new catalog item",
    path: "/admin/products?action=add",
  },
  {
    icon: Tag,
    title: "Manage Taxonomies",
    sub: "Organize categories & tags",
    path: "/admin/categories",
  },
  {
    icon: Wand2,
    title: "Site Content Editor",
    sub: "Customize hero & brand text",
    path: "/admin/content",
  },
  {
    icon: SlidersHorizontal,
    title: "Store Settings",
    sub: "Configure API keys & integrations",
    path: "/admin/settings",
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const products = useProductStore((s) => s.products);
  const orders = useProductStore((s) => s.orders);
  const categories = useProductStore((s) => s.categories);

  const activeProducts = products.filter((p) => p.active).length;
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 5).length;
  const outOfStock = products.filter((p) => p.stock === 0).length;
  const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
  const recentOrders = orders.slice(0, 5);

  const columns: AdminDataTableColumn<Order>[] = [
    {
      key: "id",
      header: "Order Identifier",
      render: (o) => (
        <code className="rounded-lg bg-surface-tertiary px-2 py-1 text-xs font-bold">
          #{o.id?.slice(0, 8).toUpperCase()}
        </code>
      ),
    },
    {
      key: "customer",
      header: "Customer Name",
      render: (o) => (
        <strong className="text-sm text-foreground">
          {o.customer?.name || "Guest Customer"}
        </strong>
      ),
    },
    {
      key: "items",
      header: "Items Count",
      render: (o) => (
        <span className="text-sm text-muted">
          {o.items?.length || 0} item{o.items?.length !== 1 ? "s" : ""}
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
      render: (o) => (
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${STATUS_STYLES[o.status] || "bg-surface-tertiary"}`}
        >
          {o.status || "pending"}
        </span>
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
      key: "actions",
      header: "",
      render: () => (
        <Button
          isIconOnly
          aria-label="View order"
          variant="ghost"
          onPress={() => navigate("/admin/orders")}
        >
          <Eye className="size-4" />
        </Button>
      ),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        action={
          <Button
            variant="primary"
            onPress={() => navigate("/admin/products?action=add")}
          >
            <Plus className="size-4" />
            <span>Add New Product</span>
          </Button>
        }
        description="Real-time metric telemetry, inventory status, and recent order activity."
        eyebrow="Executive Overview"
        title="Store Operations"
      />

      {/* Inventory alerts */}
      <div className="mb-6 flex flex-col gap-3">
        {outOfStock > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-danger/10 p-4 text-danger">
            <TriangleAlert className="size-6 shrink-0" />
            <div className="min-w-0 flex-1">
              <strong className="block text-sm">Stock Depleted Warning</strong>
              <span className="text-[13px] opacity-90">
                {outOfStock} product{outOfStock !== 1 ? "s are" : " is"}{" "}
                currently completely out of stock.
              </span>
            </div>
            <Button
              className="shrink-0"
              variant="outline"
              onPress={() => navigate("/admin/products")}
            >
              <span>Update Inventory</span>
              <ArrowRight className="size-4" />
            </Button>
          </div>
        )}

        {lowStock > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-warning/10 p-4 text-warning">
            <PackageX className="size-6 shrink-0" />
            <div className="min-w-0 flex-1">
              <strong className="block text-sm">Low Inventory Alert</strong>
              <span className="text-[13px] opacity-90">
                {lowStock} product{lowStock !== 1 ? "s have" : " has"} 5 or
                fewer items remaining.
              </span>
            </div>
            <Button
              className="shrink-0"
              variant="outline"
              onPress={() => navigate("/admin/products")}
            >
              <span>View Stock</span>
              <ArrowRight className="size-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Stat cards */}
      {/* NOTE (HeroUI v3 rebuild): the original "Products Catalog" card
          showed a hardcoded "+12% vs last month" trend string — the app has
          no historical snapshot data to compute a real month-over-month
          change, so that number was fabricated. Replaced with an honest
          descriptive tagline, matching the other three cards, which never
          claimed a fake statistic. */}
      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard icon={Boxes} path="/admin/products">
          <p className="m-0 mb-1 text-[clamp(1.8rem,3vw,2.4rem)] font-extrabold leading-none tracking-tight text-foreground">
            {products.length}
          </p>
          <p className="m-0 mb-0.5 text-sm font-bold text-foreground">
            Products Catalog
          </p>
          <p className="m-0 text-xs text-muted">
            {activeProducts} active in store
          </p>
        </AdminStatCard>

        <AdminStatCard icon={Tag} path="/admin/categories">
          <p className="m-0 mb-1 text-[clamp(1.8rem,3vw,2.4rem)] font-extrabold leading-none tracking-tight text-foreground">
            {categories.length}
          </p>
          <p className="m-0 mb-0.5 text-sm font-bold text-foreground">
            Categories
          </p>
          <p className="m-0 text-xs text-muted">Organized product groups</p>
        </AdminStatCard>

        <AdminStatCard icon={ShoppingBag} path="/admin/orders">
          <p className="m-0 mb-1 text-[clamp(1.8rem,3vw,2.4rem)] font-extrabold leading-none tracking-tight text-foreground">
            {orders.length}
          </p>
          <p className="m-0 mb-0.5 text-sm font-bold text-foreground">
            Total Orders
          </p>
          <p className="m-0 text-xs text-muted">Completed &amp; pending</p>
        </AdminStatCard>

        <AdminStatCard icon={TrendingUp} path="/admin/orders">
          <p className="m-0 mb-1 text-[clamp(1.5rem,2.6vw,2rem)] font-extrabold leading-none tracking-tight text-foreground">
            $
            {totalRevenue.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <p className="m-0 mb-0.5 text-sm font-bold text-foreground">
            Gross Revenue
          </p>
          <p className="m-0 text-xs text-muted">All-time sales</p>
        </AdminStatCard>
      </div>

      {/* Recent orders */}
      <section className="mb-9">
        <div className="mb-4 flex items-center gap-3">
          <div>
            <h3 className="m-0 text-xl font-extrabold text-foreground">
              Recent Orders
            </h3>
            <p className="m-0 text-[13px] text-muted">
              Latest purchases placed by store customers
            </p>
          </div>
          <div className="flex-1" />
          <Button variant="ghost" onPress={() => navigate("/admin/orders")}>
            <span>View All Orders</span>
            <ArrowRight className="size-4" />
          </Button>
        </div>

        <AdminDataTable
          columns={columns}
          data={recentOrders}
          emptyState={{
            icon: ShoppingBag,
            title: "No orders recorded yet",
            description:
              "Orders will automatically appear here as customers complete checkout on the live store.",
          }}
          rowKey={(o) => o.id}
        />
      </section>

      {/* Quick actions */}
      <section>
        <h3 className="m-0 mb-4 text-xl font-extrabold text-foreground">
          Management Shortcuts
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_ACTIONS.map((qa) => (
            <AdminStatCard
              key={qa.title}
              className="flex items-center gap-3.5 p-4"
              icon={qa.icon}
              iconClassName=""
              path={qa.path}
            >
              <div className="min-w-0 flex-1">
                <strong className="block truncate text-sm text-foreground">
                  {qa.title}
                </strong>
                <span className="block truncate text-xs text-muted">
                  {qa.sub}
                </span>
              </div>
              <ArrowRight className="size-[18px] shrink-0 text-muted" />
            </AdminStatCard>
          ))}
        </div>
      </section>
    </div>
  );
}
