import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProductStore } from '../lib/store'
import { useSiteStore } from '../lib/siteStore'
import ProductCard from '../components/ProductCard'
import PageMeta from '../components/PageMeta'
import BookingWizard from '../components/BookingWizard'
import BackgroundCanvas from '../components/BackgroundCanvas'
import { GOOGLE_MAPS_API_KEY } from '../lib/config'

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
  const [selectedServiceForBooking, setSelectedServiceForBooking] = useState(null)
  const [selectedTown, setSelectedTown] = useState(null)
  const [copied, setCopied] = useState(false)
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const mapMarkerRef = useRef(null)
  const [mapError, setMapError] = useState(false)

  const fadeCls = (visible) => `fade-section${visible ? ' fade-section-visible' : ''}`

  const popularRepairs = ['screen-repair', 'battery-replacement', 'water-damage']
    .map(id => repairServices.find(s => s.id === id))
    .filter(Boolean)

  const handleCopyAddress = () => {
    navigator.clipboard.writeText('920 Commerce Drive, Suite 3, Fairfield, IL 62837')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const googleMapsUrl = 'https://www.google.com/maps/search/?api=1&query=Mobicare+Fairfield+IL'

  // Load the Google Maps JavaScript API and render a real Fairfield, IL map.
  // The API key remains sourced from VITE_GOOGLE_MAPS_API_KEY in ../lib/config.
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY || !mapRef.current) {
      if (!GOOGLE_MAPS_API_KEY) setMapError(true)
      return
    }

    let cancelled = false

    const initializeMap = () => {
      if (cancelled || !window.google?.maps || !mapRef.current) return

      const businessAddress = '920 Commerce Drive, Suite 3, Fairfield, IL 62837'
      const fairfield = { lat: 38.378937, lng: -88.359768 }

      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: fairfield,
        zoom: 15,
        mapTypeId: 'roadmap',
        disableDefaultUI: true,
        zoomControl: true,
        zoomControlOptions: {
          position: window.google.maps.ControlPosition.RIGHT_BOTTOM
        },
        gestureHandling: 'cooperative',
        clickableIcons: false,
        streetViewControl: false,
        fullscreenControl: false,
        mapTypeControl: false,
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#edf0eb' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#68736b' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#edf0eb' }] },
          { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#c8d0c7' }] },
          { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#e7ebe5' }] },
          { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#dbe7d7' }] },
          { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#cfe0ca' }] },
          { featureType: 'poi.business', stylers: [{ visibility: 'simplified' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
          { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#d6dbd4' }] },
          { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
          { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#f5dca0' }] },
          { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#e6c979' }] },
          { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
          { featureType: 'transit', stylers: [{ visibility: 'off' }] },
          { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#c9dce2' }] },
          { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#78919a' }] }
        ]
      })

      const pinSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="52" height="64" viewBox="0 0 52 64">
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity=".28"/>
          </filter>
          <path filter="url(#shadow)" d="M26 2C12.7 2 2 12.7 2 26c0 17.5 24 36 24 36s24-18.5 24-36C50 12.7 39.3 2 26 2z" fill="#13522B"/>
          <circle cx="26" cy="26" r="9" fill="#fff"/>
          <circle cx="26" cy="26" r="4" fill="#13522B"/>
        </svg>
      `

      mapMarkerRef.current = new window.google.maps.Marker({
        position: fairfield,
        map: mapInstanceRef.current,
        title: 'Mobicare Device Recovery — Fairfield, IL',
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(pinSvg)}`,
          scaledSize: new window.google.maps.Size(52, 64),
          anchor: new window.google.maps.Point(26, 62)
        },
        zIndex: 10
      })

      const geocoder = new window.google.maps.Geocoder()
      geocoder.geocode({ address: businessAddress }, (results, status) => {
        if (cancelled) return
        if (status === 'OK' && results?.[0]?.geometry?.location) {
          const location = results[0].geometry.location
          mapInstanceRef.current.setCenter(location)
          mapInstanceRef.current.setZoom(16)
          if (mapMarkerRef.current) {
            mapMarkerRef.current.setPosition(location)
          }
        } else {
          console.warn('Could not geocode Mobicare business address:', status)
        }
      })

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding:4px 8px 6px;font-family:Arial,sans-serif;color:#26312b">
            <strong style="font-size:13px">Mobicare Device Recovery</strong>
            <div style="font-size:11px;margin-top:3px;color:#68736b">Fairfield, IL 62837</div>
          </div>
        `
      })

      mapMarkerRef.current.addListener('click', () => {
        infoWindow.open({
          anchor: mapMarkerRef.current,
          map: mapInstanceRef.current
        })
      })
    }

    if (window.google?.maps) {
      initializeMap()
      return () => {
        cancelled = true
        if (mapMarkerRef.current) mapMarkerRef.current.setMap(null)
      }
    }

    const existingScript = document.querySelector('script[data-google-maps-api="true"]')

    if (existingScript) {
      existingScript.addEventListener('load', initializeMap, { once: true })
      existingScript.addEventListener('error', () => setMapError(true), { once: true })
    } else {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&v=weekly`
      script.async = true
      script.defer = true
      script.dataset.googleMapsApi = 'true'
      script.onload = initializeMap
      script.onerror = () => setMapError(true)
      document.head.appendChild(script)
    }

    return () => {
      cancelled = true
      if (mapMarkerRef.current) mapMarkerRef.current.setMap(null)
    }
  }, [])

  return (
    <div id="homepage-main-container" style={{ position: 'relative', overflowX: 'hidden', minHeight: '100vh' }}>
      <PageMeta
        title="Mobicare Device Recovery — iPhone & Phone Repair in Fairfield, IL"
        description="Southern Illinois' preferred device repair shop. Next-Day Repairs for almost everything.* EST. 2022. Four years of helping you love your device, longer."
      />

      {/* Dynamic Animated Background Canvas with BeerCSS shapes */}
      <BackgroundCanvas />

      <div id="homepage-content-wrapper" className="responsive" style={{ position: 'relative', zIndex: 1, paddingTop: 96, paddingLeft: 'clamp(12px, 3vw, 24px)', paddingRight: 'clamp(12px, 3vw, 24px)', maxWidth: '100%', boxSizing: 'border-box' }}>

        {/* ── Hero + Interactive Location Bento Card ── */}
        <section
          id="hero-bento-section"
          className="card home-bento-card"
          style={{
            position: 'relative',
            overflow: 'hidden',
            padding: 'clamp(24px, 5vw, 48px)',
            margin: '0 0 32px',
            borderRadius: 32,
          }}
        >
          <div id="hero-bento-grid" className="grid middle-align">

            {/* Left: Expressive Headline & CTAs */}
            <div id="hero-text-container" className="s12 m12 l7" style={{ display: 'flex', flexDirection: 'column', gap: 20, zIndex: 1, position: 'relative', minWidth: 0 }}>

              {/* M3 Expressive Tonal Badge */}
              <div
                id="hero-status-chip"
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
                  id="hero-status-text"
                  className="on-surface-text"
                  style={{ fontSize: 'clamp(11px, 2.5vw, 12px)', fontWeight: 700, letterSpacing: '.06em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {hero.badgeText}
                </span>
              </div>

              {/* Expressive Fluid Typography */}
              <h1 id="hero-primary-headline" style={{ fontSize: 'clamp(2.2rem, 5.5vw, 3.8rem)', fontWeight: 800, lineHeight: 1.08, margin: 0, letterSpacing: '-0.02em', overflowWrap: 'break-word' }}>
                {hero.headlineLine1}<br />
                <span id="hero-primary-headline-accent" className="primary-text">{hero.headlineAccent}</span>
              </h1>

              <p id="hero-description-paragraph" className="on-surface-variant-text" style={{ fontSize: 'clamp(15px, 2vw, 18px)', lineHeight: 1.55, maxWidth: 520, margin: 0, overflowWrap: 'break-word' }}>
                {hero.description}
              </p>

              {/* Interactive Hero Buttons */}
              <div id="hero-action-buttons-row" className="row wrap" style={{ gap: 12, marginTop: 8, width: '100%', maxWidth: '100%' }}>
                <button
                  id="hero-book-repair-btn"
                  className="primary fill round"
                  onClick={() => setBookingOpen(true)}
                  style={{ padding: '12px 24px', fontWeight: 600, minHeight: 48, height: 'auto', maxWidth: '100%', boxSizing: 'border-box' }}
                >
                  <i className="material-symbols-outlined">calendar_today</i>
                  <span>Book a Repair</span>
                </button>
                <button
                  id="hero-shop-accessories-btn"
                  className="border round surface-container-high"
                  onClick={() => navigate('/shop')}
                  style={{ padding: '12px 24px', fontWeight: 600, minHeight: 48, height: 'auto', maxWidth: '100%', boxSizing: 'border-box' }}
                >
                  <span>Shop Accessories</span>
                  <i className="material-symbols-outlined">arrow_forward</i>
                </button>
              </div>
            </div>

            {/* Right: Interactive Maps & Directions Widget */}
            <div id="hero-map-widget-col" className="s12 m12 l5" style={{ zIndex: 1, position: 'relative', minWidth: 0, width: '100%' }}>
              <div
                id="hero-map-glass-card"
                className="card surface-container home-bento-card"
                style={{
                  borderRadius: 28,
                  overflow: 'hidden',
                  padding: 0
                }}
              >

                {/* Real Google Map — Fairfield, IL */}
                <div
                  id="map-frame-preview"
                  style={{
                    position: 'relative',
                    height: 210,
                    background: '#e3e8e2',
                    overflow: 'hidden'
                  }}
                >
                  <div
                    ref={mapRef}
                    aria-label="Interactive map showing Fairfield, Illinois"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%'
                    }}
                  />

                  {/* Map Loading / Missing-Key State */}
                  {(!GOOGLE_MAPS_API_KEY || mapError) && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 24,
                        textAlign: 'center',
                        background: 'linear-gradient(135deg, #e3e8e2, #d7e1d6)',
                        color: '#34403a'
                      }}
                    >
                      <div>
                        <i
                          className="material-symbols-outlined"
                          style={{ fontSize: 32, display: 'block', marginBottom: 8 }}
                        >
                          map
                        </i>
                        <strong style={{ display: 'block', fontSize: 13 }}>
                          Fairfield, Illinois
                        </strong>
                        <span style={{ display: 'block', fontSize: 11, marginTop: 4, opacity: 0.75 }}>
                          Google Maps is unavailable right now.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Mobicare Branding Overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      left: 12,
                      top: 12,
                      zIndex: 3,
                      pointerEvents: 'none'
                    }}
                  >
                    <div
                      style={{
                        background: 'var(--primary)',
                        color: 'var(--on-primary)',
                        padding: '8px 14px',
                        borderRadius: 24,
                        fontSize: 12,
                        fontWeight: 700,
                        boxShadow: '0 6px 18px rgba(0,0,0,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7
                      }}
                    >
                      <i style={{ fontSize: 16 }}>storefront</i>
                      Mobicare
                    </div>
                  </div>

                  {/* Large Map Link */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      zIndex: 4
                    }}
                  >
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="chip round"
                      style={{
                        background: 'rgba(255,255,255,0.92)',
                        color: '#34403a',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(0,0,0,0.08)',
                        fontSize: 11,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
                      }}
                    >
                      <i style={{ fontSize: 14 }}>open_in_new</i>
                      Large Map
                    </a>
                  </div>

                  {/* Location Status */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 12,
                      left: 12,
                      zIndex: 4
                    }}
                  >
                    <span
                      className="chip round"
                      style={{
                        background: 'rgba(255,255,255,0.92)',
                        color: 'var(--tertiary)',
                        backdropFilter: 'blur(12px)',
                        fontSize: 11,
                        fontWeight: 700,
                        border: '1px solid rgba(0,0,0,0.08)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
                      }}
                    >
                      ● Open Today • Fairfield, IL
                    </span>
                  </div>

                  {/* Soft Edge Treatment */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      zIndex: 2,
                      pointerEvents: 'none',
                      boxShadow: 'inset 0 0 28px rgba(25,45,34,0.08)'
                    }}
                  />
                </div>

                {/* Directions & Details Container */}
                <div id="map-card-details" style={{ padding: '20px 20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 8 }}>
                    <div>
                      <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>Visit Mobicare Express</h3>
                      <span className="on-surface-variant-text" style={{ fontSize: 13, display: 'block', marginTop: 2 }}>Fairfield, IL 62837</span>
                    </div>

                    {/* Rating Badge */}
                    <div className="surface-container-high" style={{ padding: '4px 10px', borderRadius: 12, textAlign: 'right', border: '1px solid color-mix(in srgb, var(--outline-variant) 30%, transparent)', flexShrink: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                        <i className="material-symbols-outlined">stars</i> 5.0
                      </span>
                      <span className="on-surface-variant-text" style={{ fontSize: 10, fontWeight: 600 }}>Locally Owned</span>
                    </div>
                  </div>

                  {/* Quick Drive Time Chips */}
                  <p className="on-surface-variant-text" style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.02em', margin: '16px 0 8px', textTransform: 'uppercase' }}>
                    Estimated Drive Time:
                  </p>

                  <div id="nearby-towns-chips-row" className="row wrap" style={{ gap: 8, marginBottom: 20, width: '100%', maxWidth: '100%' }}>
                    {NEARBY_TOWNS.map(town => {
                      const isActive = selectedTown === town.name;
                      return (
                        <button
                          id={`town-chip-${town.name.toLowerCase().replace(/\s+/g, '-')}`}
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

                  {/* Action Grid */}
                  <div id="map-action-grid" className="grid" style={{ rowGap: 10, columnGap: 10 }}>
                    <div className="s12" style={{ minWidth: 0 }}>
                      <a
                        id="hero-get-directions-link"
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
                        <i className="material-symbols-outlined" style={{ fontSize: 20, flexShrink: 0 }}>directions</i>
                        <span style={{ fontWeight: 600 }}>Get Directions</span>
                      </a>
                    </div>

                    <div className="s6" style={{ minWidth: 0 }}>
                      <a
                        id="hero-call-shop-link"
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
                        <i className="material-symbols-outlined" style={{ fontSize: 18, flexShrink: 0 }}>call</i>
                        <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Call Shop</span>
                      </a>
                    </div>

                    <div className="s6" style={{ minWidth: 0 }}>
                      <button
                        id="hero-copy-address-btn"
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
                        <i className="material-symbols-outlined" style={{ fontSize: 18, flexShrink: 0 }}>{copied ? 'check' : 'content_copy'}</i>
                        <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{copied ? 'Copied!' : 'Copy Address'}</span>
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            </div>

          </div>
        </section>

        {/* ── Trust Banner Ticker ── */}
        <section id="trust-banner-section" className="trust-banner-section-wrapper" style={{ padding: '0 0 8px', overflow: 'hidden' }}>
          <div className="trust-ticker-panel">
            <div className="trust-ticker-track">
              {[...trustItems, ...trustItems].map((t, i) => {
                const iconName = t.icon || 'stars'
                return (
                  <div key={i} className="trust-ticker-item">
                    <i className="material-symbols-outlined primary-text" style={{ fontSize: 20, flexShrink: 0 }}>{iconName}</i>
                    <strong style={{ fontSize: 15, whiteSpace: 'nowrap' }}>{t.label}</strong>
                    <span className="on-surface-variant-text" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{t.desc}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>


        {/* ── Featured Products Section ── */}
        <section id="featured-products-section" ref={prodRef} className={fadeCls(prodVisible)} style={{ padding: '24px 0' }}>
          <div id="featured-products-header" className="row middle-align wrap" style={{ marginBottom: 16, gap: 8, padding: '0 4px' }}>
            <div style={{ minWidth: 0 }}>
              <p className="primary-text bold" style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', margin: 0 }}>Best Sellers</p>
              <h4 style={{ margin: 0, fontSize: 'clamp(1.2rem, 3vw, 1.6rem)', overflowWrap: 'break-word' }}>Featured Products</h4>
            </div>
            <div className="max" />
            <button id="all-products-link-btn" className="transparent" onClick={() => navigate('/shop')} style={{ padding: '4px 8px' }}>
              <span>All Products</span>
              <i className="material-symbols-outlined">chevron_right</i>
            </button>
          </div>
          <div id="featured-products-grid" className="grid">
            {featured.map(p => (
              <div id={`featured-product-col-${p.id}`} key={p.id} className="s12 m6 l3" style={{ minWidth: 0 }}>
                <ProductCard product={p} onClick={() => navigate(`/product/${p.id}`)} />
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA Strip ── */}
        <section id="cta-banner-section" ref={ctaRef} className={fadeCls(ctaVisible)} style={{ padding: '24px 0 48px' }}>
          <article className="primary-container home-bento-card" style={{ borderRadius: 28, overflow: 'hidden' }}>
            <div className="cta-strip-inner" style={{ padding: 'clamp(20px, 4vw, 32px)' }}>
              <div className="cta-strip-text" style={{ minWidth: 0 }}>
                <h5 style={{ margin: '0 0 4px', fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)' }}>Ready to get started?</h5>
                <p style={{ margin: 0, opacity: .85, fontSize: 'clamp(13px, 2vw, 15px)' }}>Walk in or book ahead — we're in Fairfield, IL.</p>
              </div>
              <div className="cta-strip-actions">
                <a id="cta-call-phone-link" href="tel:6182041497" className="border" style={{ borderRadius: 999 }}>
                  <i className="material-symbols-outlined">call</i>
                  <span>618-204-1497</span>
                </a>
                <button id="cta-shop-now-btn" className="primary" onClick={() => navigate('/shop')} style={{ borderRadius: 999 }}>
                  <span>Shop Now</span>
                  <i className="material-symbols-outlined">arrow_forward</i>
                </button>
              </div>
            </div>
          </article>
        </section>
      </div>

      {bookingOpen && (
        <BookingWizard
          defaultService={selectedServiceForBooking}
          onClose={() => setBookingOpen(false)}
        />
      )}
    </div>
  )
}