import React, { useState, useEffect } from 'react'
import { useToastStore, useProductStore } from '../lib/store'
import { useSiteStore } from '../lib/siteStore'
import { sbFetchBookings, sbUpdateBookingStatus, sbUpdateBooking, isSupabaseConfigured } from '../lib/supabase'

const STATUS_OPTIONS = ['pending', 'confirmed', 'completed', 'cancelled', 'no-show']
const STATUS_COLOR = {
  pending: 'orange-container',
  confirmed: 'primary-container',
  completed: 'green-container',
  cancelled: 'error-container',
  'no-show': 'error-container',
}

export default function Bookings() {
  const addToast = useToastStore(s => s.add)
  const usingSupabase = useProductStore(s => s.usingSupabase)
  const repairServices = useSiteStore(s => s.repairServices)

  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')

  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState(null)

  const load = async () => {
    if (!isSupabaseConfigured()) return
    setLoading(true)
    const data = await sbFetchBookings()
    setLoading(false)
    if (data) setBookings(data)
    else addToast('Could not load appointments from Supabase', 'error')
  }

  useEffect(() => { load() }, [usingSupabase])

  const handleStatusChange = async (id, status) => {
    const previousStatus = bookings.find(x => x.id === id)?.status
    setBookings(b => b.map(x => x.id === id ? { ...x, status } : x))
    if (selected?.id === id) {
      setSelected(s => ({ ...s, status }))
      if (editForm?.id === id) setEditForm(f => ({ ...f, status }))
    }
    if (isSupabaseConfigured()) {
      const ok = await sbUpdateBookingStatus(id, status)
      if (ok) {
        addToast(`Appointment status updated to "${status}"`, 'success')
      } else {
        setBookings(b => b.map(x => x.id === id ? { ...x, status: previousStatus } : x))
        if (selected?.id === id) {
          setSelected(s => ({ ...s, status: previousStatus }))
          if (editForm?.id === id) setEditForm(f => ({ ...f, status: previousStatus }))
        }
        addToast('Could not update appointment status', 'error')
      }
    }
  }

  const startEditing = () => { setEditForm({ ...selected }); setIsEditing(true) }

  const handleSaveUpdates = async () => {
    if (!editForm.customer_name || !editForm.appt_date || !editForm.appt_time) {
      addToast('Customer Name, Appointment Date, and Time are required.', 'error')
      return
    }
    if (isSupabaseConfigured()) {
      const ok = await sbUpdateBooking(selected.id, {
        customer_name: editForm.customer_name,
        customer_phone: editForm.customer_phone,
        customer_email: editForm.customer_email,
        service: editForm.service,
        device_type: editForm.device_type,
        device_model: editForm.device_model,
        appt_date: editForm.appt_date,
        appt_time: editForm.appt_time,
        issue: editForm.issue || '',
        notes: editForm.notes || '',
        status: editForm.status
      })
      if (ok) {
        setBookings(bs => bs.map(b => b.id === selected.id ? { ...editForm } : b))
        setSelected({ ...editForm })
        setIsEditing(false)
        addToast('Appointment details updated', 'success')
      } else {
        addToast('Could not update appointment details', 'error')
      }
    }
  }

  const closeModal = () => { setSelected(null); setIsEditing(false) }
  const filtered = statusFilter === 'all' ? bookings : bookings.filter(b => b.status === statusFilter)

  return (
    <div id="admin-bookings-page" className="admin-page bookings-page">
      {/* Header Section */}
      <div id="bookings-header-section" className="admin-page-header row wrap middle-align">
        <div className="admin-page-heading">
          <span className="chip small primary-container margin-bottom-s">Repair Telemetry</span>
          <h2 className="admin-page-title">Service Bookings</h2>
          <p className="admin-page-description on-surface-variant-text">
            {bookings.length} total scheduled repair appointment{bookings.length !== 1 ? 's' : ''}
            {!usingSupabase ? ' — (Offline fallback mode)' : ''}
          </p>
        </div>

        <div className="row wrap gap-s middle-align" style={{ marginTop: 8 }}>
          <button
            className={`chip small ${statusFilter === 'all' ? 'primary-container' : 'surface-container-high'}`}
            onClick={() => setStatusFilter('all')}
            style={{ fontWeight: 700, borderRadius: 999 }}
          >
            All ({bookings.length})
          </button>
          {STATUS_OPTIONS.map(s => {
            const count = bookings.filter(b => b.status === s).length
            if (count === 0 && statusFilter !== s) return null
            return (
              <button
                key={s}
                className={`chip small ${statusFilter === s ? 'primary-container' : 'surface-container-high'}`}
                onClick={() => setStatusFilter(s)}
                style={{ fontWeight: 700, borderRadius: 999 }}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)} ({count})
              </button>
            )
          })}
          <button className="border round small" onClick={load} disabled={loading} style={{ fontWeight: 700 }}>
            <i className={loading ? 'rotate' : ''}>refresh</i>
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Main Table / State View */}
      {!isSupabaseConfigured() ? (
        <div
          id="bookings-no-db-state"
          style={{
            background: 'var(--surface-container-low)',
            borderRadius: 28,
            border: '1px solid color-mix(in srgb, var(--outline-variant) 50%, transparent)',
            padding: 56,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12
          }}
        >
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--surface-container-high)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="on-surface-variant-text" style={{ fontSize: 32 }}>cloud_off</i>
          </div>
          <h4 style={{ margin: 0 }}>Supabase Database Not Connected</h4>
          <p className="on-surface-variant-text" style={{ margin: 0, fontSize: 14, maxWidth: 440 }}>
            Customer repair appointments are stored in your cloud database. Connect Supabase credentials in Settings to manage live bookings.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div
          id="bookings-empty-state"
          style={{
            background: 'var(--surface-container-low)',
            borderRadius: 28,
            border: '1px solid color-mix(in srgb, var(--outline-variant) 50%, transparent)',
            padding: 56,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12
          }}
        >
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--surface-container-high)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="on-surface-variant-text" style={{ fontSize: 32 }}>calendar_month</i>
          </div>
          <h4 style={{ margin: 0 }}>No appointments found</h4>
          <p className="on-surface-variant-text" style={{ margin: 0, fontSize: 14 }}>
            {statusFilter === 'all'
              ? 'Appointments booked by customers will appear here automatically.'
              : `No appointments currently marked as "${statusFilter}".`}
          </p>
        </div>
      ) : (
        <div
          id="bookings-table-wrapper"
          style={{
            background: 'var(--surface-container-low)',
            borderRadius: 28,
            border: '1px solid color-mix(in srgb, var(--outline-variant) 50%, transparent)',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)'
          }}
        >
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="stripes" style={{ minWidth: 840, width: '100%' }}>
              <thead>
                <tr>
                  <th>Schedule Time</th>
                  <th>Customer Information</th>
                  <th>Requested Service</th>
                  <th>Target Device</th>
                  <th>Fulfillment Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(b => {
                  const svc = repairServices.find(s => s.id === b.service || s.name?.toLowerCase() === b.service?.toLowerCase())
                  const serviceLabel = svc?.name || b.service?.replace(/-/g, ' ') || 'Repair Service'
                  return (
                    <tr key={b.id}>
                      <td>
                        <strong style={{ display: 'block', fontSize: 14, color: 'var(--primary)' }}>{b.appt_date}</strong>
                        <span className="on-surface-variant-text" style={{ fontSize: 12 }}>{b.appt_time}</span>
                      </td>
                      <td>
                        <strong style={{ display: 'block', fontSize: 14 }}>{b.customer_name}</strong>
                        <span className="on-surface-variant-text" style={{ fontSize: 12 }}>{b.customer_phone || b.customer_email || 'No phone provided'}</span>
                      </td>
                      <td style={{ textTransform: 'capitalize', fontSize: 13 }}>
                        <div className="row middle-align gap-xs">
                          <i className="primary-text" style={{ fontSize: 16 }}>build</i>
                          <strong>{serviceLabel}</strong>
                        </div>
                      </td>
                      <td>
                        <strong style={{ display: 'block', fontSize: 13 }}>{b.device_type}</strong>
                        <span className="on-surface-variant-text" style={{ fontSize: 12 }}>{b.device_model}</span>
                      </td>
                      <td>
                        <div className="field label border round" style={{ minWidth: 140, margin: 0 }}>
                          <select
                            value={b.status}
                            onChange={e => handleStatusChange(b.id, e.target.value)}
                            className={STATUS_COLOR[b.status] || 'surface-container-high'}
                            style={{ fontWeight: 700 }}
                          >
                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                          </select>
                        </div>
                      </td>
                      <td className="on-surface-variant-text" style={{ fontSize: 12 }}>
                        {b.created_at ? new Date(b.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        <button className="circle transparent small" onClick={() => setSelected(b)} title="View appointment inspector">
                          <i>visibility</i>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inspector / Editor Modal */}
      <dialog id="booking-inspector-modal" className={selected ? 'active' : ''} style={{ maxWidth: 620, borderRadius: 28, padding: 32 }}>
        {selected && (
          <div>
            <div className="row middle-align" style={{ marginBottom: 20 }}>
              <div>
                <span className="chip small primary-container margin-bottom-s">Appointment Inspector</span>
                <h4 style={{ margin: 0, fontWeight: 800 }}>Booking #{selected.id}</h4>
              </div>
              <div className="max" />
              {!isEditing ? (
                <button className="border round small" onClick={startEditing} style={{ fontWeight: 700 }}>
                  <i>edit</i><span>Edit Details</span>
                </button>
              ) : (
                <div className="row gap-s">
                  <button className="border round small" onClick={() => setIsEditing(false)}>Cancel</button>
                  <button className="primary round small" onClick={handleSaveUpdates}>
                    <i>check</i><span>Save</span>
                  </button>
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="grid" style={{ rowGap: 14, columnGap: 14 }}>
                <div className="s12 m6 field label border round">
                  <input value={editForm.customer_name} onChange={e => setEditForm(f => ({ ...f, customer_name: e.target.value }))} placeholder=" " />
                  <label>Customer Name *</label>
                </div>
                <div className="s12 m6 field label border round">
                  <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                  <label>Status</label>
                </div>
                <div className="s12 m6 field label border round">
                  <input value={editForm.customer_phone} onChange={e => setEditForm(f => ({ ...f, customer_phone: e.target.value }))} placeholder=" " />
                  <label>Customer Phone</label>
                </div>
                <div className="s12 m6 field label border round">
                  <input value={editForm.customer_email} onChange={e => setEditForm(f => ({ ...f, customer_email: e.target.value }))} placeholder=" " />
                  <label>Customer Email</label>
                </div>
                <div className="s12 m6 field label border round">
                  <input value={editForm.appt_date} onChange={e => setEditForm(f => ({ ...f, appt_date: e.target.value }))} placeholder=" " />
                  <label>Appointment Date *</label>
                </div>
                <div className="s12 m6 field label border round">
                  <input value={editForm.appt_time} onChange={e => setEditForm(f => ({ ...f, appt_time: e.target.value }))} placeholder=" " />
                  <label>Appointment Time *</label>
                </div>
                <div className="s12 m6 field label border round">
                  <input value={editForm.device_type} onChange={e => setEditForm(f => ({ ...f, device_type: e.target.value }))} placeholder=" " />
                  <label>Device Category</label>
                </div>
                <div className="s12 m6 field label border round">
                  <input value={editForm.device_model} onChange={e => setEditForm(f => ({ ...f, device_model: e.target.value }))} placeholder=" " />
                  <label>Device Specific Model</label>
                </div>
                <div className="s12 field label border round">
                  <select value={editForm.service} onChange={e => setEditForm(f => ({ ...f, service: e.target.value }))}>
                    {repairServices.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <label>Service Type</label>
                </div>
                <div className="s12 field label border round">
                  <textarea rows={2} value={editForm.issue || ''} onChange={e => setEditForm(f => ({ ...f, issue: e.target.value }))} placeholder=" " />
                  <label>Customer Issue Description</label>
                </div>
                <div className="s12 field label border round">
                  <textarea rows={2} value={editForm.notes || ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} placeholder=" " />
                  <label>Admin Technician Notes</label>
                </div>
              </div>
            ) : (
              <div>
                <div className="field label border round" style={{ maxWidth: 240, marginBottom: 24 }}>
                  <select value={selected.status} onChange={e => handleStatusChange(selected.id, e.target.value)}>
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                  <label>Fulfillment Status</label>
                </div>

                <h6 style={{ margin: '0 0 10px', fontWeight: 800 }}>Appointment Schedule & Device</h6>
                <div style={{ background: 'var(--surface-container-low)', borderRadius: 20, border: '1px solid color-mix(in srgb, var(--outline-variant) 40%, transparent)', padding: 16, marginBottom: 24 }}>
                  {[
                    ['Requested Service', repairServices.find(s => s.id === selected.service || s.name?.toLowerCase() === selected.service?.toLowerCase())?.name || selected.service?.replace(/-/g, ' ')],
                    ['Scheduled Date', selected.appt_date],
                    ['Time Window', selected.appt_time],
                    ['Device Type', selected.device_type],
                    ['Device Model', selected.device_model],
                    selected.issue && ['Reported Issue', selected.issue],
                    selected.notes && ['Technician Notes', selected.notes],
                  ].filter(Boolean).map(([label, val]) => (
                    <div key={label} className="row" style={{ padding: '8px 0', borderBottom: '1px solid color-mix(in srgb, var(--outline-variant) 30%, transparent)', justifyContent: 'space-between', gap: 16 }}>
                      <span className="on-surface-variant-text" style={{ fontSize: 13 }}>{label}</span>
                      <strong style={{ fontSize: 13, textAlign: 'right', textTransform: label === 'Requested Service' ? 'capitalize' : 'none' }}>{val}</strong>
                    </div>
                  ))}
                </div>

                <h6 style={{ margin: '0 0 10px', fontWeight: 800 }}>Customer Contact Details</h6>
                <div style={{ background: 'var(--surface-container-low)', borderRadius: 20, border: '1px solid color-mix(in srgb, var(--outline-variant) 40%, transparent)', padding: 16, marginBottom: 24 }}>
                  <div className="row" style={{ padding: '8px 0', borderBottom: '1px solid color-mix(in srgb, var(--outline-variant) 30%, transparent)', justifyContent: 'space-between' }}>
                    <span className="on-surface-variant-text" style={{ fontSize: 13 }}>Full Name</span>
                    <strong style={{ fontSize: 13 }}>{selected.customer_name}</strong>
                  </div>
                  <div className="row" style={{ padding: '8px 0', borderBottom: '1px solid color-mix(in srgb, var(--outline-variant) 30%, transparent)', justifyContent: 'space-between' }}>
                    <span className="on-surface-variant-text" style={{ fontSize: 13 }}>Phone Number</span>
                    <a href={`tel:${selected.customer_phone}`} className="primary-text" style={{ fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>{selected.customer_phone}</a>
                  </div>
                  <div className="row" style={{ padding: '8px 0', justifyContent: 'space-between' }}>
                    <span className="on-surface-variant-text" style={{ fontSize: 13 }}>Email Address</span>
                    <a href={`mailto:${selected.customer_email}`} className="primary-text" style={{ fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>{selected.customer_email}</a>
                  </div>
                </div>
              </div>
            )}

            <nav className="right-align" style={{ marginTop: 24 }}>
              <button className="primary round" onClick={closeModal}>Close</button>
            </nav>
          </div>
        )}
      </dialog>
    </div>
  )
}

