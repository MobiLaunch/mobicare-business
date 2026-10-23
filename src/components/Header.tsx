import { Suspense, lazy, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { Menu, ShoppingBag } from "lucide-react";

import MenuPanel, { type MenuLink } from "@/components/MenuPanel";
import { ThemeSwitch } from "@/components/arc/theme-switch/theme-switch";
import { useAuth } from "@/lib/AuthContext";
import { useCartStore } from "@/lib/store";
import { getEffectiveColorScheme, useSiteStore } from "@/lib/siteStore";
import localLogo from "@/assets/mobicare-logo.svg";

const BookingWizard = lazy(() => import("@/components/BookingWizard"));

const LINKS: MenuLink[] = [
  { to: "/", label: "Home", hint: "Start here", end: true },
  { to: "/shop", label: "Shop", hint: "Chargers, cases and more" },
  { to: "/repairs", label: "Repairs", hint: "Screens, batteries, water damage" },
  { to: "/protection", label: "Protection", hint: "Plans from $5 a month" },
  { to: "/about", label: "About", hint: "Our story and shop" },
];

export default function Header() {
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

  return (
    <header className="mc-header" id="site-header">
      <div className="mc-page mc-header-in">
        <div className="mc-header-side">
          <ThemeSwitch iconOnly theme={theme === "dark" ? "dark" : "light"} onThemeChange={(next) => setViewerColorScheme?.(next)} />
        </div>

        <Link aria-label={`${brand?.name || "Mobicare"} home`} className="mc-brand" id="header-brand-logo" to="/">
          <img alt="" className="mc-logo" src={logo} />
        </Link>

        <div className="mc-header-side mc-header-side--end">
          <button aria-label={`Open cart${count ? `, ${count} item${count === 1 ? "" : "s"}` : ""}`} className="mc-iconbtn" type="button" onClick={() => setCartDrawerOpen(true)}>
            <ShoppingBag aria-hidden="true" size={18} strokeWidth={1.75} />
            <AnimatePresence initial={false}>
              {count > 0 && (
                <motion.span key={count} aria-hidden="true" className="mc-count" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={{ type: "spring", stiffness: 600, damping: 22 }}>
                  {count > 99 ? "99+" : count}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <button aria-expanded={menuOpen} aria-haspopup="dialog" aria-label="Open menu" className="mc-iconbtn" type="button" onClick={() => setMenuOpen(true)}>
            <Menu aria-hidden="true" size={18} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <MenuPanel accountTo={user ? "/account" : "/login"} links={LINKS} open={menuOpen} signedIn={!!user} onBook={() => setBooking(true)} onOpenChange={setMenuOpen} />

      {booking && (
        <Suspense fallback={null}>
          <BookingWizard onClose={() => setBooking(false)} />
        </Suspense>
      )}
    </header>
  );
}
