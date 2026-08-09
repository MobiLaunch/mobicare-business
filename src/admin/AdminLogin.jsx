import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminStore, isLocalAuthAvailable } from '../lib/store'
import { isSupabaseConfigured } from '../lib/supabase'

export default function AdminLogin() {
  const navigate = useNavigate()
  const login = useAdminStore(s => s.login)
  const restoreSession = useAdminStore(s => s.restoreSession)
  const isAuthenticated = useAdminStore(s => s.isAuthenticated)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [lockSecs, setLockSecs] = useState(0)

  const supabaseReady = isSupabaseConfigured()
  const localAuthReady = !supabaseReady && isLocalAuthAvailable

  useEffect(() => { restoreSession?.() }, [])
  useEffect(() => { if (isAuthenticated) navigate('/admin/dashboard') }, [isAuthenticated])

  useEffect(() => {
    if (!lockSecs) return
    const t = setInterval(() => setLockSecs(s => s <= 1 ? (clearInterval(t), 0) : s - 1), 1000)
    return () => clearInterval(t)
  }, [lockSecs])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading || lockSecs > 0) return
    setError(''); setLoading(true)
    try {
      const result = supabaseReady ? await login(email, password) : await login(password)
      if (result.locked) {
        setLockSecs(result.secsLeft || 30)
        setError(`Too many attempts. Try again in ${result.secsLeft}s.`)
      } else if (!result.ok) {
        const hint = result.attemptsLeft != null ? ` (${result.attemptsLeft} attempts left)` : ''
        setError((result.error || 'Incorrect credentials.') + hint)
      }
    } catch { setError('Unexpected error. Please try again.') }
    finally { setLoading(false) }
  }

  return (
    <div className="admin-login-bg">
      <div className="admin-login-blob admin-login-blob-1" />
      <div className="admin-login-blob admin-login-blob-2" />

      <main className="admin-login-card">
        <div className="admin-login-brand">
          <div className="admin-brand-dot admin-login-brand-mark">
            <i>bolt</i>
          </div>
          <div className="admin-login-brand-copy">
            <strong>Mobicare</strong>
            <span className="chip small secondary-container admin-portal-chip">Admin Portal</span>
          </div>
        </div>

        <div className="admin-login-glass">
          <div className="admin-login-heading">
            <span className="admin-login-eyebrow">Store workspace</span>
            <h1>Welcome back</h1>
            <p className="on-surface-variant-text">
              {supabaseReady
                ? 'Enter your admin email and password.'
                : localAuthReady
                  ? 'Development-only local access mode.'
                  : 'Supabase is required for admin access.'}
            </p>
          </div>

          {!supabaseReady && (
            <div className={`${localAuthReady ? 'primary-container' : 'error-container'} admin-login-notice`} role="status">
              <i>{localAuthReady ? 'info' : 'error'}</i>
              <span>
                {localAuthReady
                  ? 'Local authentication is enabled only for development builds.'
                  : 'Configure Supabase Auth before using the admin portal.'}
              </span>
            </div>
          )}

          {error && (
            <div className="admin-login-notice error-container" role="alert">
              <i>error</i>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="admin-login-form">
            {supabaseReady && (
              <div className="field label prefix border round admin-login-field">
                <i>email</i>
                <input
                  type="email"
                  placeholder=" "
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={lockSecs > 0 || (!supabaseReady && !localAuthReady)}
                  autoComplete="email"
                />
                <label>Email</label>
              </div>
            )}

            <div className="field label prefix suffix border round admin-login-field admin-password-field">
              <i>lock</i>
              <input
                type={showPw ? 'text' : 'password'}
                placeholder=" "
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={lockSecs > 0 || (!supabaseReady && !localAuthReady)}
                autoComplete="current-password"
              />
              <label>Password</label>
              <button
                type="button"
                className="circle transparent admin-password-toggle"
                onClick={() => setShowPw(v => !v)}
                disabled={!supabaseReady && !localAuthReady}
                tabIndex={-1}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                <i>{showPw ? 'visibility_off' : 'visibility'}</i>
              </button>
            </div>

            <button type="submit" className="responsive primary round admin-login-submit" disabled={loading || lockSecs > 0 || (!supabaseReady && !localAuthReady)}>
              {loading ? <progress className="circle small" /> : <i>login</i>}
              <span>{loading ? 'Signing in…' : lockSecs > 0 ? `Locked — ${lockSecs}s` : 'Sign in'}</span>
            </button>
          </form>

          <p className="center-align on-surface-variant-text admin-login-help">
            {supabaseReady
              ? 'Forgot password? Reset via Supabase Dashboard → Authentication.'
              : localAuthReady
                ? 'Development-only local access is disabled in production.'
                : 'Admin access requires a configured Supabase Auth project.'}
          </p>
        </div>
      </main>
    </div>
  )
}
