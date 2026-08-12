import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getClient, updateCustomerPassword } from '../lib/supabase'
import PageMeta from '../components/PageMeta'
import BackgroundCanvas from '../components/BackgroundCanvas'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    const sb = getClient()
    if (!sb) {
      setError('Supabase is not configured.')
      return
    }

    const { data: listener } = sb.auth.onAuthStateChange((_event, session) => {
      if (session) setReady(true)
    })

    sb.auth.getSession().then(({ data }) => {
      if (data?.session) setReady(true)
    })

    return () => listener?.subscription?.unsubscribe()
  }, [])

  const submit = async (event) => {
    event.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setBusy(true)
    const { error: updateError } = await updateCustomerPassword(password)
    setBusy(false)

    if (updateError) {
      setError(updateError.message || 'Unable to update your password.')
      return
    }

    setDone(true)
    setTimeout(() => navigate('/login', { replace: true }), 1800)
  }

  return (
    <div id="reset-password-page-wrapper" className="min-height-100vh">
      <PageMeta
        title="Choose New Password — Mobicare Device Recovery"
        description="Set a new secure password for your Mobicare customer account."
      />

      <BackgroundCanvas />

      <main className="responsive medium-padding">
        <article className="surface-container round large-padding max">
          {done ? (
            <div className="center-align">
              <i className="extra primary-text">check_circle</i>
              <h1 className="large">Password Updated</h1>
              <p className="on-surface-variant-text">
                Your password has been changed successfully. Redirecting you to sign in…
              </p>
              <Link className="button primary fill round large" to="/login">
                <span>Sign In Now</span>
              </Link>
            </div>
          ) : (
            <>
              <header className="center-align no-padding">
                <div className="chip surface-container-high">
                  <i>vpn_key</i>
                  <span>Security</span>
                </div>

                <h1 className="large">New Password</h1>
                <p className="on-surface-variant-text">
                  Create a secure password with at least 8 characters.
                </p>
              </header>

              {!ready && !error && (
                <div className="center-align medium-padding">
                  <progress className="circle" />
                  <p className="on-surface-variant-text">Authenticating secure reset session…</p>
                </div>
              )}

              {error && (
                <output className="invalid round small-padding margin" role="alert" style={{ display: 'block' }}>
                  <div className="row middle-align wrap">
                    <i style={{ flexShrink: 0 }}>error</i>
                    <span className="max" style={{ overflowWrap: 'break-word' }}>{error}</span>
                  </div>
                </output>
              )}

              {ready && (
                <form onSubmit={submit} className="grid">
                  <div className="s12 field border round fill">
                    <input
                      id="reset-password-new"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder=" "
                      required
                      minLength={8}
                      disabled={busy}
                    />
                    <label htmlFor="reset-password-new">New password</label>
                    <i>lock</i>
                  </div>

                  <div className="s12 field border round fill">
                    <input
                      id="reset-password-confirm"
                      type="password"
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder=" "
                      required
                      minLength={8}
                      disabled={busy}
                    />
                    <label htmlFor="reset-password-confirm">Confirm new password</label>
                    <i>lock</i>
                  </div>

                  <div className="s12">
                    <button
                      id="reset-password-submit-btn"
                      className="primary fill round large"
                      type="submit"
                      disabled={busy}
                      aria-busy={busy}
                      style={{ width: '100%' }}
                    >
                      {busy ? (
                        <>
                          <progress className="circle small" />
                          <span>Updating password…</span>
                        </>
                      ) : (
                        <>
                          <span>Update Password</span>
                          <i>arrow_forward</i>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </article>
      </main>
    </div>
  )
}