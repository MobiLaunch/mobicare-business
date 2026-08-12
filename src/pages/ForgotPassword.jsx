import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { sendCustomerPasswordReset } from '../lib/supabase'
import PageMeta from '../components/PageMeta'
import BackgroundCanvas from '../components/BackgroundCanvas'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')

    const { error: resetError } = await sendCustomerPasswordReset(email)
    setBusy(false)

    if (resetError) {
      setError(resetError.message || 'Unable to send the reset email.')
      return
    }

    setSent(true)
  }

  return (
    <div id="forgot-password-page-wrapper" className="min-height-100vh">
      <PageMeta
        title="Reset Password — Mobicare Device Recovery"
        description="Request a secure password reset link for your Mobicare account."
      />

      <BackgroundCanvas />

      <main className="responsive medium-padding">
        <article className="surface-container round large-padding max">
          {sent ? (
            <div className="center-align">
              <i className="extra primary-text">mark_email_read</i>
              <h1 className="large">Check Your Inbox</h1>
              <p className="on-surface-variant-text">
                If an account matches <strong>{email}</strong>, you will receive password reset
                instructions shortly.
              </p>
              <Link className="button primary fill round large" to="/login">
                <span>Return to Sign In</span>
              </Link>
            </div>
          ) : (
            <>
              <header className="center-align no-padding">
                <div className="chip surface-container-high">
                  <i>lock_reset</i>
                  <span>Security</span>
                </div>

                <h1 className="large">Reset Password</h1>
                <p className="on-surface-variant-text">
                  We'll send a secure reset link to your email address.
                </p>
              </header>

              {error && (
                <output className="invalid round small-padding margin" role="alert" style={{ display: 'block' }}>
                  <div className="row middle-align wrap">
                    <i style={{ flexShrink: 0 }}>error</i>
                    <span className="max" style={{ overflowWrap: 'break-word' }}>{error}</span>
                  </div>
                </output>
              )}

              <form onSubmit={submit}>
                <div className="field border round fill">
                  <input
                    id="forgot-password-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder=" "
                    required
                    disabled={busy}
                  />
                  <label htmlFor="forgot-password-email">Email address</label>
                  <i>mail</i>
                </div>

                <button
                  id="forgot-password-submit-btn"
                  className="primary fill round large"
                  type="submit"
                  disabled={busy}
                  aria-busy={busy}
                >
                  {busy ? (
                    <>
                      <progress className="circle small" />
                      <span>Sending reset link…</span>
                    </>
                  ) : (
                    <>
                      <span>Send Reset Link</span>
                      <i>arrow_forward</i>
                    </>
                  )}
                </button>
              </form>

              <nav className="row wrap center-align small-margin">
                <i className="small">arrow_back</i>
                <Link className="primary-text bold" to="/login">Back to Sign In</Link>
              </nav>
            </>
          )}
        </article>
      </main>
    </div>
  )
}