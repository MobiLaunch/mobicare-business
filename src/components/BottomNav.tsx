import { Link, useLocation } from "react-router-dom";
import { CircleUserRound, House, Shield, ShoppingCart, Store, Wrench } from "lucide-react";

import { useCartStore } from "@/lib/store";
import { useAuth } from "@/lib/AuthContext";

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: House },
  { to: "/repairs", label: "Repairs", icon: Wrench },
  { to: "/shop", label: "Shop", icon: Store },
  { to: "/protection", label: "Protect", icon: Shield },
];

/** iOS 6 tab bar: glossy black, active tab glows blue. Phones only. */
export default function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();
  const cart = useCartStore((s) => s.items);
  const cartDrawerOpen = useCartStore((s) => s.cartDrawerOpen);
  const setCartDrawerOpen = useCartStore((s) => s.setCartDrawerOpen);

  const isActive = (path: string) => (path === "/" ? location.pathname === "/" : location.pathname.startsWith(path));
  const accountPath = user ? "/account" : "/login";
  const isAccountActive = location.pathname === accountPath;
  const cartCount = cart.reduce((total, item) => total + (item?.qty || 0), 0);

  return (
    <nav
      aria-label="Mobile navigation"
      className="ios-tabbar fixed inset-x-0 bottom-0 z-[60] flex items-stretch lg:hidden"
      style={{ height: "calc(var(--ios-tab-h) + env(safe-area-inset-bottom))", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <Link key={to} aria-current={isActive(to) ? "page" : undefined} className="ios-tab" to={to}>
          <Icon aria-hidden="true" className="size-6" />
          <span>{label}</span>
        </Link>
      ))}

      <button
        aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ""}`}
        aria-pressed={cartDrawerOpen}
        aria-current={cartDrawerOpen ? "page" : undefined}
        className="ios-tab"
        type="button"
        onClick={() => setCartDrawerOpen(true)}
      >
        <span className="relative">
          <ShoppingCart aria-hidden="true" className="size-6" />
          {cartCount > 0 && (
            <span className="ios-badge absolute -right-3 -top-2 !h-[18px] !min-w-[18px] !px-1 !text-[10px] !leading-[14px]">
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          )}
        </span>
        <span>Cart</span>
      </button>

      <Link aria-current={isAccountActive ? "page" : undefined} className="ios-tab" to={accountPath}>
        <CircleUserRound aria-hidden="true" className="size-6" />
        <span>{user ? "Account" : "Sign in"}</span>
      </Link>
    </nav>
  );
}
