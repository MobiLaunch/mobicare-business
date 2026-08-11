import { createClient } from '@supabase/supabase-js'
import { limitRequest, parseJsonBody } from './_lib/security.js'

const fields = [
  ['service', 120],
  ['deviceType', 120],
  ['deviceModel', 160],
  ['issue', 1000],
  ['date', 80],
  ['time', 40],
  ['name', 160],
  ['phone', 40],
  ['email', 200],
  ['notes', 1000],
]

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

function text(value, maxLength) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const body = parseJsonBody(req, 12_000)
    const rate = await limitRequest(req, 'booking', { limit: 3, windowSeconds: 300, identifier: body?.email || body?.phone || '', requireShared: process.env.NODE_ENV === 'production' })
    if (rate.unavailable) return res.status(503).json({ error: 'Booking is temporarily unavailable. Please try again later.' })
    if (!rate.success) return res.status(429).json({ error: 'Too many requests. Please wait before trying again.' })

    if (!body || typeof body !== 'object' || !fields.every(([key, maxLength]) => {
      if (key === 'issue' || key === 'notes') return body[key] === undefined || body[key] === '' || text(body[key], maxLength)
      return text(body[key], maxLength)
    })) {
      return res.status(400).json({ error: 'Please provide all required booking information.' })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return res.status(400).json({ error: 'Please provide a valid email address.' })

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      console.error('create-booking: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing.')
      return res.status(503).json({ error: 'Booking is temporarily unavailable. Please call us to schedule.' })
    }

    const { error } = await supabase.from('bookings').insert({
      service: body.service.trim(),
      device_type: body.deviceType.trim(),
      device_model: body.deviceModel.trim(),
      issue: body.issue?.trim() || '',
      appt_date: body.date.trim(),
      appt_time: body.time.trim(),
      customer_name: body.name.trim(),
      customer_phone: body.phone.trim(),
      customer_email: body.email.trim().toLowerCase(),
      notes: body.notes?.trim() || '',
      status: 'pending',
    })
    if (error) {
      console.error('create-booking database error:', error.code, error.message, error.details || '', error.hint || '')
      return res.status(500).json({ error: 'Unable to save booking. Please try again or call us.' })
    }

    return res.status(201).json({ ok: true })
  } catch (error) {
    if (error.message === 'Request too large' || error.message === 'Invalid request body' || error instanceof SyntaxError) {
      return res.status(400).json({ error: 'Invalid booking request.' })
    }
    console.error('create-booking error:', error.message)
    return res.status(500).json({ error: 'Unable to submit booking right now.' })
  }
}
