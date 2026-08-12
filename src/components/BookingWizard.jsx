import React, { useState, useEffect } from 'react'
import emailjs from '@emailjs/browser'
import { getEmailJSConfig, BUSINESS } from '../lib/config'
import { useSiteStore } from '../lib/siteStore'
import { useToastStore } from '../lib/store'
import { isSupabaseConfigured, getClient } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const STEPS = ['Service', 'Device', 'Schedule', 'Contact', 'Confirm']
const TIMES = ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM']

function getNextDays(n = 14) {
  const days = []; const today = new Date()
  for (let i = 1; i <= n + 4; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i)
    if (d.getDay() !== 0) days.push(d)
    if (days.length >= n) break
  }
  return days
}

export default function BookingWizard({ onClose, defaultService = null }) {
  const { user, profile } = useAuth()
  const repairServices = useSiteStore(s => s.repairServices)
  const deviceTypes = useSiteStore(s => s.deviceTypes) || []

  const [step, setStep] = useState(0)
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const addToast = useToastStore(s => s.add)

  const [form, setForm] = useState(() => {
    const initialContact = {
      name: profile?.full_name || '',
      phone: profile?.phone || '',
      email: user?.email || '',
    }

    if (defaultService) {
      const match = repairServices.find(s => s.name.toLowerCase() === defaultService.toLowerCase())
      if (match) {
        return {
          service: match.id,
          variant: '',
          deviceType: '',
          deviceModel: '',
          issue: '',
          date: '',
          time: '',
          ...initialContact,
          notes: '',
        }
      }
    }
    return {
      service: '',
      variant: '',
      deviceType: '',
      deviceModel: '',
      issue: '',
      date: '',
      time: '',
      ...initialContact,
      notes: '',
    }
  })

  useEffect(() => {
    if (defaultService) {
      const match = repairServices.find(s => s.name.toLowerCase() === defaultService.toLowerCase())
      if (match) setStep(1)
    }
  }, [])

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const selectedService = repairServices.find(s => s.id === form.service)
  const selectedDeviceType = deviceTypes.find(d => d.name === form.deviceType || d.id === form.deviceType)

  const canNext = () => {
    if (step === 0) return !!form.service && (!selectedService?.variants?.length || !!form.variant)
    if (step === 1) return !!form.deviceType && !!form.deviceModel
    if (step === 2) return !!form.date && !!form.time
    if (step === 3) return !!form.name && !!form.phone && !!form.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
    return true
  }

  const handleSubmit = async () => {
    setSending(true)
    const service = repairServices.find(s => s.id === form.service)
    const serviceLabel = form.variant ? `${service?.name} (${form.variant})` : (service?.name || form.service)

    if (!import.meta.env.DEV) {
      try {
        const sb = getClient()
        const { data: { session } } = sb?.auth ? await sb.auth.getSession() : { data: { session: null } }

        const response = await fetch('/api/create-booking', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token
              ? { Authorization: `Bearer ${session.access_token}` }
              : {}),
          },
          body: JSON.stringify({ ...form, service: serviceLabel }),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Unable to submit booking.')
      } catch (bookingError) {
        addToast(bookingError.message || 'Submission blocked. Please try again.', 'error')
        setSending(false)
        return
      }
    }

    try {
      const emailjsConfig = getEmailJSConfig()
      if (!emailjsConfig.serviceId || !emailjsConfig.bookingTemplateId || !emailjsConfig.publicKey) {
        console.warn('[EmailJS] Missing configuration. Missing keys:', {
          serviceId: !emailjsConfig.serviceId,
          bookingTemplateId: !emailjsConfig.bookingTemplateId,
          publicKey: !emailjsConfig.publicKey,
        })
      } else {
        await emailjs.send(
          emailjsConfig.serviceId,
          emailjsConfig.bookingTemplateId,
          {
            to_email: BUSINESS.email,
            recipient_email: BUSINESS.email,
            customer_name: form.name,
            customer_phone: form.phone,
            customer_email: form.email,
            email: form.email,
            reply_to: form.email,
            service_type: serviceLabel,
            device_type: form.deviceType,
            device_model: form.deviceModel,
            issue_description: form.issue || 'None',
            appointment_date: form.date,
            appointment_time: form.time,
            special_notes: form.notes || 'None',
          },
          emailjsConfig.publicKey
        )
      }
    } catch (e) {
      console.error('[EmailJS error]:', e?.status || e, e?.text || e?.message || e)
      if (!isSupabaseConfigured()) addToast('Booking submitted! (Check console for EmailJS configuration)', 'info')
    }

    setSending(false)
    setDone(true)
  }

  const days = getNextDays()

  const DetailRow = ({ label, value }) => (
    <div className="row padding small-padding" style={{ borderBottom: '1px solid var(--outline-variant)', justifyContent: 'space-between', gap: 12 }}>
      <span className="on-surface-variant-text" style={{ fontSize: 12 }}>{label}</span>
      <strong style={{ fontSize: 13, textAlign: 'right' }}>{value}</strong>
    </div>
  )

  if (done) return (
    <dialog className="active" onClick={e => e.target === e.currentTarget && onClose()} style={{ maxWidth: 460 }}>
      <div className="center-align" style={{ padding: '8px 8px 0' }}>
        <div className="green-container padding circle" style={{ width: 64, height: 64, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <i className="extra green-text">check</i>
        </div>
        <h5>You're all set!</h5>
        <p className="on-surface-variant-text" style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
          Your appointment request has been submitted. We'll confirm via phone or email within 2 hours during business hours.
        </p>
      </div>
      <article className="border no-elevate no-padding" style={{ marginBottom: 20, textAlign: 'left' }}>
        <DetailRow label="Service" value={`${selectedService?.name || ''}${form.variant ? ` (${form.variant})` : ''}`} />
        <DetailRow label="Device" value={`${form.deviceType} — ${form.deviceModel}`} />
        <DetailRow label="Date" value={`${form.date} at ${form.time}`} />
        <DetailRow label="Contact" value={`${form.name} · ${form.phone}`} />
      </article>
      <button className="responsive primary" onClick={onClose}>Done</button>
    </dialog>
  )

  return (
    <dialog className="active" onClick={e => e.target === e.currentTarget && onClose()} style={{ maxWidth: 620 }}>
      <div className="row middle-align" style={{ marginBottom: 4 }}>
        <div>
          <h5 style={{ margin: 0 }}>Book Appointment</h5>
          <p className="on-surface-variant-text" style={{ margin: '2px 0 0', fontSize: 12 }}>Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>
        </div>
        <div className="max" />
        <button className="circle transparent" onClick={onClose}><i>close</i></button>
      </div>

      <nav className="row" style={{ margin: '16px 0', gap: 4 }}>
        {STEPS.map((s, i) => (
          <div key={s} className="row middle-align max" style={{ gap: 6 }}>
            <span className={`chip small ${i <= step ? 'primary' : 'border'}`} style={{ minWidth: 22, justifyContent: 'center', padding: 0, width: 22, height: 22 }}>
              {i < step ? <i style={{ fontSize: 12 }}>check</i> : i + 1}
            </span>
            <span className="on-surface-variant-text" style={{ fontSize: 10, display: window.innerWidth < 500 ? 'none' : 'inline' }}>{s}</span>
          </div>
        ))}
      </nav>

      <div style={{ maxHeight: '55vh', overflowY: 'auto', padding: '4px 2px' }}>
        {step === 0 && (
          <div>
            <h6>What needs fixing?</h6>
            <p className="on-surface-variant-text" style={{ fontSize: 13, marginBottom: 16 }}>Select the repair service you need.</p>
            <div className="grid">
              {repairServices.map(svc => {
                const selected = form.service === svc.id
                return (
                  <div key={svc.id} className="s6 m4">
                    <article
                      className={selected ? 'primary-container no-elevate' : 'border no-elevate'}
                      style={{ cursor: 'pointer', height: '100%' }}
                      onClick={() => { update('service', svc.id); update('variant', '') }}
                    >
                      <div className="padding small-padding center-align">
                        <i style={{ fontSize: 22 }}>build</i>
                        <strong style={{ display: 'block', fontSize: 12, margin: '6px 0 2px' }}>{svc.name}</strong>
                        <span style={{ fontSize: 11, display: 'block' }}>{svc.priceRange}</span>
                        <span className="on-surface-variant-text" style={{ fontSize: 10 }}>{svc.duration}</span>
                      </div>
                    </article>
                  </div>
                )
              })}
            </div>

            {selectedService?.variants?.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <h6 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>Select Part Option</h6>
                <div className="grid">
                  {selectedService.variants.map((v, idx) => {
                    const selected = form.variant === v.name
                    return (
                      <div key={idx} className="s12 m6">
                        <article className={selected ? 'primary-container no-elevate no-padding' : 'border no-elevate no-padding'} style={{ cursor: 'pointer' }} onClick={() => update('variant', v.name)}>
                          <div className="row middle-align padding small-padding" style={{ justifyContent: 'space-between' }}>
                            <div>
                              <strong style={{ display: 'block', fontSize: 13 }}>{v.name}</strong>
                              <span style={{ fontSize: 12 }}>{v.price}</span>
                            </div>
                            {selected && <i>check_circle</i>}
                          </div>
                        </article>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div>
            <h6>Tell us about your device</h6>
            <p className="on-surface-variant-text" style={{ fontSize: 13, marginBottom: 16 }}>We support most phones, tablets, and gaming consoles.</p>
            <div className="row wrap" style={{ gap: 8, marginBottom: 16 }}>
              {deviceTypes.map(d => (
                <button
                  key={d.id || d.name}
                  className={`chip ${form.deviceType === d.name ? 'primary' : 'border'}`}
                  onClick={() => { update('deviceType', d.name); update('deviceModel', '') }}
                >
                  {d.name}
                </button>
              ))}
            </div>

            {selectedDeviceType?.models?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <label className="field-label">Select Model</label>
                <div className="row wrap" style={{ gap: 8, marginTop: 8 }}>
                  {selectedDeviceType.models.map(m => (
                    <button key={m} className={`chip ${form.deviceModel === m ? 'primary' : 'border'}`} onClick={() => update('deviceModel', m)}>{m}</button>
                  ))}
                  <button
                    className={`chip ${form.deviceModel && !selectedDeviceType.models.includes(form.deviceModel) ? 'primary' : 'border'}`}
                    onClick={() => update('deviceModel', '')}
                  >
                    Other Model…
                  </button>
                </div>
              </div>
            )}

            {(!selectedDeviceType?.models?.length || (form.deviceModel && !selectedDeviceType.models.includes(form.deviceModel)) || !form.deviceModel) && (
              <div className="field label border round" style={{ marginBottom: 16 }}>
                <input placeholder=" " value={form.deviceModel} onChange={e => update('deviceModel', e.target.value)} />
                <label>Exact Model Name</label>
              </div>
            )}

            <div className="field label border round">
              <textarea placeholder=" " rows={3} value={form.issue} onChange={e => update('issue', e.target.value)} />
              <label>Describe the issue (optional)</label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h6>Pick a date &amp; time</h6>
            <p className="on-surface-variant-text" style={{ fontSize: 13, marginBottom: 16 }}>Monday – Saturday. Sundays closed.</p>
            <div className="grid" style={{ marginBottom: 16 }}>
              {days.map(d => {
                const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                const selected = form.date === label
                return (
                  <div key={label} className="s3 m2">
                    <article className={selected ? 'primary-container no-elevate no-padding' : 'border no-elevate no-padding'} style={{ cursor: 'pointer' }} onClick={() => update('date', label)}>
                      <div className="center-align padding small-padding">
                        <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.05em', display: 'block' }}>{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                        <strong style={{ fontSize: 16, display: 'block' }}>{d.getDate()}</strong>
                        <span style={{ fontSize: 10 }}>{d.toLocaleDateString('en-US', { month: 'short' })}</span>
                      </div>
                    </article>
                  </div>
                )
              })}
            </div>
            {form.date && (
              <div className="row wrap" style={{ gap: 8 }}>
                {TIMES.map(t => (
                  <button key={t} className={`chip ${form.time === t ? 'primary' : 'border'}`} onClick={() => update('time', t)}>{t}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div>
            <h6>Your contact info</h6>
            <p className="on-surface-variant-text" style={{ fontSize: 13, marginBottom: 16 }}>We'll confirm your appointment and reach out with any questions.</p>
            <div className="field label border round">
              <input placeholder=" " value={form.name} onChange={e => update('name', e.target.value)} />
              <label>Full Name</label>
            </div>
            <div className="field label border round">
              <input type="tel" placeholder=" " value={form.phone} onChange={e => update('phone', e.target.value)} />
              <label>Phone Number</label>
            </div>
            <div className="field label border round">
              <input type="email" placeholder=" " value={form.email} onChange={e => update('email', e.target.value)} />
              <label>Email Address</label>
            </div>
            <div className="field label border round">
              <textarea placeholder=" " rows={2} value={form.notes} onChange={e => update('notes', e.target.value)} />
              <label>Additional Notes (optional)</label>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h6>Review your booking</h6>
            <p className="on-surface-variant-text" style={{ fontSize: 13, marginBottom: 16 }}>Everything look right?</p>
            <article className="border no-elevate no-padding" style={{ marginBottom: 16 }}>
              <DetailRow label="Service" value={`${selectedService?.name || ''}${form.variant ? ` (${form.variant})` : ''}`} />
              <DetailRow label="Device" value={`${form.deviceType} — ${form.deviceModel}`} />
              {form.issue && <DetailRow label="Issue" value={form.issue} />}
              <DetailRow label="Date & Time" value={`${form.date} at ${form.time}`} />
              <DetailRow label="Name" value={form.name} />
              <DetailRow label="Phone" value={form.phone} />
              <DetailRow label="Email" value={form.email} />
              {form.notes && <DetailRow label="Notes" value={form.notes} />}
            </article>
            <p className="on-surface-variant-text" style={{ fontSize: 12, lineHeight: 1.6 }}>
              By confirming, you agree to bring your device in at the scheduled time. Same-day cancellations should be made by phone.
            </p>
          </div>
        )}
      </div>

      <nav className="right-align" style={{ marginTop: 16 }}>
        <button className="border" onClick={() => step === 0 ? onClose() : setStep(s => s - 1)}>
          <i>chevron_left</i><span>{step === 0 ? 'Cancel' : 'Back'}</span>
        </button>
        {step < 4 ? (
          <button className="primary" disabled={!canNext()} onClick={() => setStep(s => s + 1)}>
            <span>Continue</span><i>chevron_right</i>
          </button>
        ) : (
          <button className="primary" disabled={sending} onClick={handleSubmit}>
            <span>{sending ? 'Sending…' : 'Confirm Booking'}</span>{!sending && <i>check</i>}
          </button>
        )}
      </nav>
    </dialog>
  )
}