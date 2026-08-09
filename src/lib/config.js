// ─── Environment variable helpers ─────────────────────────────────────────────
// All sensitive values come from .env (VITE_ prefix exposes them to the browser).
// Never hardcode credentials here. See .env.example for required variables.

function requireEnv(key) {
  const value = import.meta.env[key]
  if (!value) {
    console.warn(`[config] Missing environment variable: ${key}. See .env.example.`)
  }
  return value || ''
}

// ─── Supabase ─────────────────────────────────────────────────────────────────
export const SUPABASE_URL      = requireEnv('VITE_SUPABASE_URL')
export const SUPABASE_ANON_KEY = requireEnv('VITE_SUPABASE_ANON_KEY')

// ─── Stripe ───────────────────────────────────────────────────────────────────
// NOTE: No Stripe key lives here. Real payment processing happens entirely
// server-side via /api/create-checkout-session.js and /api/stripe-webhook.js,
// using STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET set only in your hosting
// provider's serverless environment variables (never VITE_-prefixed, never
// in this frontend bundle). See .env.example for details.

// ─── EmailJS ──────────────────────────────────────────────────────────────────
export const EMAILJS_CONFIG = {
  serviceId:          requireEnv('VITE_EMAILJS_SERVICE_ID'),
  bookingTemplateId:  requireEnv('VITE_EMAILJS_BOOKING_TEMPLATE_ID'),
  orderTemplateId:    requireEnv('VITE_EMAILJS_ORDER_TEMPLATE_ID'),
  publicKey:          requireEnv('VITE_EMAILJS_PUBLIC_KEY'),
}

// ─── Business info ────────────────────────────────────────────────────────────
// Non-sensitive — fine to stay in source code. Edit here to update site defaults.
export const BUSINESS = {
  name:    'Mobicare Device Recovery',
  tagline: 'Fix. Protect. Upgrade.',
  phone:   '618-204-1497',
  email:   'Mobicarehello@gmail.com',
  address: 'Fairfield, Illinois',
  city:    'Fairfield, IL 62837',
  hours: [
    { days: 'Monday – Friday', hours: '9:00 AM – 6:00 PM' },
    { days: 'Saturday',         hours: '10:00 AM – 4:00 PM' },
    { days: 'Sunday',           hours: 'Closed' },
  ],
  social: { facebook: '', instagram: '', google: '' },
}

// ─── Repair services ──────────────────────────────────────────────────────────
export const REPAIR_SERVICES = [
  { id:'screen-repair',       name:'Screen Repair',            icon:'Smartphone', duration:'1–2 hours',    priceRange:'$49 – $249',         description:'Cracked or shattered display? We replace screens on iPhones, Androids, and tablets with OEM-quality parts.' },
  { id:'battery-replacement', name:'Battery Replacement',      icon:'Battery',    duration:'30–60 min',    priceRange:'$39 – $89',          description:'Restore your phone to full battery life. We carry batteries for hundreds of models.' },
  { id:'water-damage',        name:'Water Damage Recovery',    icon:'Droplets',   duration:'24–48 hours',  priceRange:'Free diagnostic',    description:"Dropped your phone in water? Bring it in immediately. Our ultrasonic cleaning process saves most devices." },
  { id:'charging-port',       name:'Charging Port Repair',     icon:'Plug',       duration:'45–90 min',    priceRange:'$45 – $99',          description:"Won't charge or connect? We repair loose or corroded charging ports." },
  { id:'camera-repair',       name:'Camera Repair',            icon:'Camera',     duration:'1–2 hours',    priceRange:'$59 – $149',         description:'Blurry, cracked, or non-functional camera module replacement.' },
  { id:'data-recovery',       name:'Data Recovery',            icon:'HardDrive',  duration:'2–5 days',     priceRange:'Quote after diagnostic', description:'Lost photos, contacts, or files? We recover data from damaged or non-booting devices.' },
]
