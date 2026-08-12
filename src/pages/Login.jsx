import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { isSupabaseConfigured } from '../lib/supabase'
import PageMeta from '../components/PageMeta'
import BackgroundCanvas from '../components/BackgroundCanvas'

export default function Login() {
  const { user, loading, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(location.state?.message || '')

  useEffect(() => {
    if (!loading && user) {
      navigate('/account', { replace: true })
    }
  }, [loading, user, navigate])

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')

    if (!isSupabaseConfigured()) {
      setError('Customer accounts are not configured yet. Please check system settings.')
      return
    }

    setBusy(true)

    try {
      const result = await signIn(email, password)

      if (result.error) {
        setError(result.error.message || 'Unable to sign in.')
        return
      }

      if (!result.data?.user?.email_confirmed_at) {
        setError('Please verify your email address before signing in.')
        return
      }

      navigate(location.state?.from || '/account', { replace: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div id="login-page-wrapper" className="page min-height-100vh">
      <PageMeta
        title="Sign In — Mobicare Device Recovery"
        description="Sign in to your Mobicare account to track repairs, review orders, and manage appointments."
      />

      <BackgroundCanvas />

      <main className="responsive medium-padding">
        <article className="surface-container round large-padding max">
          <header className="center-align no-padding">
            <div className="chip surface-container-high">
              <i>lock</i>
              <span>Mobicare Account</span>
            </div>

            <h1 className="large">Welcome Back</h1>
            <p className="on-surface-variant-text">
              Sign in to manage your repairs and orders.
            </p>
          </header>

          {notice && (
            <article className="surface-container-high round small-padding margin">
              <div className="row middle-align no-space">
                <i className="primary-text">info</i>
                <span>{notice}</span>
              </div>
            </article>
          )}

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
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=" "
                required
                disabled={busy}
              />
              <label htmlFor="login-email">Email address</label>
              <i>mail</i>
            </div>

            <div className="field border round fill">
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=" "
                required
                disabled={busy}
              />
              <label htmlFor="login-password">Password</label>
              <i>key</i>
            </div>

            <button
              id="login-submit-btn"
              className="primary fill round large"
              type="submit"
              disabled={busy}
              aria-busy={busy}
            >
              {busy ? (
                <>
                  <progress className="circle small" />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <i>arrow_forward</i>
                </>
              )}
            </button>
          </form>

          <nav className="row wrap space-between small-margin">
            <Link className="primary-text" to="/forgot-password">
              Forgot password?
            </Link>

            <Link className="primary-text" to="/signup">
              Create an account
              <i className="small">arrow_forward</i>
            </Link>
          </nav>
        </article>
      </main>
    </div>
  )
}
