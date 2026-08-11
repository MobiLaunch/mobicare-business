import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addDays, format } from 'date-fns'
import { useCartStore, useToastStore, useProductStore } from '../lib/store'
import PageMeta from '../components/PageMeta'

function ArrivalEstimate({ shippingDays }) {
  if (!shippingDays) return null
  const minDate = format(addDays(new Date(), shippingDays.min + 1), 'MMM d')
  const maxDate = format(addDays(new Date(), shippingDays.max + 1), 'MMM d')
  return (
    <span className="on-surface-variant-text" style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <i style={{ fontSize: 14 }}>local_shipping</i> Est. {minDate}–{maxDate}
    </span>
  )
}

export default function Cart() {
  const navigate = useNavigate()
  const { items, removeItem, updateQty } = useCartStore()
  const products = useProductStore(s => s.products)
  const addToast = useToastStore(s => s.add)

  const [checkoutStep, setCheckoutStep] = useState('cart')
  const [shippingInfo, setShippingInfo] = useState({
    name: '', email: '', phone: '', address: '', city: '', state: '', zip: ''
  })
  const checkoutRequestIdRef = useRef(null)
  const [payError, setPayError] = useState('')

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
  const shipping = subtotal >= 35 ? 0 : 5.99
  const tax = subtotal * 0.085
  const total = subtotal + shipping + tax

  const maxShipping = items.reduce((max, item) => {
    const d = item.shippingDays || { min: 3, max: 7 }
    return { min: Math.max(max.min, d.min), max: Math.max(max.max, d.max) }
  }, { min: 0, max: 0 })

  const estMin = format(addDays(new Date(), maxShipping.min + 1), 'EEEE, MMMM d')
  const estMax = format(addDays(new Date(), maxShipping.max + 1), 'EEEE, MMMM d')

  const handleUpdateField = (k, v) => setShippingInfo(f => ({ ...f, [k]: v }))

  const handleProceedToShipping = () => {
    if (items.length === 0) return
    setCheckoutStep('shipping')
    window.scrollTo(0, 0)
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
    setCheckoutStep('payment')
    window.scrollTo(0, 0)
  }

  const handleStripeCheckout = async () => {
    setCheckoutStep('processing')
    setPayError('')
    try {
      checkoutRequestIdRef.current ||= crypto.randomUUID()
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      setCheckoutStep('payment')
    }
  }

  if (items.length === 0 && checkoutStep === 'cart') return (
    <div className="page-top center-align" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
      <PageMeta title="Your Cart | Mobicare Device Recovery" description="View your shopping cart, manage items, and checkout securely." />
      <div className="surface-container-high circle" style={{ width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <i className="primary-text" style={{ fontSize: 40 }}>shopping_cart</i>
      </div>
      <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 700, margin: '0 0 8px' }}>Your cart is empty</h2>
      <p className="on-surface-variant-text" style={{ fontSize: 16, margin: '0 0 24px', maxWidth: 400 }}>Browse our accessories and find what you need.</p>
      <button className="primary round fill" onClick={() => navigate('/shop')} style={{ padding: '10px 24px', fontWeight: 600, maxWidth: '100%' }}>
        <span>Shop Now</span><i>arrow_forward</i>
      </button>
    </div>
  )

  const steps = ['Cart', 'Shipping', 'Payment']
  const stepIndex = ['cart', 'shipping', 'payment'].indexOf(checkoutStep)

  return (
    <main
      className="page-top responsive"
      style={{
        paddingLeft: 'clamp(12px, 3vw, 24px)',
        paddingRight: 'clamp(12px, 3vw, 24px)',
        paddingBottom: 48,
        overflowX: 'hidden',
        maxWidth: '100%',
        boxSizing: 'border-box'
      }}
    >
      <PageMeta title="Your Cart | Mobicare Device Recovery" description="View your shopping cart, manage items, and checkout securely." />

      {/* Stepper Navigation */}
      <nav className="row wrap center-align" style={{ justifyContent: 'center', marginBottom: 32, gap: 12 }}>
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <div className="row middle-align" style={{ gap: 8 }}>
              <span
                className={`chip round small ${stepIndex >= i ? 'primary' : 'surface-container-high'}`}
                style={{
                  minWidth: 28,
                  height: 28,
                  justifyContent: 'center',
                  fontWeight: 700,
                  border: stepIndex >= i ? 'none' : '1px solid var(--outline-variant)'
                }}
              >
                {i + 1}
              </span>
              <span className={stepIndex >= i ? 'bold' : 'on-surface-variant-text'} style={{ fontSize: 14 }}>{s}</span>
            </div>
            {i < steps.length - 1 && <span className="on-surface-variant-text" style={{ margin: '0 4px', opacity: 0.5 }}>—</span>}
          </React.Fragment>
        ))}
      </nav>

      <div className="grid" style={{ gap: 24 }}>
        {/* Left Column: Flow Content */}
        <div className="s12 m7" style={{ minWidth: 0 }}>
          {checkoutStep === 'cart' && (
            <>
              <h2 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2rem)', fontWeight: 700, margin: '0 0 20px' }}>
                Your Cart ({items.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                {items.map(item => (
                  <article key={item.id} className="surface-container-low" style={{ borderRadius: 20, border: '1px solid var(--outline-variant)', overflow: 'hidden' }}>
                    <div className="row middle-align wrap padding" style={{ gap: 16 }}>
                      <img src={item.images?.[0]} alt={item.name} style={{ width: 72, height: 72, borderRadius: 14, objectFit: 'cover', flexShrink: 0 }} />

                      <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                        <p style={{ fontWeight: 700, fontSize: 15, margin: '0 0 4px', overflowWrap: 'break-word' }}>{item.name}</p>
                        <p className="on-surface-variant-text" style={{ fontSize: 14, margin: '0 0 6px', fontWeight: 600 }}>${item.price.toFixed(2)}</p>
                        <ArrivalEstimate shippingDays={item.shippingDays} />
                      </div>

                      <div className="row middle-align wrap" style={{ gap: 12, flex: '1 1 200px', maxWidth: '100%', justifyContent: 'space-between' }}>
                        <div className="row middle-align border round surface-container-high" style={{ padding: '2px 4px', height: 40, flexShrink: 0 }}>
                          <button className="circle transparent small" onClick={() => updateQty(item.id, item.qty - 1)}><i>remove</i></button>
                          <span style={{ minWidth: 24, textAlign: 'center', fontSize: 14, fontWeight: 600 }}>{item.qty}</span>
                          <button className="circle transparent small" onClick={() => updateQty(item.id, item.qty + 1, products.find(p => p.id === item.id)?.stock ?? item.stock)}><i>add</i></button>
                        </div>
                        <strong style={{ minWidth: 60, textAlign: 'right', fontSize: 16 }}>${(item.price * item.qty).toFixed(2)}</strong>
                        <button className="circle transparent small" onClick={() => removeItem(item.id)}><i>close</i></button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {/* Fixed Proceed to Shipping button */}
              <button
                className="primary round fill"
                style={{
                  fontWeight: 600,
                  minHeight: 48,
                  height: 'auto',
                  padding: '12px 20px',
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
                onClick={handleProceedToShipping}
              >
                <span>Proceed to Shipping</span>
                <i style={{ flexShrink: 0 }}>arrow_forward</i>
              </button>
            </>
          )}

          {checkoutStep === 'shipping' && (
            <>
              <h2 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2rem)', fontWeight: 700, margin: '0 0 20px' }}>
                Shipping Information
              </h2>
              <div className="grid" style={{ rowGap: 16, columnGap: 16, marginBottom: 24 }}>
                <div className="s12 field label border round max" style={{ minWidth: 0 }}>
                  <input placeholder=" " value={shippingInfo.name} onChange={e => handleUpdateField('name', e.target.value)} />
                  <label>Full Name *</label>
                </div>
                <div className="s12 m6 field label border round max" style={{ minWidth: 0 }}>
                  <input type="email" placeholder=" " value={shippingInfo.email} onChange={e => handleUpdateField('email', e.target.value)} />
                  <label>Email *</label>
                </div>
                <div className="s12 m6 field label border round max" style={{ minWidth: 0 }}>
                  <input type="tel" placeholder=" " value={shippingInfo.phone} onChange={e => handleUpdateField('phone', e.target.value)} />
                  <label>Phone</label>
                </div>
                <div className="s12 field label border round max" style={{ minWidth: 0 }}>
                  <input placeholder=" " value={shippingInfo.address} onChange={e => handleUpdateField('address', e.target.value)} />
                  <label>Street Address *</label>
                </div>
                <div className="s12 m4 field label border round max" style={{ minWidth: 0 }}>
                  <input placeholder=" " value={shippingInfo.city} onChange={e => handleUpdateField('city', e.target.value)} />
                  <label>City *</label>
                </div>
                <div className="s6 m4 field label border round max" style={{ minWidth: 0 }}>
                  <input placeholder=" " value={shippingInfo.state} onChange={e => handleUpdateField('state', e.target.value)} />
                  <label>State *</label>
                </div>
                <div className="s6 m4 field label border round max" style={{ minWidth: 0 }}>
                  <input placeholder=" " value={shippingInfo.zip} onChange={e => handleUpdateField('zip', e.target.value)} />
                  <label>ZIP Code *</label>
                </div>
              </div>

              <div className="row wrap" style={{ gap: 12, width: '100%', maxWidth: '100%' }}>
                <button
                  className="border round"
                  onClick={() => setCheckoutStep('cart')}
                  style={{ minHeight: 48, height: 'auto', fontWeight: 600, flex: '1 1 160px', maxWidth: '100%', justifyContent: 'center', padding: '10px 16px', boxSizing: 'border-box' }}
                >
                  ← Back to Cart
                </button>
                <button
                  className="primary round fill"
                  onClick={handleProceedToPayment}
                  style={{ minHeight: 48, height: 'auto', fontWeight: 600, flex: '1 1 200px', maxWidth: '100%', justifyContent: 'center', padding: '10px 16px', boxSizing: 'border-box' }}
                >
                  <span>Continue to Payment</span><i>arrow_forward</i>
                </button>
              </div>
            </>
          )}

          {checkoutStep === 'payment' && (
            <>
              <h2 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2rem)', fontWeight: 700, margin: '0 0 20px' }}>
                Payment
              </h2>

              <div className="primary-container padding round row middle-align wrap" style={{ gap: 14, marginBottom: 20, borderRadius: 20 }}>
                <i style={{ fontSize: 28, flexShrink: 0 }}>lock</i>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, flex: 1, minWidth: 200, overflowWrap: 'break-word' }}>
                  You'll be redirected to <strong>Stripe's secure checkout</strong> to enter your card details.
                  We never see or store your card information.
                </p>
              </div>

              {payError && (
                <div className="error-container padding round" style={{ marginBottom: 20, fontSize: 14, borderRadius: 16 }}>
                  {payError}
                </div>
              )}

              <article className="surface-container-low" style={{ borderRadius: 20, border: '1px solid var(--outline-variant)', marginBottom: 24 }}>
                <div className="padding" style={{ padding: 20 }}>
                  <p style={{ margin: '0 0 8px', fontSize: 14, overflowWrap: 'break-word' }}>
                    <strong>Shipping to:</strong> {shippingInfo.name}, {shippingInfo.address}, {shippingInfo.city}, {shippingInfo.state} {shippingInfo.zip}
                  </p>
                  <p style={{ margin: 0, fontSize: 14, overflowWrap: 'break-word' }}>
                    <strong>Email:</strong> {shippingInfo.email}
                  </p>
                </div>
              </article>

              <div className="row wrap" style={{ gap: 12, width: '100%', maxWidth: '100%' }}>
                <button
                  className="border round"
                  onClick={() => setCheckoutStep('shipping')}
                  style={{ minHeight: 48, height: 'auto', fontWeight: 600, flex: '1 1 120px', maxWidth: '100%', justifyContent: 'center', padding: '10px 16px', boxSizing: 'border-box' }}
                >
                  ← Back
                </button>
                <button
                  className="primary round fill"
                  onClick={handleStripeCheckout}
                  style={{ minHeight: 48, height: 'auto', fontWeight: 700, flex: '2 1 220px', maxWidth: '100%', justifyContent: 'center', padding: '10px 16px', whiteSpace: 'normal', lineHeight: 1.3, boxSizing: 'border-box' }}
                >
                  <i style={{ flexShrink: 0 }}>lock</i>
                  <span style={{ overflowWrap: 'break-word', textAlign: 'center' }}>Continue to Stripe — ${total.toFixed(2)}</span>
                </button>
              </div>
            </>
          )}

          {checkoutStep === 'processing' && (
            <div className="center-align surface-container-low padding" style={{ padding: '60px 20px', borderRadius: 24, border: '1px solid var(--outline-variant)' }}>
              <progress className="circle large" />
              <h3 style={{ marginTop: 20, fontSize: '1.5rem', fontWeight: 700 }}>Redirecting to Stripe…</h3>
              <p className="on-surface-variant-text" style={{ margin: 0 }}>Please don't close or refresh this page.</p>
            </div>
          )}
        </div>

        {/* Right Column: Order Summary */}
        <div className="s12 m5" style={{ minWidth: 0 }}>
          <article className="surface-container-high" style={{ borderRadius: 28, border: '1px solid var(--outline-variant)' }}>
            <div className="padding" style={{ padding: 'clamp(20px, 3vw, 28px)' }}>
              <h3 style={{ marginTop: 0, marginBottom: 20, fontSize: '1.25rem', fontWeight: 700 }}>Order Summary</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                {items.map(item => (
                  <div key={item.id} className="row wrap" style={{ justifyContent: 'space-between', fontSize: 14, gap: 8 }}>
                    <span className="on-surface-variant-text" style={{ flex: 1, minWidth: 120, overflowWrap: 'break-word' }}>
                      {item.name} <em style={{ fontWeight: 600 }}>×{item.qty}</em>
                    </span>
                    <span style={{ fontWeight: 600 }}>${(item.price * item.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <hr className="divider-row" style={{ margin: '16px 0' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="on-surface-variant-text">Subtotal</span>
                  <span style={{ fontWeight: 600 }}>${subtotal.toFixed(2)}</span>
                </div>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="on-surface-variant-text">Shipping</span>
                  <span>{shipping === 0 ? <span className="primary-text bold">FREE</span> : `$${shipping.toFixed(2)}`}</span>
                </div>
                {shipping > 0 && (
                  <p className="primary-text" style={{ fontSize: 12, margin: 0, fontWeight: 600 }}>
                    Add ${(35 - subtotal).toFixed(2)} more for free shipping
                  </p>
                )}
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="on-surface-variant-text">Tax (8.5%)</span>
                  <span style={{ fontWeight: 600 }}>${tax.toFixed(2)}</span>
                </div>
              </div>

              <hr className="divider-row" style={{ margin: '16px 0' }} />

              <div className="row" style={{ justifyContent: 'space-between', fontSize: 18, fontWeight: 800, marginBottom: 20 }}>
                <span>Total</span>
                <span className="primary-text">${total.toFixed(2)}</span>
              </div>

              {items.length > 0 && (
                <div className="surface-container-low padding" style={{ borderRadius: 16, marginBottom: 16, border: '1px solid var(--outline-variant)' }}>
                  <div className="row middle-align wrap" style={{ gap: 10 }}>
                    <i className="primary-text" style={{ fontSize: 20 }}>local_shipping</i>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <strong style={{ fontSize: 13, display: 'block' }}>Estimated Arrival</strong>
                      <span className="on-surface-variant-text" style={{ fontSize: 12, overflowWrap: 'break-word' }}>{estMin} to {estMax}</span>
                    </div>
                  </div>
                </div>
              )}

              <p className="on-surface-variant-text" style={{ fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, margin: 0, fontWeight: 500 }}>
                <i style={{ fontSize: 16 }}>lock</i> Secured by Stripe · 256-bit SSL
              </p>
            </div>
          </article>
        </div>
      </div>
    </main>
  )
}
