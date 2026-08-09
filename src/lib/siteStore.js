import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { sbUpsertSiteSettings, isSupabaseConfigured } from './supabase'

// ─── Default site content ──────────────────────────────────────────────────
export const DEFAULT_SITE_CONTENT = {
  brand: {
    name: 'Mobicare',
    subLabel: 'Device Recovery',
    tagline: 'Fix. Protect. Upgrade.',
  },
  hero: {
    badgeText: 'Fairfield, Illinois \u00b7 Est. 2019',
    headlineLine1: 'Fix. Protect.',
    headlineAccent: 'Upgrade.',
    description:
      "Southern Illinois' premier device repair shop. Cracked screen? Dead battery? Water damage? We fix it fast \u2014 and stock everything you need to keep your devices safe after.",
    primaryCta: 'Shop Accessories',
    secondaryCta: 'Call 618-204-1497',
  },
  trustItems: [
    { icon: 'bolt',          label: 'Same-Day Repairs',  desc: 'Most screen & battery jobs done same day' },
    { icon: 'shield',        label: '90-Day Warranty',   desc: 'All repairs covered, no questions asked' },
    { icon: 'schedule',      label: 'Free Diagnostics',  desc: "No charge to find out what's wrong" },
    { icon: 'star',          label: '4.9\u2605 Rating',  desc: 'Hundreds of happy customers in Fairfield' },
  ],
  repairBanner: {
    eyebrow: 'Device Repair',
    headline: 'Broken device?\nWe fix it fast.',
    description:
      "Cracked screens, dead batteries, water damage, charging ports, cameras \u2014 if it's broken, there's a good chance we can fix it same-day. Free diagnostic on every device.",
    primaryCta: 'See Repair Services',
    secondaryCta: 'Call First',
  },
  repairServices: [
    {
      id: 'screen-repair',
      name: 'Screen Repair',
      icon: 'smartphone',
      duration: '1\u20132 hours',
      priceRange: '$49 \u2013 $249',
      description: 'Cracked or shattered display? We replace screens on iPhones, Androids, and tablets with OEM-quality parts.',
    },
    {
      id: 'battery-replacement',
      name: 'Battery Replacement',
      icon: 'battery_full',
      duration: '30\u201360 min',
      priceRange: '$39 \u2013 $89',
      description: 'Restore your phone to full battery life. We carry batteries for hundreds of models.',
    },
    {
      id: 'water-damage',
      name: 'Water Damage Recovery',
      icon: 'water_drop',
      duration: '24\u201348 hours',
      priceRange: 'Free diagnostic',
      description: 'Dropped your phone in water? Bring it in immediately. Our ultrasonic cleaning process saves most devices.',
    },
    {
      id: 'charging-port',
      name: 'Charging Port Repair',
      icon: 'ev_station',
      duration: '45\u201390 min',
      priceRange: '$45 \u2013 $99',
      description: "Won't charge or connect to a computer? We repair loose or corroded charging ports.",
    },
    {
      id: 'camera-repair',
      name: 'Camera Repair',
      icon: 'photo_camera',
      duration: '1\u20132 hours',
      priceRange: '$59 \u2013 $149',
      description: 'Blurry, cracked, or non-functional camera module replacement.',
    },
    {
      id: 'data-recovery',
      name: 'Data Recovery',
      icon: 'sd_card',
      duration: '2\u20135 days',
      priceRange: 'Quote after diagnostic',
      description: 'Lost photos, contacts, or files? We recover data from damaged or non-booting devices.',
    },
  ],
  about: {
    eyebrow: 'About Us',
    headline: 'Mobicare Device Recovery',
    lead: "We're a locally-owned electronics repair shop in Fairfield, Illinois \u2014 serving Wayne County and surrounding areas with honest, fast, quality repairs.",
    story: [
      "Mobicare started with a simple belief: your devices should be repaired by someone who actually cares about doing the job right. As a locally-owned shop, we're not chasing volume \u2014 we're building a reputation, one repair at a time.",
      "We fix what the big-box stores won't touch, and we're honest about what can and can't be done. Free diagnostics mean you'll always know the cost before committing to a repair. No surprises, no hidden fees.",
      "We're also expanding into accessories and certified pre-owned devices \u2014 making it easier for everyone in southern Illinois to get the gear they need at fair prices.",
    ],
  },
  business: {
    name: 'Mobicare Device Recovery',
    phone: '618-204-1497',
    email: 'Mobicarehello@gmail.com',
    address: 'Fairfield, Illinois',
    city: 'Fairfield, IL 62837',
    hours: [
      { days: 'Monday \u2013 Friday', hours: '9:00 AM \u2013 6:00 PM' },
      { days: 'Saturday',             hours: '10:00 AM \u2013 4:00 PM' },
      { days: 'Sunday',               hours: 'Closed' },
    ],
  },
  appearance: {
    logoType:        'image',
    logoUrl:         '',
    logoAlt:         'Mobicare logo',
    accentColor:     '#13522B',
    accentColorDeep: '#0A3318',
    bgBase:          '#F8FAF4',
    bgSurface:       '#F8FAF7',
    bgElevated:      '#ECEFE8',
    fontFamily:      'system',
    fontUrl:         '',
    colorScheme:     'light',
  },
  seo: {
    siteTitle:       'Mobicare Device Recovery',
    titleSuffix:     '| Mobicare',
    metaDescription: "Southern Illinois' premier device repair shop. Fast screen repairs, battery replacements, water damage recovery, and mobile accessories in Fairfield, IL.",
    keywords:        'phone repair, screen repair, battery replacement, Fairfield Illinois, device recovery',
    ogImage:         '',
    googleAnalyticsId: '',
    facebookPixelId:   '',
  },
  social: {
    facebook:  '',
    instagram: '',
    twitter:   '',
    tiktok:    '',
    youtube:   '',
    yelp:      '',
    google:    '',
  },
  footer: {
    tagline:    'Fast repairs. Fair prices. Local experts.',
    showHours:   true,
    showSocial:  true,
    copyrightName: 'Mobicare Device Recovery',
    extraLinks: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
    ],
  },
  ctaStrip: {
    headline:    'Ready to get your device fixed?',
    subtext:     'Walk-ins welcome. Most repairs done same day.',
    primaryCta:  'Book Appointment',
    secondaryCta: 'Browse Shop',
  },
  deviceTypes: [
    { id: 'iphone', name: 'iPhone', models: ['iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15', 'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14', 'iPhone 13', 'iPhone 12', 'iPhone 11', 'iPhone SE'] },
    { id: 'android', name: 'Android / Samsung', models: ['Galaxy S24 Ultra', 'Galaxy S24', 'Galaxy S23 Ultra', 'Galaxy S23', 'Galaxy S22 Ultra', 'Galaxy A54', 'Pixel 8 Pro', 'Pixel 8'] },
    { id: 'ipad', name: 'iPad / Tablet', models: ['iPad Pro 12.9', 'iPad Pro 11', 'iPad Air', 'iPad Mini', 'iPad 10th Gen', 'Galaxy Tab S9'] },
    { id: 'laptop', name: 'Laptop / PC', models: ['MacBook Pro M-Series', 'MacBook Air M-Series', 'Dell XPS', 'Lenovo ThinkPad', 'HP Spectre'] },
    { id: 'console', name: 'Game Console', models: ['PlayStation 5', 'PlayStation 4', 'Xbox Series X', 'Xbox Series S', 'Nintendo Switch OLED', 'Nintendo Switch'] },
    { id: 'other', name: 'Other Device', models: [] }
  ],
}

// ─── Font presets ───────────────────────────────────────────────────────────
export const FONT_PRESETS = [
  { id: 'system',     label: 'SF Pro (System Default)', css: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif', url: '' },
  { id: 'inter',      label: 'Inter',      css: '"Inter", system-ui, sans-serif',      url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap' },
  { id: 'outfit',     label: 'Outfit',     css: '"Outfit", system-ui, sans-serif',     url: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap' },
  { id: 'poppins',    label: 'Poppins',    css: '"Poppins", system-ui, sans-serif',    url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap' },
  { id: 'montserrat', label: 'Montserrat', css: '"Montserrat", system-ui, sans-serif', url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap' },
  { id: 'dm-sans',    label: 'DM Sans',    css: '"DM Sans", system-ui, sans-serif',    url: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap' },
  { id: 'geist',      label: 'Geist',      css: '"Geist", system-ui, sans-serif',      url: 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&display=swap' },
  { id: 'custom',     label: 'Custom URL', css: '',                                    url: '' },
]

// ─── Apply appearance → CSS custom properties (instant, no reload) ──────────
export function applyAppearance(a) {
  const s = document.documentElement.style
  const scheme = a.colorScheme || 'dark'

  // Set data-theme on <html> for light/dark CSS cascade
  document.documentElement.setAttribute('data-theme', scheme)
  // Update PWA theme-color
  const themeMetaDark = document.querySelector('meta[name="theme-color"][media*="dark"]')
  const themeMetaLight = document.querySelector('meta[name="theme-color"][media*="light"]')
  if (themeMetaDark) themeMetaDark.setAttribute('content', scheme === 'dark' ? '#000000' : a.bgBase || '#000000')
  if (themeMetaLight) themeMetaLight.setAttribute('content', scheme === 'light' ? '#f5f5f7' : '#000000')

  if (scheme === 'light') {
    // Light mode — use light CSS vars, override the accentColor as well
    s.setProperty('--cyan',          a.accentColor || '#0071e3')
    s.setProperty('--cyan-dim',      hexToRgba(a.accentColor || '#0071e3', 0.1))
    s.setProperty('--cyan-glow',     hexToRgba(a.accentColor || '#0071e3', 0.15))
    s.setProperty('--cyan-deep',     a.accentColorDeep || '#0071e3')
    s.setProperty('--border-accent', hexToRgba(a.accentColor || '#0071e3', 0.3))
    // Light backgrounds handled by CSS [data-theme="light"] vars
    s.removeProperty('--bg-base')
    s.removeProperty('--bg-surface')
    s.removeProperty('--bg-elevated')
    s.removeProperty('--bg-panel')
    s.removeProperty('--shadow-cyan')
  } else {
    s.setProperty('--cyan',          a.accentColor)
    s.setProperty('--cyan-dim',      hexToRgba(a.accentColor, 0.12))
    s.setProperty('--cyan-glow',     hexToRgba(a.accentColor, 0.20))
    s.setProperty('--cyan-deep',     a.accentColorDeep)
    s.setProperty('--border-accent', hexToRgba(a.accentColor, 0.35))
    s.setProperty('--bg-base',       a.bgBase)
    s.setProperty('--bg-surface',    a.bgSurface)
    s.setProperty('--bg-elevated',   a.bgElevated)
    s.setProperty('--bg-panel',      lighten(a.bgElevated, 10))
    s.setProperty('--shadow-cyan',   `0 0 24px ${hexToRgba(a.accentColor, 0.10)}`)
  }

  const preset = FONT_PRESETS.find(f => f.id === a.fontFamily)
  if (preset && preset.css) {
    if (preset.url) injectFontLink(preset.id, preset.url)
    s.setProperty('--font-display', preset.css)
    s.setProperty('--font-body',    preset.css)
  }
  if (a.fontFamily === 'custom' && a.fontUrl) {
    injectFontLink('custom-font', a.fontUrl)
  }
}

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function lighten(hex, amount) {
  const h = hex.replace('#', '')
  const r = Math.min(255, parseInt(h.substring(0, 2), 16) + amount)
  const g = Math.min(255, parseInt(h.substring(2, 4), 16) + amount)
  const b = Math.min(255, parseInt(h.substring(4, 6), 16) + amount)
  return `rgb(${r}, ${g}, ${b})`
}

function injectFontLink(id, url) {
  if (document.getElementById(`font-link-${id}`)) return
  const link = document.createElement('link')
  link.id = `font-link-${id}`
  link.rel = 'stylesheet'
  link.href = url
  document.head.appendChild(link)
}

const syncToSupabase = (state) => {
  if (isSupabaseConfigured()) {
    const cleanState = {
      brand: state.brand,
      hero: state.hero,
      trustItems: state.trustItems,
      repairBanner: state.repairBanner,
      repairServices: state.repairServices,
      about: state.about,
      business: state.business,
      appearance: state.appearance,
      deviceTypes: state.deviceTypes,
    }
    sbUpsertSiteSettings(cleanState)
  }
}

// ─── Store ──────────────────────────────────────────────────────────────────
export const useSiteStore = create(
  persist(
    (set, get) => ({
      ...DEFAULT_SITE_CONTENT,

      updateBrand: (data) => {
        set({ brand: { ...get().brand, ...data } })
        syncToSupabase(get())
      },
      updateHero: (data) => {
        set({ hero: { ...get().hero, ...data } })
        syncToSupabase(get())
      },
      updateRepairBanner: (data) => {
        set({ repairBanner: { ...get().repairBanner, ...data } })
        syncToSupabase(get())
      },
      updateAbout: (data) => {
        set({ about: { ...get().about, ...data } })
        syncToSupabase(get())
      },
      updateBusiness: (data) => {
        set({ business: { ...get().business, ...data } })
        syncToSupabase(get())
      },
      updateAppearance: (data) => {
        const next = { ...get().appearance, ...data }
        set({ appearance: next })
        applyAppearance(next)
        syncToSupabase(get())
      },
      setColorScheme: (scheme) => {
        const next = { ...get().appearance, colorScheme: scheme }
        set({ appearance: next })
        applyAppearance(next)
        syncToSupabase(get())
      },
      updateTrustItem: (index, data) => {
        const items = [...get().trustItems]
        items[index] = { ...items[index], ...data }
        set({ trustItems: items })
        syncToSupabase(get())
      },
      updateRepairService: (id, data) => {
        set({ repairServices: get().repairServices.map(s => s.id === id ? { ...s, ...data } : s) })
        syncToSupabase(get())
      },
      addRepairService: (service) => {
        set({ repairServices: [...get().repairServices, service] })
        syncToSupabase(get())
      },
      deleteRepairService: (id) => {
        set({ repairServices: get().repairServices.filter(s => s.id !== id) })
        syncToSupabase(get())
      },
      setRepairServices: (services) => {
        set({ repairServices: services })
        syncToSupabase(get())
      },
      setDeviceTypes: (deviceTypes) => {
        set({ deviceTypes })
        syncToSupabase(get())
      },
      updateBusinessHour: (index, data) => {
        const hours = [...get().business.hours]
        hours[index] = { ...hours[index], ...data }
        set({ business: { ...get().business, hours } })
        syncToSupabase(get())
      },
      updateSeo: (data) => {
        set({ seo: { ...get().seo, ...data } })
        syncToSupabase(get())
      },
      updateSocial: (data) => {
        set({ social: { ...get().social, ...data } })
        syncToSupabase(get())
      },
      updateFooter: (data) => {
        set({ footer: { ...get().footer, ...data } })
        syncToSupabase(get())
      },
      updateCtaStrip: (data) => {
        set({ ctaStrip: { ...get().ctaStrip, ...data } })
        syncToSupabase(get())
      },
      resetToDefaults: () => {
        set({ ...DEFAULT_SITE_CONTENT })
        applyAppearance(DEFAULT_SITE_CONTENT.appearance)
        syncToSupabase(DEFAULT_SITE_CONTENT)
      },
    }),
    { name: 'mobicare-site-content' }
  )
)
