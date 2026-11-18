import { CalendarDays, LayoutDashboard, Ellipsis, Package, ShoppingBag } from "lucide-react";
import { NavLink } from "react-router-dom";

const ITEMS = [
  { path: "/admin/dashboard", icon: LayoutDashboard, label: "Home" },
  { path: "/admin/products", icon: Package, label: "Products" },
  { path: "/admin/orders", icon: ShoppingBag, label: "Orders" },
  { path: "/admin/bookings", icon: CalendarDays, label: "Bookings" },
];

export default function AdminBottomNav({ onMore, moreActive }: { onMore: () => void; moreActive: boolean }) {
  return (
    <nav aria-label="Admin mobile" className="ad-bottom">
      {ITEMS.map(({ path, icon: Icon, label }) => (
        <NavLink key={path} to={path}>
          <span className="pill"><Icon aria-hidden="true" size={18} strokeWidth={1.75} /></span>
          {label}
        </NavLink>
      ))}
      <button aria-expanded={moreActive} aria-label="Open full admin menu" type="button" onClick={onMore}>
        <span className="pill"><Ellipsis aria-hidden="true" size={18} strokeWidth={1.75} /></span>
        More
      </button>
    </nav>
  );
}
