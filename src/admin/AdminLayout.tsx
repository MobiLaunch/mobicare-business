import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { ArrowUpRight, Menu, TriangleAlert } from "lucide-react";

import { Drawer, DrawerContent } from "@/components/arc/drawer/drawer";
import { useProductStore } from "@/lib/store";
import AdminBottomNav from "@/admin/components/AdminBottomNav";
import AdminSidebarContent, { ADMIN_NAV } from "@/admin/components/AdminSidebarContent";

export default function AdminLayout() {
  const location = useLocation();
  const loadError = useProductStore((s) => s.loadError);
  const [mobileOpen, setMobileOpen] = useState(false);
  const current = ADMIN_NAV.find((n) => location.pathname.startsWith(n.path))?.label ?? "Console";

  return (
    <div className="ad-shell" id="admin-root-shell">
      <AdminSidebarContent />

      <Drawer open={mobileOpen} onOpenChange={setMobileOpen}>
        <DrawerContent description="Jump to any admin section" side="left" title="Menu">
          <AdminSidebarContent sheet onNavigate={() => setMobileOpen(false)} />
        </DrawerContent>
      </Drawer>

      <div className="ad-main">
        <header className="ad-top">
          <div className="ad-top-l">
            <button aria-label="Open side menu" className="ad-iconbtn ad-only-mobile" type="button" onClick={() => setMobileOpen(true)}>
              <Menu aria-hidden="true" size={20} strokeWidth={1.75} />
            </button>
            <p className="ad-crumb">Mobicare / <strong>{current}</strong></p>
          </div>
          <div className="ad-top-r">
            <a className="ad-link ad-hide-mobile" href="/" rel="noreferrer" style={{ color: "var(--text-secondary)" }} target="_blank">
              Live store<ArrowUpRight aria-hidden="true" size={16} strokeWidth={1.75} />
            </a>
            <span className="ad-user"><i aria-hidden="true">A</i><span className="ad-hide-mobile">Administrator</span></span>
          </div>
        </header>

        {loadError && (
          <div className="ad-warn" role="alert">
            <TriangleAlert aria-hidden="true" size={18} />
            <span><strong>Database connection problem.</strong> {loadError}</span>
            <Link to="/admin/settings">Fix in Settings</Link>
          </div>
        )}

        <main className="ad-content">
          <Outlet />
        </main>

        <AdminBottomNav moreActive={mobileOpen} onMore={() => setMobileOpen(true)} />
      </div>
    </div>
  );
}
