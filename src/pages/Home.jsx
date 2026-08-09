import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProductStore } from '../lib/store'
import { useSiteStore } from '../lib/siteStore'
import ProductCard from '../components/ProductCard'
import PageMeta from '../components/PageMeta'
import BookingWizard from '../components/BookingWizard'

const REPAIR_VISUALS = {
  'screen-repair': { icon: 'smartphone', from: '#1F4E50', to: '#13522B' },
  'battery-replacement': { icon: 'battery_full', from: '#0A3318', to: '#2F4E37' },
  'water-damage': { icon: 'water_drop', from: '#003739', to: '#1F4E50' },
  'charging-port': { icon: 'ev_station', from: '#12512A', to: '#0A3318' },
  'camera-repair': { icon: 'photo_camera', from: '#1F4E50', to: '#003739' },
  'data-recovery': { icon: 'sd_card', from: '#0A3318', to: '#13522B' },
}

// Quick towns for directions preview
const NEARBY_TOWNS = [
  { name: 'Albion', time: '15 min drive' },
  { name: 'Wayne City', time: '18 min drive' },
  { name: 'Mt. Vernon', time: '35 min drive' }
]

function useFadeIn() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.12 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return [ref, visible]
}

export default function Home() {
  const navigate = useNavigate()
  const featured = useProductStore(s => s.getFeatured())
  const hero = useSiteStore(s => s.hero)
  const trustItems = useSiteStore(s => s.trustItems)
  const repairServices = useSiteStore(s => s.repairServices)

  const [prodRef, prodVisible] = useFadeIn()
  const [ctaRef, ctaVisible] = useFadeIn()

  const [bookingOpen, setBookingOpen] = useState(false)
  const [selectedTown, setSelectedTown] = useState(null)
  const [copied, setCopied] = useState(false)

  const fadeCls = (visible) => `fade-section${visible ? ' fade-section-visible' : ''}`

  const popularRepairs = ['screen-repair', 'battery-replacement', 'water-damage']
    .map(id => repairServices.find(s => s.id === id))
    .filter(Boolean)

  const handleCopyAddress = () => {
    navigator.clipboard.writeText('Fairfield, IL 62837')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const googleMapsUrl = 'https://www.google.com/maps/search/?api=1&query=Mobicare+Fairfield+IL'

  return (
    <div style={{ overflowX: 'hidden' }}>
      <PageMeta
        title="Mobicare Device Recovery — iPhone & Phone Repair in Fairfield, IL"
        description="Southern Illinois' premier device repair shop. Same-day iPhone screen repairs, iPad repairs, batteries, and electronic accessories in Fairfield, IL."
      />

      <div className="responsive" style={{ paddingTop: 96, paddingLeft: 'clamp(12px, 3vw, 24px)', paddingRight: 'clamp(12px, 3vw, 24px)', maxWidth: '100%', boxSizing: 'border-box' }}>

        {/* ── Hero + Interactive Google Maps Location Widget ── */}
        <section
          className="card surface-container-low"
          style={{
            position: 'relative',
            overflow: 'hidden',
            padding: 'clamp(24px, 5vw, 48px)',
            margin: '0 0 32px',
            borderRadius: 32,
            border: '1px solid var(--outline-variant)'
          }}
        >
          <div className="grid middle-align">

            {/* Left: Expressive Headline & CTAs */}
            <div className="s12 m12 l7" style={{ display: 'flex', flexDirection: 'column', gap: 20, zIndex: 1, position: 'relative', minWidth: 0 }}>

              {/* M3 Expressive Tonal Badge */}
              <div
                className="chip surface-container-high"
                style={{
                  borderRadius: 16,
                  padding: '6px 14px',
                  width: 'max-content',
                  maxWidth: '100%',
                  border: '1px solid color-mix(in srgb, var(--outline) 15%, transparent)'
                }}
              >
                <i className="tertiary-text" style={{ fontSize: 18 }}>location_on</i>
                <span
                  className="on-surface-text"
                  style={{ fontSize: 'clamp(11px, 2.5vw, 12px)', fontWeight: 700, letterSpacing: '.06em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {hero.badgeText}
                </span>
              </div>

              {/* Expressive Fluid Typography */}
              <h1 style={{ fontSize: 'clamp(2.2rem, 5.5vw, 3.8rem)', fontWeight: 800, lineHeight: 1.08, margin: 0, letterSpacing: '-0.02em', overflowWrap: 'break-word' }}>
                {hero.headlineLine1}<br />
                <span className="primary-text">{hero.headlineAccent}</span>
              </h1>

              <p className="on-surface-variant-text" style={{ fontSize: 'clamp(15px, 2vw, 18px)', lineHeight: 1.55, maxWidth: 520, margin: 0, overflowWrap: 'break-word' }}>
                {hero.description}
              </p>

              {/* Interactive Hero Buttons */}
              <div className="row wrap" style={{ gap: 12, marginTop: 8, width: '100%', maxWidth: '100%' }}>
                <button
                  className="primary fill round"
                  onClick={() => setBookingOpen(true)}
                  style={{ padding: '12px 24px', fontWeight: 600, minHeight: 48, height: 'auto', maxWidth: '100%', boxSizing: 'border-box' }}
                >
                  <i>calendar_today</i>
                  <span>Book a Repair</span>
                </button>
                <button
                  className="border round surface-container-high"
                  onClick={() => navigate('/shop')}
                  style={{ padding: '12px 24px', fontWeight: 600, minHeight: 48, height: 'auto', maxWidth: '100%', boxSizing: 'border-box' }}
                >
                  <span>Shop Accessories</span>
                  <i>arrow_forward</i>
                </button>
              </div>
            </div>

            {/* Right: Interactive Maps & Directions Widget */}
            <div className="s12 m12 l5" style={{ zIndex: 1, position: 'relative', minWidth: 0, width: '100%' }}>
              <div
                className="card surface-container"
                style={{
                  borderRadius: 28,
                  overflow: 'hidden',
                  border: '1px solid color-mix(in srgb, var(--outline-variant) 40%, transparent)',
                  boxShadow: 'var(--elevation-2)',
                  padding: 0
                }}
              >

                {/* Map View Frame */}
                <div style={{ position: 'relative', height: 210, background: '#121c19', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

                  {/* Radial Grid Pattern */}
                  <div style={{ position: 'absolute', inset: 0, opacity: 0.2, backgroundImage: 'radial-gradient(var(--primary) 1.5px, transparent 1.5px)', backgroundSize: '18px 18px' }} />

                  {/* Vector Road Paths */}
                  <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.4 }}>
                    <path d="M -10 110 Q 150 130 400 70" fill="none" stroke="var(--primary)" strokeWidth="5" strokeLinecap="round" />
                    <path d="M 190 -10 Q 210 100 230 230" fill="none" stroke="#ffffff" strokeWidth="2" strokeDasharray="6 6" opacity="0.7" />
                  </svg>

                  {/* Elevated Map Pin Marker */}
                  <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', transform: 'translateY(-10px)' }}>
                    <div
                      style={{
                        background: 'var(--primary)',
                        color: 'var(--on-primary)',
                        padding: '8px 16px',
                        borderRadius: 24,
                        fontSize: 12,
                        fontWeight: 700,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                      }}
                    >
                      <i style={{ fontSize: 16 }}>storefront</i> Mobicare
                    </div>
                    <div style={{ width: 12, height: 12, background: 'var(--primary)', transform: 'rotate(45deg)', marginTop: -6, boxShadow: '0 4px 8px rgba(0,0,0,0.3)' }} />
                  </div>

                  {/* Floating Controls Overlay */}
                  <div style={{ position: 'absolute', top: 12, right: 12 }}>
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="chip round"
                      style={{ background: 'rgba(18, 28, 25, 0.75)', color: '#fff', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', fontSize: 11 }}
                    >
                      <i style={{ fontSize: 14 }}>open_in_new</i> Large Map
                    </a>
                  </div>

                  <div style={{ position: 'absolute', bottom: 12, left: 12 }}>
                    <span
                      className="chip round"
                      style={{ background: 'rgba(18, 28, 25, 0.75)', color: 'var(--tertiary)', backdropFilter: 'blur(12px)', fontSize: 11, fontWeight: 700, border: '1px solid rgba(255,255,255,0.15)' }}
                    >
                      ● Open Today • Fairfield, IL
                    </span>
                  </div>
                </div>

                {/* Directions & Details Container */}
                <div style={{ padding: '20px 20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 8 }}>
                    <div>
                      <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>Visit Mobicare Express</h3>
                      <span className="on-surface-variant-text" style={{ fontSize: 13, display: 'block', marginTop: 2 }}>Fairfield, IL 62837</span>
                    </div>

                    {/* Rating Badge */}
                    <div className="surface-container-high" style={{ padding: '4px 10px', borderRadius: 12, textAlign: 'right', border: '1px solid color-mix(in srgb, var(--outline-variant) 30%, transparent)', flexShrink: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                        <i>stars</i> 5.0
                      </span>
                      <span className="on-surface-variant-text" style={{ fontSize: 10, fontWeight: 600 }}>Locally Owned</span>
                    </div>
                  </div>

                  {/* Quick Drive Time Chips */}
                  <p className="on-surface-variant-text" style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.02em', margin: '16px 0 8px', textTransform: 'uppercase' }}>
                    Estimated Drive Time:
                  </p>

                  <div className="row wrap" style={{ gap: 8, marginBottom: 20, width: '100%', maxWidth: '100%' }}>
                    {NEARBY_TOWNS.map(town => {
                      const isActive = selectedTown === town.name;
                      return (
                        <button
                          key={town.name}
                          className={`chip round ${isActive ? 'primary' : 'surface-container-high'}`}
                          onClick={() => setSelectedTown(isActive ? null : town.name)}
                          style={{
                            fontSize: 11,
                            padding: '6px 12px',
                            fontWeight: isActive ? 700 : 500,
                            border: isActive ? 'none' : '1px solid color-mix(in srgb, var(--outline-variant) 40%, transparent)',
                            transition: 'all 0.2s ease',
                            maxWidth: '100%',
                            boxSizing: 'border-box'
                          }}
                        >
                          {town.name} ({town.time})
                        </button>
                      );
                    })}
                  </div>

                  {/* Expressive Action Grid - Fixed for Mobile */}
                  <div className="grid" style={{ rowGap: 10, columnGap: 10 }}>
                    <div className="s12" style={{ minWidth: 0 }}>
                      <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="primary fill round"
                        style={{
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          width: '100%',
                          maxWidth: '100%',
                          minHeight: 48,
                          height: 'auto',
                          padding: '12px 16px',
                          boxSizing: 'border-box'
                        }}
                      >
                        <i style={{ fontSize: 20, flexShrink: 0 }}>directions</i>
                        <span style={{ fontWeight: 600 }}>Get Directions</span>
                      </a>
                    </div>

                    <div className="s6" style={{ minWidth: 0 }}>
                      <a
                        href="tel:6182041497"
                        className="border round surface-container-high"
                        style={{
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          width: '100%',
                          maxWidth: '100%',
                          minHeight: 44,
                          height: 'auto',
                          padding: '8px 10px',
                          boxSizing: 'border-box'
                        }}
                      >
                        <i style={{ fontSize: 18, flexShrink: 0 }}>call</i>
                        <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Call Shop</span>
                      </a>
                    </div>

                    <div className="s6" style={{ minWidth: 0 }}>
                      <button
                        onClick={handleCopyAddress}
                        className="border round surface-container-high"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          width: '100%',
                          maxWidth: '100%',
                          minHeight: 44,
                          height: 'auto',
                          padding: '8px 10px',
                          boxSizing: 'border-box'
                        }}
                      >
                        <i style={{ fontSize: 18, flexShrink: 0 }}>{copied ? 'check' : 'content_copy'}</i>
                        <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{copied ? 'Copied!' : 'Copy Address'}</span>
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            </div>

          </div>
        </section>

        {/* ── Trust badges ── */}
        <section style={{ padding: '16px 0' }}>
          <div className="grid">
            {trustItems.map((t, i) => {
              const iconName = t.icon || 'stars'
              return (
                <div key={i} className="s12 m6 l3" style={{ minWidth: 0 }}>
                  <div className="surface-container-low row middle-align" style={{ borderRadius: 24, padding: '16px 18px', gap: 14, border: '1px solid color-mix(in srgb, var(--outline-variant) 40%, transparent)', height: '100%', minWidth: 0 }}>
                    <div className="primary-container padding circle" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i style={{ fontSize: 20 }}>{iconName}</i>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ display: 'block', fontSize: 'clamp(15px, 2.5vw, 17px)', overflowWrap: 'break-word' }}>{t.label}</strong>
                      <span className="on-surface-variant-text" style={{ fontSize: 'clamp(12px, 2vw, 13px)', overflowWrap: 'break-word' }}>{t.desc}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Popular Repairs (photo cards) ── */}
        <section style={{ padding: '24px 0' }}>
          <div className="row middle-align wrap" style={{ marginBottom: 16, gap: 8, padding: '0 4px' }}>
            <div style={{ minWidth: 0 }}>
              <p className="primary-text bold" style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', margin: 0 }}>Services</p>
              <h4 style={{ margin: 0, fontSize: 'clamp(1.2rem, 3vw, 1.6rem)', overflowWrap: 'break-word' }}>Popular Repairs</h4>
            </div>
            <div className="max" />
            <button className="transparent" onClick={() => navigate('/repairs')} style={{ padding: '4px 8px' }}>
              <span>View All Repairs</span><i>arrow_forward</i>
            </button>
          </div>
          <div className="grid">
            {popularRepairs.map(svc => {
              const visual = REPAIR_VISUALS[svc.id] || REPAIR_VISUALS['screen-repair']
              return (
                <div key={svc.id} className="s12 m4" style={{ minWidth: 0 }}>
                  <div style={{ cursor: 'pointer' }} onClick={() => navigate('/repairs')}>
                    <div style={{
                      position: 'relative', height: 220, borderRadius: 28, overflow: 'hidden', marginBottom: 12,
                      background: `linear-gradient(135deg, ${visual.from}, ${visual.to})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <i style={{ position: 'absolute', fontSize: 160, opacity: 0.12, color: '#fff' }}>{visual.icon}</i>
                      <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, color: '#fff' }}>
                        <span className="chip small" style={{ background: 'rgba(255,255,255,.18)', color: '#fff', marginBottom: 8, backdropFilter: 'blur(8px)', fontSize: 11 }}>
                          Starting at {svc.priceRange?.split('–')[0]?.trim() || svc.priceRange}
                        </span>
                        <h5 style={{ margin: 0, color: '#fff', fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', overflowWrap: 'break-word' }}>{svc.name}</h5>
                      </div>
                    </div>
                    <p className="on-surface-variant-text" style={{ fontSize: 13, padding: '0 4px', margin: 0, overflowWrap: 'break-word' }}>{svc.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Featured products ── */}
        <section ref={prodRef} className={fadeCls(prodVisible)} style={{ padding: '24px 0' }}>
          <div className="row middle-align wrap" style={{ marginBottom: 16, gap: 8, padding: '0 4px' }}>
            <div style={{ minWidth: 0 }}>
              <p className="primary-text bold" style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', margin: 0 }}>Best Sellers</p>
              <h4 style={{ margin: 0, fontSize: 'clamp(1.2rem, 3vw, 1.6rem)', overflowWrap: 'break-word' }}>Featured Products</h4>
            </div>
            <div className="max" />
            <button className="transparent" onClick={() => navigate('/shop')} style={{ padding: '4px 8px' }}>
              <span>All Products</span><i>chevron_right</i>
            </button>
          </div>
          <div className="grid">
            {featured.map(p => (
              <div key={p.id} className="s12 m6 l3" style={{ minWidth: 0 }}>
                <ProductCard product={p} onClick={() => navigate(`/product/${p.id}`)} />
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA strip ── */}
        <section ref={ctaRef} className={fadeCls(ctaVisible)} style={{ padding: '24px 0 48px' }}>
          <article className="primary-container" style={{ borderRadius: 28, overflow: 'hidden' }}>
            <div className="cta-strip-inner" style={{ padding: 'clamp(20px, 4vw, 32px)' }}>
              <div className="cta-strip-text" style={{ minWidth: 0 }}>
                <h5 style={{ margin: '0 0 4px', fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)' }}>Ready to get started?</h5>
                <p style={{ margin: 0, opacity: .85, fontSize: 'clamp(13px, 2vw, 15px)' }}>Walk in or book ahead — we're in Fairfield, IL.</p>
              </div>
              <div className="cta-strip-actions">
                <a href="tel:6182041497" className="border">
                  <i>call</i><span>618-204-1497</span>
                </a>
                <button className="primary" onClick={() => navigate('/shop')}>
                  <span>Shop Now</span><i>arrow_forward</i>
                </button>
              </div>
            </div>
          </article>
        </section>
      </div>

      {bookingOpen && (
        <BookingWizard
          onClose={() => setBookingOpen(false)}
        />
      )}
    </div>
  )
}