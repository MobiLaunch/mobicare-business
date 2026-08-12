import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useCartStore } from '../lib/store'

// Google-apps-style bottom nav (Gmail/Meet pattern):
// - Fixed to viewport bottom, only visible on small screens (≤600px)
// - Active tab: pill-shaped highlight capsule behind the icon
// - Cart tab opens the CartDrawer instead of navigating to /cart
export default function BottomNav() {
  const location = useLocation()
  const cartCount = useCartStore(s => s.items.reduce((n, i) => n + i.qty, 0))
  const setCartDrawerOpen = useCartStore(s => s.setCartDrawerOpen)

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  const LINK_TABS = [
    { to: '/', label: 'Home', icon: 'home' },
    { to: '/shop', label: 'Shop', icon: 'storefront' },
    { to: '/repairs', label: 'Repairs', icon: 'build' },
    { to: '/about', label: 'About', icon: 'info' },
  ]

  return (
    <div role="navigation" className="bottom-nav-google" aria-label="Primary">
      {LINK_TABS.map(tab => {
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
            </span>
            <span className={`bottom-nav-label ${active ? 'primary-text' : 'on-surface-variant-text'}`}>
              {tab.label}
            </span>
          </Link>
        )
      })}

      {/* Cart tab — opens drawer instead of navigating */}
      <button
        type="button"
        className="bottom-nav-item bottom-nav-cart-btn"
        onClick={() => setCartDrawerOpen(true)}
        aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ''}`}
      >
        <span className={`bottom-nav-pill ${cartCount > 0 ? 'bottom-nav-pill-active' : ''}`}>
          <i className={cartCount > 0 ? 'primary-text' : 'on-surface-variant-text'}>
            shopping_cart
          </i>
          {cartCount > 0 && (
            <span className="bottom-nav-badge">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
        </span>
        <span className={`bottom-nav-label ${cartCount > 0 ? 'primary-text' : 'on-surface-variant-text'}`}>
          Cart
        </span>
      </button>
    </div>
  )
}