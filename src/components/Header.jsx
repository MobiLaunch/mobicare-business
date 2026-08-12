import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useSiteStore } from '../lib/siteStore'
import { useAuth } from '../lib/AuthContext'
import BookingWizard from './BookingWizard'
import CartDrawer from './CartDrawer'
import localLogo from '../assets/mobicare-logo.svg'

export default function Header() {
  const [bookingOpen, setBookingOpen] = useState(false)

  const location = useLocation()
  const brand = useSiteStore(s => s.brand)
  const appearance = useSiteStore(s => s.appearance)
  const setColorScheme = useSiteStore(s => s.setColorScheme)

  // Cart store integration (falls back safely if structured in siteStore or cart store)
  const cart = useSiteStore(s => s.cart || s.cartItems || [])
  const toggleCart = useSiteStore(s => s.toggleCart || s.openCart || (() => {
    window.dispatchEvent(new CustomEvent('open-cart'))
  }))

  const theme = appearance?.colorScheme || 'dark'
  const logoSrc = appearance?.logoUrl || localLogo
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    document.body.className = theme
  }, [theme])

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  const navLinks = [
    { to: '/', label: 'Home', icon: 'home' },
    { to: '/shop', label: 'Shop', icon: 'storefront' },
    { to: '/repairs', label: 'Repairs', icon: 'build' },
    { to: '/about', label: 'About', icon: 'info' },
  ]

  const accountLabel = authLoading
    ? 'Account'
    : user
      ? (user.user_metadata?.full_name?.split(' ')[0] || 'Account')
      : 'Sign In'

  const accountPath = user ? '/account' : '/login'
  const accountActive = isActive('/account')
  const cartItemCount = cart.reduce((total, item) => total + (item.quantity || 1), 0)

  return (
    <>
      <header
        className="fixed top left right surface-container-highest z-50 glass-header"
        style={{ padding: '0.5rem 1.25rem' }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            width: '100%',
          }}
        >
          {/* ─── LEFT: Theme Toggle + Desktop Nav Links ────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifySelf: 'start' }}>
            <button
              id="theme-toggle-button"
              type="button"
              className="circle transparent no-margin"
              onClick={() => setColorScheme(theme === 'dark' ? 'light' : 'dark')}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              <i>{theme === 'dark' ? 'light_mode' : 'dark_mode'}</i>
            </button>

            {/* Desktop Navigation Links (Desktop Only) */}
            <div className="surface-variant round small-padding l" style={{ display: 'flex', gap: '0.25rem' }}>
              {navLinks.map(({ to, label, icon }) => {
                const active = isActive(to)
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`button ${active ? 'primary' : 'transparent'} round no-margin`}
                    style={{ textDecoration: 'none' }}
                  >
                    <i>{icon}</i>
                    <span>{label}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* ─── CENTER: Logo & Wordmark ───────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0 }}>
            <Link
              id="header-brand-logo-link"
              to="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                textDecoration: 'none',
                color: 'inherit',
                whiteSpace: 'nowrap',
              }}
              aria-label={`${brand?.name || 'Mobicare Device Recovery'}`}
            >
              {appearance?.logoType === 'image' ? (
                <img
                  className="circle small"
                  src={logoSrc}
                  alt={appearance.logoAlt || brand?.name || 'Logo'}
                  style={{ height: '32px', width: '32px', minWidth: '32px', objectFit: 'contain' }}
                />
              ) : (
                <button
                  type="button"
                  className="circle small primary no-margin"
                  tabIndex={-1}
                  style={{ pointerEvents: 'none' }}
                >
                  <i>bolt</i>
                </button>
              )}
              <strong
                className="primary-text bold large-text m l"
                style={{ letterSpacing: '-0.02em' }}
              >
                {brand?.name || 'Mobicare Device Recovery'}
              </strong>
            </Link>
          </div>

          {/* ─── RIGHT: Shopping Cart, Book Appointment & Desktop Account ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifySelf: 'end' }}>
            {/* Shopping Cart Action Button */}
            <button
              id="header-cart-button"
              type="button"
              className={`header-cart-action ${cartItemCount > 0 ? 'header-cart-action-filled' : ''}`}
              onClick={typeof toggleCart === 'function' ? toggleCart : () => { }}
              title="Open Shopping Cart"
              aria-label="Open Shopping Cart"
            >
              <i>shopping_bag</i>
              {cartItemCount > 0 && (
                <span className="badge circle error header-cart-badge">{cartItemCount}</span>
              )}
            </button>

            {/* Book Appointment CTA */}
            <button
              id="header-book-appointment-btn"
              type="button"
              className="primary button round no-margin bold shadow"
              onClick={() => setBookingOpen(true)}
              title="Book Appointment"
            >
              <i>calendar_today</i>
              <span className="l">Book Appointment</span>
            </button>

            {/* Desktop Account Button (Hidden on Mobile/Tablet since it is in BottomNav) */}
            <Link
              id="header-account-button"
              to={accountPath}
              className={`button ${accountActive ? 'secondary-container' : 'transparent'} round no-margin l`}
              title={user ? 'My Account' : 'Sign in'}
              aria-label={user ? 'My Account' : 'Sign in'}
              style={{ textDecoration: 'none' }}
            >
              <i>account_circle</i>
              <span>{accountLabel}</span>
            </Link>
          </div>
        </div>
      </header>

      <CartDrawer />
      {bookingOpen && <BookingWizard onClose={() => setBookingOpen(false)} />}
    </>
  )
}