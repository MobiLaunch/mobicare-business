import {
  CalendarDays,
  LayoutDashboard,
  MoreHorizontal,
  Package,
  ShoppingBag,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { Link } from "@heroui/react";

const BOTTOM_NAV_ITEMS = [
  { path: "/admin/dashboard", icon: LayoutDashboard, label: "Home" },
  { path: "/admin/products", icon: Package, label: "Products" },
  { path: "/admin/orders", icon: ShoppingBag, label: "Orders" },
  { path: "/admin/bookings", icon: CalendarDays, label: "Bookings" },
];

export default function AdminBottomNav({
  onMore,
  moreActive,
}: {
  onMore: () => void;
  moreActive: boolean;
}) {
  const location = useLocation();
  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const pillClass = (active: boolean) =>
    `flex h-8 w-14 items-center justify-center rounded-2xl transition-colors ${active ? "bg-accent-soft text-accent" : "text-muted"}`;
  const labelClass = (active: boolean) =>
    `text-caption transition-colors ${active ? "font-semibold text-foreground" : "font-medium text-muted"}`;

  return (
    <nav
      aria-label="Admin mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 flex h-[70px] items-center justify-around bg-surface pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-1px_0_var(--border)] lg:hidden"
    >
      {BOTTOM_NAV_ITEMS.map(({ path, icon: Icon, label }) => {
        const active = isActive(path);

        return (
          <Link
            key={path}
            aria-current={active ? "page" : undefined}
            className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1"
            href={path}
          >
            <span className={pillClass(active)}>
              <Icon className="size-[18px]" />
            </span>
            <span className={labelClass(active)}>{label}</span>
          </Link>
        );
      })}

      <button
        aria-expanded={moreActive}
        aria-label="Open full admin menu"
        className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1"
        type="button"
        onClick={onMore}
      >
        <span className={pillClass(moreActive)}>
          <MoreHorizontal className="size-[18px]" />
        </span>
        <span className={labelClass(moreActive)}>More</span>
      </button>
    </nav>
  );
}
