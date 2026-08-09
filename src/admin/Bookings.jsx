import React, { useState, useEffect } from 'react'
import { useToastStore, useProductStore } from '../lib/store'
import { useSiteStore } from '../lib/siteStore'
import { sbFetchBookings, sbUpdateBookingStatus, sbUpdateBooking, isSupabaseConfigured } from '../lib/supabase'

const STATUS_OPTIONS = ['pending','confirmed','completed','cancelled','no-show']
const STATUS_COLOR = {
  pending: 'orange-container', confirmed: 'primary-container',
  completed: 'green-container', cancelled: 'error-container', 'no-show': 'error-container',
}

export default function Bookings() {
  const addToast       = useToastStore(s => s.add)
  const usingSupabase   = useProductStore(s => s.usingSupabase)
  const repairServices  = useSiteStore(s => s.repairServices)

  const [bookings,     setBookings]     = useState([])
  const [loading,      setLoading]      = useState(false)
  const [selected,     setSelected]     = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')

  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm]   = useState(null)

  const load = async () => {
    if (!isSupabaseConfigured()) return
    setLoading(true)
    const data = await sbFetchBookings()
    setLoading(false)
    if (data) setBookings(data)
    else addToast('Could not load bookings', 'error')
  }

  useEffect(() => { load() }, [usingSupabase])

  const handleStatusChange = async (id, status) => {
    setBookings(b => b.map(x => x.id === id ? { ...x, status } : x))
    if (selected?.id === id) {
      setSelected(s => ({ ...s, status }))
      if (editForm?.id === id) setEditForm(f => ({ ...f, status }))
    }
    if (isSupabaseConfigured()) {
      const ok = await sbUpdateBookingStatus(id, status)
      if (ok) addToast(`Booking marked "${status}"`, 'success')
    }
  }

  const startEditing = () => { setEditForm({ ...selected }); setIsEditing(true) }

  const handleSaveUpdates = async () => {
    if (!editForm.customer_name || !editForm.appt_date || !editForm.appt_time) {
      addToast('Name, Date, and Time are required fields.', 'error')
      return
    }
    if (isSupabaseConfigured()) {
      const ok = await sbUpdateBooking(selected.id, {
        customer_name: editForm.customer_name, customer_phone: editForm.customer_phone,
        customer_email: editForm.customer_email, service: editForm.service,
        device_type: editForm.device_type, device_model: editForm.device_model,
        appt_date: editForm.appt_date, appt_time: editForm.appt_time,
        issue: editForm.issue || '', notes: editForm.notes || '', status: editForm.status
      })
      if (ok) {
        setBookings(bs => bs.map(b => b.id === selected.id ? { ...editForm } : b))
        setSelected({ ...editForm })
        setIsEditing(false)
        addToast('Booking updated successfully', 'success')
      } else {
        addToast('Could not update booking details', 'error')
      }
    }
  }

  const closeModal = () => { setSelected(null); setIsEditing(false) }
  const filtered = statusFilter === 'all' ? bookings : bookings.filter(b => b.status === statusFilter)

  return (
    <div className="admin-page bookings-page">
      <div className="admin-page-header row middle-align">
        <div>
          <h4 style={{ margin: 0 }}>Bookings</h4>
          <p className="on-surface-variant-text" style={{ margin: 0, fontSize: 13 }}>
            {bookings.length} appointment{bookings.length !== 1 ? 's' : ''}
            {!usingSupabase ? ' — connect Supabase to see live data' : ''}
          </p>
        </div>
        <div className="max" />
        <div className="field label border round admin-filter-field">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <label>Status</label>
        </div>
        <button className="border" onClick={load} disabled={loading}>
          <i className={loading ? 'rotate' : ''}>refresh</i>
          <span>Refresh</span>
        </button>
      </div>

      {!isSupabaseConfigured() ? (
        <article className="center-align padding">
          <i className="extra on-surface-variant-text">calendar_month</i>
          <h6>Supabase not connected</h6>
          <p className="on-surface-variant-text">Bookings are saved to Supabase. Connect your database in <strong>Settings</strong> to see appointments here.</p>
        </article>
      ) : filtered.length === 0 ? (
        <article className="center-align padding">
          <i className="extra on-surface-variant-text">calendar_month</i>
          <h6>No bookings yet</h6>
          <p className="on-surface-variant-text">Appointments booked through your site will appear here.</p>
        </article>
      ) : (
        <article className="no-padding" style={{ overflowX: 'auto' }}>
          <table className="stripes">
            <thead>
              <tr><th>Date / Time</th><th>Customer</th><th>Service</th><th>Device</th><th>Status</th><th>Booked</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map(b => {
                const svc = repairServices.find(s => s.id === b.service || s.name.toLowerCase() === b.service?.toLowerCase())
                const serviceLabel = svc?.name || b.service?.replace(/-/g, ' ')
                return (
                  <tr key={b.id}>
                    <td>
                      <strong style={{ display: 'block', fontSize: 13 }}>{b.appt_date}</strong>
                      <span className="on-surface-variant-text" style={{ fontSize: 11 }}>{b.appt_time}</span>
                    </td>
                    <td>
                      <strong style={{ display: 'block', fontSize: 13 }}>{b.customer_name}</strong>
                      <span className="on-surface-variant-text" style={{ fontSize: 11 }}>{b.customer_phone}</span>
                    </td>
                    <td style={{ textTransform: 'capitalize', fontSize: 13 }}>
                      <i className="primary-text" style={{ fontSize: 15, verticalAlign: 'middle', marginRight: 4 }}>build</i>
                      {serviceLabel}
                    </td>
                    <td>
                      <strong style={{ display: 'block', fontSize: 13 }}>{b.device_type}</strong>
                      <span className="on-surface-variant-text" style={{ fontSize: 11 }}>{b.device_model}</span>
                    </td>
                    <td>
                      <div className="field label border round" style={{ minWidth: 130, margin: 0 }}>
                        <select value={b.status} onChange={e => handleStatusChange(b.id, e.target.value)} className={STATUS_COLOR[b.status]}>
                          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </td>
                    <td className="on-surface-variant-text" style={{ fontSize: 12 }}>{new Date(b.created_at).toLocaleDateString()}</td>
                    <td><button className="circle transparent small" onClick={() => setSelected(b)}><i>visibility</i></button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </article>
      )}

      <dialog className={selected ? 'active' : ''} style={{ maxWidth: 560 }}>
        {selected && (
          <>
            <div className="row middle-align" style={{ marginBottom: 16 }}>
              <h5 style={{ margin: 0 }}>Booking #{selected.id}</h5>
              <div className="max" />
              {!isEditing ? (
                <button className="border small" onClick={startEditing}>
                  <i>edit</i><span>Edit</span>
                </button>
              ) : (
                <>
                  <button className="border small" onClick={() => setIsEditing(false)}>Cancel</button>
                  <button className="primary small" onClick={handleSaveUpdates}>
                    <i>check</i><span>Save</span>
                  </button>
                </>
              )}
            </div>

            {isEditing ? (
              <div className="grid">
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
                  <label>Device Type</label>
                </div>
                <div className="s12 m6 field label border round">
                  <input value={editForm.device_model} onChange={e => setEditForm(f => ({ ...f, device_model: e.target.value }))} placeholder=" " />
                  <label>Device Model</label>
                </div>
                <div className="s12 field label border round">
                  <select value={editForm.service} onChange={e => setEditForm(f => ({ ...f, service: e.target.value }))}>
                    {repairServices.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <label>Service</label>
                </div>
                <div className="s12 field label border round">
                  <textarea rows={2} value={editForm.issue || ''} onChange={e => setEditForm(f => ({ ...f, issue: e.target.value }))} placeholder=" " />
                  <label>Issue Description</label>
                </div>
                <div className="s12 field label border round">
                  <textarea rows={2} value={editForm.notes || ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} placeholder=" " />
                  <label>Notes / Admin Comments</label>
                </div>
              </div>
            ) : (
              <>
                <div className="field label border round" style={{ maxWidth: 220, marginBottom: 20 }}>
                  <select value={selected.status} onChange={e => handleStatusChange(selected.id, e.target.value)}>
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                  <label>Status</label>
                </div>

                <h6 style={{ marginBottom: 8 }}>Appointment</h6>
                <article className="border no-elevate no-padding" style={{ marginBottom: 20 }}>
                  {[
                    ['Service', repairServices.find(s => s.id === selected.service || s.name.toLowerCase() === selected.service?.toLowerCase())?.name || selected.service?.replace(/-/g, ' ')],
                    ['Date', selected.appt_date],
                    ['Time', selected.appt_time],
                    ['Device Type', selected.device_type],
                    ['Model', selected.device_model],
                    selected.issue && ['Issue', selected.issue],
                    selected.notes && ['Notes', selected.notes],
                  ].filter(Boolean).map(([label, val]) => (
                    <div key={label} className="row padding small-padding" style={{ borderBottom: '1px solid var(--outline-variant)', justifyContent: 'space-between', gap: 12 }}>
                      <span className="on-surface-variant-text" style={{ fontSize: 12 }}>{label}</span>
                      <strong style={{ fontSize: 13, textAlign: 'right', textTransform: label === 'Service' ? 'capitalize' : 'none' }}>{val}</strong>
                    </div>
                  ))}
                </article>

                <h6 style={{ marginBottom: 8 }}>Customer</h6>
                <article className="border no-elevate no-padding" style={{ marginBottom: 20 }}>
                  <div className="row padding small-padding" style={{ borderBottom: '1px solid var(--outline-variant)', justifyContent: 'space-between' }}>
                    <span className="on-surface-variant-text" style={{ fontSize: 12 }}>Name</span>
                    <strong style={{ fontSize: 13 }}>{selected.customer_name}</strong>
                  </div>
                  <div className="row padding small-padding" style={{ borderBottom: '1px solid var(--outline-variant)', justifyContent: 'space-between' }}>
                    <span className="on-surface-variant-text" style={{ fontSize: 12 }}>Phone</span>
                    <a href={`tel:${selected.customer_phone}`} className="primary-text" style={{ fontSize: 13, textDecoration: 'none' }}>{selected.customer_phone}</a>
                  </div>
                  <div className="row padding small-padding" style={{ justifyContent: 'space-between' }}>
                    <span className="on-surface-variant-text" style={{ fontSize: 12 }}>Email</span>
                    <a href={`mailto:${selected.customer_email}`} className="primary-text" style={{ fontSize: 13, textDecoration: 'none' }}>{selected.customer_email}</a>
                  </div>
                </article>
              </>
            )}

            <nav className="right-align">
              <button className="border" onClick={closeModal}>Close</button>
            </nav>
          </>
        )}
      </dialog>
    </div>
  )
}
