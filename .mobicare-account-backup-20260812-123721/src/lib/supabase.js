import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config'

// ─── Input sanitization (XSS prevention) ──────────────────────────────────
export function sanitizeInput(str) {
  if (typeof str !== 'string') return str
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

// ─── Supabase client ───────────────────────────────────────────────────────
// Priority: .env vars → localStorage (set via Settings page) → empty
// The Settings page lets admins configure credentials post-deployment without
// redeployment, by storing them in localStorage. Env vars take precedence.

let _client = null
let _clientUrl = null
let _clientKey = null

export function getSupabaseConfig() {
  // Env vars win; fall back to localStorage for settings-page-configured creds
  const url = SUPABASE_URL || localStorage.getItem('sb_url') || ''
  const anonKey = SUPABASE_ANON_KEY || localStorage.getItem('sb_anon_key') || ''
  return { url, anonKey }
}

export function isSupabaseConfigured() {
  const { url, anonKey } = getSupabaseConfig()
  return !!(url && anonKey && url.startsWith('https://') && anonKey.length > 20)
}

export function getClient() {
  if (!isSupabaseConfigured()) return null
  const { url, anonKey } = getSupabaseConfig()

  // Re-create only when credentials actually change
  if (_client && _clientUrl === url && _clientKey === anonKey) return _client

  _client = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })
  _clientUrl = url
  _clientKey = anonKey
  return _client
}

export function resetClient() {
  _client = null
  _clientUrl = null
  _clientKey = null
}

// ─── Supabase Auth (General / Admin) ───────────────────────────────────────
export async function signInWithEmail(email, password) {
  const sb = getClient()
  if (!sb) return { error: { message: 'Supabase not configured — enter credentials in Settings first.' } }
  const { data, error } = await sb.auth.signInWithPassword({ email, password })
  return { data, error }
}

export async function signOut() {
  const sb = getClient()
  if (!sb) return
  await sb.auth.signOut()
}

export async function getSession() {
  const sb = getClient()
  if (!sb) return null
  const { data } = await sb.auth.getSession()
  return data?.session ?? null
}

export async function getUser() {
  const sb = getClient()
  if (!sb) return null
  const { data } = await sb.auth.getUser()
  return data?.user ?? null
}

export async function updatePassword(newPassword) {
  const sb = getClient()
  if (!sb) return { error: { message: 'Supabase not configured' } }
  const { error } = await sb.auth.updateUser({ password: newPassword })
  return { error }
}

export async function sendPasswordReset(email) {
  const sb = getClient()
  if (!sb) return { error: { message: 'Supabase not configured' } }
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/admin/reset-password`,
  })
  return { error }
}

// ─── Customer Auth & Account Management ────────────────────────────────────
export async function signUpWithEmail(email, password, metadata = {}) {
  const sb = getClient()
  if (!sb) return { data: null, error: { message: 'Supabase not configured.' } }

  const { data, error } = await sb.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: {
        full_name: metadata.full_name || '',
        phone: metadata.phone || '',
      },
      emailRedirectTo: `${window.location.origin}/login`,
    },
  })

  return { data, error }
}

export async function getCurrentUser() {
  const sb = getClient()
  if (!sb) return null

  const { data, error } = await sb.auth.getUser()
  if (error) return null
  return data?.user ?? null
}

export async function getCustomerProfile(userId) {
  const sb = getClient()
  if (!sb || !userId) return { data: null, error: null }

  const { data, error } = await sb
    .from('profiles')
    .select('id, full_name, phone, created_at, updated_at')
    .eq('id', userId)
    .maybeSingle()

  return { data, error }
}

export async function updateCustomerProfile(userId, updates) {
  const sb = getClient()
  if (!sb || !userId) {
    return { data: null, error: { message: 'Supabase not configured.' } }
  }

  const payload = {
    full_name: updates.full_name?.trim() || '',
    phone: updates.phone?.trim() || '',
  }

  const { data, error } = await sb
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select()
    .single()

  return { data, error }
}

export async function sbFetchCustomerBookings(userId) {
  const sb = getClient()
  if (!sb || !userId) return { data: [], error: null }

  const { data, error } = await sb
    .from('bookings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return { data: data || [], error }
}

export async function sbFetchCustomerOrders(userId) {
  const sb = getClient()
  if (!sb || !userId) return { data: [], error: null }

  const { data, error } = await sb
    .from('orders')
    .select('*, order_items(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return { data: data || [], error }
}

export async function sendCustomerPasswordReset(email) {
  const sb = getClient()
  if (!sb) return { error: { message: 'Supabase not configured.' } }

  const { error } = await sb.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    {
      redirectTo: `${window.location.origin}/reset-password`,
    }
  )

  return { error }
}

export async function updateCustomerPassword(newPassword) {
  const sb = getClient()
  if (!sb) return { error: { message: 'Supabase not configured.' } }

  const { error } = await sb.auth.updateUser({
    password: newPassword,
  })

  return { error }
}

// ─── Connection test ───────────────────────────────────────────────────────
export async function testConnection() {
  const sb = getClient()
  if (!sb) return { ok: false, error: 'Not configured' }
  try {
    const { error } = await sb.from('categories').select('id').limit(1)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

// ─── Products ──────────────────────────────────────────────────────────────
export async function sbFetchProducts() {
  const sb = getClient(); if (!sb) return null
  const { data, error } = await sb.from('products').select('*').order('created_at', { ascending: false })
  if (error) { console.error('sbFetchProducts:', error); return null }
  return data.map(dbToProduct)
}

export async function sbInsertProduct(product) {
  const sb = getClient(); if (!sb) return null
  const { data, error } = await sb.from('products').insert(productToDb(product)).select().single()
  if (error) { console.error('sbInsertProduct:', error); return null }
  return dbToProduct(data)
}

export async function sbUpdateProduct(id, updates) {
  const sb = getClient(); if (!sb) return null
  const { error } = await sb.from('products').update(productToDb(updates)).eq('id', id)
  if (error) { console.error('sbUpdateProduct:', error); return null }
  return true
}

export async function sbDeleteProduct(id) {
  const sb = getClient(); if (!sb) return null
  const { error } = await sb.from('products').delete().eq('id', id)
  if (error) { console.error('sbDeleteProduct:', error); return null }
  return true
}

// ─── Categories ────────────────────────────────────────────────────────────
export async function sbFetchCategories() {
  const sb = getClient(); if (!sb) return null
  const { data, error } = await sb.from('categories').select('*').order('sort_order', { ascending: true })
  if (error) { console.error('sbFetchCategories:', error); return null }
  return data.map(dbToCategory)
}

export async function sbInsertCategory(cat) {
  const sb = getClient(); if (!sb) return null
  const { data, error } = await sb.from('categories').insert(categoryToDb(cat)).select().single()
  if (error) { console.error('sbInsertCategory:', error); return null }
  return dbToCategory(data)
}

export async function sbUpdateCategory(id, updates) {
  const sb = getClient(); if (!sb) return null
  const { error } = await sb.from('categories').update(categoryToDb(updates)).eq('id', id)
  if (error) { console.error('sbUpdateCategory:', error); return null }
  return true
}

export async function sbDeleteCategory(id) {
  const sb = getClient(); if (!sb) return null
  const { error } = await sb.from('categories').delete().eq('id', id)
  if (error) { console.error('sbDeleteCategory:', error); return null }
  return true
}

// ─── Orders ────────────────────────────────────────────────────────────────
export async function sbFetchOrders() {
  const sb = getClient(); if (!sb) return null
  const { data, error } = await sb.from('orders').select('*, order_items(*)').order('created_at', { ascending: false })
  if (error) { console.error('sbFetchOrders:', error); return null }
  return data.map(dbToOrder)
}

export async function sbInsertOrder(order) {
  const sb = getClient(); if (!sb) return null
  const { data: orderRow, error: orderErr } = await sb.from('orders').insert({
    id: order.id,
    customer_name: order.customer?.name || '',
    customer_email: order.customer?.email || '',
    customer_phone: order.customer?.phone || '',
    shipping_address: order.customer?.address || '',
    shipping_city: order.customer?.city || '',
    shipping_state: order.customer?.state || '',
    shipping_zip: order.customer?.zip || '',
    subtotal: order.subtotal,
    shipping_cost: order.shipping,
    tax: order.tax,
    total: order.total,
    status: order.status || 'pending',
  }).select().single()
  if (orderErr) { console.error('sbInsertOrder:', orderErr); return null }

  if (order.items?.length) {
    const lineItems = order.items.map(i => ({
      order_id: orderRow.id, product_id: i.id,
      name: i.name, price: i.price, qty: i.qty,
    }))
    const { error: itemsErr } = await sb.from('order_items').insert(lineItems)
    if (itemsErr) console.error('sbInsertOrder items:', itemsErr)
  }
  return dbToOrder({ ...orderRow, order_items: order.items?.map(i => ({ ...i, product_id: i.id })) || [] })
}

export async function sbUpdateOrderStatus(id, status) {
  const sb = getClient(); if (!sb) return null
  const { error } = await sb.from('orders').update({ status }).eq('id', id)
  if (error) { console.error('sbUpdateOrderStatus:', error); return null }
  return true
}

// ─── Bookings ──────────────────────────────────────────────────────────────
export async function sbInsertBooking(booking) {
  const sb = getClient()
  const { data: { session } } = sb?.auth ? await sb.auth.getSession() : { data: { session: null } }

  const response = await fetch('/api/create-booking', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify(booking),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Unable to submit booking.')
  return data.ok === true
}

export async function sbFetchBookings() {
  const sb = getClient(); if (!sb) return null
  const { data, error } = await sb.from('bookings').select('*').order('created_at', { ascending: false })
  if (error) { console.error('sbFetchBookings:', error); return null }
  return data
}

export async function sbUpdateBookingStatus(id, status) {
  const sb = getClient(); if (!sb) return null
  const { error } = await sb.from('bookings').update({ status }).eq('id', id)
  if (error) { console.error('sbUpdateBookingStatus:', error); return null }
  return true
}

export async function sbUpdateBooking(id, updates) {
  const sb = getClient(); if (!sb) return null
  const { error } = await sb.from('bookings').update(updates).eq('id', id)
  if (error) { console.error('sbUpdateBooking:', error); return null }
  return true
}

// ─── Site settings ─────────────────────────────────────────────────────────
export async function sbFetchSiteSettings() {
  const sb = getClient(); if (!sb) return null
  try {
    const { data, error } = await sb.from('site_settings').select('content').eq('id', 'mobicare-config').maybeSingle()
    if (error) { console.warn('sbFetchSiteSettings:', error.message); return null }
    return data?.content || null
  } catch (e) { console.warn('sbFetchSiteSettings:', e.message); return null }
}

export async function sbUpsertSiteSettings(content) {
  const sb = getClient(); if (!sb) return null
  try {
    const { error } = await sb.from('site_settings').upsert({ id: 'mobicare-config', content, updated_at: new Date().toISOString() })
    if (error) { console.error('sbUpsertSiteSettings:', error.message); return false }
    return true
  } catch (e) { console.error('sbUpsertSiteSettings:', e.message); return false }
}

// ─── Seed ──────────────────────────────────────────────────────────────────
export async function sbSeedInitialData(products, categories) {
  const sb = getClient(); if (!sb) return { ok: false, error: 'Not configured' }
  try {
    const { error: catErr } = await sb.from('categories').upsert(categories.map(categoryToDb), { onConflict: 'id', ignoreDuplicates: true })
    if (catErr) return { ok: false, error: `Categories: ${catErr.message}` }
    const { error: prodErr } = await sb.from('products').upsert(products.map(productToDb), { onConflict: 'id', ignoreDuplicates: true })
    if (prodErr) return { ok: false, error: `Products: ${prodErr.message}` }
    return { ok: true }
  } catch (e) { return { ok: false, error: e.message } }
}

// ─── Shape converters ──────────────────────────────────────────────────────
function productToDb(p) {
  const out = {}
  if (p.id !== undefined) out.id = p.id
  if (p.name !== undefined) out.name = p.name
  if (p.category !== undefined) out.category = p.category
  if (p.price !== undefined) out.price = p.price
  if (p.comparePrice !== undefined) out.compare_price = p.comparePrice
  if (p.stock !== undefined) out.stock = p.stock
  if (p.sku !== undefined) out.sku = p.sku
  if (p.description !== undefined) out.description = p.description
  if (p.images !== undefined) out.images = p.images
  if (p.tags !== undefined) out.tags = p.tags
  if (p.featured !== undefined) out.featured = p.featured
  if (p.active !== undefined) out.active = p.active
  if (p.weight !== undefined) out.weight = p.weight
  if (p.shippingDays !== undefined) out.shipping_days = p.shippingDays
  return out
}

function dbToProduct(row) {
  return {
    id: row.id, name: row.name, category: row.category,
    price: parseFloat(row.price),
    comparePrice: row.compare_price ? parseFloat(row.compare_price) : null,
    stock: row.stock, sku: row.sku, description: row.description,
    images: row.images || [], tags: row.tags || [],
    featured: row.featured, active: row.active, weight: row.weight,
    shippingDays: row.shipping_days || { min: 3, max: 7 },
    createdAt: row.created_at,
  }
}

function categoryToDb(c) {
  const out = {}
  if (c.id !== undefined) out.id = c.id
  if (c.name !== undefined) out.name = c.name
  if (c.description !== undefined) out.description = c.description
  if (c.icon !== undefined) out.icon = c.icon
  if (c.sortOrder !== undefined) out.sort_order = c.sortOrder
  return out
}

function dbToCategory(row) {
  return { id: row.id, name: row.name, description: row.description || '', icon: row.icon || 'Star', sortOrder: row.sort_order || 0 }
}

function dbToOrder(row) {
  return {
    id: row.id, status: row.status, createdAt: row.created_at,
    customer: {
      name: row.customer_name, email: row.customer_email, phone: row.customer_phone,
      address: row.shipping_address, city: row.shipping_city, state: row.shipping_state, zip: row.shipping_zip,
    },
    items: (row.order_items || []).map(i => ({ id: i.product_id, name: i.name, price: parseFloat(i.price), qty: i.qty })),
    subtotal: parseFloat(row.subtotal || 0), shipping: parseFloat(row.shipping_cost || 0),
    tax: parseFloat(row.tax || 0), total: parseFloat(row.total || 0),
  }
}