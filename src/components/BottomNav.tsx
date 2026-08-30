import { Link as RouterLink, useLocation } from "react-router-dom";
import {
  CircleUserRound,
  House,
  Shield,
  ShoppingCart,
  Store,
  Wrench,
} from "lucide-react";
import { Badge } from "@heroui/react";

import { useCartStore } from "@/lib/store";
import { useAuth } from "@/lib/AuthContext";

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: House },
  { to: "/repairs", label: "Repairs", icon: Wrench },
  { to: "/shop", label: "Shop", icon: Store },
  { to: "/protection", label: "Protect", icon: Shield },
];

export default function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();
  const cart = useCartStore((s) => s.items);
  const cartDrawerOpen = useCartStore((s) => s.cartDrawerOpen);
  const setCartDrawerOpen = useCartStore((s) => s.setCartDrawerOpen);

  const isActive = (path: string) =>
    path === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(path);
  const accountPath = user ? "/account" : "/login";
  const isAccountActive = location.pathname === accountPath;
  const cartCount = cart.reduce((total, item) => total + (item?.qty || 0), 0);

  const itemClass =
    "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 py-1.5 touch-manipulation select-none";
  const pillClass = (active: boolean) =>
    `flex h-10 min-w-12 items-center justify-center rounded-2xl px-3 transition-colors ${
      active ? "bg-accent-soft text-accent" : "text-muted"
    }`;
  const labelClass = (active: boolean) =>
    `text-caption leading-4 transition-colors ${active ? "font-semibold text-foreground" : "font-medium text-muted"}`;

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-[60] flex min-h-[4.75rem] items-stretch justify-around border-t border-border bg-surface/95 px-1 pt-1 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.25rem)" }}
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
              <Icon aria-hidden="true" className="size-5" />
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
        onClick={() => setCartDrawerOpen(true)}
      >
        <Badge.Anchor className={pillClass(cartDrawerOpen)}>
          <ShoppingCart aria-hidden="true" className="size-5" />
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
          <CircleUserRound aria-hidden="true" className="size-5" />
        </span>
        <span className={labelClass(isAccountActive)}>
          {user ? "Account" : "Sign in"}
        </span>
      </RouterLink>
    </nav>
  );
}
