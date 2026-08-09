import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { createLookupToken, limitRequest, parseJsonBody } from './_lib/security.js'

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('Missing STRIPE_SECRET_KEY configuration')
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
}

function getSupabaseAdmin() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase server configuration')
  }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function getPublicSiteUrl() {
  const value = process.env.PUBLIC_SITE_URL
  if (!value) throw new Error('Missing PUBLIC_SITE_URL configuration')
  const url = new URL(value)
  if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
    throw new Error('PUBLIC_SITE_URL must use HTTPS in production')
  }
  return url.origin
}

function validateCartItems(items) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) return false
  const ids = new Set()
  return items.every(item => {
    if (!item || typeof item.id !== 'string' || item.id.length === 0 || item.id.length > 120) return false
    if (ids.has(item.id) || typeof item.qty !== 'number' || !Number.isInteger(item.qty) || item.qty < 1 || item.qty > 99) return false
    ids.add(item.id)
    return true
  })
}

function validateShipping(shipping) {
  if (!shipping || typeof shipping !== 'object' || Array.isArray(shipping)) return false
  const required = ['name', 'email', 'address', 'city', 'state', 'zip']
  if (!required.every(key => typeof shipping[key] === 'string' && shipping[key].trim().length > 0)) return false
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shipping.email)) return false
  return ['name', 'email', 'phone', 'address', 'city', 'state', 'zip'].every(key => {
    const value = shipping[key] || ''
    return typeof value === 'string' && value.length <= 200
  })
}

function money(value) {
  return Math.round(value * 100) / 100
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const body = parseJsonBody(req)
    const { items, shipping, idempotencyKey } = body || {}
    const requestKey = typeof idempotencyKey === 'string' && /^[A-Za-z0-9_-]{16,128}$/.test(idempotencyKey)
      ? idempotencyKey
      : null
    const rate = await limitRequest(req, 'checkout', { limit: 5, windowSeconds: 60, identifier: shipping?.email || '', requireShared: process.env.NODE_ENV === 'production' })
    if (rate.unavailable) return res.status(503).json({ error: 'Checkout is temporarily unavailable. Please try again later.' })
    if (!rate.success) return res.status(429).json({ error: 'Too many requests. Please wait and try again.' })
    if (!requestKey) return res.status(400).json({ error: 'Invalid checkout request.' })

    if (!validateCartItems(items)) return res.status(400).json({ error: 'Invalid cart items.' })
    if (!validateShipping(shipping)) return res.status(400).json({ error: 'Invalid shipping information.' })

    const supabase = getSupabaseAdmin()
    const ids = items.map(item => item.id)
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('id,name,price,stock,active')
      .in('id', ids)

    if (productError) throw productError
    const productsById = new Map((products || []).map(product => [product.id, product]))
    const trustedItems = items.map(item => {
      const product = productsById.get(item.id)
      if (!product || !product.active || product.stock < item.qty || !Number.isFinite(Number(product.price)) || Number(product.price) < 0) {
        throw new Error('Item unavailable')
      }
      return {
        id: product.id,
        name: product.name,
        price: money(Number(product.price)),
        qty: item.qty,
      }
    })

    const subtotal = money(trustedItems.reduce((sum, item) => sum + item.price * item.qty, 0))
    const shippingCost = subtotal >= 35 ? 0 : 5.99
    const tax = money(subtotal * 0.085)
    const total = money(subtotal + shippingCost + tax)
    const lookup = createLookupToken()
    const stripe = getStripe()
    const siteUrl = getPublicSiteUrl()

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: trustedItems.map(item => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
            metadata: { kind: 'product', product_id: item.id },
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.qty,
      })).concat(shippingCost > 0 ? [{
        price_data: { currency: 'usd', product_data: { name: 'Shipping', metadata: { kind: 'shipping' } }, unit_amount: Math.round(shippingCost * 100) },
        quantity: 1,
      }] : []).concat([{
        price_data: { currency: 'usd', product_data: { name: 'Tax', metadata: { kind: 'tax' } }, unit_amount: Math.round(tax * 100) },
        quantity: 1,
      }]),
      customer_email: shipping.email,
      phone_number_collection: { enabled: true },
      shipping_address_collection: { allowed_countries: ['US'] },
      metadata: {
        lookup_token_hash: lookup.hash,
        lookup_token_expires_at: lookup.expiresAt,
      },
      success_url: `${siteUrl}/order-success?lookup_token=${encodeURIComponent(lookup.token)}`,
      cancel_url: `${siteUrl}/cart`,
    }, requestKey ? { idempotencyKey: requestKey } : undefined)

    return res.status(200).json({ url: session.url })
  } catch (error) {
    if (error.message === 'Item unavailable') return res.status(409).json({ error: 'One or more items are unavailable. Please refresh your cart.' })
    if (error.message === 'Request too large' || error.message === 'Invalid request body') return res.status(400).json({ error: 'Invalid checkout request.' })
    if (error instanceof SyntaxError) return res.status(400).json({ error: 'Invalid checkout request.' })
    console.error('create-checkout-session error:', error.message)
    return res.status(500).json({ error: 'Unable to start checkout. Please try again.' })
  }
}
