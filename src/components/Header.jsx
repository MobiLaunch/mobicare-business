import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useSiteStore } from '../lib/siteStore'
import { useCartStore } from '../lib/store'
import { useAuth } from '../lib/AuthContext'
import BookingWizard from './BookingWizard'
import CartDrawer from './CartDrawer'
import localLogo from '../assets/mobicare-logo.svg'

// Stable fallback reference to prevent infinite re-render loops in Zustand
const EMPTY_CART = []

export default function Header() {
  const [bookingOpen, setBookingOpen] = useState(false)

  const location = useLocation()
  const siteStore = useSiteStore()

  const brand = siteStore?.brand
  const appearance = siteStore?.appearance
  const setColorScheme = siteStore?.setColorScheme

  // Cart state comes from the same store used by BottomNav and CartDrawer.
  const cart = useCartStore(s => s.items) || EMPTY_CART
  const cartDrawerOpen = useCartStore(s => s.cartDrawerOpen)
  const setCartDrawerOpen = useCartStore(s => s.setCartDrawerOpen)

  const theme = appearance?.colorScheme || 'dark'
  const logoSrc = appearance?.logoUrl || localLogo
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    document.body.classList.remove('dark', 'light')
    document.body.classList.add(theme)
  }, [theme])

  const isActive = (path) =>
    path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(path)

  const navLinks = [
    { to: '/', label: 'Home', icon: 'home' },
    { to: '/shop', label: 'Shop', icon: 'storefront' },
    { to: '/repairs', label: 'Repairs', icon: 'build' },
    { to: '/about', label: 'About', icon: 'info' },
  ]

  const accountLabel = authLoading
    ? 'Account'
    : user
      ? user.user_metadata?.full_name?.split(' ')[0] || 'Account'
      : 'Sign In'

  const accountPath = user ? '/account' : '/login'
  const accountActive = isActive('/account')

  const cartItemCount = cart.reduce(
    (total, item) => total + (item?.quantity || 1),
    0,
  )

  // Use the same cart state/action as BottomNav and CartDrawer.
  const handleCartClick = () => {
    setCartDrawerOpen(!cartDrawerOpen)
  }

  return (
    <>
      <header
        className="fixed top left right surface-container-highest z-50 glass-header"
        style={{
          padding: '0.5rem clamp(0.5rem, 2vw, 1.25rem)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
            alignItems: 'center',
            gap: '0.5rem',
            width: '100%',
            minWidth: 0,
          }}
        >
          {/* LEFT: Theme Toggle & Desktop Nav */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              justifySelf: 'start',
              minWidth: 0,
            }}
          >
            {/* Theme Toggle */}
            <button
              id="theme-toggle-button"
              type="button"
              className="circle transparent no-margin"
              style={{
                width: '44px',
                height: '44px',
                minWidth: '44px',
                padding: 0,
                margin: 0,
                display: 'grid',
                placeItems: 'center',
                alignSelf: 'center',
                flexShrink: 0,
                lineHeight: 1,
              }}
              onClick={() =>
                setColorScheme && setColorScheme(theme === 'dark' ? 'light' : 'dark')
              }
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              <i>{theme === 'dark' ? 'light_mode' : 'dark_mode'}</i>
            </button>

            {/* Desktop Navigation (including Cart button) */}
            <nav
              className="surface-variant round small-padding l"
              aria-label="Primary navigation"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                minWidth: 0,
              }}
            >
              {navLinks.map(({ to, label, icon }) => {
                const active = isActive(to)

                return (
                  <Link
                    key={to}
                    to={to}
                    className={`button ${active ? 'primary' : 'transparent'
                      } round no-margin`}
                    style={{
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                    }}
                    aria-current={active ? 'page' : undefined}
                  >
                    <i>{icon}</i>
                    <span>{label}</span>
                  </Link>
                )
              })}

              {/* Desktop Cart Button embedded in Nav */}
              <button
                id="header-cart-button"
                type="button"
                className="button transparent round no-margin"
                onClick={handleCartClick}
                style={{
                  position: 'relative',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
                title="Open Shopping Cart"
                aria-label={`Open Shopping Cart${cartItemCount > 0 ? `, ${cartItemCount} items` : ''
                  }`}
              >
                <i>shopping_bag</i>
                <span>Cart</span>
                {cartItemCount > 0 && (
                  <span
                    className="badge circle error"
                    style={{
                      position: 'absolute',
                      top: '0.1rem',
                      left: '0.1rem',
                      minWidth: '1.1rem',
                      height: '1.1rem',
                      padding: '0 0.2rem',
                      fontSize: '0.7rem',
                      lineHeight: 1,
                      margin: 0,
                      display: 'grid',
                      placeItems: 'center',
                      zIndex: 2,
                    }}
                  >
                    {cartItemCount}
                  </span>
                )}
              </button>
            </nav>
          </div>

          {/* CENTER: Logo */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 0,
              maxWidth: '100%',
            }}
          >
            <Link
              id="header-brand-logo-link"
              to="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                minWidth: 0,
                maxWidth: '100%',
                textDecoration: 'none',
                color: 'inherit',
              }}
              aria-label={brand?.name || 'Mobicare Device Recovery'}
            >
              {appearance?.logoType === 'image' ? (
                <img
                  src={logoSrc}
                  className="circle small"
                  alt={appearance.logoAlt || brand?.name || 'Logo'}
                  style={{
                    display: 'block',
                    width: '32px',
                    height: '32px',
                    minWidth: '32px',
                    objectFit: 'contain',
                  }}
                />
              ) : (
                <span
                  className="circle small primary"
                  aria-hidden="true"
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    width: '32px',
                    minWidth: '32px',
                    height: '32px',
                  }}
                >
                  <i>bolt</i>
                </span>
              )}

              <strong
                className="primary-text bold large-text m l"
                style={{
                  letterSpacing: '-0.02em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 'min(42vw, 360px)',
                }}
              >
                {brand?.name || 'Mobicare Device Recovery'}
              </strong>
            </Link>
          </div>

          {/* RIGHT: Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.375rem',
              justifySelf: 'end',
              minWidth: 0,
            }}
          >
            {/* Book Appointment */}
            <button
              id="header-book-appointment-btn"
              type="button"
              className="primary button round no-margin bold"
              onClick={() => setBookingOpen(true)}
              title="Book Appointment"
              style={{
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              <i>calendar_today</i>
              <span className="l">Book Appointment</span>
            </button>

            {/* Account Link */}
            <Link
              id="header-account-button"
              to={accountPath}
              className={`button ${accountActive ? 'secondary-container' : 'transparent'
                } round no-margin l`}
              title={user ? 'My Account' : 'Sign in'}
              aria-label={user ? 'My Account' : 'Sign in'}
              style={{
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              <i>account_circle</i>
              <span>{accountLabel}</span>
            </Link>
          </div>
        </div>
      </header>

      <CartDrawer />

      {bookingOpen && (
        <BookingWizard onClose={() => setBookingOpen(false)} />
      )}
    </>
  )
}