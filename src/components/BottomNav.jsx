import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useCartStore } from '../lib/store'

// Google-apps-style bottom nav (Gmail/Meet pattern):
// - Fixed to viewport bottom, only visible on small screens (mobile "s" size)
// - Active tab: pill-shaped highlight capsule behind the icon (the
//   signature Google "active indicator"), plus a color change on the
//   icon and label. Icon glyph and label font-weight stay fixed between
//   states — only color changes — so nothing shifts width when tapped.
// - A badge (count) can float on any tab's icon, matching the floating
//   notification badge pattern in Gmail/Meet.
export default function BottomNav() {
  const location = useLocation()
  const navigate  = useNavigate()
  const cartCount = useCartStore(s => s.items.reduce((n, i) => n + i.qty, 0))

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  const TABS = [
    { to: '/',        label: 'Home',    icon: 'home',          badge: null },
    { to: '/shop',    label: 'Shop',    icon: 'storefront',    badge: null },
    { to: '/repairs', label: 'Repairs', icon: 'build',         badge: null },
    { to: '/cart',    label: 'Cart',    icon: 'shopping_cart', badge: cartCount > 0 ? cartCount : null },
    { to: '/about',   label: 'About',   icon: 'info',          badge: null },
  ]

  return (
    <nav className="s bottom-nav-google" aria-label="Primary">
      {TABS.map(tab => {
        const active = isActive(tab.to)
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className="bottom-nav-item"
            aria-current={active ? 'page' : undefined}
          >
            <span className={`bottom-nav-pill ${active ? 'bottom-nav-pill-active' : ''}`}>
              <i className={active ? 'primary-text' : 'on-surface-variant-text'}>
                {tab.icon}
              </i>
              {tab.badge != null && (
                <span className="bottom-nav-badge">
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              )}
            </span>
            <span
              className={`bottom-nav-label ${active ? 'primary-text' : 'on-surface-variant-text'}`}
            >
              {tab.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
