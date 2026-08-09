import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { buffer } from 'micro'

export const config = { api: { bodyParser: false } }

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

async function getTrustedLineItems(stripe, session) {
  const result = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 100,
    expand: ['data.price.product'],
  })
  if (!result.data?.length || result.data.length > 52) throw new Error('Invalid checkout item data')

  const items = []
  let shippingCents = 0
  let taxCents = 0
  for (const lineItem of result.data) {
    const product = lineItem.price?.product
    const kind = product && typeof product === 'object' ? product.metadata?.kind : null
    const amount = lineItem.price?.unit_amount
    const quantity = lineItem.quantity
    if (!Number.isInteger(amount) || amount < 0 || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      throw new Error('Invalid checkout item data')
    }
    if (kind === 'shipping') {
      if (quantity !== 1) throw new Error('Invalid checkout shipping data')
      shippingCents += amount
    } else if (kind === 'tax') {
      if (quantity !== 1) throw new Error('Invalid checkout tax data')
      taxCents += amount
    } else if (kind === 'product' && product.metadata?.product_id && typeof product.name === 'string') {
      items.push({
        id: product.metadata.product_id,
        name: product.name,
        price: amount / 100,
        qty: quantity,
      })
    } else {
      throw new Error('Invalid checkout item data')
    }
  }
  if (!items.length || items.length > 50) throw new Error('Invalid checkout item data')
  return { items, shippingCents, taxCents }
}

function money(value) {
  return Math.round(value * 100) / 100
}

async function persistOrder(supabase, stripe, session) {
  const metadata = session.metadata || {}
  const customerDetails = session.customer_details || {}
  const shippingDetails = session.shipping_details || customerDetails
  const address = shippingDetails.address || customerDetails.address || {}
  const { items, shippingCents, taxCents } = await getTrustedLineItems(stripe, session)
  const subtotal = money(items.reduce((sum, item) => sum + item.price * item.qty, 0))
  const expectedShippingCents = subtotal >= 35 ? 0 : 599
  const expectedTaxCents = Math.round(subtotal * 8.5)
  const expectedTotalCents = Math.round(subtotal * 100) + expectedShippingCents + expectedTaxCents

  if (
    session.payment_status !== 'paid' ||
    shippingCents !== expectedShippingCents ||
    taxCents !== expectedTaxCents ||
    session.amount_total !== expectedTotalCents
  ) {
    throw new Error('Checkout amount could not be reconciled')
  }

  const supabaseOrder = {
    stripe_payment_intent_id: session.payment_intent,
    stripe_checkout_session_id: session.id,
    lookup_token_hash: metadata.lookup_token_hash || null,
    lookup_token_expires_at: metadata.lookup_token_expires_at || null,
    status: 'paid',
    customer_name: shippingDetails.name || customerDetails.name || '',
    customer_email: session.customer_email || customerDetails.email || '',
    customer_phone: customerDetails.phone || '',
    shipping_address: [address.line1, address.line2].filter(Boolean).join(', '),
    shipping_city: address.city || '',
    shipping_state: address.state || '',
    shipping_zip: address.postal_code || '',
    subtotal,
    shipping_cost: expectedShippingCents / 100,
    tax: expectedTaxCents / 100,
    total: expectedTotalCents / 100,
  }

  let { data: order, error: orderError } = await supabase
    .from('orders')
    .upsert(supabaseOrder, { onConflict: 'stripe_checkout_session_id', ignoreDuplicates: true })
    .select('id')
    .maybeSingle()

  if (orderError) throw orderError
  if (!order) {
    const existingResult = await supabase.from('orders').select('id').eq('stripe_checkout_session_id', session.id).single()
    if (existingResult.error) throw existingResult.error
    order = existingResult.data
  }

  const lineItems = items.map(item => ({
    order_id: order.id,
    product_id: item.id,
    name: item.name,
    price: item.price,
    qty: item.qty,
  }))
  const { error: itemsError } = await supabase
    .from('order_items')
    .upsert(lineItems, { onConflict: 'order_id,product_id' })
  if (itemsError) throw itemsError

  return order
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let event
  try {
    const rawBody = await buffer(req)
    const signature = req.headers['stripe-signature']
    event = getStripe().webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (error) {
    console.error('Webhook signature verification failed:', error.message)
    return res.status(400).json({ error: 'Webhook signature verification failed' })
  }

  if (event.type !== 'checkout.session.completed') return res.status(200).json({ received: true })

  try {
    const stripe = getStripe()
    const order = await persistOrder(getSupabaseAdmin(), stripe, event.data.object)
    console.log('Order reconciled from Stripe webhook:', order.id)
    return res.status(200).json({ received: true })
  } catch (error) {
    console.error('Failed to reconcile Stripe order:', error.message)
    return res.status(500).json({ error: 'Failed to record order' })
  }
}
