import React, { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSiteStore } from '../lib/siteStore'
import { useCartStore } from '../lib/store'
import PageMeta from '../components/PageMeta'

const MAX_POLL_ATTEMPTS = 8
const POLL_INTERVAL_MS = 1500

export default function OrderSuccess() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const business = useSiteStore(s => s.business)
  const clearCart = useCartStore(s => s.clearCart)

  const lookupToken = searchParams.get('lookup_token')
  const [order, setOrder] = useState(null)
  const [status, setStatus] = useState(lookupToken ? 'loading' : 'no-session')
  const attemptsRef = useRef(0)
  const clearedRef = useRef(false)

  useEffect(() => {
    if (!lookupToken) return

    let cancelled = false

    const poll = async () => {
      try {
        const res = await fetch(`/api/order-status?lookup_token=${encodeURIComponent(lookupToken)}`)
        const data = await res.json()

        if (cancelled) return

        if (res.status === 202 || data.pending) {
          // Webhook hasn't finished processing yet — retry briefly
          attemptsRef.current += 1
          if (attemptsRef.current < MAX_POLL_ATTEMPTS) {
            setTimeout(poll, POLL_INTERVAL_MS)
          } else {
            setStatus('timeout')
          }
          return
        }

        if (!res.ok) {
          setStatus('error')
          return
        }

        setOrder(data.order)
        setStatus('confirmed')

        // Only clear the cart once payment is genuinely confirmed —
        // never optimistically, so a failed/abandoned checkout leaves
        // the cart intact for the customer to retry.
        if (!clearedRef.current) {
          clearCart()
          clearedRef.current = true
        }
      } catch (err) {
        if (!cancelled) setStatus('error')
      }
    }

    poll()
    return () => { cancelled = true }
  }, [lookupToken])

  return (
    <div className="page-top responsive center-align" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <PageMeta title="Order Status | Mobicare" description="Your order confirmation." />

      <article className="padding" style={{ maxWidth: 480, width: '100%' }}>

        {status === 'no-session' && (
          <>
            <i className="on-surface-variant-text extra">inventory_2</i>
            <h4>No order found</h4>
            <p className="on-surface-variant-text">
              This page shows your order confirmation after checkout. If you completed a
              purchase, check your email for confirmation.
            </p>
            <button className="primary" onClick={() => navigate('/shop')}>
              <i>arrow_forward</i><span>Continue Shopping</span>
            </button>
          </>
        )}

        {status === 'loading' && (
          <>
            <progress className="circle large" />
            <h5 style={{ marginTop: 16 }}>Confirming your payment…</h5>
            <p className="on-surface-variant-text">This usually takes just a few seconds.</p>
          </>
        )}

        {status === 'timeout' && (
          <>
            <i className="orange-text extra">inventory_2</i>
            <h4>Almost there</h4>
            <p className="on-surface-variant-text">
              Your payment was received by Stripe, but we're still finalizing your order
              details. You'll receive an email confirmation shortly — no need to try
              paying again.
            </p>
            <button className="primary" onClick={() => navigate('/')}>
              <i>home</i><span>Back to Home</span>
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <i className="error-text extra">inventory_2</i>
            <h4>Something went wrong</h4>
            <p className="on-surface-variant-text">
              We couldn't confirm your order status. If you were charged, don't worry —
              contact us and we'll sort it out right away.
            </p>
            <a href={`tel:${business.phone}`} className="border">
              <i>call</i><span>Call {business.phone}</span>
            </a>
          </>
        )}

        {status === 'confirmed' && order && (
          <>
            <i className="green-text extra">check_circle</i>
            <h4>Order Confirmed!</h4>
            <p className="on-surface-variant-text" style={{ marginBottom: 20 }}>
              Thank you for your purchase. We've received your payment and your order
              is being prepared.
            </p>

            <div className="surface-container-high round padding" style={{ textAlign: 'left', marginBottom: 20 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="on-surface-variant-text">Order ID</span>
                <strong>#{order.id?.slice(0, 8).toUpperCase()}</strong>
              </div>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="on-surface-variant-text">Customer</span>
                <strong>{order.customer_name}</strong>
              </div>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="on-surface-variant-text">Email</span>
                <strong>{order.customer_email}</strong>
              </div>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="on-surface-variant-text">Total</span>
                <strong>${order.total?.toFixed(2)}</strong>
              </div>
            </div>

            <div className="row wrap" style={{ gap: 8, justifyContent: 'center' }}>
              <button className="primary" onClick={() => navigate('/shop')}>
                <span>Continue Shopping</span><i>arrow_forward</i>
              </button>
              <button className="border" onClick={() => navigate('/')}>
                <i>home</i><span>Home</span>
              </button>
            </div>
          </>
        )}

        <p className="on-surface-variant-text" style={{ fontSize: 12, marginTop: 24 }}>
          <i style={{ fontSize: 14, verticalAlign: 'middle' }}>mail</i> A confirmation
          email is sent automatically. Questions? Contact us at {business.email}
        </p>
      </article>
    </div>
  )
}
