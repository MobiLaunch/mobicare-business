import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useCartStore } from '../lib/store'
import { useSiteStore } from '../lib/siteStore'
import BookingWizard from './BookingWizard'
import localLogo from '../assets/mobicare-logo.svg'

export default function Header() {
  const [bookingOpen, setBookingOpen] = useState(false)
  const cartCount = useCartStore(s => s.items.reduce((n, i) => n + i.qty, 0))
  const navigate = useNavigate()
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

  // Primary nav now lives in the bottom bar on mobile (Gmail/Meet pattern);
  // the top bar keeps just the desktop links + always-visible actions.
  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/shop', label: 'Shop' },
    { to: '/repairs', label: 'Repairs' },
    { to: '/about', label: 'About' },
  ]

  return (
    <>
      {/* Glassmorphism header per DESIGN.md — translucent over page background */}
      <header className="fixed glass-header" style={{ zIndex: 900 }}>
        <nav style={{ maxWidth: 1440, margin: '0 auto', width: '100%' }}>
          {/* Logo */}
          <Link to="/" className="no-margin site-logo-link" aria-label={`${brand.name} home`}>
            {appearance?.logoType === 'image'
              ? <img className="site-logo-image" src={logoSrc} alt={appearance.logoAlt || brand.name} />
              : <i className="primary-text extra">bolt</i>
            }
            <strong className="primary-text site-logo-wordmark">{brand.name}</strong>
          </Link>

          <div className="max" />

          {/* Desktop nav links — underline style on active, hidden below 600px
              since the bottom nav takes over primary navigation on mobile */}
          <div className="row m l" style={{ gap: 24 }}>
            {navLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                style={{
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: isActive(to) ? 700 : 500,
                  color: isActive(to) ? 'var(--primary)' : 'var(--on-surface-variant)',
                  borderBottom: isActive(to) ? '2px solid var(--primary)' : '2px solid transparent',
                  paddingBottom: 4,
                }}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Theme toggle */}
          <label className="switch icon" title="Toggle theme">
            <input
              type="checkbox"
              checked={theme === 'dark'}
              onChange={() => setColorScheme(theme === 'dark' ? 'light' : 'dark')}
            />
            <span>
              <i>{theme === 'dark' ? 'dark_mode' : 'light_mode'}</i>
            </span>
          </label>

          {/* Cart — pill capsule + floating numeric badge, matching the
              Google-apps reference (Gmail unread-count style) */}
          <button
            onClick={() => navigate('/cart')}
            title="Cart"
            aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ''}`}
            className={`header-cart-action${cartCount > 0 ? ' header-cart-action-filled' : ''}`}
          >
            <i className={cartCount > 0 ? 'on-secondary-container-text' : 'primary-text'}>shopping_cart</i>
            {cartCount > 0 && (
              <span className="bottom-nav-badge header-cart-badge">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>

          {/* Book CTA — pill, filled primary. Icon-only on mobile to save
              space since the bottom nav now handles the rest of primary nav. */}
          <button className="primary round" onClick={() => setBookingOpen(true)} style={{ borderRadius: 999 }}>
            <i>calendar_today</i>
            <span className="book-cta-label">Book Appointment</span>
          </button>
        </nav>
      </header>

      {bookingOpen && <BookingWizard onClose={() => setBookingOpen(false)} />}
    </>
  )
}
