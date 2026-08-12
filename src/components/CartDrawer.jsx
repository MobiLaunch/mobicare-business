import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCartStore, useToastStore, useProductStore } from '../lib/store'
import { getClient } from '../lib/supabase'

/**
 * CartDrawer – Full checkout experience in a slide-over drawer.
 *
 * Desktop:  Anchored right side panel that morphs width per step.
 * Mobile:   Full-screen slide-up drawer.
 *
 * Steps: cart → shipping → payment → processing
 */
export default function CartDrawer() {
  const navigate = useNavigate()
  const { items, removeItem, updateQty, cartDrawerOpen, setCartDrawerOpen } = useCartStore()
  const products = useProductStore(s => s.products)
  const addToast = useToastStore(s => s.add)

  const [step, setStep] = useState('cart')
  const [shippingInfo, setShippingInfo] = useState({
    name: '', email: '', phone: '', address: '', city: '', state: '', zip: ''
  })
  const [payError, setPayError] = useState('')
  const checkoutRequestIdRef = useRef(null)
  const panelRef = useRef(null)

  const cartCount = items.reduce((n, i) => n + i.qty, 0)
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
  const shipping = subtotal >= 35 ? 0 : 5.99
  const tax = subtotal * 0.085
  const total = subtotal + shipping + tax

  // Reset step when drawer closes
  useEffect(() => {
    if (!cartDrawerOpen) {
      // Small delay so the close animation plays before resetting
      const t = setTimeout(() => setStep('cart'), 300)
      return () => clearTimeout(t)
    }
  }, [cartDrawerOpen])

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (cartDrawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [cartDrawerOpen])

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') setCartDrawerOpen(false)
    }
    if (cartDrawerOpen) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [cartDrawerOpen, setCartDrawerOpen])

  const closeDrawer = () => setCartDrawerOpen(false)

  const handleUpdateField = (k, v) => setShippingInfo(f => ({ ...f, [k]: v }))

  const handleProceedToShipping = () => {
    if (items.length === 0) return
    setStep('shipping')
  }

  const handleProceedToPayment = () => {
    const { name, email, address, city, state, zip } = shippingInfo
    if (!name || !email || !address || !city || !state || !zip) {
      addToast('Please fill in all required fields', 'error')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      addToast('Please enter a valid email address', 'error')
      return
    }
    checkoutRequestIdRef.current = null
    setStep('payment')
  }

  const handleStripeCheckout = async () => {
    setStep('processing')
    setPayError('')
    try {
      checkoutRequestIdRef.current ||= crypto.randomUUID()
      const sb = getClient()
      const { data: { session } } = sb?.auth
        ? await sb.auth.getSession()
        : { data: { session: null } }

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({
          items: items.map(i => ({ id: i.id, qty: i.qty })),
          shipping: shippingInfo,
          idempotencyKey: checkoutRequestIdRef.current,
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.url) throw new Error(data.error || 'Unable to start checkout')
      window.location.href = data.url
    } catch (err) {
      console.error(err)
      setPayError(err.message || 'Payment processing error. Please try again.')
      setStep('payment')
    }
  }

  // Step indicator data
  const stepLabels = ['Cart', 'Shipping', 'Payment']
  const stepIndex = ['cart', 'shipping', 'payment'].indexOf(step)

  // Determine drawer width class per step
  const stepWidthClass = step === 'shipping' || step === 'payment' ? 'cart-drawer-wide' : ''

  return (
    <>
      {/* Overlay */}
      <div
        id="cart-drawer-overlay"
        className={`cart-drawer-overlay ${cartDrawerOpen ? 'cart-drawer-overlay-visible' : ''}`}
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <aside
        id="cart-drawer-panel"
        ref={panelRef}
        className={`cart-drawer-panel ${cartDrawerOpen ? 'cart-drawer-open' : ''} ${stepWidthClass}`}
        role="dialog"
        aria-label="Shopping Cart"
        aria-modal="true"
      >
        {/* Header */}
        <div id="cart-drawer-header" className="cart-drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="material-symbols-outlined primary-text" style={{ fontSize: 22 }}>shopping_bag</i>
            <strong style={{ fontSize: 16 }}>
              {step === 'cart' && 'Your Cart'}
              {step === 'shipping' && 'Shipping'}
              {step === 'payment' && 'Payment'}
              {step === 'processing' && 'Processing'}
            </strong>
            {step === 'cart' && (
              <span className="chip small primary-container" style={{ fontSize: 11 }}>
                {cartCount} {cartCount === 1 ? 'item' : 'items'}
              </span>
            )}
          </div>
          <button
            id="cart-drawer-close-btn"
            type="button"
            className="circle transparent"
            onClick={closeDrawer}
            aria-label="Close cart"
            style={{ width: 36, height: 36 }}
          >
            <i className="material-symbols-outlined" style={{ fontSize: 20 }}>close</i>
          </button>
        </div>

        {/* Step Indicator (visible after cart step) */}
        {step !== 'processing' && items.length > 0 && (
          <div id="cart-drawer-stepper" className="cart-drawer-stepper">
            {stepLabels.map((label, i) => (
              <React.Fragment key={label}>
                <div className="cart-drawer-step-item">
                  <span
                    className={`cart-drawer-step-num ${stepIndex >= i ? 'cart-drawer-step-active' : ''}`}
                  >
                    {stepIndex > i ? '✓' : i + 1}
                  </span>
                  <span className={`cart-drawer-step-label ${stepIndex >= i ? 'cart-drawer-step-label-active' : ''}`}>
                    {label}
                  </span>
                </div>
                {i < stepLabels.length - 1 && (
                  <div className={`cart-drawer-step-line ${stepIndex > i ? 'cart-drawer-step-line-done' : ''}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* ─── Step: Cart ─── */}
        {step === 'cart' && (
          <div id="cart-drawer-cart-step" className="cart-drawer-body">
            {items.length === 0 ? (
              <div className="cart-drawer-empty">
                <i className="material-symbols-outlined on-surface-variant-text" style={{ fontSize: 52, opacity: 0.35 }}>
                  shopping_cart
                </i>
                <p style={{ margin: '12px 0 18px', fontSize: 15, color: 'var(--on-surface-variant)' }}>
                  Your cart is empty
                </p>
                <button
                  id="cart-drawer-explore-btn"
                  type="button"
                  className="primary fill round"
                  style={{ padding: '10px 24px', fontSize: 14 }}
                  onClick={() => { closeDrawer(); navigate('/shop') }}
                >
                  Explore Shop
                </button>
              </div>
            ) : (
              <>
                <div className="cart-drawer-items">
                  {items.map(item => (
                    <div id={`cart-drawer-item-${item.id}`} key={item.id} className="cart-drawer-item-row">
                      <img
                        src={item.images?.[0] || 'https://images.unsplash.com/photo-1609592179791-5b2f37d4c6e1?w=120&q=80'}
                        alt={item.name}
                        className="cart-drawer-thumb"
                      />
                      <div className="cart-drawer-item-info">
                        <span className="cart-drawer-item-name">{item.name}</span>
                        <span className="cart-drawer-item-price">${(item.price * item.qty).toFixed(2)}</span>
                        <div className="cart-drawer-qty-row">
                          <button
                            type="button"
                            className="cart-drawer-qty-btn"
                            onClick={() => updateQty(item.id, item.qty - 1, item.stock)}
                          >
                            −
                          </button>
                          <span className="cart-drawer-qty-num">{item.qty}</span>
                          <button
                            type="button"
                            className="cart-drawer-qty-btn"
                            onClick={() => updateQty(item.id, item.qty + 1, products.find(p => p.id === item.id)?.stock ?? item.stock)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="cart-drawer-remove-btn"
                        onClick={() => removeItem(item.id)}
                        title="Remove"
                      >
                        <i className="material-symbols-outlined" style={{ fontSize: 18 }}>delete_outline</i>
                      </button>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="cart-drawer-footer">
                  <div className="cart-drawer-subtotal-row">
                    <span>Subtotal</span>
                    <strong style={{ fontSize: 17 }}>${subtotal.toFixed(2)}</strong>
                  </div>
                  {subtotal < 35 ? (
                    <p className="cart-drawer-shipping-hint">
                      Add <strong>${(35 - subtotal).toFixed(2)}</strong> more for <strong>FREE Shipping</strong>!
                    </p>
                  ) : (
                    <p className="cart-drawer-shipping-hint" style={{ color: 'var(--primary)' }}>
                      ✓ Qualified for <strong>FREE Shipping</strong>!
                    </p>
                  )}
                  <button
                    id="cart-drawer-checkout-btn"
                    type="button"
                    className="primary fill round cart-drawer-main-btn"
                    onClick={handleProceedToShipping}
                  >
                    <i className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</i>
                    <span>Proceed to Checkout</span>
                  </button>
                  <button
                    id="cart-drawer-continue-btn"
                    type="button"
                    className="border round cart-drawer-secondary-btn"
                    onClick={closeDrawer}
                  >
                    Continue Shopping
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── Step: Shipping ─── */}
        {step === 'shipping' && (
          <div id="cart-drawer-shipping-step" className="cart-drawer-body cart-drawer-form-body">
            <div className="cart-drawer-form-scroll">
              <h3 className="cart-drawer-section-title">Shipping Information</h3>

              <div className="cart-drawer-form-grid">
                <div className="cart-drawer-field cart-drawer-field-full">
                  <div className="field label border round">
                    <input placeholder=" " value={shippingInfo.name} onChange={e => handleUpdateField('name', e.target.value)} />
                    <label>Full Name *</label>
                  </div>
                </div>
                <div className="cart-drawer-field cart-drawer-field-half">
                  <div className="field label border round">
                    <input type="email" placeholder=" " value={shippingInfo.email} onChange={e => handleUpdateField('email', e.target.value)} />
                    <label>Email *</label>
                  </div>
                </div>
                <div className="cart-drawer-field cart-drawer-field-half">
                  <div className="field label border round">
                    <input type="tel" placeholder=" " value={shippingInfo.phone} onChange={e => handleUpdateField('phone', e.target.value)} />
                    <label>Phone</label>
                  </div>
                </div>
                <div className="cart-drawer-field cart-drawer-field-full">
                  <div className="field label border round">
                    <input placeholder=" " value={shippingInfo.address} onChange={e => handleUpdateField('address', e.target.value)} />
                    <label>Street Address *</label>
                  </div>
                </div>
                <div className="cart-drawer-field cart-drawer-field-third">
                  <div className="field label border round">
                    <input placeholder=" " value={shippingInfo.city} onChange={e => handleUpdateField('city', e.target.value)} />
                    <label>City *</label>
                  </div>
                </div>
                <div className="cart-drawer-field cart-drawer-field-third">
                  <div className="field label border round">
                    <input placeholder=" " value={shippingInfo.state} onChange={e => handleUpdateField('state', e.target.value)} />
                    <label>State *</label>
                  </div>
                </div>
                <div className="cart-drawer-field cart-drawer-field-third">
                  <div className="field label border round">
                    <input placeholder=" " value={shippingInfo.zip} onChange={e => handleUpdateField('zip', e.target.value)} />
                    <label>ZIP Code *</label>
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <h3 className="cart-drawer-section-title" style={{ marginTop: 24 }}>Order Summary</h3>
              <div className="cart-drawer-order-summary">
                {items.map(item => (
                  <div key={item.id} className="cart-drawer-summary-item">
                    <span className="cart-drawer-summary-name">
                      {item.name} <em>×{item.qty}</em>
                    </span>
                    <span className="cart-drawer-summary-price">${(item.price * item.qty).toFixed(2)}</span>
                  </div>
                ))}
                <div className="cart-drawer-summary-divider" />
                <div className="cart-drawer-summary-item">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="cart-drawer-summary-item">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? <strong className="primary-text">FREE</strong> : `$${shipping.toFixed(2)}`}</span>
                </div>
                <div className="cart-drawer-summary-item">
                  <span>Tax (8.5%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="cart-drawer-summary-divider" />
                <div className="cart-drawer-summary-item cart-drawer-summary-total">
                  <strong>Total</strong>
                  <strong className="primary-text">${total.toFixed(2)}</strong>
                </div>
              </div>
            </div>

            <div className="cart-drawer-footer">
              <button
                id="cart-drawer-to-payment-btn"
                type="button"
                className="primary fill round cart-drawer-main-btn"
                onClick={handleProceedToPayment}
              >
                <span>Continue to Payment</span>
                <i className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</i>
              </button>
              <button
                type="button"
                className="border round cart-drawer-secondary-btn"
                onClick={() => setStep('cart')}
              >
                ← Back to Cart
              </button>
            </div>
          </div>
        )}

        {/* ─── Step: Payment ─── */}
        {step === 'payment' && (
          <div id="cart-drawer-payment-step" className="cart-drawer-body cart-drawer-form-body">
            <div className="cart-drawer-form-scroll">
              <h3 className="cart-drawer-section-title">Secure Payment</h3>

              <div className="cart-drawer-stripe-info">
                <i className="material-symbols-outlined" style={{ fontSize: 28, flexShrink: 0 }}>lock</i>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, flex: 1 }}>
                  You'll be redirected to <strong>Stripe's secure checkout</strong> to enter your card details.
                  We never see or store your card information.
                </p>
              </div>

              {payError && (
                <div className="cart-drawer-pay-error">
                  <i className="material-symbols-outlined" style={{ fontSize: 18 }}>error</i>
                  <span>{payError}</span>
                </div>
              )}

              {/* Shipping review */}
              <div className="cart-drawer-shipping-review">
                <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700 }}>Shipping to:</h4>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>
                  {shippingInfo.name}<br />
                  {shippingInfo.address}<br />
                  {shippingInfo.city}, {shippingInfo.state} {shippingInfo.zip}<br />
                  {shippingInfo.email}
                </p>
              </div>

              {/* Total */}
              <div className="cart-drawer-payment-total">
                <span>Order Total</span>
                <strong className="primary-text" style={{ fontSize: 22 }}>${total.toFixed(2)}</strong>
              </div>
            </div>

            <div className="cart-drawer-footer">
              <button
                id="cart-drawer-stripe-btn"
                type="button"
                className="primary fill round cart-drawer-main-btn"
                onClick={handleStripeCheckout}
              >
                <i className="material-symbols-outlined" style={{ fontSize: 18 }}>lock</i>
                <span>Pay with Stripe — ${total.toFixed(2)}</span>
              </button>
              <button
                type="button"
                className="border round cart-drawer-secondary-btn"
                onClick={() => setStep('shipping')}
              >
                ← Back to Shipping
              </button>
            </div>
          </div>
        )}

        {/* ─── Step: Processing ─── */}
        {step === 'processing' && (
          <div id="cart-drawer-processing-step" className="cart-drawer-body">
            <div className="cart-drawer-processing">
              <progress className="circle large" />
              <h3 style={{ marginTop: 20, fontSize: '1.3rem', fontWeight: 700 }}>Redirecting to Stripe…</h3>
              <p className="on-surface-variant-text" style={{ margin: 0, fontSize: 14 }}>Please don't close this page.</p>
            </div>
          </div>
        )}

        {/* Security footer */}
        <div className="cart-drawer-security-footer">
          <i className="material-symbols-outlined" style={{ fontSize: 14 }}>lock</i>
          <span>Secured by Stripe · 256-bit SSL</span>
        </div>
      </aside>
    </>
  )
}