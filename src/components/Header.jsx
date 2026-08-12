import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useCartStore } from '../lib/store'
import { useSiteStore } from '../lib/siteStore'
import BookingWizard from './BookingWizard'
import CartDrawer from './CartDrawer'
import localLogo from '../assets/mobicare-logo.svg'

export default function Header() {
  const [bookingOpen, setBookingOpen] = useState(false)

  const items = useCartStore(s => s.items)
  const cartDrawerOpen = useCartStore(s => s.cartDrawerOpen)
  const setCartDrawerOpen = useCartStore(s => s.setCartDrawerOpen)
  const cartCount = items.reduce((n, i) => n + i.qty, 0)

  const location = useLocation()
  const brand = useSiteStore(s => s.brand)
  const appearance = useSiteStore(s => s.appearance)
  const setColorScheme = useSiteStore(s => s.setColorScheme)
  const theme = appearance?.colorScheme || 'dark'
  const logoSrc = appearance?.logoUrl || localLogo

  // Keep <body> class in sync with theme
  useEffect(() => {
    document.body.className = theme
  }, [theme])

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  const handleCartClick = () => {
    setCartDrawerOpen(!cartDrawerOpen)
  }

  // Desktop navigation items
  const navLinks = [
    { to: '/', label: 'Home', icon: 'home' },
    { to: '/shop', label: 'Shop', icon: 'storefront' },
    { to: '/repairs', label: 'Repairs', icon: 'build' },
    { to: '/about', label: 'About', icon: 'info' },
  ]

  return (
    <div id="main-header-wrapper" className="header-wrapper">
      {/* Glassmorphism header — translucent over page background */}
      <header id="site-main-header" className="fixed glass-header" style={{ zIndex: 900 }}>
        <div id="header-inner-nav" className="header-inner-container">

          {/* 1. Left: Brand Logo */}
          <Link id="header-brand-logo-link" to="/" className="no-margin site-logo-link" aria-label={`${brand.name} home`}>
            {appearance?.logoType === 'image' ? (
              <img className="site-logo-image" src={logoSrc} alt={appearance.logoAlt || brand.name} />
            ) : (
              <div id="header-brand-icon-dot" className="site-logo-icon-dot">
                <i className="material-symbols-outlined">bolt</i>
              </div>
            )}
            <strong id="header-brand-wordmark" className="primary-text site-logo-wordmark">
              {brand.name}
            </strong>
          </Link>

          {/* 2. Center: Desktop Nav Capsule */}
          <div id="desktop-header-nav-group" className="glass-nav-pill-group desktop-only-nav">
            {navLinks.map(({ to, label, icon }) => {
              const active = isActive(to)
              return (
                <Link
                  id={`desktop-nav-link-${label.toLowerCase()}`}
                  key={to}
                  to={to}
                  className={`glass-nav-item ${active ? 'active' : ''}`}
                >
                  <i className="material-symbols-outlined">{icon}</i>
                  <span>{label}</span>
                </Link>
              )
            })}
          </div>

          {/* 3. Right: Header Action Controls */}
          <div id="header-right-actions-group" className="header-actions-right">
            {/* Theme Toggle Button */}
            <button
              id="theme-toggle-button"
              type="button"
              className="theme-toggle-btn"
              onClick={() => setColorScheme(theme === 'dark' ? 'light' : 'dark')}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              <span
                id="theme-toggle-icon-container"
                className="theme-toggle-icon-wrap"
                aria-hidden="true"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 24,
                  height: 24,
                  minWidth: 24,
                  padding: 0,
                  margin: 0,
                  background: 'transparent',
                  border: 0,
                  borderRadius: 0,
                  boxShadow: 'none',
                  lineHeight: 1,
                  overflow: 'visible',
                }}
              >
                <i
                  className="material-symbols-outlined"
                  style={{
                    display: 'block',
                    width: '1em',
                    height: '1em',
                    margin: 0,
                    lineHeight: 1,
                    fontSize: 20,
                  }}
                >
                  {theme === 'dark' ? 'dark_mode' : 'light_mode'}
                </i>
              </span>
              <span id="theme-toggle-label" className="theme-toggle-text">{theme === 'dark' ? 'Dark' : 'Light'}</span>
            </button>

            {/* Cart Button */}
            <button
              id="header-cart-button"
              onClick={handleCartClick}
              title="Cart"
              aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ''}`}
              className={`header-cart-action${cartCount > 0 ? ' header-cart-action-filled' : ''}`}
            >
              <i className="material-symbols-outlined primary-text">shopping_cart</i>
              {cartCount > 0 && (
                <span id="header-cart-count-badge" className="bottom-nav-badge header-cart-badge">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>

            {/* Book Appointment CTA */}
            <button
              id="header-book-appointment-btn"
              className="primary round header-book-cta"
              onClick={() => setBookingOpen(true)}
            >
              <i className="material-symbols-outlined">calendar_today</i>
              <span className="book-cta-label">Book Appointment</span>
            </button>
          </div>

        </div>
      </header>

      {/* Cart Drawer */}
      <CartDrawer />

      {bookingOpen && <BookingWizard onClose={() => setBookingOpen(false)} />}
    </div>
  )
}