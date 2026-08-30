import { useState } from "react";
import { useLocation } from "react-router-dom";
import { CalendarDays, CircleUserRound, House, Info, Moon, Shield, ShoppingBag, Store, Sun, Wrench } from "lucide-react";
import { Badge, Button, Link } from "@heroui/react";

import { useSiteStore, getEffectiveColorScheme } from "@/lib/siteStore";
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
  const viewerColorScheme = useSiteStore((s) => s.viewerColorScheme);
  const setViewerColorScheme = useSiteStore((s) => s.setViewerColorScheme);
  const cart = useCartStore((s) => s.items);
  const setCartDrawerOpen = useCartStore((s) => s.setCartDrawerOpen);
  const { user, loading: authLoading } = useAuth();
  const [bookingOpen, setBookingOpen] = useState(false);

  const theme = appearance ? getEffectiveColorScheme({ appearance, viewerColorScheme }) : "dark";
  const logoSrc = appearance?.logoUrl || localLogo;
  const isActive = (path: string) => path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);
  const accountLabel = authLoading ? "Account" : user ? (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] || "Account" : "Sign In";
  const accountPath = user ? "/account" : "/login";
  const accountActive = isActive("/account");
  const cartItemCount = cart.reduce((total, item) => total + (item?.qty || 0), 0);

  return (
    <header className="fixed inset-x-0 top-0 z-40 min-h-14 border-b border-border bg-surface/90 px-3 backdrop-blur-xl sm:px-4" id="site-header">
      <div className="mx-auto grid min-h-14 w-full max-w-[1400px] grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <Button isIconOnly aria-label={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`} className="size-9 shrink-0" variant="ghost" onPress={() => setViewerColorScheme?.(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun aria-hidden="true" className="size-[17px]" /> : <Moon aria-hidden="true" className="size-[17px]" />}
          </Button>

          <nav aria-label="Primary navigation" className="hidden items-center gap-0.5 rounded-full bg-surface-secondary p-0.5 lg:flex">
            {NAV_LINKS.map(({ to, label, icon: Icon }) => {
              const active = isActive(to);
              return <Link key={to} aria-current={active ? "page" : undefined} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-label font-medium transition-colors ${active ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-surface"}`} href={to}>
                <Icon aria-hidden="true" className="size-3.5" />
                <span>{label}</span>
              </Link>;
            })}
            <Button aria-label={`Open Shopping Cart${cartItemCount > 0 ? `, ${cartItemCount} items` : ""}`} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-label font-medium text-foreground transition-colors hover:bg-surface" variant="ghost" onPress={() => setCartDrawerOpen(true)}>
              <Badge.Anchor><ShoppingBag aria-hidden="true" className="size-3.5" />{cartItemCount > 0 && <Badge color="danger" size="sm"><Badge.Label>{cartItemCount}</Badge.Label></Badge>}</Badge.Anchor>
              <span>Cart</span>
            </Button>
          </nav>
        </div>

        <Link aria-label={brand?.name || "Mobicare Device Recovery"} className="min-w-0 justify-self-center transition-opacity hover:opacity-90 lg:translate-x-4" href="/" id="header-brand-logo">
          {appearance?.logoType === "image" && logoSrc ? <img alt={appearance.logoAlt || brand?.name || "Logo"} className="mx-auto h-6 max-w-[130px] object-contain sm:h-7 sm:max-w-[170px] dark:brightness-0 dark:invert" src={logoSrc} /> : <div className="flex items-center gap-1.5"><span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-sm"><Store className="size-3.5" /></span><strong className="truncate text-sm font-bold tracking-tight text-foreground sm:text-base">{brand?.name || "Mobicare"}</strong></div>}
        </Link>

        <div className="flex items-center justify-end gap-1.5 sm:gap-2">
          <Button aria-label="Book repair appointment" className="h-9 min-w-9 gap-1.5 px-2 sm:px-3 lg:px-3.5" variant="primary" onPress={() => setBookingOpen(true)}>
            <CalendarDays aria-hidden="true" className="size-3.5" />
            <span className="hidden sm:inline">Book Appointment</span>
          </Button>
          <Link aria-label={user ? "My Account" : "Sign in"} className={`hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-label font-medium lg:inline-flex ${accountActive ? "bg-surface-secondary text-foreground" : "text-foreground hover:bg-surface-secondary"}`} href={accountPath}>
            <CircleUserRound aria-hidden="true" className="size-3.5" />
            <span>{accountLabel}</span>
          </Link>
        </div>
      </div>
      {bookingOpen && <BookingWizard onClose={() => setBookingOpen(false)} />}
    </header>
  );
}
