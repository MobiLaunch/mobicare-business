import { Link as RouterLink, useLocation } from "react-router-dom";
import {
  CircleUserRound,
  House,
  ShoppingCart,
  Store,
  Wrench,
} from "lucide-react";
import { Badge } from "@heroui/react";

import { useCartStore } from "@/lib/store";
import { useAuth } from "@/lib/AuthContext";

// NOTE (HeroUI v3 rebuild): the original BottomNav took cartDrawerOpen /
// handleCart / cartCount / user / accountPath as PROPS — but App.jsx rendered
// it as bare `<BottomNav />` with none of them supplied. That meant, on the
// original site: the mobile Cart tab's onClick was undefined (tapping it did
// nothing), the cart badge count never showed, and the Account tab always
// linked to /account and always read "Sign in" regardless of whether someone
// was actually logged in. Rebuilt to pull cart state and auth directly from
// the real stores/context instead of relying on props a parent has to
// remember to wire up — self-sufficient, and actually works.
const NAV_ITEMS = [
  { to: "/", label: "Home", icon: House },
  { to: "/repairs", label: "Repairs", icon: Wrench },
  { to: "/shop", label: "Shop", icon: Store },
];

export default function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();
  const cart = useCartStore((s) => s.items);
  const cartDrawerOpen = useCartStore((s) => s.cartDrawerOpen);
  const setCartDrawerOpen = useCartStore((s) => s.setCartDrawerOpen);

  const isActive = (path: string) => location.pathname === path;
  const accountPath = user ? "/account" : "/login";
  const isAccountActive = location.pathname === accountPath;
  const cartCount = cart.reduce((total, item) => total + (item?.qty || 0), 0);

  const handleCart = () => setCartDrawerOpen(true);

  const itemClass =
    "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-1";
  const pillClass = (active: boolean) =>
    `flex h-8 w-16 items-center justify-center rounded-2xl transition-colors ${
      active ? "bg-accent-soft text-accent" : "text-muted"
    }`;
  const labelClass = (active: boolean) =>
    `text-xs transition-colors ${active ? "font-semibold text-foreground" : "font-medium text-muted"}`;

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-[60] flex min-h-20 items-center justify-around bg-surface px-1 pt-1 pb-[calc(env(safe-area-inset-bottom,0px)+0.25rem)] shadow-[0_-1px_0_var(--border)] lg:hidden"
    >
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
        const active = isActive(to);

        return (
          <RouterLink
            key={to}
            aria-current={active ? "page" : undefined}
            className={itemClass}
            to={to}
          >
            <span className={pillClass(active)}>
              <Icon className="size-5" />
            </span>
            <span className={labelClass(active)}>{label}</span>
          </RouterLink>
        );
      })}

      <button
        aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ""}`}
        aria-pressed={cartDrawerOpen}
        className={itemClass}
        type="button"
        onClick={handleCart}
      >
        <Badge.Anchor className={pillClass(cartDrawerOpen)}>
          <ShoppingCart className="size-5" />
          {cartCount > 0 && (
            <Badge color="danger" size="sm">
              <Badge.Label>{cartCount > 99 ? "99+" : cartCount}</Badge.Label>
            </Badge>
          )}
        </Badge.Anchor>
        <span className={labelClass(cartDrawerOpen)}>Cart</span>
      </button>

      <RouterLink
        aria-current={isAccountActive ? "page" : undefined}
        className={itemClass}
        to={accountPath}
      >
        <span className={pillClass(isAccountActive)}>
          <CircleUserRound className="size-5" />
        </span>
        <span className={labelClass(isAccountActive)}>
          {user ? "Account" : "Sign in"}
        </span>
      </RouterLink>
    </nav>
  );
}
