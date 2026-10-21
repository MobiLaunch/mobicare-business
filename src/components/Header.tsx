import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CalendarDays, CircleUserRound, ShoppingBag, Smartphone, Volume2, VolumeX } from "lucide-react";

import { useSiteStore } from "@/lib/siteStore";
import { useCartStore } from "@/lib/store";
import { useAuth } from "@/lib/AuthContext";
import { useSoundStore } from "@/lib/sound";
import localLogo from "@/assets/mobicare-logo.svg";
import BookingWizard from "@/components/LazyBookingWizard";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Shop" },
  { to: "/repairs", label: "Repairs" },
  { to: "/protection", label: "Protection" },
  { to: "/about", label: "About" },
];

/**
 * iOS 6 navigation bar. On phones it's the classic three-slot bar (sound ·
 * title · Book); from `lg` up the title slot grows into a segmented set of
 * links. Primary navigation on phones lives in the tab bar (BottomNav).
 */
export default function Header() {
  const location = useLocation();
  const brand = useSiteStore((s) => s.brand);
  const appearance = useSiteStore((s) => s.appearance);
  const cart = useCartStore((s) => s.items);
  const setCartDrawerOpen = useCartStore((s) => s.setCartDrawerOpen);
  const { user, loading: authLoading } = useAuth();
  const muted = useSoundStore((s) => s.muted);
  const toggleSound = useSoundStore((s) => s.toggle);
  const [bookingOpen, setBookingOpen] = useState(false);

  const logoSrc = appearance?.logoUrl || localLogo;
  const isActive = (path: string) => (path === "/" ? location.pathname === "/" : location.pathname.startsWith(path));
  const accountLabel = authLoading ? "Account" : user ? (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] || "Account" : "Sign In";
  const accountPath = user ? "/account" : "/login";
  const cartItemCount = cart.reduce((total, item) => total + (item?.qty || 0), 0);

  return (
    <header className="ios-navbar fixed inset-x-0 top-0 z-40 px-2 sm:px-4" id="site-header">
      <div className="mx-auto grid h-11 w-full max-w-[1400px] grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex items-center gap-2">
          <button
            aria-label={muted ? "Turn sounds on" : "Turn sounds off"}
            aria-pressed={!muted}
            className="ios-bar-btn w-9 !px-0"
            type="button"
            onClick={toggleSound}
          >
            {muted ? <VolumeX aria-hidden="true" className="size-4" /> : <Volume2 aria-hidden="true" className="size-4" />}
          </button>

          <nav aria-label="Primary navigation" className="ml-2 !hidden items-center gap-1 lg:!flex">
            {NAV_LINKS.map(({ to, label }) => (
              <Link key={to} aria-current={isActive(to) ? "page" : undefined} className="ios-bar-link" to={to}>
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <Link aria-label={brand?.name || "Mobicare Device Recovery"} className="min-w-0 justify-self-center" id="header-brand-logo" to="/">
          {appearance?.logoType === "image" && logoSrc ? (
            <img alt={appearance.logoAlt || brand?.name || "Logo"} className="mx-auto h-6 max-w-[150px] object-contain brightness-0 invert" src={logoSrc} />
          ) : (
            <span className="ios-navbar-title flex items-center gap-1.5 text-[17px]">
              <Smartphone aria-hidden="true" className="size-4" />
              {brand?.name || "Mobicare"}
            </span>
          )}
        </Link>

        <div className="flex items-center justify-end gap-2">
          <button
            aria-label={`Open Shopping Cart${cartItemCount > 0 ? `, ${cartItemCount} items` : ""}`}
            className="ios-bar-btn relative !hidden w-9 !px-0 lg:!inline-flex"
            type="button"
            onClick={() => setCartDrawerOpen(true)}
          >
            <ShoppingBag aria-hidden="true" className="size-4" />
            {cartItemCount > 0 && <span className="ios-badge absolute -right-2 -top-2 !min-w-5 !h-5 !leading-4 !text-[11px]">{cartItemCount}</span>}
          </button>

          <Link aria-label={user ? "My Account" : "Sign in"} className="ios-bar-link !hidden lg:!inline-flex" to={accountPath}>
            <CircleUserRound aria-hidden="true" className="size-4" />
            {accountLabel}
          </Link>

          <button aria-label="Book repair appointment" className="ios-bar-btn ios-bar-btn--done" type="button" onClick={() => setBookingOpen(true)}>
            <CalendarDays aria-hidden="true" className="size-3.5" />
            <span>Book</span>
          </button>
        </div>
      </div>
      {bookingOpen && <BookingWizard onClose={() => setBookingOpen(false)} />}
    </header>
  );
}
