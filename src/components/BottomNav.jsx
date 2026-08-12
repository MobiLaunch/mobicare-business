import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useCartStore } from '../lib/store'
import { useAuth } from '../lib/AuthContext'

export default function BottomNav() {
  const location = useLocation()
  const cartCount = useCartStore(s => s.items.reduce((n, i) => n + i.qty, 0))
  const cartDrawerOpen = useCartStore(s => s.cartDrawerOpen)
  const setCartDrawerOpen = useCartStore(s => s.setCartDrawerOpen)
  const { user } = useAuth()

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  const LINK_TABS = [
    { to: '/', label: 'Home', icon: 'home' },
    { to: '/shop', label: 'Shop', icon: 'storefront' },
    { to: '/repairs', label: 'Repairs', icon: 'build' },
    { to: '/about', label: 'About', icon: 'info' },
  ]

  const accountPath = user ? '/account' : '/login'
  const accountActive = isActive('/account') || isActive('/login')
  const accountLabel = user ? 'Account' : 'Sign In'

  return (
    <div role="navigation" className="bottom-nav-google" aria-label="Primary">
      {/* Route Links */}
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

      {/* Cart Drawer Trigger */}
      <button
        type="button"
        className="bottom-nav-item bottom-nav-cart-btn"
        onClick={() => setCartDrawerOpen(!cartDrawerOpen)}
        aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ''}`}
        style={{
          background: 'transparent',
          border: 'none',
          padding: 0,
          color: 'inherit',
          cursor: 'pointer',
        }}
      >
        <span className={`bottom-nav-pill ${cartDrawerOpen ? 'bottom-nav-pill-active' : ''}`}>
          <i className={cartDrawerOpen ? 'primary-text' : 'on-surface-variant-text'}>
            shopping_cart
          </i>
          {cartCount > 0 && (
            <span className="bottom-nav-badge">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
        </span>
        <span className={`bottom-nav-label ${cartDrawerOpen ? 'primary-text' : 'on-surface-variant-text'}`}>
          Cart
        </span>
      </button>

      {/* Account Route Link */}
      <Link
        to={accountPath}
        className="bottom-nav-item"
        aria-current={accountActive ? 'page' : undefined}
      >
        <span className={`bottom-nav-pill ${accountActive ? 'bottom-nav-pill-active' : ''}`}>
          <i className={accountActive ? 'primary-text' : 'on-surface-variant-text'}>
            account_circle
          </i>
        </span>
        <span className={`bottom-nav-label ${accountActive ? 'primary-text' : 'on-surface-variant-text'}`}>
          {accountLabel}
        </span>
      </Link>
    </div>
  )
}