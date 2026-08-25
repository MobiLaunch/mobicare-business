import type { LucideIcon } from "lucide-react";

import { useLocation, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  CloudCheck,
  CloudOff,
  Database,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Package,
  Sparkles,
  SlidersHorizontal,
  Tag,
  ShoppingBag,
  Zap,
} from "lucide-react";
import { Chip, Link } from "@heroui/react";

import { useAdminStore, useProductStore } from "@/lib/store";

interface NavItem {
  path: string;
  icon: LucideIcon;
  label: string;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  {
    path: "/admin/content",
    icon: Sparkles,
    label: "Site Editor",
    badge: "Live",
  },
  { path: "/admin/products", icon: Package, label: "Products" },
  { path: "/admin/categories", icon: Tag, label: "Categories" },
  { path: "/admin/orders", icon: ShoppingBag, label: "Orders" },
  { path: "/admin/bookings", icon: CalendarDays, label: "Bookings" },
  { path: "/admin/settings", icon: SlidersHorizontal, label: "Settings" },
];

export default function AdminSidebarContent({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAdminStore((s) => s.logout);
  const usingSupabase = useProductStore((s) => s.usingSupabase);
  const loadError = useProductStore((s) => s.loadError);
  const products = useProductStore((s) => s.products);
  const orders = useProductStore((s) => s.orders);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const getBadgeValue = (path: string) => {
    if (path === "/admin/products")
      return products.length ? `${products.length}` : null;
    if (path === "/admin/orders")
      return orders.length ? `${orders.length}` : null;

    return null;
  };

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 pb-[18px] pt-[22px]">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Zap className="size-[22px]" />
        </span>
        <div>
          <strong className="block text-foreground">Mobicare</strong>
          <Chip color="default" size="sm">
            <Chip.Label>Admin Workspace</Chip.Label>
          </Chip>
        </div>
      </div>

      <div className="mx-5 border-t border-border" />

      <nav
        aria-label="Admin navigation"
        className="flex flex-1 flex-col gap-1 px-3 py-4"
      >
        <span className="mb-1 px-2 text-[11px] font-bold uppercase tracking-widest text-muted">
          Navigation
        </span>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.path);
          const badgeValue = getBadgeValue(item.path) || item.badge;

          return (
            <Link
              key={item.path}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground hover:bg-surface-secondary"
              }`}
              href={item.path}
              onClick={onNavigate}
            >
              <item.icon className="size-[18px] shrink-0" />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {badgeValue && (
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    active ? "bg-accent-foreground/20" : "bg-surface-tertiary"
                  }`}
                >
                  {badgeValue}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 pb-4">
        <span className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-muted">
          Database State
        </span>
        <div className="flex items-center gap-3 rounded-2xl bg-surface-secondary p-3">
          <span
            className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
              usingSupabase
                ? "bg-success/15 text-success"
                : loadError
                  ? "bg-danger/15 text-danger"
                  : "bg-surface-tertiary text-muted"
            }`}
          >
            {usingSupabase ? (
              <CloudCheck className="size-[18px]" />
            ) : loadError ? (
              <CloudOff className="size-[18px]" />
            ) : (
              <Database className="size-[18px]" />
            )}
          </span>
          <div className="min-w-0">
            <span
              className={`block text-xs font-bold ${
                usingSupabase
                  ? "text-success"
                  : loadError
                    ? "text-danger"
                    : "text-foreground"
              }`}
            >
              {usingSupabase
                ? "Supabase Synchronized"
                : loadError
                  ? "Database Connection Error"
                  : "Local Storage Mode"}
            </span>
            <p className="m-0 truncate text-[11px] text-muted">
              {usingSupabase
                ? "Real-time cloud database active"
                : "Running in offline fallback mode"}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-5 border-t border-border" />

      <div className="flex flex-col gap-1 p-3">
        <a
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground hover:bg-surface-secondary"
          href="/"
          rel="noreferrer"
          target="_blank"
        >
          <ExternalLink className="size-[18px]" />
          <span>View Public Site</span>
        </a>
        <button
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-danger hover:bg-danger/10"
          type="button"
          onClick={handleLogout}
        >
          <LogOut className="size-[18px]" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
