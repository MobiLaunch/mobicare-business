import type { LucideIcon } from "lucide-react";

import { NavLink, useNavigate } from "react-router-dom";
import { CalendarDays, ExternalLink, LayoutDashboard, LogOut, Package, ShoppingBag, SlidersHorizontal, Sparkles, Tag } from "lucide-react";

import { useAdminStore, useProductStore } from "@/lib/store";
import localLogo from "@/assets/mobicare-logo.svg";

interface NavItem { path: string; icon: LucideIcon; label: string }

export const ADMIN_NAV: NavItem[] = [
  { path: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/admin/content", icon: Sparkles, label: "Site editor" },
  { path: "/admin/products", icon: Package, label: "Products" },
  { path: "/admin/categories", icon: Tag, label: "Categories" },
  { path: "/admin/orders", icon: ShoppingBag, label: "Orders" },
  { path: "/admin/bookings", icon: CalendarDays, label: "Bookings" },
  { path: "/admin/settings", icon: SlidersHorizontal, label: "Settings" },
];

export default function AdminSidebarContent({ onNavigate, sheet }: { onNavigate?: () => void; sheet?: boolean }) {
  const navigate = useNavigate();
  const logout = useAdminStore((s) => s.logout);
  const usingSupabase = useProductStore((s) => s.usingSupabase);
  const loadError = useProductStore((s) => s.loadError);
  const products = useProductStore((s) => s.products);
  const orders = useProductStore((s) => s.orders);

  const count = (path: string) => (path === "/admin/products" ? products.length : path === "/admin/orders" ? orders.length : 0);
  const state = usingSupabase ? "ok" : loadError ? "error" : "local";

  return (
    <div className={`ad-side${sheet ? " ad-side--sheet" : ""}`}>
      <div className="ad-brand">
        <img alt="Mobicare" src={localLogo} />
        <span>Admin</span>
      </div>

      <nav aria-label="Admin" className="ad-nav">
        <p className="ad-nav-label">Manage</p>
        {ADMIN_NAV.map((item) => (
          <NavLink key={item.path} className="ad-link" to={item.path} onClick={onNavigate}>
            <item.icon aria-hidden="true" size={18} strokeWidth={1.75} />
            {item.label}
            {count(item.path) > 0 && <span className="ad-count">{count(item.path)}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="ad-side-foot">
        <div className="ad-db" data-state={state}>
          <span aria-hidden="true" className="ad-db-dot" />
          <div>
            <strong>{usingSupabase ? "Database connected" : loadError ? "Connection error" : "Offline mode"}</strong>
            <small>{usingSupabase ? "Changes sync live" : loadError ? "Check Settings" : "Saved in this browser"}</small>
          </div>
        </div>
        <a className="ad-link" href="/" rel="noreferrer" target="_blank">
          <ExternalLink aria-hidden="true" size={18} strokeWidth={1.75} />View public site
        </a>
        <button className="ad-link ad-link--danger" type="button" onClick={async () => { await logout(); navigate("/admin/login"); }}>
          <LogOut aria-hidden="true" size={18} strokeWidth={1.75} />Sign out
        </button>
      </div>
    </div>
  );
}
