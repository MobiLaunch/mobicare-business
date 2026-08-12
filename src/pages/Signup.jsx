import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { isSupabaseConfigured } from '../lib/supabase'
import PageMeta from '../components/PageMeta'
import BackgroundCanvas from '../components/BackgroundCanvas'

export default function Signup() {
  const { user, loading, signUp } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', confirm: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState(false)

  useEffect(() => {
    if (!loading && user) navigate('/account', { replace: true })
  }, [loading, user, navigate])

  const update = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }))
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')

    if (!isSupabaseConfigured()) {
      setError('Customer accounts are not configured yet. Please check system settings.')
      return
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (form.password !== form.confirm) {
      setError('Passwords do not match.')
      return
    }

    setBusy(true)
    const result = await signUp(form.email, form.password, {
      full_name: form.name,
      phone: form.phone,
    })
    setBusy(false)

    if (result.error) {
      setError(result.error.message || 'Unable to create your account.')
      return
    }

    setCreated(true)
  }

  if (created) {
    return (
      <div id="signup-confirmation-page-wrapper" className="page min-height-100vh">
        <PageMeta
          title="Verify Your Account — Mobicare Device Recovery"
          description="Verification link sent. Verify your email to access your Mobicare account."
        />
        <BackgroundCanvas />

        <main className="responsive medium-padding">
          <article className="surface-container round large-padding max center-align">
            <i className="extra primary-text">mark_email_read</i>
            <h1 className="large">Check Your Email</h1>
            <p className="on-surface-variant-text">
              We sent a verification link to <strong>{form.email}</strong>. Click the link in
              the message to confirm your address, then sign in.
            </p>
            <Link className="button primary fill round large" to="/login">
              <span>Go to Sign In</span>
              <i>arrow_forward</i>
            </Link>
          </article>
        </main>
      </div>
    )
  }

  return (
    <div id="signup-page-wrapper" className="page min-height-100vh">
      <PageMeta
        title="Create Account — Mobicare Device Recovery"
        description="Register for a Mobicare account to track repairs and manage store orders."
      />
      <BackgroundCanvas />

      <main className="responsive medium-padding">
        <article className="surface-container round large-padding max">
          <header className="center-align no-padding">
            <div className="chip surface-container-high">
              <i>person_add</i>
              <span>Join Mobicare</span>
            </div>

            <h1 className="large">Create Account</h1>
            <p className="on-surface-variant-text">
              Keep your repair appointments and purchases synchronized.
            </p>
          </header>

          {error && (
            <output className="invalid round small-padding margin" role="alert">
              <div className="row middle-align no-space">
                <i>error</i>
                <span>{error}</span>
              </div>
            </output>
          )}

          <form onSubmit={submit} className="grid">
            <div className="field border round fill">
              <input
                id="signup-name"
                type="text"
                autoComplete="name"
                value={form.name}
                onChange={update('name')}
                placeholder=" "
                required
                disabled={busy}
              />
              <label htmlFor="signup-name">Full name</label>
              <i>person</i>
            </div>

            <div className="field border round fill">
              <input
                id="signup-phone"
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={update('phone')}
                placeholder=" "
                disabled={busy}
              />
              <label htmlFor="signup-phone">Phone number</label>
              <i>call</i>
            </div>

            <div className="field border round fill">
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={update('email')}
                placeholder=" "
                required
                disabled={busy}
              />
              <label htmlFor="signup-email">Email address</label>
              <i>mail</i>
            </div>

            <div className="field border round fill">
              <input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={update('password')}
                placeholder=" "
                minLength={8}
                required
                disabled={busy}
              />
              <label htmlFor="signup-password">Password (8+ characters)</label>
              <i>lock</i>
            </div>

            <div className="field border round fill">
              <input
                id="signup-confirm"
                type="password"
                autoComplete="new-password"
                value={form.confirm}
                onChange={update('confirm')}
                placeholder=" "
                minLength={8}
                required
                disabled={busy}
              />
              <label htmlFor="signup-confirm">Confirm password</label>
              <i>lock</i>
            </div>

            <button
              id="signup-submit-btn"
              className="primary fill round large"
              type="submit"
              disabled={busy}
              aria-busy={busy}
            >
              {busy ? (
                <>
                  <progress className="circle small" />
                  <span>Creating account…</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <i>arrow_forward</i>
                </>
              )}
            </button>
          </form>

          <nav className="row wrap center-align small-margin">
            <span className="on-surface-variant-text">Already have an account?</span>
            <Link className="primary-text bold" to="/login">Sign in</Link>
          </nav>
        </article>
      </main>
    </div>
  )
}
