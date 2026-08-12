import React, { useState } from 'react'
import BookingWizard from '../components/BookingWizard'
import PageMeta from '../components/PageMeta'

const REPAIR_CATEGORIES_BENTO = [
  {
    id: 'screen-repair',
    name: 'Screen Repair',
    icon: 'smartphone',
    price: '$49 – $249',
    time: '1–2 hrs',
    desc: 'Cracked glass, shattered OLED, touch issues, or black display lines. OEM-quality displays backed by a 90-day warranty.'
  },
  {
    id: 'battery-replacement',
    name: 'Battery Replacement',
    icon: 'battery_full',
    price: '$39 – $89',
    time: '30–60 mins',
    desc: 'Fast battery drain, overheating, swollen cell, or phone shutting off at 20%. Premium high-capacity battery replacements.'
  },
  {
    id: 'water-damage',
    name: 'Water Damage Recovery',
    icon: 'water_drop',
    price: '$59 – $149',
    time: 'Same Day',
    desc: 'Ultrasonic logic board cleaning, corrosion removal, & multi-point liquid damage diagnostics for submerged electronics.'
  },
  {
    id: 'charging-port',
    name: 'Charging Port Repair',
    icon: 'ev_station',
    price: '$29 – $79',
    time: '30–45 mins',
    desc: 'Loose cable connection, dirty port, or phone won\'t charge. Debris cleaning or complete port assembly swap.'
  },
  {
    id: 'camera-repair',
    name: 'Camera & Lens Repair',
    icon: 'photo_camera',
    price: '$39 – $119',
    time: '45–60 mins',
    desc: 'Cracked camera lens glass, blurry autofocus, black rear/front camera preview screen, or lens vibration.'
  },
  {
    id: 'data-recovery',
    name: 'Data Recovery & Transfer',
    icon: 'sd_card',
    price: '$69 – $199',
    time: '1–2 Days',
    desc: 'Extract photos, contacts, texts, and documents from dead, locked, water-damaged, or broken smartphones.'
  },
  {
    id: 'tablet-repair',
    name: 'iPad & Tablet Repair',
    icon: 'tablet_mac',
    price: '$59 – $199',
    time: 'Same Day',
    desc: 'Glass digitizer, LCD display, charging port, and battery replacement for all iPad Air, Pro, & Mini models.'
  },
  {
    id: 'back-glass',
    name: 'Laser Back Glass Repair',
    icon: 'devices',
    price: '$49 – $129',
    time: '2–3 hrs',
    desc: 'Precision laser rear glass removal and housing replacement for iPhone 12, 13, 14, and 15 series.'
  }
]

const FAQS = [
  { q: 'How long do repairs take?', a: 'Most screen and battery replacements are completed same-day, typically within 1–2 hours. Water damage recovery or data extraction can take 24–48 hours.' },
  { q: 'Do you offer a warranty on repairs?', a: 'Yes! All repairs include a 90-day warranty covering parts and labor. If the issue persists within 90 days, we service it free of charge.' },
  { q: 'Do you fix all phone brands?', a: 'We repair iPhones, Samsung Galaxy, Google Pixel, Motorola, LG, OnePlus, as well as iPads and Android tablets.' },
  { q: 'Is there a diagnostic fee?', a: "Diagnostics are always 100% free. We'll examine your device and provide a zero-obligation quote before starting work." },
  { q: 'Do I need an appointment?', a: 'Walk-ins are always welcome! However, booking ahead reserves your parts and guarantees immediate service when you arrive.' },
]

export default function Repairs() {
  const [bookingOpen, setBookingOpen] = useState(false)
  const [selectedService, setSelectedService] = useState(null)
  const [openFaq, setOpenFaq] = useState(null)

  const handleBook = (serviceName = null) => {
    setSelectedService(serviceName)
    setBookingOpen(true)
  }

  return (
    <main
      className="page-top responsive"
      style={{
        paddingLeft: 'clamp(12px, 3vw, 24px)',
        paddingRight: 'clamp(12px, 3vw, 24px)',
        paddingBottom: 64,
        overflowX: 'hidden'
      }}
    >
      <PageMeta
        title="Device Repair Services — Screen, Battery & More | Mobicare Fairfield IL"
        description="Professional same-day phone repairs, cracked screens, dead batteries, water damage diagnostics and repairs for iPhones, iPads, Samsung and more in Fairfield, IL."
      />

      {/* ── Hero Header ── */}
      <section style={{ paddingTop: 'clamp(24px, 5vw, 48px)', paddingBottom: 32, textAlign: 'center' }}>
        <p className="primary-text bold upper" style={{ fontSize: 11, letterSpacing: '0.12em', margin: '0 0 6px' }}>
          Device Repair Services
        </p>
        <h1 style={{ margin: '0 0 12px', fontSize: 'clamp(2.2rem, 5vw, 3.4rem)', fontWeight: 800, lineHeight: 1.15 }}>
          We Fix What's Broken.
        </h1>
        <p className="on-surface-variant-text" style={{ maxWidth: 640, margin: '0 auto 28px', fontSize: 'clamp(15px, 2vw, 18px)', lineHeight: 1.6 }}>
          Fast, honest repairs on every major device brand. Free diagnostics, 90-day warranty, same-day turnaround on most jobs.
        </p>

        {/* Feature Badges */}
        <div className="row wrap center-align" style={{ gap: 12, justifyContent: 'center', marginBottom: 32 }}>
          {['Free Diagnostics', '90-Day Warranty', 'Same-Day Repairs', 'Walk-Ins Welcome'].map((badge, idx) => (
            <span key={idx} className="chip surface-container-high" style={{ fontSize: 12, fontWeight: 600, border: '1px solid var(--outline-variant)' }}>
              ✓ {badge}
            </span>
          ))}
        </div>
      </section>

      {/* ── Repairs Categories Bento Grid ── */}
      <section id="repairs-grid-section" style={{ marginBottom: 56 }}>
        <div className="grid">
          {REPAIR_CATEGORIES_BENTO.map(svc => (
            <div id={`repair-card-${svc.id}`} key={svc.id} className="s12 m6 l3" style={{ minWidth: 0 }}>
              <div
                className="home-bento-card"
                style={{
                  padding: 24,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 20
                }}
              >
                <div>
                  {/* Icon + Price & Time Chips */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div
                      className="primary-container circle"
                      style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    >
                      <i className="material-symbols-outlined" style={{ fontSize: 24 }}>{svc.icon}</i>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                      <span className="chip small primary-container" style={{ fontSize: 11, fontWeight: 700 }}>
                        {svc.price}
                      </span>
                      <span className="on-surface-variant-text" style={{ fontSize: 11, fontWeight: 600 }}>
                        ⏱ {svc.time}
                      </span>
                    </div>
                  </div>

                  <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px', overflowWrap: 'break-word' }}>
                    {svc.name}
                  </h3>
                  <p className="on-surface-variant-text" style={{ fontSize: 13, margin: 0, lineHeight: 1.5, overflowWrap: 'break-word' }}>
                    {svc.desc}
                  </p>
                </div>

                <button
                  id={`repairs-page-book-btn-${svc.id}`}
                  type="button"
                  className="primary fill round"
                  style={{
                    width: '100%',
                    margin: 0,
                    boxSizing: 'border-box',
                    padding: '7px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    lineHeight: 1.2
                  }}
                  onClick={() => handleBook(svc.name)}
                >
                  <i className="material-symbols-outlined" style={{ fontSize: 14 }}>calendar_month</i>
                  <span>Book Repair</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ Section ── */}
      <section style={{ maxWidth: 840, margin: '0 auto 56px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <p className="primary-text bold upper" style={{ fontSize: 11, letterSpacing: '0.1em', margin: '0 0 4px' }}>
            Got Questions?
          </p>
          <h2 style={{ margin: 0, fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)', fontWeight: 800 }}>
            Frequently Asked Questions
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {FAQS.map((faq, index) => {
            const isOpen = openFaq === index
            return (
              <div
                key={index}
                className="home-bento-card"
                style={{ borderRadius: 18, overflow: 'hidden', transition: 'all 0.2s ease' }}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  style={{
                    width: '100%',
                    margin: 0,
                    boxSizing: 'border-box',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: 'var(--on-surface)',
                    fontFamily: 'inherit',
                    fontWeight: 700,
                    fontSize: 15
                  }}
                >
                  <span>{faq.q}</span>
                  <i className="material-symbols-outlined" style={{ transition: 'transform 0.2s ease', transform: isOpen ? 'rotate(180deg)' : 'none', color: 'var(--primary)' }}>
                    expand_more
                  </i>
                </button>
                {isOpen && (
                  <div style={{ padding: '0 20px 18px', fontSize: 14, color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>
                    {faq.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Booking Modal */}
      {bookingOpen && (
        <BookingWizard
          defaultService={selectedService}
          onClose={() => setBookingOpen(false)}
        />
      )}
    </main>
  )
}