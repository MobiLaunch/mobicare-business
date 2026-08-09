import { createClient } from '@supabase/supabase-js'
import { hashLookupToken, limitRequest, setNoStore, verifyLookupToken } from './_lib/security.js'

function getSupabaseAdmin() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase server configuration')
  }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export default async function handler(req, res) {
  setNoStore(res)
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const token = typeof req.query.lookup_token === 'string' ? req.query.lookup_token : ''
  try {
    if (!verifyLookupToken(token)) return res.status(404).json({ error: 'Order not found' })
  } catch (error) {
    console.error('order-status token configuration error:', error.message)
    return res.status(503).json({ error: 'Order status is temporarily unavailable.' })
  }

  const rate = await limitRequest(req, 'order-status', { limit: 20, windowSeconds: 300, requireShared: process.env.NODE_ENV === 'production' })
  if (rate.unavailable) return res.status(503).json({ error: 'Order status is temporarily unavailable.' })
  if (!rate.success) return res.status(429).json({ error: 'Too many requests. Please try again later.' })

  try {
    const { data: order, error } = await getSupabaseAdmin()
      .from('orders')
      .select('id,status,total,customer_name,customer_email,created_at,order_items(name,price,qty)')
      .eq('lookup_token_hash', hashLookupToken(token))
      .gt('lookup_token_expires_at', new Date().toISOString())
      .maybeSingle()

    if (error) throw error
    if (!order) return res.status(202).json({ pending: true, message: 'Order is being processed. Please refresh in a few seconds.' })

    return res.status(200).json({
      order: {
        id: order.id,
        status: order.status,
        total: Number(order.total || 0),
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        created_at: order.created_at,
        items: (order.order_items || []).map(item => ({
          name: item.name,
          price: Number(item.price || 0),
          qty: item.qty,
        })),
      },
    })
  } catch (error) {
    console.error('order-status error:', error.message)
    return res.status(500).json({ error: 'Unable to retrieve order' })
  }
}
