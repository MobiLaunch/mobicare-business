import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useSiteStore } from '../lib/siteStore'
import PageMeta from '../components/PageMeta'

const VALUE_PROPS = [
  { icon: 'shield', title: '90-Day Warranty', desc: 'Every repair is covered. If the same issue returns within 90 days, we fix it free.' },
  { icon: 'bolt', title: 'Same-Day Service', desc: 'Most screen and battery repairs are done within 1–2 hours while you wait.' },
  { icon: 'star', title: 'Honest Pricing', desc: 'Free diagnostics every time. No hidden fees. You approve the cost before we start.' },
  { icon: 'smartphone', title: 'All Major Brands', desc: 'iPhones, Samsung, Google Pixel, iPads, tablets, and more — we fix them all.' },
]

export default function About() {
  const navigate = useNavigate()
  const about = useSiteStore(s => s.about)
  const business = useSiteStore(s => s.business)
  const repairServices = useSiteStore(s => s.repairServices)

  return (
    <main
      className="page-top responsive"
      style={{
        paddingLeft: 'clamp(12px, 3vw, 24px)',
        paddingRight: 'clamp(12px, 3vw, 24px)',
        paddingBottom: 48,
        overflowX: 'hidden'
      }}
    >
      <PageMeta
        title="About Mobicare — Local Device Repair in Fairfield, Illinois"
        description="Learn more about Mobicare, southern Illinois' trusted repair shop for iPhones, Androids, and laptops. Fast turnarounds, 90-day warranty, honest pricing."
      />

      {/* Hero Header */}
      <div className="center-align" style={{ paddingTop: 'clamp(24px, 5vw, 48px)', paddingBottom: 'clamp(32px, 6vw, 48px)' }}>
        <p className="primary-text bold" style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', margin: 0 }}>
          {about.eyebrow}
        </p>
        <h1 style={{ margin: '8px 0 16px', fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 800, lineHeight: 1.15, overflowWrap: 'break-word' }}>
          {about.headline}
        </h1>
        <p className="on-surface-variant-text" style={{ maxWidth: 640, margin: '0 auto', fontSize: 'clamp(15px, 2vw, 18px)', lineHeight: 1.6, overflowWrap: 'break-word' }}>
          {about.lead}
        </p>
      </div>

      {/* Value Props Grid */}
      <section style={{ paddingBottom: 'clamp(32px, 6vw, 48px)' }}>
        <div className="grid">
          {VALUE_PROPS.map((v, i) => (
            <div key={i} className="s12 m6 l3" style={{ minWidth: 0 }}>
              <article className="surface-container-low" style={{ height: '100%', borderRadius: 24, border: '1px solid var(--outline-variant)', overflow: 'hidden' }}>
                <div className="padding" style={{ padding: 20 }}>
                  <div className="primary-container circle" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <i className="primary-text" style={{ fontSize: 20 }}>{v.icon}</i>
                  </div>
                  <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 700, overflowWrap: 'break-word' }}>{v.title}</h3>
                  <p className="on-surface-variant-text" style={{ fontSize: 13, margin: 0, lineHeight: 1.6, overflowWrap: 'break-word' }}>{v.desc}</p>
                </div>
              </article>
            </div>
          ))}
        </div>
      </section>

      {/* Story & Find Us Section */}
      <section
        className="surface-container-low"
        style={{
          borderRadius: 32,
          margin: '16px 0',
          border: '1px solid var(--outline-variant)',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 32,
            padding: 'clamp(20px, 4vw, 48px)',
            boxSizing: 'border-box',
            width: '100%'
          }}
        >
          {/* Story Content */}
          <div style={{ flex: '1 1 300px', minWidth: 0, maxWidth: '100%', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
            <h2 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: 700, margin: '0 0 16px' }}>Our Story</h2>
            {about.story.map((para, i) => (
              <p key={i} className="on-surface-variant-text" style={{ lineHeight: 1.7, fontSize: 'clamp(14px, 2vw, 16px)', overflowWrap: 'break-word', wordBreak: 'break-word', marginBottom: 16 }}>
                {para}
              </p>
            ))}
            <div className="row wrap" style={{ gap: 12, marginTop: 24 }}>
              <button className="primary round fill" onClick={() => navigate('/shop')} style={{ height: 44, fontWeight: 600 }}>
                <span>Shop Accessories</span><i>arrow_forward</i>
              </button>
              <button className="border round surface-container-high" onClick={() => navigate('/repairs')} style={{ height: 44, fontWeight: 600 }}>
                View Repair Services
              </button>
            </div>
          </div>

          {/* Contact Details Card */}
          <div style={{ flex: '1 1 240px', minWidth: 0, maxWidth: '100%' }}>
            <article className="surface-container-high" style={{ borderRadius: 24, border: '1px solid var(--outline-variant)' }}>
              <div style={{ padding: '20px 24px' }}>
                <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: '1.25rem', fontWeight: 700 }}>Find Us</h3>
                {[
                  { icon: 'call', label: 'Phone', val: business.phone, href: `tel:${business.phone}` },
                  { icon: 'mail', label: 'Email', val: business.email, href: `mailto:${business.email}` },
                  { icon: 'location_on', label: 'Location', val: business.city },
                ].map(row => {
                  const Tag = row.href ? 'a' : 'div'
                  return (
                    <Tag key={row.label} href={row.href} className="row middle-align" style={{ textDecoration: 'none', color: 'inherit', padding: '10px 0', borderBottom: '1px solid var(--outline-variant)' }}>
                      <div className="secondary-container circle" style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i style={{ fontSize: 18 }}>{row.icon}</i>
                      </div>
                      <div style={{ marginLeft: 12, minWidth: 0, overflow: 'hidden' }}>
                        <strong style={{ display: 'block', fontSize: 13 }}>{row.label}</strong>
                        <span className="on-surface-variant-text" style={{ fontSize: 13, display: 'block', overflowWrap: 'break-word', wordBreak: 'break-all' }}>{row.val}</span>
                      </div>
                    </Tag>
                  )
                })}
                <div className="row middle-align" style={{ padding: '10px 0' }}>
                  <div className="secondary-container circle" style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i style={{ fontSize: 18 }}>schedule</i>
                  </div>
                  <div style={{ marginLeft: 12, minWidth: 0 }}>
                    <strong style={{ display: 'block', fontSize: 13 }}>Hours</strong>
                    {business.hours.map(h => (
                      <span key={h.days} className="on-surface-variant-text" style={{ fontSize: 12, display: 'block', overflowWrap: 'break-word' }}>{h.days}: {h.hours}</span>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>


      {/* Services List Preview */}
      <section style={{ padding: 'clamp(32px, 6vw, 48px) 0' }}>
        <p className="primary-text bold" style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', margin: 0 }}>What We Do</p>
        <h2 style={{ margin: '8px 0 20px', fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: 700 }}>Repair Services</h2>
        <div className="grid">
          {repairServices.map(svc => (
            <div key={svc.id} className="s12 m6 l4" style={{ minWidth: 0 }}>
              <article className="surface-container-low" style={{ borderRadius: 16, border: '1px solid var(--outline-variant)', overflow: 'hidden' }}>
                <div className="row middle-align wrap padding" style={{ justifyContent: 'space-between', gap: 8 }}>
                  <strong style={{ fontSize: 14, minWidth: 120, overflowWrap: 'break-word' }}>{svc.name}</strong>
                  <span className="primary-text bold" style={{ fontSize: 13 }}>{svc.priceRange}</span>
                </div>
              </article>
            </div>
          ))}
        </div>
        <button className="primary round fill" onClick={() => navigate('/repairs')} style={{ marginTop: 24, fontWeight: 600 }}>
          <span>Full Repair Details</span><i>arrow_forward</i>
        </button>
      </section>
    </main>
  )
}