import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  CircleUserRound,
  FileText,
  House,
  Info,
  Moon,
  SearchCheck,
  Shield,
  ShoppingBag,
  Store,
  Sun,
  Wrench,
  X,
} from "lucide-react";
import { Badge, Button, Link } from "@heroui/react";

import { useSiteStore, getEffectiveColorScheme } from "@/lib/siteStore";
import { useCartStore } from "@/lib/store";
import { useAuth } from "@/lib/AuthContext";
import localLogo from "@/assets/mobicare-logo.svg";
import BookingWizard from "@/components/BookingWizard";

const BASE_NAV_LINKS = [
  { to: "/", label: "Home", copyKey: "nav.home", icon: House },
  { to: "/shop", label: "Shop", copyKey: "nav.shop", icon: Store },
  { to: "/repairs", label: "Repairs", copyKey: "nav.repairs", icon: Wrench },
  {
    to: "/protection",
    label: "Protection",
    copyKey: "nav.protection",
    icon: Shield,
  },
  { to: "/about", label: "About", copyKey: "nav.about", icon: Info },
];

export default function Header() {
  const location = useLocation();
  const brand = useSiteStore((s) => s.brand);
  const appearance = useSiteStore((s) => s.appearance);
  const announcement = useSiteStore((s) => s.announcement);
  const menu = useSiteStore((s) => s.menu);
  const copy = useSiteStore((s) => s.copy);
  const pages = useSiteStore((s) => s.pages);
  const isPreview = useSiteStore((s) => s.isPreview);
  const viewerColorScheme = useSiteStore((s) => s.viewerColorScheme);
  const setViewerColorScheme = useSiteStore((s) => s.setViewerColorScheme);
  const cart = useCartStore((s) => s.items);
  const setCartDrawerOpen = useCartStore((s) => s.setCartDrawerOpen);
  const { user, loading: authLoading } = useAuth();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [dismissedText, setDismissedText] = useState<string | null>(null);

  const theme = appearance
    ? getEffectiveColorScheme({ appearance, viewerColorScheme, isPreview })
    : "dark";
  const hasCustomLogo = Boolean(appearance?.logoUrl?.trim());
  const logoSrc = hasCustomLogo ? appearance!.logoUrl : localLogo;

  const isActive = (path: string) =>
    path === "/"
      ? location.pathname === "/"
      : location.pathname === path || location.pathname.startsWith(`${path}/`);

  const accountLabel = authLoading
    ? "Account"
    : user
      ? (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ||
        "Account"
      : "Sign In";
  const accountPath = user ? "/account" : "/login";
  const accountActive = isActive("/account");
  const cartItemCount = cart.reduce((total, item) => total + (item?.qty || 0), 0);

  const navItems = useMemo(() => {
    const order = Array.isArray(menu?.order) ? menu.order : [];
    const hidden = new Set(Array.isArray(menu?.hidden) ? menu.hidden : []);

    const orderedBase = [
      ...order
        .map((to) => BASE_NAV_LINKS.find((item) => item.to === to))
        .filter((x): x is (typeof BASE_NAV_LINKS)[number] => Boolean(x)),
      ...BASE_NAV_LINKS.filter((item) => !order.includes(item.to)),
    ].filter((item) => !hidden.has(item.to));

    const extraMenuPages = (pages || [])
      .filter((p) => p.inMenu && (p.published || isPreview))
      .map((p) => ({
        to: `/p/${p.slug}`,
        label: p.title,
        copyKey: "",
        icon: FileText,
      }));

    return [...orderedBase, ...extraMenuPages];
  }, [menu, pages, isPreview]);

  const showAnnouncement = Boolean(
    announcement?.enabled &&
      announcement?.text?.trim() &&
      (isPreview || dismissedText !== announcement.text),
  );

  const announcementToneClass =
    announcement?.tone === "warning"
      ? "bg-amber-500 text-slate-950"
      : announcement?.tone === "dark"
        ? "bg-foreground text-background"
        : "bg-accent text-accent-foreground";

  return (
    <div className="sticky top-0 z-40 w-full">
      {showAnnouncement && (
        <div
          className={`relative flex items-center justify-center gap-3 px-9 py-2 text-center text-xs font-semibold sm:text-label ${announcementToneClass}`}
          id="site-announcement-bar"
          role="region"
          aria-label="Store announcement"
        >
          <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1">
            <span data-edit="announcement.text">{announcement.text}</span>
            {announcement.link?.trim() && (
              <Link
                className="inline-flex items-center gap-1 underline underline-offset-2 opacity-95 hover:opacity-100"
                href={announcement.link.trim()}
              >
                <span>{announcement.linkLabel?.trim() || "Learn more"}</span>
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </Link>
            )}
          </div>
          {!isPreview && (
            <button
              aria-label="Dismiss announcement"
              className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full opacity-80 transition-opacity hover:opacity-100"
              type="button"
              onClick={() => setDismissedText(announcement.text)}
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          )}
        </div>
      )}

      <header
        className="min-h-14 border-b border-[var(--hairline)] bg-surface/85 px-3 shadow-[var(--elev-1)] backdrop-blur-xl backdrop-saturate-150 sm:px-4"
        id="site-header"
      >
        <div className="mx-auto grid min-h-14 w-full max-w-[1400px] grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <Button
              isIconOnly
              aria-label={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
              className="size-9 shrink-0"
              variant="ghost"
              onPress={() =>
                setViewerColorScheme?.(theme === "dark" ? "light" : "dark")
              }
            >
              {theme === "dark" ? (
                <Sun aria-hidden="true" className="size-[17px]" />
              ) : (
                <Moon aria-hidden="true" className="size-[17px]" />
              )}
            </Button>

            <nav
              aria-label="Primary navigation"
              className="hidden items-center gap-0.5 rounded-full bg-surface-secondary p-0.5 lg:flex"
            >
              {navItems.map(({ to, label, copyKey, icon: Icon }) => {
                const active = isActive(to);
                const resolvedLabel =
                  (copyKey && copy?.[copyKey]) || label;

                return (
                  <Link
                    key={to}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-label font-medium transition-colors ${active ? "bg-accent text-accent-foreground shadow-[var(--elev-1)]" : "text-muted hover:bg-surface hover:text-foreground"}`}
                    data-edit={copyKey ? `copy.${copyKey}` : undefined}
                    href={to}
                  >
                    <Icon aria-hidden="true" className="size-3.5" />
                    <span>{resolvedLabel}</span>
                  </Link>
                );
              })}
              <Link
                aria-current={isActive("/repair-status") ? "page" : undefined}
                className={`inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-label font-medium transition-colors ${isActive("/repair-status") ? "bg-accent text-accent-foreground shadow-[var(--elev-1)]" : "text-muted hover:bg-surface hover:text-foreground"}`}
                href="/repair-status"
              >
                <SearchCheck aria-hidden="true" className="size-3.5" />
                <span>Track</span>
              </Link>
              <Button
                aria-label={`Open Shopping Cart${cartItemCount > 0 ? `, ${cartItemCount} items` : ""}`}
                className="inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-label font-medium text-muted transition-colors hover:bg-surface hover:text-foreground"
                variant="ghost"
                onPress={() => setCartDrawerOpen(true)}
              >
                <Badge.Anchor>
                  <ShoppingBag aria-hidden="true" className="size-3.5" />
                  {cartItemCount > 0 && (
                    <Badge color="danger" size="sm">
                      <Badge.Label>{cartItemCount}</Badge.Label>
                    </Badge>
                  )}
                </Badge.Anchor>
                <span>Cart</span>
              </Button>
            </nav>
          </div>

          <Link
            aria-label={brand?.name || "Mobicare Device Recovery"}
            className="min-w-0 justify-self-center transition-opacity hover:opacity-90 lg:translate-x-4"
            href="/"
            id="header-brand-logo"
          >
            {appearance?.logoType === "image" && logoSrc ? (
              <img
                alt={appearance.logoAlt || brand?.name || "Logo"}
                className={`mx-auto h-6 max-w-[130px] object-contain sm:h-7 sm:max-w-[170px] ${hasCustomLogo ? "" : "dark:brightness-0 dark:invert"}`}
                src={logoSrc}
              />
            ) : (
              <div className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-sm"
                >
                  <Store className="size-3.5" />
                </span>
                <strong
                  className="truncate text-sm font-bold tracking-tight text-foreground sm:text-base"
                  data-edit="brand.name"
                >
                  {brand?.name || "Mobicare"}
                </strong>
              </div>
            )}
          </Link>

          <div className="flex items-center justify-end gap-1.5 sm:gap-2">
            <Link
              aria-label="Track repair or order"
              className="inline-flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-secondary hover:text-foreground lg:hidden"
              href="/repair-status"
            >
              <SearchCheck aria-hidden="true" className="size-[17px]" />
            </Link>
            <Button
              aria-label="Book repair appointment"
              className="h-9 min-w-9 gap-1.5 px-2.5 sm:px-3 lg:px-3.5"
              variant="primary"
              onPress={() => setBookingOpen(true)}
            >
              <CalendarDays aria-hidden="true" className="size-3.5" />
              <span className="hidden sm:inline">Book Appointment</span>
            </Button>
            <Link
              aria-label={user ? "My Account" : "Sign in"}
              className={`hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-label font-medium lg:inline-flex ${accountActive ? "bg-surface-secondary text-foreground" : "text-foreground hover:bg-surface-secondary"}`}
              href={accountPath}
            >
              <CircleUserRound aria-hidden="true" className="size-3.5" />
              <span>{accountLabel}</span>
            </Link>
          </div>
        </div>
        {bookingOpen && <BookingWizard onClose={() => setBookingOpen(false)} />}
      </header>
    </div>
  );
}
