import { useState } from "react";
import { useLocation } from "react-router-dom";
import {
  CalendarDays,
  CircleUserRound,
  House,
  Info,
  Moon,
  Shield,
  ShoppingBag,
  Store,
  Sun,
  Wrench,
} from "lucide-react";
import { Badge, Button, Link } from "@heroui/react";

import { useSiteStore } from "@/lib/siteStore";
import { useCartStore } from "@/lib/store";
import { useAuth } from "@/lib/AuthContext";
import localLogo from "@/assets/mobicare-logo.svg";
import BookingWizard from "@/components/BookingWizard";

const NAV_LINKS = [
  { to: "/", label: "Home", icon: House },
  { to: "/shop", label: "Shop", icon: Store },
  { to: "/repairs", label: "Repairs", icon: Wrench },
  { to: "/protection", label: "Protection", icon: Shield },
  { to: "/about", label: "About", icon: Info },
];

export default function Header() {
  const location = useLocation();

  const brand = useSiteStore((s) => s.brand);
  const appearance = useSiteStore((s) => s.appearance);
  const setColorScheme = useSiteStore((s) => s.setColorScheme);
  const cart = useCartStore((s) => s.items);
  const setCartDrawerOpen = useCartStore((s) => s.setCartDrawerOpen);
  const { user, loading: authLoading } = useAuth();

  const [bookingOpen, setBookingOpen] = useState(false);

  const theme = appearance?.colorScheme || "dark";
  const logoSrc = appearance?.logoUrl || localLogo;

  // NOTE (HeroUI v3 rebuild): the original also mirrored theme onto a
  // `.dark`/`.light` class on <body> (a separate mechanism from siteStore's
  // data-theme attribute on <html>) specifically so `body.dark ...` CSS
  // selectors elsewhere in the app would match. Those selectors are gone now
  // — this rebuild's dark-mode detection is unified on the single
  // `[data-theme="dark"]` attribute on <html> (see globals.css's `dark:`
  // custom-variant and HeroUI's own token selectors), so the body-class
  // mirror is no longer needed.

  const isActive = (path: string) =>
    path === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(path);

  const accountLabel = authLoading
    ? "Account"
    : user
      ? (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ||
        "Account"
      : "Sign In";

  const accountPath = user ? "/account" : "/login";
  const accountActive = isActive("/account");
  const cartItemCount = cart.reduce(
    (total, item) => total + (item?.qty || 0),
    0,
  );

  const handleCartClick = () => setCartDrawerOpen(true);

  const handleBookClick = () => setBookingOpen(true);

  return (
    <header
      className="fixed inset-x-0 top-0 z-40 flex min-h-16 items-center bg-surface/95 px-4 backdrop-blur-xl"
      id="site-header"
    >
      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-[1fr_auto_1fr] items-center gap-4">
        {/* LEFT: theme toggle + desktop nav */}
        <div className="flex min-w-0 items-center gap-2">
          <Button
            isIconOnly
            aria-label={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
            variant="ghost"
            onPress={() =>
              setColorScheme?.(theme === "dark" ? "light" : "dark")
            }
          >
            {theme === "dark" ? (
              <Sun className="size-[18px]" />
            ) : (
              <Moon className="size-[18px]" />
            )}
          </Button>

          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-1 rounded-full bg-surface-secondary p-1 lg:flex"
          >
            {NAV_LINKS.map(({ to, label, icon: Icon }) => {
              const active = isActive(to);

              return (
                <Link
                  key={to}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground hover:bg-surface"
                  }`}
                  href={to}
                >
                  <Icon className="size-4" />
                  <span>{label}</span>
                </Link>
              );
            })}

            <button
              aria-label={`Open Shopping Cart${cartItemCount > 0 ? `, ${cartItemCount} items` : ""}`}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface"
              title="Open Shopping Cart"
              type="button"
              onClick={handleCartClick}
            >
              <Badge.Anchor>
                <ShoppingBag className="size-4" />
                {cartItemCount > 0 && (
                  <Badge color="danger" size="sm">
                    <Badge.Label>{cartItemCount}</Badge.Label>
                  </Badge>
                )}
              </Badge.Anchor>
              <span>Cart</span>
            </button>
          </nav>
        </div>

        {/* CENTER: logo or wordmark */}
        <Link
          aria-label={brand?.name || "Mobicare Device Recovery"}
          className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
          href="/"
          id="header-brand-logo"
        >
          {appearance?.logoType === "image" && logoSrc ? (
            <img
              alt={appearance.logoAlt || brand?.name || "Logo"}
              className="h-7 w-auto max-w-[190px] object-contain sm:h-8 dark:brightness-0 dark:invert"
              src={logoSrc}
            />
          ) : (
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="flex size-8 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-sm"
              >
                <Store className="size-4" />
              </span>
              <strong className="text-base font-bold tracking-tight text-foreground sm:text-lg">
                {brand?.name || "Mobicare"}
              </strong>
            </div>
          )}
        </Link>

        {/* RIGHT: actions */}
        <div className="flex items-center justify-end gap-2">
          <Button className="gap-2" variant="primary" onPress={handleBookClick}>
            <CalendarDays className="size-4" />
            <span className="hidden lg:inline">Book Appointment</span>
          </Button>

          <Link
            aria-label={user ? "My Account" : "Sign in"}
            className={`hidden items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium lg:inline-flex ${
              accountActive
                ? "bg-surface-secondary text-foreground"
                : "text-foreground hover:bg-surface-secondary"
            }`}
            href={accountPath}
          >
            <CircleUserRound className="size-4" />
            <span>{accountLabel}</span>
          </Link>
        </div>
      </div>

      {bookingOpen && <BookingWizard onClose={() => setBookingOpen(false)} />}
    </header>
  );
}
