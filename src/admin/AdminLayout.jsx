import React, { useState } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { useAdminStore, useProductStore } from '../lib/store'

const NAV_ITEMS = [
  { path: '/admin/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { path: '/admin/content', icon: 'language', label: 'Site Content' },
  { path: '/admin/products', icon: 'inventory_2', label: 'Products' },
  { path: '/admin/categories', icon: 'label', label: 'Categories' },
  { path: '/admin/orders', icon: 'shopping_bag', label: 'Orders' },
  { path: '/admin/bookings', icon: 'calendar_month', label: 'Bookings' },
  { path: '/admin/settings', icon: 'settings', label: 'Settings' },
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
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/admin/login') }
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`)
  const currentPage = NAV_ITEMS.find(item => isActive(item.path))?.label || 'Management Console'

  return (
    <div className="admin-shell">
      <div
        className={`admin-overlay ${mobileOpen ? 'open' : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      <aside className={`admin-sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="admin-brand-header">
          <div className="admin-brand-dot">
            <i className="admin-brand-icon">bolt</i>
          </div>
          <div className="admin-brand-copy">
            <strong>Mobicare</strong>
            <span className="chip small secondary-container admin-portal-chip">Admin Portal</span>
          </div>
          <button
            className="admin-sidebar-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <i>close</i>
          </button>
        </div>

        <div className="admin-sidebar-divider" />

        <nav className="admin-sidebar-nav" aria-label="Admin navigation">
          <span className="admin-nav-kicker">Workspace</span>
          {NAV_ITEMS.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`admin-nav-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <i className="admin-nav-icon">{item.icon}</i>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="admin-status-section">
          <span className="admin-nav-kicker">Connection</span>
          <div className="admin-status-card">
            <i className={`admin-status-icon ${usingSupabase ? 'connected' : loadError ? 'error' : ''}`}>
              {usingSupabase ? 'cloud_done' : loadError ? 'cloud_off' : 'storage'}
            </i>
            <span className={usingSupabase ? 'connected' : loadError ? 'error' : ''}>
              {usingSupabase ? 'Supabase Live' : loadError ? 'DB Error' : 'Local Mode'}
            </span>
          </div>
        </div>

        <div className="admin-sidebar-divider" />

        <div className="admin-sidebar-footer">
          <a href="/" target="_blank" rel="noreferrer" className="admin-nav-item">
            <i className="admin-nav-icon">open_in_new</i>
            <span>View Live Site</span>
          </a>
          <button className="admin-nav-item admin-signout" onClick={handleLogout}>
            <i className="admin-nav-icon">logout</i>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <div className="admin-main-wrapper">
        <header className="admin-header">
          <div className="admin-header-leading">
            <button
              className="admin-mobile-toggle"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              aria-expanded={mobileOpen}
            >
              <i>menu</i>
            </button>
            <div className="admin-header-title">
              <span className="admin-header-eyebrow">Mobicare Admin</span>
              <h1>{currentPage}</h1>
            </div>
          </div>

          <div className="admin-header-actions">
            <a href="/" target="_blank" rel="noreferrer" title="View live site" className="admin-header-link">
              <i>open_in_new</i>
              <span>Live site</span>
            </a>
            <span className="chip round small secondary-container admin-role-chip">Admin</span>
          </div>
        </header>

        {loadError && (
          <div className="admin-connection-alert" role="alert">
            <i>warning</i>
            <span>Supabase Error: {loadError}</span>
            <Link to="/admin/settings">Fix in Settings <i>arrow_forward</i></Link>
          </div>
        )}

        <main className="admin-content-outlet">
          <Outlet />
        </main>

        <nav className="admin-bottom-nav" aria-label="Admin mobile navigation">
          {BOTTOM_NAV_ITEMS.map(item => {
            const active = item.path ? isActive(item.path) : mobileOpen
            if (item.more) {
              return (
                <button
                  key={item.label}
                  type="button"
                  className={`admin-bottom-item ${active ? 'active' : ''}`}
                  onClick={() => setMobileOpen(true)}
                  aria-label="Open more admin navigation"
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
