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
      <aside className="hidden w-[272px] shrink-0 border-r border-border bg-surface/94 backdrop-blur-xl lg:flex lg:flex-col">
        <AdminSidebarContent />
      </aside>

      <Drawer>
        <Drawer.Backdrop isOpen={mobileOpen} onOpenChange={setMobileOpen}>
          <Drawer.Content className="w-[min(88vw,320px)]" placement="left">
            <Drawer.Dialog>
              <AdminSidebarContent onNavigate={() => setMobileOpen(false)} />
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-border bg-surface/80 px-3 py-2 backdrop-blur-xl sm:px-5 lg:px-6">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <button
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? "Close side menu" : "Open side menu"}
              className="flex size-11 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:hidden"
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
            >
              <Menu aria-hidden="true" className="size-5" />
            </button>
            <div className="min-w-0">
              <span className="block truncate text-micro font-bold uppercase tracking-[0.16em] text-accent sm:text-caption">
                Mobicare Admin Portal
              </span>
              <h1 className="m-0 truncate text-base font-bold text-foreground sm:text-lg">
                {currentPage}
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <a
              aria-label="Open live store in a new tab"
              className="hidden min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-secondary hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:inline-flex"
              href="/"
              rel="noreferrer"
              target="_blank"
              title="Open public website in new tab"
            >
              <ArrowRight aria-hidden="true" className="size-4" />
              <span>Live Store</span>
            </a>
            <div className="flex min-h-11 items-center gap-2 rounded-full bg-surface-secondary py-1 pl-1 pr-2 sm:pr-3">
              <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-full bg-accent-soft text-accent sm:size-7">
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
            className="mx-3 mt-3 flex flex-wrap items-start gap-3 rounded-2xl bg-danger/10 p-3.5 text-danger sm:mx-5 sm:mt-4 sm:p-4 lg:mx-6"
            role="alert"
          >
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 flex-1 text-sm leading-relaxed">
              <strong className="mr-1">Database Connection Warning:</strong>
              <span>{loadError}</span>
            </div>
            <Link
              className="flex min-h-11 shrink-0 items-center gap-1 rounded-full px-2 text-sm font-semibold underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              to="/admin/settings"
            >
              <span>Fix in Settings</span>
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </div>
        )}

        <main className="min-w-0 flex-1 px-3 py-4 pb-24 sm:px-5 sm:py-6 lg:px-6 lg:pb-6">
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
