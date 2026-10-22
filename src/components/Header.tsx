import { Suspense, lazy, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { CalendarDays, CircleUser, Menu, ShoppingBag } from "lucide-react";

import { Button } from "@/components/arc/button/button";
import { Drawer, DrawerContent } from "@/components/arc/drawer/drawer";
import { ThemeSwitch } from "@/components/arc/theme-switch/theme-switch";
import { useAuth } from "@/lib/AuthContext";
import { useCartStore } from "@/lib/store";
import { getEffectiveColorScheme, useSiteStore } from "@/lib/siteStore";
import localLogo from "@/assets/mobicare-logo.svg";

const BookingWizard = lazy(() => import("@/components/BookingWizard"));

const NAV = [
  { to: "/", label: "Home", end: true },
  { to: "/shop", label: "Shop" },
  { to: "/repairs", label: "Repairs" },
  { to: "/protection", label: "Protection" },
  { to: "/about", label: "About" },
];

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const brand = useSiteStore((s) => s.brand);
  const appearance = useSiteStore((s) => s.appearance);
  const viewerColorScheme = useSiteStore((s) => s.viewerColorScheme);
  const setViewerColorScheme = useSiteStore((s) => s.setViewerColorScheme);
  const cart = useCartStore((s) => s.items);
  const setCartDrawerOpen = useCartStore((s) => s.setCartDrawerOpen);
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [booking, setBooking] = useState(false);

  const theme = appearance ? getEffectiveColorScheme({ appearance, viewerColorScheme }) : "light";
  const count = cart.reduce((n, item) => n + (item?.qty || 0), 0);
  const logo = appearance?.logoType === "image" && appearance.logoUrl ? appearance.logoUrl : localLogo;
  const accountTo = user ? "/account" : "/login";
  const isCurrent = (to: string, end?: boolean) => (end ? location.pathname === to : location.pathname.startsWith(to));

  return (
    <header className="mc-header" id="site-header">
      <div className="mc-page mc-header-in">
        <Link aria-label={brand?.name || "Mobicare"} className="mc-brand" id="header-brand-logo" to="/">
          <img alt="" className="mc-logo" src={logo} />
        </Link>

        <nav aria-label="Primary" className="mc-nav">
          {NAV.map((n) => (
            <NavLink key={n.to} end={n.end} to={n.to}>{n.label}</NavLink>
          ))}
        </nav>

        <div className="mc-header-actions">
          <ThemeSwitch iconOnly theme={theme === "dark" ? "dark" : "light"} onThemeChange={(next) => setViewerColorScheme?.(next)} />

          <span className="mc-cart">
            <Button aria-label={`Open cart${count ? `, ${count} items` : ""}`} size="sm" variant="secondary" onClick={() => setCartDrawerOpen(true)}>
              <ShoppingBag aria-hidden="true" size={16} strokeWidth={1.75} />
            </Button>
            {count > 0 && <span aria-hidden="true" className="mc-count">{count > 99 ? "99+" : count}</span>}
          </span>

          <span className="mc-only-wide">
            <Button size="sm" variant="secondary" onClick={() => navigate(accountTo)}>
              <CircleUser aria-hidden="true" size={16} strokeWidth={1.75} />
              {user ? "Account" : "Sign in"}
            </Button>
          </span>

          <Button size="sm" onClick={() => setBooking(true)}>
            <CalendarDays aria-hidden="true" size={16} strokeWidth={1.75} />
            Book a repair
          </Button>

          <span className="mc-only-narrow">
            <Button aria-label="Open menu" size="sm" variant="secondary" onClick={() => setMenuOpen(true)}>
              <Menu aria-hidden="true" size={16} strokeWidth={1.75} />
            </Button>
          </span>
        </div>
      </div>

      <Drawer open={menuOpen} onOpenChange={setMenuOpen}>
        <DrawerContent description="Navigate the site" side="right" title="Menu">
          <nav aria-label="Mobile" className="mc-drawer-links">
            {NAV.map((n) => (
              <NavLink key={n.to} aria-current={isCurrent(n.to, n.end) ? "page" : undefined} end={n.end} to={n.to} onClick={() => setMenuOpen(false)}>{n.label}</NavLink>
            ))}
            <NavLink to={accountTo} onClick={() => setMenuOpen(false)}>{user ? "Account" : "Sign in"}</NavLink>
          </nav>
        </DrawerContent>
      </Drawer>

      {booking && (
        <Suspense fallback={null}>
          <BookingWizard onClose={() => setBooking(false)} />
        </Suspense>
      )}
    </header>
  );
}
