import React, { useState } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { useAdminStore, useProductStore } from '../lib/store'

const NAV_ITEMS = [
  { path: '/admin/dashboard', icon: 'dashboard', label: 'Dashboard', badge: null },
  { path: '/admin/content', icon: 'auto_fix_high', label: 'Site Editor', badge: 'Live' },
  { path: '/admin/products', icon: 'inventory_2', label: 'Products', badge: null },
  { path: '/admin/categories', icon: 'category', label: 'Categories', badge: null },
  { path: '/admin/orders', icon: 'shopping_bag', label: 'Orders', badge: null },
  { path: '/admin/bookings', icon: 'calendar_month', label: 'Bookings', badge: null },
  { path: '/admin/settings', icon: 'tune', label: 'Settings', badge: null },
]

const BOTTOM_NAV_ITEMS = [
  { path: '/admin/dashboard', icon: 'dashboard', label: 'Home' },
  { path: '/admin/products', icon: 'inventory_2', label: 'Products' },
  { path: '/admin/orders', icon: 'shopping_bag', label: 'Orders' },
  { path: '/admin/bookings', icon: 'calendar_month', label: 'Bookings' },
  { icon: 'more_horiz', label: 'More', more: true },
]

export default function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const logout = useAdminStore(s => s.logout)
  const usingSupabase = useProductStore(s => s.usingSupabase)
  const loadError = useProductStore(s => s.loadError)
  const products = useProductStore(s => s.products)
  const orders = useProductStore(s => s.orders)
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`)
  const currentNav = NAV_ITEMS.find(item => isActive(item.path))
  const currentPage = currentNav?.label || 'Management Console'

  const getBadgeValue = (path) => {
    if (path === '/admin/products') return products.length ? `${products.length}` : null
    if (path === '/admin/orders') return orders.length ? `${orders.length}` : null
    return null
  }

  return (
    <div id="admin-root-shell" className="admin-shell">
      {/* Mobile Drawer Overlay Backdrop */}
      <div
        id="admin-drawer-overlay"
        className={`admin-overlay ${mobileOpen ? 'open' : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* Main Admin Glass Sidebar Navigation */}
      <aside id="admin-sidebar-navigation" className={`admin-sidebar ${mobileOpen ? 'open' : ''}`}>
        <div id="admin-sidebar-header" className="admin-brand-header">
          <div className="admin-brand-dot">
            <i className="admin-brand-icon">bolt</i>
          </div>
          <div className="admin-brand-copy">
            <strong>Mobicare</strong>
            <span className="chip small secondary-container admin-portal-chip">Admin Workspace</span>
          </div>
          <button
            id="admin-sidebar-close-btn"
            className="admin-sidebar-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close drawer navigation"
          >
            <i>close</i>
          </button>
        </div>

        <div className="admin-sidebar-divider" />

        <nav id="admin-main-nav" className="admin-sidebar-nav" aria-label="Admin navigation">
          <span className="admin-nav-kicker">Navigation</span>
          {NAV_ITEMS.map(item => {
            const active = isActive(item.path)
            const badgeCount = getBadgeValue(item.path) || item.badge
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`admin-nav-item ${active ? 'active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                <i className="admin-nav-icon">{item.icon}</i>
                <span className="admin-nav-text">{item.label}</span>
                {badgeCount && (
                  <span className={`chip small ${active ? 'primary-container' : 'surface-container-high'} admin-nav-badge`}>
                    {badgeCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div id="admin-connection-status-widget" className="admin-status-section">
          <span className="admin-nav-kicker">Database State</span>
          <div className="admin-status-card">
            <i className={`admin-status-icon ${usingSupabase ? 'connected' : loadError ? 'error' : ''}`}>
              {usingSupabase ? 'cloud_done' : loadError ? 'cloud_off' : 'storage'}
            </i>
            <div className="admin-status-copy">
              <span className={`admin-status-label ${usingSupabase ? 'connected' : loadError ? 'error' : ''}`}>
                {usingSupabase ? 'Supabase Synchronized' : loadError ? 'Database Connection Error' : 'Local Storage Mode'}
              </span>
              <p className="admin-status-subtext">
                {usingSupabase ? 'Real-time cloud database active' : 'Running in offline fallback mode'}
              </p>
            </div>
          </div>
        </div>

        <div className="admin-sidebar-divider" />

        <div id="admin-sidebar-footer-actions" className="admin-sidebar-footer">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="admin-nav-item admin-live-site-link"
          >
            <i className="admin-nav-icon">open_in_new</i>
            <span>View Public Site</span>
          </a>
          <button
            id="admin-sign-out-button"
            className="admin-nav-item admin-signout"
            onClick={handleLogout}
          >
            <i className="admin-nav-icon">logout</i>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content View Container */}
      <div id="admin-main-wrapper" className="admin-main-wrapper">
        <header id="admin-top-header" className="admin-header">
          <div className="admin-header-leading">
            <button
              id="admin-mobile-toggle-btn"
              className="admin-mobile-toggle"
              onClick={() => setMobileOpen(true)}
              aria-label="Open side menu"
              aria-expanded={mobileOpen}
            >
              <i>menu</i>
            </button>
            <div className="admin-header-title">
              <span className="admin-header-eyebrow">Mobicare Admin Portal</span>
              <h1>{currentPage}</h1>
            </div>
          </div>

          <div className="admin-header-actions">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              title="Open public website in new tab"
              className="admin-header-link"
            >
              <i>open_in_new</i>
              <span>Live Store</span>
            </a>
            <div className="admin-user-avatar-chip">
              <div className="admin-user-avatar">
                <i>admin_panel_settings</i>
              </div>
              <span className="admin-user-name">Administrator</span>
            </div>
          </div>
        </header>

        {/* Global Connection Alert Banner */}
        {loadError && (
          <div id="admin-connection-error-alert" className="admin-connection-alert" role="alert">
            <i className="admin-alert-icon">warning</i>
            <div className="admin-alert-copy">
              <strong>Database Connection Warning:</strong>
              <span>{loadError}</span>
            </div>
            <Link to="/admin/settings" className="admin-alert-action">
              <span>Fix in Settings</span>
              <i>arrow_forward</i>
            </Link>
          </div>
        )}

        {/* Page Outlet Router */}
        <main id="admin-content-view" className="admin-content-outlet">
          <Outlet />
        </main>

        {/* Mobile Floating Bottom Bar */}
        <nav id="admin-mobile-bottom-bar" className="admin-bottom-nav" aria-label="Admin mobile navigation">
          {BOTTOM_NAV_ITEMS.map(item => {
            const active = item.path ? isActive(item.path) : mobileOpen
            if (item.more) {
              return (
                <button
                  key={item.label}
                  type="button"
                  className={`admin-bottom-item ${active ? 'active' : ''}`}
                  onClick={() => setMobileOpen(true)}
                  aria-label="Open full admin menu"
                  aria-expanded={mobileOpen}
                >
                  <span className="admin-bottom-pill"><i>{item.icon}</i></span>
                  <span className="admin-bottom-label">{item.label}</span>
                </button>
              )
            }
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`admin-bottom-item ${active ? 'active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                <span className="admin-bottom-pill"><i>{item.icon}</i></span>
                <span className="admin-bottom-label">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

