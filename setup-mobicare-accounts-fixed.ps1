$ErrorActionPreference = "Stop"

# Always use the folder containing THIS script as the project root.
# This avoids failures when PowerShell is launched from another directory.
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$Backup = Join-Path $Root ".mobicare-account-backup-$Stamp"

function ProjectPath($RelativePath) {
    return Join-Path $Root $RelativePath
}

function RequireFile($RelativePath) {
    $Path = ProjectPath $RelativePath
    if (!(Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "Missing required file: $RelativePath`nExpected: $Path"
    }
    return $Path
}

function BackupFile($RelativePath) {
    $Source = ProjectPath $RelativePath
    if (Test-Path -LiteralPath $Source -PathType Leaf) {
        $Destination = Join-Path $Backup $RelativePath
        $DestinationDir = Split-Path -Parent $Destination
        New-Item -ItemType Directory -Path $DestinationDir -Force | Out-Null
        Copy-Item -LiteralPath $Source -Destination $Destination -Force
        Write-Host "BACKUP  $RelativePath" -ForegroundColor Yellow
    }
}

function CreateIfMissing($RelativePath, $Content) {
    $Path = ProjectPath $RelativePath

    if (Test-Path -LiteralPath $Path -PathType Leaf) {
        Write-Host "EXISTS  $RelativePath" -ForegroundColor DarkGray
        return
    }

    $Directory = Split-Path -Parent $Path
    New-Item -ItemType Directory -Path $Directory -Force | Out-Null
    Set-Content -LiteralPath $Path -Value $Content -Encoding UTF8

    Write-Host "CREATED $RelativePath" -ForegroundColor Green
}

function AppendIfMissing($RelativePath, $Marker, $Content) {
    $Path = RequireFile $RelativePath
    $Existing = Get-Content -LiteralPath $Path -Raw

    if ($Existing.Contains($Marker)) {
        Write-Host "EXISTS  $RelativePath" -ForegroundColor DarkGray
        return
    }

    Add-Content -LiteralPath $Path -Value "`r`n`r`n$Content" -Encoding UTF8
    Write-Host "UPDATED $RelativePath" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Mobicare Customer Account Installer ===" -ForegroundColor Cyan
Write-Host "Project root:" $Root
Write-Host ""

# Verify this really is the Mobicare project.
if (!(Test-Path (ProjectPath "package.json"))) {
    throw "package.json was not found in:`n$Root`n`nPut this script directly inside your Mobicare project folder and run it again."
}

if (!(Test-Path (ProjectPath "src"))) {
    throw "The src folder was not found in:`n$Root"
}

# Create backup INSIDE the actual project.
New-Item -ItemType Directory -Path $Backup -Force | Out-Null

foreach ($File in @(
    "src/lib/supabase.js",
    "src/App.jsx",
    "src/components/Header.jsx",
    "src/globals.css",
    "src/components/globals.css"
)) {
    BackupFile $File
}

Write-Host ""
Write-Host "Backup created:" -ForegroundColor Yellow
Write-Host $Backup
Write-Host ""

# ------------------------------------------------------------
# Authentication context
# ------------------------------------------------------------

CreateIfMissing "src/lib/AuthContext.jsx" @'
import { createContext, useContext, useEffect, useState } from 'react'
import { getClient } from './supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async (currentUser) => {
    if (!currentUser) {
      setProfile(null)
      return
    }

    const supabase = getClient()
    if (!supabase) return

    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, phone')
      .eq('id', currentUser.id)
      .maybeSingle()

    setProfile(data || null)
  }

  useEffect(() => {
    const supabase = getClient()

    if (!supabase) {
      setLoading(false)
      return
    }

    let alive = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return

      setSession(data.session)
      setUser(data.session?.user || null)

      await loadProfile(data.session?.user)

      if (alive) setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!alive) return

      setSession(newSession)
      setUser(newSession?.user || null)

      await loadProfile(newSession?.user)

      if (alive) setLoading(false)
    })

    return () => {
      alive = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = () => getClient().auth.signOut()

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signOut,
        refreshProfile: () => loadProfile(user),
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
'@

# ------------------------------------------------------------
# Account pages
# ------------------------------------------------------------

CreateIfMissing "src/pages/Login.jsx" @'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getClient } from '../lib/supabase'
import './account-auth.css'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await getClient().auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    navigate(location.state?.from || '/account', { replace: true })
  }

  return (
    <main className="account-auth-page">
      <div className="account-auth-card">
        <h1>Welcome back</h1>
        <p>Sign in to view your repairs and purchases.</p>

        {error && <div className="account-auth-error">{error}</div>}

        <form onSubmit={submit} className="account-auth-form">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          <button disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <Link to="/forgot-password">Forgot password?</Link>

        <p>
          New customer? <Link to="/signup">Create an account</Link>
        </p>
      </div>
    </main>
  )
}
'@

CreateIfMissing "src/pages/Signup.jsx" @'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getClient } from '../lib/supabase'
import './account-auth.css'

export default function Signup() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
  })

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const update = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    const { data, error } = await getClient().auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: {
          full_name: form.name.trim(),
          phone: form.phone.trim(),
        },
      },
    })

    if (error) {
      setLoading(false)
      setError(error.message)
      return
    }

    if (data.user && !data.session) {
      setLoading(false)
      setMessage(
        'Account created. Check your email to verify your account.'
      )
      return
    }

    if (data.user) {
      await getClient()
        .from('profiles')
        .upsert({
          id: data.user.id,
          full_name: form.name.trim(),
          phone: form.phone.trim(),
        })
    }

    setLoading(false)
    navigate('/account', { replace: true })
  }

  return (
    <main className="account-auth-page">
      <div className="account-auth-card">
        <h1>Create your account</h1>
        <p>Keep your repair appointments and purchases together.</p>

        {error && <div className="account-auth-error">{error}</div>}
        {message && <div className="account-auth-success">{message}</div>}

        {!message && (
          <form onSubmit={submit} className="account-auth-form">
            <label>
              Full name
              <input
                value={form.name}
                onChange={(event) => update('name', event.target.value)}
                required
              />
            </label>

            <label>
              Phone
              <input
                value={form.phone}
                onChange={(event) => update('phone', event.target.value)}
                required
              />
            </label>

            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(event) => update('email', event.target.value)}
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={form.password}
                onChange={(event) => update('password', event.target.value)}
                minLength="8"
                required
              />
            </label>

            <button disabled={loading}>
              {loading ? 'Creating…' : 'Create Account'}
            </button>
          </form>
        )}

        <p>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </main>
  )
}
'@

CreateIfMissing "src/pages/ForgotPassword.jsx" @'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getClient } from '../lib/supabase'
import './account-auth.css'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event) => {
    event.preventDefault()

    setError('')
    setLoading(true)

    const { error } = await getClient().auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${window.location.origin}/reset-password`,
      }
    )

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setMessage(
      'If an account exists for that email, a reset link has been sent.'
    )
  }

  return (
    <main className="account-auth-page">
      <div className="account-auth-card">
        <h1>Reset your password</h1>

        {error && <div className="account-auth-error">{error}</div>}
        {message && <div className="account-auth-success">{message}</div>}

        <form onSubmit={submit} className="account-auth-form">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <button disabled={loading}>
            {loading ? 'Sending…' : 'Send Reset Link'}
          </button>
        </form>

        <Link to="/login">Back to sign in</Link>
      </div>
    </main>
  )
}
'@

CreateIfMissing "src/pages/ResetPassword.jsx" @'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getClient } from '../lib/supabase'
import './account-auth.css'

export default function ResetPassword() {
  const navigate = useNavigate()

  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const supabase = getClient()

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setReady(true)
      }
    })

    return () => subscription.unsubscribe()
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

    const { error } = await getClient().auth.updateUser({
      password,
    })

    if (error) {
      setError(error.message)
      return
    }

    setMessage('Password updated.')

    setTimeout(() => {
      navigate('/account', { replace: true })
    }, 700)
  }

  return (
    <main className="account-auth-page">
      <div className="account-auth-card">
        <h1>Choose a new password</h1>

        {!ready && !message && (
          <p>Open the reset link from your email to continue.</p>
        )}

        {error && <div className="account-auth-error">{error}</div>}
        {message && <div className="account-auth-success">{message}</div>}

        {ready && !message && (
          <form onSubmit={submit} className="account-auth-form">
            <label>
              New password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength="8"
                required
              />
            </label>

            <label>
              Confirm password
              <input
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                minLength="8"
                required
              />
            </label>

            <button>Update Password</button>
          </form>
        )}

        <Link to="/login">Back to sign in</Link>
      </div>
    </main>
  )
}
'@

CreateIfMissing "src/pages/Account.jsx" @'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { getClient } from '../lib/supabase'
import './account-auth.css'

export default function Account() {
  const navigate = useNavigate()

  const {
    user,
    profile,
    loading,
    signOut,
    refreshProfile,
  } = useAuth()

  const [bookings, setBookings] = useState([])
  const [orders, setOrders] = useState([])

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true })
    }
  }, [loading, user, navigate])

  useEffect(() => {
    if (profile) {
      setName(profile.full_name || '')
      setPhone(profile.phone || '')
    }
  }, [profile])

  useEffect(() => {
    if (!user) return

    const load = async () => {
      const supabase = getClient()

      const [bookingResult, orderResult] = await Promise.all([
        supabase
          .from('bookings')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),

        supabase
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ])

      if (bookingResult.error || orderResult.error) {
        setError(
          bookingResult.error?.message ||
            orderResult.error?.message ||
            'Unable to load account history.'
        )
      }

      setBookings(bookingResult.data || [])
      setOrders(orderResult.data || [])
      setBusy(false)
    }

    load()
  }, [user])

  const save = async (event) => {
    event.preventDefault()

    setSaved(false)

    const { error } = await getClient()
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: name.trim(),
        phone: phone.trim(),
      })

    if (error) {
      setError(error.message)
      return
    }

    await refreshProfile()
    setSaved(true)
  }

  if (loading) {
    return (
      <main className="account-auth-page">
        <div className="account-auth-card">Loading account…</div>
      </main>
    )
  }

  return (
    <main className="account-page">
      <div className="account-container">
        <div className="account-heading">
          <div>
            <p>Mobicare</p>
            <h1>My Account</h1>
            <p>
              Welcome back
              {profile?.full_name
                ? `, ${profile.full_name.split(' ')[0]}`
                : ''}
              .
            </p>
          </div>

          <button
            onClick={async () => {
              await signOut()
              navigate('/login', { replace: true })
            }}
          >
            Sign Out
          </button>
        </div>

        {error && <div className="account-auth-error">{error}</div>}
        {saved && (
          <div className="account-auth-success">Profile saved.</div>
        )}

        <section className="account-card">
          <h2>Profile</h2>

          <form onSubmit={save} className="account-profile-form">
            <label>
              Name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>

            <label>
              Phone
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </label>

            <label>
              Email
              <input value={user?.email || ''} disabled />
            </label>

            <button>Save Profile</button>
          </form>
        </section>

        <section className="account-card">
          <div className="account-section-heading">
            <h2>Repair Appointments</h2>
            <Link to="/book">Book a Repair</Link>
          </div>

          {busy ? (
            'Loading…'
          ) : bookings.length === 0 ? (
            'No repair appointments yet.'
          ) : (
            bookings.map((booking) => (
              <article className="account-history-item" key={booking.id}>
                <div>
                  <strong>{booking.service || 'Repair'}</strong>
                  <span>
                    {booking.device_type} {booking.device_model}
                  </span>
                  <span>
                    {booking.appt_date} at {booking.appt_time}
                  </span>
                </div>

                <span>{booking.status || 'pending'}</span>
              </article>
            ))
          )}
        </section>

        <section className="account-card">
          <div className="account-section-heading">
            <h2>Purchase History</h2>
            <Link to="/shop">Shop</Link>
          </div>

          {busy ? (
            'Loading…'
          ) : orders.length === 0 ? (
            'No purchases yet.'
          ) : (
            orders.map((order) => (
              <article className="account-history-item" key={order.id}>
                <div>
                  <strong>
                    Order #{String(order.id).slice(0, 8)}
                  </strong>

                  <span>
                    {order.created_at
                      ? new Date(order.created_at).toLocaleDateString()
                      : ''}
                  </span>

                  <span>{order.status || 'paid'}</span>
                </div>

                <strong>
                  ${Number(order.total || 0).toFixed(2)}
                </strong>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  )
}
'@

# ------------------------------------------------------------
# Supabase helper
# ------------------------------------------------------------

$SupabasePath = RequireFile "src/lib/supabase.js"
$SupabaseContent = Get-Content -LiteralPath $SupabasePath -Raw

if (!$SupabaseContent.Contains("export function getClient()")) {
    Add-Content -LiteralPath $SupabasePath -Value @'

/* Mobicare customer account helpers */
export function getClient() {
  return supabase
}
'@ -Encoding UTF8

    Write-Host "UPDATED src/lib/supabase.js" -ForegroundColor Green
}
else {
    Write-Host "EXISTS  src/lib/supabase.js helper" -ForegroundColor DarkGray
}

# ------------------------------------------------------------
# Account CSS
# ------------------------------------------------------------

CreateIfMissing "src/components/account-auth.css" @'
.account-auth-page {
  min-height: 70vh;
  display: grid;
  place-items: center;
  padding: 48px 20px;
}

.account-auth-card,
.account-card {
  background: var(--card, #fff);
  border: 1px solid rgba(0, 0, 0, .08);
  border-radius: 18px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, .08);
}

.account-auth-card {
  width: min(100%, 460px);
  padding: 32px;
}

.account-auth-form,
.account-profile-form {
  display: grid;
  gap: 16px;
  margin: 24px 0;
}

.account-auth-form label,
.account-profile-form label {
  display: grid;
  gap: 7px;
  font-weight: 600;
}

.account-auth-form input,
.account-profile-form input {
  box-sizing: border-box;
  width: 100%;
  padding: 12px 14px;
  border: 1px solid rgba(0, 0, 0, .16);
  border-radius: 10px;
  background: var(--input-bg, #fff);
  color: inherit;
}

.account-auth-form button,
.account-profile-form button,
.account-heading button {
  border: 0;
  border-radius: 10px;
  padding: 12px 16px;
  cursor: pointer;
  font-weight: 700;
}

.account-auth-error,
.account-auth-success {
  padding: 12px 14px;
  border-radius: 10px;
  margin: 16px 0;
}

.account-auth-error {
  background: #fee4e2;
  color: #b42318;
}

.account-auth-success {
  background: #dcfae6;
  color: #067647;
}

.account-page {
  padding: 40px 20px 80px;
}

.account-container {
  width: min(100%, 1000px);
  margin: auto;
  display: grid;
  gap: 24px;
}

.account-heading,
.account-section-heading,
.account-history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.account-card {
  padding: 24px;
}

.account-history-item {
  padding: 15px;
  border: 1px solid rgba(0, 0, 0, .08);
  border-radius: 12px;
  margin-top: 10px;
}

.account-history-item div {
  display: grid;
  gap: 4px;
}

.account-history-item span {
  opacity: .7;
}
'@

# Import account CSS through the pages, so no globals.css append is required.

# ------------------------------------------------------------
# App.jsx
# ------------------------------------------------------------

$AppPath = RequireFile "src/App.jsx"
$App = Get-Content -LiteralPath $AppPath -Raw

if (!$App.Contains("import { AuthProvider } from './lib/AuthContext'")) {
    $App = "import { AuthProvider } from './lib/AuthContext'`r`n" + $App
}

foreach ($Import in @(
    "import Login from './pages/Login'",
    "import Signup from './pages/Signup'",
    "import ForgotPassword from './pages/ForgotPassword'",
    "import ResetPassword from './pages/ResetPassword'",
    "import Account from './pages/Account'"
)) {
    if (!$App.Contains($Import)) {
        $App = "$Import`r`n$App"
    }
}

if (!$App.Contains('path="/login"')) {
    $Routes = @'
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/account" element={<Account />} />
'@

    if ($App.Contains("<Routes>")) {
        $App = $App.Replace("<Routes>", "<Routes>`r`n$Routes")
    }
}

# Add AuthProvider around the application only when possible.
if (!$App.Contains("<AuthProvider>")) {
    if ($App.Contains("<BrowserRouter>") -and $App.Contains("</BrowserRouter>")) {
        $App = $App.Replace("<BrowserRouter>", "<BrowserRouter>`r`n      <AuthProvider>")
        $Index = $App.LastIndexOf("</BrowserRouter>")
        if ($Index -ge 0) {
            $App = $App.Insert($Index, "      </AuthProvider>`r`n      ")
        }
    }
    elseif ($App.Contains("<Router>") -and $App.Contains("</Router>")) {
        $App = $App.Replace("<Router>", "<Router>`r`n      <AuthProvider>")
        $Index = $App.LastIndexOf("</Router>")
        if ($Index -ge 0) {
            $App = $App.Insert($Index, "      </AuthProvider>`r`n      ")
        }
    }
}

Set-Content -LiteralPath $AppPath -Value $App -Encoding UTF8
Write-Host "UPDATED src/App.jsx" -ForegroundColor Green

# ------------------------------------------------------------
# Phase 2 API endpoint scaffolding
# ------------------------------------------------------------

CreateIfMissing "api/create-booking.js" @'
import { createClient } from '@supabase/supabase-js'

async function getUser(req) {
  const header = req.headers.authorization || ''

  if (!header.startsWith('Bearer ')) return null

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )

  const { data } = await supabase.auth.getUser(
    header.slice(7)
  )

  return data?.user || null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
    })
  }

  try {
    const body =
      typeof req.body === 'string'
        ? JSON.parse(req.body)
        : req.body

    const user = await getUser(req)

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )

    const required = [
      'service',
      'deviceType',
      'deviceModel',
      'date',
      'time',
      'name',
      'phone',
      'email',
    ]

    if (
      !body ||
      !required.every(
        (key) =>
          typeof body[key] === 'string' &&
          body[key].trim()
      )
    ) {
      return res.status(400).json({
        error:
          'Please provide all required booking information.',
      })
    }

    const { error } = await supabase
      .from('bookings')
      .insert({
        user_id: user?.id || null,
        service: body.service.trim(),
        device_type: body.deviceType.trim(),
        device_model: body.deviceModel.trim(),
        issue: body.issue?.trim() || '',
        appt_date: body.date.trim(),
        appt_time: body.time.trim(),
        customer_name: body.name.trim(),
        customer_phone: body.phone.trim(),
        customer_email: body.email.trim().toLowerCase(),
        notes: body.notes?.trim() || '',
        status: 'pending',
      })

    if (error) throw error

    return res.status(201).json({
      ok: true,
      linkedToAccount: Boolean(user),
    })
  } catch (error) {
    console.error(error.message)

    return res.status(500).json({
      error: 'Unable to submit booking.',
    })
  }
}
'@

CreateIfMissing "api/create-checkout-session.js" @'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

async function getUser(req) {
  const header = req.headers.authorization || ''

  if (!header.startsWith('Bearer ')) return null

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )

  const { data } = await supabase.auth.getUser(
    header.slice(7)
  )

  return data?.user || null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
    })
  }

  try {
    const body =
      typeof req.body === 'string'
        ? JSON.parse(req.body)
        : req.body

    const user = await getUser(req)

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )

    const items = Array.isArray(body?.items)
      ? body.items
      : []

    if (!items.length) {
      return res.status(400).json({
        error: 'Your cart is empty.',
      })
    }

    const ids = [
      ...new Set(items.map((item) => String(item.id))),
    ]

    const { data: products, error } = await supabase
      .from('products')
      .select('id,name,price,stock,active')
      .in('id', ids)

    if (error) throw error

    const productMap = new Map(
      (products || []).map((product) => [
        String(product.id),
        product,
      ])
    )

    const trustedItems = items.map((item) => {
      const product = productMap.get(String(item.id))
      const quantity = Number(item.qty)

      if (
        !product ||
        product.active === false ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 99 ||
        product.stock < quantity
      ) {
        throw new Error('Item unavailable')
      }

      return {
        product,
        quantity,
      }
    })

    const stripe = new Stripe(
      process.env.STRIPE_SECRET_KEY
    )

    const origin = new URL(
      process.env.PUBLIC_SITE_URL ||
        req.headers.origin ||
        'http://localhost:5173'
    ).origin

    const session =
      await stripe.checkout.sessions.create({
        mode: 'payment',

        line_items: trustedItems.map(
          ({ product, quantity }) => ({
            price_data: {
              currency: 'usd',

              product_data: {
                name: product.name,
                metadata: {
                  kind: 'product',
                  product_id: String(product.id),
                },
              },

              unit_amount: Math.round(
                Number(product.price) * 100
              ),
            },

            quantity,
          })
        ),

        customer_email:
          body.shipping?.email || user?.email,

        shipping_address_collection: {
          allowed_countries: ['US'],
        },

        metadata: {
          user_id: user?.id || '',
        },

        success_url: `${origin}/order-success`,
        cancel_url: `${origin}/cart`,
      })

    return res.json({
      url: session.url,
    })
  } catch (error) {
    if (error.message === 'Item unavailable') {
      return res.status(409).json({
        error: 'One or more items are unavailable.',
      })
    }

    console.error(error.message)

    return res.status(500).json({
      error: 'Unable to start checkout.',
    })
  }
}
'@

# ------------------------------------------------------------
# SQL safety migration
# ------------------------------------------------------------

CreateIfMissing "supabase-phase2-safety.sql" @'
create index if not exists bookings_user_id_created_at_idx
on public.bookings(user_id, created_at desc);

create index if not exists orders_user_id_created_at_idx
on public.orders(user_id, created_at desc);

alter table public.bookings enable row level security;
alter table public.orders enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "Customers can view own bookings"
on public.bookings;

create policy "Customers can view own bookings"
on public.bookings
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Customers can view own orders"
on public.orders;

create policy "Customers can view own orders"
on public.orders
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Customers can view own profile"
on public.profiles;

create policy "Customers can view own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "Customers can update own profile"
on public.profiles;

create policy "Customers can update own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());
'@

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Mobicare account setup completed" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Project root:" -ForegroundColor Yellow
Write-Host $Root
Write-Host ""
Write-Host "Backup:" -ForegroundColor Yellow
Write-Host $Backup
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Review the changes with: git diff"
Write-Host "2. Run: npm run build"
Write-Host "3. Run supabase-phase2-safety.sql in Supabase SQL Editor"
Write-Host ""
Write-Host "IMPORTANT:"
Write-Host "Never put SUPABASE_SERVICE_ROLE_KEY or STRIPE_SECRET_KEY in frontend code." -ForegroundColor Yellow
Write-Host ""
