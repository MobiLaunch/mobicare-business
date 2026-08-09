import React, { useState } from 'react'
import { useSiteStore } from '../lib/siteStore'
import BookingWizard from '../components/BookingWizard'
import PageMeta from '../components/PageMeta'

const FAQS = [
  { q: 'How long do repairs take?', a: 'Most screen and battery replacements are done same-day, often within 1–2 hours. More complex repairs like water damage or data recovery may take 24–72 hours.' },
  { q: 'Do you offer a warranty on repairs?', a: 'Yes — all our repairs come with a 90-day warranty covering parts and labor. If the same issue returns within 90 days, we fix it at no charge.' },
  { q: 'Do you fix all phone brands?', a: 'We repair iPhones, Samsung, Google Pixel, LG, Motorola, OnePlus, and most other Android brands. We also repair tablets and iPads.' },
  { q: 'Is there a diagnostic fee?', a: "Diagnostics are always free. We'll identify the problem and give you a quote with no obligation to proceed." },
  { q: 'Do I need an appointment?', a: 'Walk-ins are welcome, but booking ahead guarantees your time slot and lets us have parts ready. Use the "Book Appointment" button anytime.' },
  { q: "What if my device can't be fixed?", a: "If we can't repair your device, you pay nothing for the diagnostic. We'll also advise on data recovery options if your data is at risk." },
]

export default function Repairs() {
  const [bookingOpen, setBookingOpen] = useState(false)
  const [defaultService, setDefaultService] = useState(null)
  const [openFaq, setOpenFaq] = useState(null)

  const repairServices = useSiteStore(s => s.repairServices)
  const business = useSiteStore(s => s.business)

  const openBooking = (serviceName = null) => {
    setDefaultService(serviceName)
    setBookingOpen(true)
  }

  return (
    <div className="page-top" style={{ overflowX: 'hidden' }}>
      <PageMeta
        title="Device Repair Services — Screen, Battery & More | Mobicare Fairfield IL"
        description="Professional same-day phone repairs, cracked screens, dead batteries, water damage diagnostics and repairs for iPhones, iPads, Samsung and more in Fairfield, IL."
      />

      {/* ── Hero Section ── */}
      <section>
        <div
          className="responsive center-align"
          style={{
            paddingTop: 'clamp(32px, 8vw, 64px)',
            paddingBottom: 'clamp(40px, 8vw, 64px)',
            paddingLeft: 'clamp(12px, 3vw, 24px)',
            paddingRight: 'clamp(12px, 3vw, 24px)'
          }}
        >
          <p className="primary-text bold" style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', margin: 0 }}>
            Device Repair Services
          </p>
          <h1 style={{ margin: '8px 0 16px', fontSize: 'clamp(2.2rem, 6vw, 3.5rem)', fontWeight: 800, lineHeight: 1.1, overflowWrap: 'break-word' }}>
            We Fix What's Broken.
          </h1>
          <p className="on-surface-variant-text" style={{ maxWidth: 580, margin: '0 auto 32px', fontSize: 'clamp(15px, 2vw, 18px)', lineHeight: 1.6, overflowWrap: 'break-word' }}>
            Fast, honest repairs on every major brand. Free diagnostics, 90-day warranty, same-day turnaround on most jobs.
          </p>

          <div className="row wrap" style={{ justifyContent: 'center', gap: 12, marginBottom: 40 }}>
            <button className="primary fill round" onClick={() => openBooking()} style={{ padding: '8px 24px', fontWeight: 600 }}>
              <i>build</i>
              <span>Book a Repair</span>
            </button>
            <a href={`tel:${business.phone}`} className="button border round surface-container-high" style={{ textDecoration: 'none', padding: '8px 24px', fontWeight: 600 }}>
              <i>call</i>
              <span>{business.phone}</span>
            </a>
          </div>

          <div className="row wrap" style={{ justifyContent: 'center', gap: 'clamp(16px, 4vw, 32px)' }}>
            {[['Free', 'Diagnostics'], ['90-Day', 'Warranty'], ['Same-Day', 'Most Repairs'], ['Walk-Ins', 'Welcome']].map(([a, b]) => (
              <div key={a} className="center-align" style={{ minWidth: 120 }}>
                <strong style={{ display: 'block', fontSize: 'clamp(16px, 2.5vw, 20px)' }}>{a}</strong>
                <span className="on-surface-variant-text" style={{ fontSize: 'clamp(12px, 1.5vw, 14px)' }}>{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services Grid ── */}
      <section className="surface-container-low">
        <div
          className="responsive"
          style={{
            paddingTop: 'clamp(40px, 6vw, 64px)',
            paddingBottom: 'clamp(40px, 6vw, 64px)',
            paddingLeft: 'clamp(12px, 3vw, 24px)',
            paddingRight: 'clamp(12px, 3vw, 24px)'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <p className="primary-text bold" style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', margin: 0 }}>What We Fix</p>
            <h2 style={{ margin: '8px 0 0', fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 700 }}>Repair Services</h2>
          </div>

          <div className="grid">
            {repairServices.map(svc => (
              <div key={svc.id} id={svc.id} className="s12 m6 l4" style={{ minWidth: 0 }}>
                <article
                  className="surface-container-lowest"
                  style={{
                    height: '100%',
                    borderRadius: 28,
                    border: '1px solid var(--outline-variant)',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <div className="padding" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <div className="row middle-align wrap" style={{ marginBottom: 16, gap: 12 }}>
                      <div className="primary-container padding circle" style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="primary-text">build</i>
                      </div>
                      <div className="max" />
                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ display: 'block', fontSize: 15 }}>{svc.priceRange}</strong>
                        <span className="on-surface-variant-text" style={{ fontSize: 12 }}>
                          <i style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 2 }}>schedule</i>
                          {svc.duration}
                        </span>
                      </div>
                    </div>

                    <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: 700, overflowWrap: 'break-word' }}>
                      {svc.name}
                    </h3>
                    <p className="on-surface-variant-text" style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 20, flexGrow: 1, overflowWrap: 'break-word' }}>
                      {svc.description}
                    </p>

                    {svc.variants?.length > 0 && (
                      <div className="surface-container-low" style={{ marginBottom: 16, borderRadius: 16, padding: '8px 12px' }}>
                        {svc.variants.map((v, idx) => (
                          <div key={idx} className="row wrap" style={{ justifyContent: 'space-between', fontSize: 13, padding: '4px 0', gap: 8 }}>
                            <span className="on-surface-variant-text" style={{ overflowWrap: 'break-word', flex: 1, minWidth: 100 }}>{v.name}</span>
                            <strong style={{ whiteSpace: 'nowrap' }}>{v.price}</strong>
                          </div>
                        ))}
                      </div>
                    )}

                    <button className="responsive border round" onClick={() => openBooking(svc.name)} style={{ fontWeight: 600, width: '100%', justifyContent: 'center' }}>
                      <span>Book This Repair</span>
                      <i>arrow_forward</i>
                    </button>
                  </div>
                </article>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Mobicare / Walk-in Section ── */}
      <section>
        <div
          className="responsive grid"
          style={{
            paddingTop: 'clamp(48px, 8vw, 80px)',
            paddingBottom: 'clamp(48px, 8vw, 80px)',
            paddingLeft: 'clamp(12px, 3vw, 24px)',
            paddingRight: 'clamp(12px, 3vw, 24px)',
            gap: 32
          }}
        >
          <div className="s12 m6" style={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p className="primary-text bold" style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', margin: 0 }}>Why Mobicare</p>
            <h2 style={{ margin: '8px 0 16px', fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 700 }}>Repair Done Right.</h2>
            <p className="on-surface-variant-text" style={{ fontSize: 'clamp(15px, 2vw, 16px)', lineHeight: 1.7, marginBottom: 24, overflowWrap: 'break-word' }}>
              We're a local shop — not a chain. Every repair is done by an experienced technician
              who cares about getting it right the first time. We use quality parts and stand behind
              our work with a real warranty.
            </p>

            <div style={{ marginBottom: 24 }}>
              {[
                { icon: 'shield', text: '90-day parts & labor warranty on every job' },
                { icon: 'bolt', text: 'Most repairs completed same-day or faster' },
                { icon: 'schedule', text: 'Free diagnostic — know the cost before you commit' },
                { icon: 'smartphone', text: 'OEM-quality parts for iPhones & major Android brands' },
              ].map((item, i) => (
                <div key={i} className="row middle-align wrap" style={{ gap: 12, marginBottom: 12 }}>
                  <div className="primary-container circle" style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="primary-text" style={{ fontSize: 16 }}>{item.icon}</i>
                  </div>
                  <span style={{ fontSize: 14, flex: 1, minWidth: 200, overflowWrap: 'break-word' }}>{item.text}</span>
                </div>
              ))}
            </div>

            <div>
              <button className="primary round fill" onClick={() => openBooking()} style={{ fontWeight: 600 }}>
                <span>Schedule Repair</span><i>arrow_forward</i>
              </button>
            </div>
          </div>

          <div className="s12 m6" style={{ minWidth: 0 }}>
            <article className="surface-container-high" style={{ borderRadius: 32, border: '1px solid var(--outline-variant)' }}>
              <div className="padding" style={{ padding: 'clamp(24px, 4vw, 32px)' }}>
                <h3 style={{ marginTop: 0, fontSize: '1.5rem', fontWeight: 700 }}>Walk In or Call First</h3>
                <p className="on-surface-variant-text" style={{ fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
                  No appointment required for diagnostics. Drop in anytime during business hours.
                </p>

                <a href={`tel:${business.phone}`} className="row middle-align surface-container-low" style={{ textDecoration: 'none', color: 'inherit', marginBottom: 16, padding: '12px 16px', borderRadius: 16, border: '1px solid var(--outline-variant)' }}>
                  <i className="primary-text" style={{ fontSize: 24 }}>call</i>
                  <div style={{ marginLeft: 16, minWidth: 0 }}>
                    <strong style={{ display: 'block', fontSize: 14 }}>Call Us</strong>
                    <span className="on-surface-variant-text" style={{ fontSize: 13 }}>{business.phone}</span>
                  </div>
                </a>

                <div className="row middle-align surface-container-low" style={{ marginBottom: 24, padding: '12px 16px', borderRadius: 16, border: '1px solid var(--outline-variant)' }}>
                  <i className="primary-text" style={{ fontSize: 24 }}>schedule</i>
                  <div style={{ marginLeft: 16, minWidth: 0 }}>
                    <strong style={{ display: 'block', fontSize: 14 }}>Hours</strong>
                    {business.hours.map(h => (
                      <span key={h.days} className="on-surface-variant-text" style={{ fontSize: 13, display: 'block' }}>{h.days}: {h.hours}</span>
                    ))}
                  </div>
                </div>

                <button className="responsive primary round fill" onClick={() => openBooking()} style={{ fontWeight: 600, width: '100%', justifyContent: 'center' }}>
                  Book Appointment
                </button>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ── FAQ Section ── */}
      <section className="surface-container-low">
        <div
          className="responsive center-align"
          style={{
            maxWidth: 720,
            margin: '0 auto',
            paddingTop: 'clamp(48px, 8vw, 80px)',
            paddingBottom: 'clamp(48px, 8vw, 80px)',
            paddingLeft: 'clamp(12px, 3vw, 24px)',
            paddingRight: 'clamp(12px, 3vw, 24px)'
          }}
        >
          <p className="primary-text bold" style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', margin: 0 }}>FAQ</p>
          <h2 style={{ margin: '8px 0 32px', fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 700 }}>Common Questions</h2>

          <div style={{ textAlign: 'left' }}>
            {FAQS.map((faq, i) => (
              <article
                key={i}
                className="surface-container-highest"
                style={{
                  marginBottom: 12,
                  cursor: 'pointer',
                  borderRadius: 20,
                  border: '1px solid var(--outline-variant)',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <div className="row middle-align padding wrap" style={{ gap: 12 }}>
                  <strong style={{ flex: 1, fontSize: 15, minWidth: 200, overflowWrap: 'break-word', lineHeight: 1.4 }}>{faq.q}</strong>
                  <i className="primary-text" style={{ fontSize: 20 }}>{openFaq === i ? 'remove' : 'add'}</i>
                </div>
                {openFaq === i && (
                  <p className="on-surface-variant-text" style={{ margin: '0 16px 20px', fontSize: 14, lineHeight: 1.6, overflowWrap: 'break-word' }}>
                    {faq.a}
                  </p>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      {bookingOpen && (
        <BookingWizard
          defaultService={defaultService}
          onClose={() => { setBookingOpen(false); setDefaultService(null) }}
        />
      )}
    </div>
  )
}