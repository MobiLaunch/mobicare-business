import React, { useEffect, useMemo, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import {
  sbFetchCustomerBookings,
  sbFetchCustomerOrders,
  updateCustomerProfile,
} from '../lib/supabase'
import PageMeta from '../components/PageMeta'
import BackgroundCanvas from '../components/BackgroundCanvas'

const money = (value) => `$${Number(value || 0).toFixed(2)}`

const formatDate = (value) => {
  if (!value) return 'Date unavailable'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function Account() {
  const { user, profile, loading, logout, reloadProfile } = useAuth()
  const [bookings, setBookings] = useState([])
  const [orders, setOrders] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(profile?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setName(profile?.full_name || '')
    setPhone(profile?.phone || '')
  }, [profile])

  useEffect(() => {
    if (!user) return

    let mounted = true
    setLoadingData(true)

    Promise.all([
      sbFetchCustomerBookings(user.id),
      sbFetchCustomerOrders(user.id),
    ]).then(([bookingResult, orderResult]) => {
      if (!mounted) return

      if (bookingResult.error) setError(bookingResult.error.message)
      if (orderResult.error) setError(orderResult.error.message)

      setBookings(bookingResult.data || [])
      setOrders(orderResult.data || [])
      setLoadingData(false)
    })

    return () => {
      mounted = false
    }
  }, [user])

  const upcoming = useMemo(() => {
    const now = Date.now()
    return bookings.filter((b) => {
      const date = new Date(b.appointment_date || b.scheduled_at || b.created_at).getTime()
      return Number.isFinite(date) && date >= now && !['completed', 'cancelled'].includes(String(b.status || '').toLowerCase())
    })
  }, [bookings])

  const saveProfile = async (event) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    const { error: saveError } = await updateCustomerProfile(user.id, {
      full_name: name,
      phone,
    })

    setSaving(false)

    if (saveError) {
      setError(saveError.message || 'Unable to update your profile.')
      return
    }

    await reloadProfile()
    setEditing(false)
    setMessage('Profile updated successfully.')
  }

  if (loading) {
    return (
      <main id="account-loading-container" className="min-height-100vh">
        <BackgroundCanvas />
        <div className="surface-container round large-padding margin center-align">
          <progress className="circle small" />
          <p>Loading your account…</p>
        </div>
      </main>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ message: 'Please sign in to view your account.' }} />
  }

  return (
    <div id="account-page-wrapper" className="min-height-100vh">
      <PageMeta
        title="My Account — Mobicare Device Recovery"
        description="View your repair history, track active orders, and update your Mobicare account profile."
      />

      <BackgroundCanvas />

      <main className="responsive medium-padding">

        <section className="surface-container round large-padding margin">
          <div className="row middle-align wrap">
            <div className="max">
              <div className="chip surface-container-high">
                <i>badge</i>
                <span>Customer Portal</span>
              </div>
              <h1 className="large">
                Hi, {profile?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'there'}
              </h1>
              <p className="on-surface-variant-text">{user.email}</p>
            </div>

            <button id="account-signout-btn" className="border round" type="button" onClick={logout}>
              <i>logout</i>
              <span>Sign Out</span>
            </button>
          </div>
        </section>

        {message && (
          <div className="surface-container-high round small-padding margin">
            <div className="row middle-align no-space">
              <i className="primary-text">check_circle</i>
              <span>{message}</span>
            </div>
          </div>
        )}

        {error && (
          <output className="invalid round small-padding margin" role="alert">
            <div className="row middle-align no-space">
              <i>error</i>
              <span>{error}</span>
            </div>
          </output>
        )}

        <section className="grid margin">
          <div className="s12 m4 l4">
            <article className="surface-container round large-padding">
              <div className="row middle-align no-space">
                <i className="primary-text">schedule</i>
                <span className="on-surface-variant-text small">Upcoming Repairs</span>
              </div>
              <h2 className="large">{upcoming.length}</h2>
            </article>
          </div>
          <div className="s12 m4 l4">
            <article className="surface-container round large-padding">
              <div className="row middle-align no-space">
                <i className="tertiary-text">build</i>
                <span className="on-surface-variant-text small">Total Appointments</span>
              </div>
              <h2 className="large">{bookings.length}</h2>
            </article>
          </div>
          <div className="s12 m4 l4">
            <article className="surface-container round large-padding">
              <div className="row middle-align no-space">
                <i className="primary-text">shopping_bag</i>
                <span className="on-surface-variant-text small">Orders</span>
              </div>
              <h2 className="large">{orders.length}</h2>
            </article>
          </div>
        </section>

        <div className="grid">
          <div className="s12 m12 l8">
            <section className="surface-container round large-padding margin">
              <div className="row middle-align wrap">
                <div className="max">
                  <h2 className="medium">Repair History</h2>
                  <p className="on-surface-variant-text small">Your scheduled service and diagnostic appointments.</p>
                </div>
                <Link className="button primary fill round" to="/repairs">
                  <i>add</i>
                  <span>Book a Repair</span>
                </Link>
              </div>

              {loadingData ? (
                <p className="on-surface-variant-text center-align">Loading appointments…</p>
              ) : bookings.length === 0 ? (
                <div className="surface-container-high round large-padding center-align">
                  <i className="extra on-surface-variant-text">event_busy</i>
                  <p>No repair appointments are linked to this account yet.</p>
                  <Link className="primary-text bold" to="/repairs">Book your first repair →</Link>
                </div>
              ) : (
                <div className="grid">
                  {bookings.map((booking) => (
                    <div key={booking.id} className="s12">
                      <article className="surface-container-high round medium-padding row middle-align space-between wrap">
                        <div className="max">
                          <strong>{booking.device || booking.device_type || 'Device repair'}</strong>
                          <div className="on-surface-variant-text small">{booking.repair || booking.service || 'Repair appointment'}</div>
                          <div className="on-surface-variant-text small">{formatDate(booking.appointment_date || booking.scheduled_at || booking.created_at)}</div>
                        </div>
                        <span className="chip primary round">{booking.status || 'Pending'}</span>
                      </article>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="surface-container round large-padding">
              <h2 className="medium">Purchase History</h2>
              <p className="on-surface-variant-text small">Orders and purchases linked to your account.</p>

              {loadingData ? (
                <p className="on-surface-variant-text center-align">Loading orders…</p>
              ) : orders.length === 0 ? (
                <div className="surface-container-high round large-padding center-align">
                  <i className="extra on-surface-variant-text">receipt_long</i>
                  <p>No purchases have been placed with this account yet.</p>
                  <Link className="primary-text bold" to="/shop">Browse the shop →</Link>
                </div>
              ) : (
                <div className="grid">
                  {orders.map((order) => (
                    <div key={order.id} className="s12">
                      <article className="surface-container-high round medium-padding">
                        <div className="row middle-align space-between wrap">
                          <strong>Order #{order.id}</strong>
                          <strong className="primary-text">{money(order.total)}</strong>
                        </div>
                        <div className="on-surface-variant-text small">{formatDate(order.created_at)}</div>
                        {order.order_items?.length > 0 && (
                          <>
                            <hr />
                            <div className="on-surface-variant-text small">
                              {order.order_items.map((item) => `${item.name} × ${item.qty}`).join(' • ')}
                            </div>
                          </>
                        )}
                      </article>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="s12 m12 l4">
            <section className="surface-container round large-padding">
              <div className="row middle-align space-between">
                <div>
                  <h2 className="medium">Profile Details</h2>
                  <p className="on-surface-variant-text small">Personal contact details.</p>
                </div>
                {!editing && (
                  <button className="border round" type="button" onClick={() => setEditing(true)}>
                    Edit
                  </button>
                )}
              </div>

              {editing ? (
                <form onSubmit={saveProfile} className="grid">
                  <div className="s12 field border round fill">
                    <input id="account-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder=" " required />
                    <label htmlFor="account-name">Full name</label>
                  </div>

                  <div className="s12 field border round fill">
                    <input id="account-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder=" " />
                    <label htmlFor="account-phone">Phone number</label>
                  </div>

                  <div className="s12">
                    <div className="row wrap">
                      <button className="primary fill round" type="submit" disabled={saving}>
                        {saving ? 'Saving…' : 'Save Changes'}
                      </button>
                      <button className="border round" type="button" onClick={() => setEditing(false)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="grid">
                  <div className="s12">
                    <div className="surface-container-high round medium-padding">
                      <span className="on-surface-variant-text small">Name</span>
                      <div><strong>{profile?.full_name || 'Not provided'}</strong></div>
                    </div>
                  </div>

                  <div className="s12">
                    <div className="surface-container-high round medium-padding">
                      <span className="on-surface-variant-text small">Email</span>
                      <div><strong>{user.email}</strong></div>
                    </div>
                  </div>

                  <div className="s12">
                    <div className="surface-container-high round medium-padding">
                      <span className="on-surface-variant-text small">Phone</span>
                      <div><strong>{profile?.phone || 'Not provided'}</strong></div>
                    </div>
                  </div>
                </div>
              )}

              <hr />

              <div className="row middle-align">
                <i className={user.email_confirmed_at ? 'primary-text' : ''}>
                  {user.email_confirmed_at ? 'verified' : 'pending'}
                </i>
                <span>Email verified: <strong>{user.email_confirmed_at ? 'Yes' : 'No'}</strong></span>
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  )
}