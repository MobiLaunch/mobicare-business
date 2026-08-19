import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { ArrowRight, Menu, ShieldUser, TriangleAlert } from "lucide-react";
import { Drawer } from "@heroui/react";

import { useProductStore } from "@/lib/store";
import AdminSidebarContent from "@/admin/components/AdminSidebarContent";
import AdminBottomNav from "@/admin/components/AdminBottomNav";

const NAV_LABELS: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/content": "Site Editor",
  "/admin/products": "Products",
  "/admin/categories": "Categories",
  "/admin/orders": "Orders",
  "/admin/bookings": "Bookings",
  "/admin/settings": "Settings",
};

// NOTE (HeroUI v3 rebuild): the original mobile nav was a hand-rolled overlay
// (fixed-position <aside> + a manual backdrop <div>, toggled via a CSS
// transform and an `open` class) with no real focus trap or keyboard
// dismissal. Rebuilt on HeroUI's real Drawer here instead — same shared
// AdminSidebarContent renders in both places, so there's one nav to
// maintain, but mobile now gets real focus-trapping/Escape-to-close/
// backdrop-click behavior for free instead of a hand-rolled approximation.
export default function AdminLayout() {
  const location = useLocation();
  const loadError = useProductStore((s) => s.loadError);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);
  const currentPath = Object.keys(NAV_LABELS).find(isActive);
  const currentPage =
    (currentPath && NAV_LABELS[currentPath]) || "Management Console";

  return (
    <div
      className="flex min-h-screen w-full max-w-full overflow-x-hidden bg-background text-foreground"
      id="admin-root-shell"
    >
      {/* Desktop: static sidebar */}
      <aside className="hidden w-[272px] shrink-0 border-r border-border bg-surface/94 backdrop-blur-xl lg:flex lg:flex-col">
        <AdminSidebarContent />
      </aside>

      {/* Mobile: real Drawer */}
      <Drawer>
        <Drawer.Backdrop isOpen={mobileOpen} onOpenChange={setMobileOpen}>
          <Drawer.Content className="w-[280px]" placement="left">
            <Drawer.Dialog>
              <AdminSidebarContent onNavigate={() => setMobileOpen(false)} />
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-surface/80 px-6 backdrop-blur-xl">
          <div className="flex min-w-0 items-center gap-3">
            <button
              aria-expanded={mobileOpen}
              aria-label="Open side menu"
              className="flex size-9 items-center justify-center rounded-full text-foreground hover:bg-surface-secondary lg:hidden"
              type="button"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-5" />
            </button>
            <div className="min-w-0">
              <span className="block text-[11px] font-bold uppercase tracking-widest text-accent">
                Mobicare Admin Portal
              </span>
              <h1 className="m-0 truncate text-lg font-bold text-foreground">
                {currentPage}
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <a
              className="hidden items-center gap-1.5 text-sm font-medium text-foreground hover:text-accent sm:inline-flex"
              href="/"
              rel="noreferrer"
              target="_blank"
              title="Open public website in new tab"
            >
              <ArrowRight className="size-4" />
              <span>Live Store</span>
            </a>
            <div className="flex items-center gap-2 rounded-full bg-surface-secondary py-1 pl-1 pr-3">
              <span className="flex size-7 items-center justify-center rounded-full bg-accent-soft text-accent">
                <ShieldUser className="size-4" />
              </span>
              <span className="hidden text-sm font-semibold sm:inline">
                Administrator
              </span>
            </div>
          </div>
        </header>

        {loadError && (
          <div
            className="mx-6 mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-danger/10 p-4 text-danger"
            role="alert"
          >
            <TriangleAlert className="size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <strong className="mr-1">Database Connection Warning:</strong>
              <span className="text-sm">{loadError}</span>
            </div>
            <Link
              className="flex shrink-0 items-center gap-1 text-sm font-semibold underline"
              to="/admin/settings"
            >
              <span>Fix in Settings</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        )}

        <main className="flex-1 p-6 pb-24 lg:pb-6">
          <Outlet />
        </main>

        <AdminBottomNav
          moreActive={mobileOpen}
          onMore={() => setMobileOpen(true)}
        />
      </div>
    </div>
  );
}
