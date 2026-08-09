import React, { useState, useEffect } from 'react'
import { useAdminStore, useToastStore, useProductStore, SEED_PRODUCTS, SEED_CATEGORIES } from '../lib/store'
import { testConnection, resetClient, isSupabaseConfigured, sbSeedInitialData } from '../lib/supabase'

// ─── Full SQL schema (v2 — Supabase Auth + hardened RLS) ──────────────────
const SCHEMA_SQL = `-- ============================================================
--  Mobicare — Supabase schema v2
--  SECURITY MODEL:
--    - Admin auth = Supabase Auth plus an explicit staff_users allowlist.
--    - Before running this, create your user in:
--      Dashboard → Authentication → Users → Add User, then provision its
--      UUID in staff_users using the trusted SQL note at the end.
--    - Orders are NEVER writable by anonymous clients. They are only
--      created by your Stripe webhook (service_role key, server-side),
--      after payment is confirmed. The browser can only read the minimum
--      confirmation data using a short-lived signed lookup token.
--    - Bookings are written only by the rate-limited serverless booking API
--      using the service-role key. There is NO public SELECT/INSERT/UPDATE/
--      DELETE policy on bookings; only staff can read or manage them.
--  Run this entire block in your Supabase SQL editor.
--  Dashboard → SQL Editor → New query → paste → Run
-- ============================================================

create extension if not exists "pgcrypto";

-- ────────────────────────────────────────────────────────────
-- STAFF ALLOWLIST — authentication is not authorization
-- ────────────────────────────────────────────────────────────
-- Provision staff rows manually from the Supabase SQL editor or a trusted
-- server-side admin workflow. Never allow browser users to write this table.
create table if not exists public.staff_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'admin' check (role in ('admin', 'staff')),
  enabled    boolean not null default true,
  created_at timestamptz not null default now()
);

revoke all on table public.staff_users from anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff_users
    where user_id = auth.uid()
      and enabled = true
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ────────────────────────────────────────────────────────────
-- CATEGORIES
-- ────────────────────────────────────────────────────────────
create table if not exists public.categories (
  id          text primary key,
  name        text not null,
  description text not null default '',
  icon        text not null default 'Star',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- PRODUCTS
-- ────────────────────────────────────────────────────────────
create table if not exists public.products (
  id            text primary key default gen_random_uuid()::text,
  name          text not null,
  category      text not null references public.categories(id) on delete set null,
  price         numeric(10,2) not null check (price >= 0),
  compare_price numeric(10,2) check (compare_price is null or compare_price >= 0),
  stock         integer not null default 0 check (stock >= 0),
  sku           text unique,
  description   text not null default '',
  images        text[]   not null default '{}',
  tags          text[]   not null default '{}',
  featured      boolean  not null default false,
  active        boolean  not null default true,
  weight        numeric(6,3),
  shipping_days jsonb    not null default '{"min":3,"max":7}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists products_category_idx on public.products(category);
create index if not exists products_active_idx   on public.products(active);
create index if not exists products_featured_idx on public.products(featured);

-- ────────────────────────────────────────────────────────────
-- ORDERS
-- Written ONLY by the Stripe webhook (service_role key), after
-- payment_intent.succeeded. The anon/browser key can never insert,
-- update, or delete rows here — see RLS policies below.
-- ────────────────────────────────────────────────────────────
create table if not exists public.orders (
  id                       text primary key default gen_random_uuid()::text,
  stripe_payment_intent_id text unique,           -- idempotency key from Stripe
  stripe_checkout_session_id text unique,
  status           text not null default 'paid'
                     check (status in ('paid','processing','shipped','delivered','cancelled','refunded')),
  customer_name    text not null default '',
  customer_email   text not null default '',
  customer_phone   text not null default '',
  shipping_address text not null default '',
  shipping_city    text not null default '',
  shipping_state   text not null default '',
  shipping_zip     text not null default '',
  subtotal         numeric(10,2) not null default 0,
  shipping_cost    numeric(10,2) not null default 0,
  tax              numeric(10,2) not null default 0,
  total            numeric(10,2) not null default 0,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.orders add column if not exists lookup_token_hash text unique;
alter table public.orders add column if not exists lookup_token_expires_at timestamptz;

create index if not exists orders_status_idx     on public.orders(status);
create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists orders_lookup_token_idx on public.orders(lookup_token_hash);
create unique index if not exists orders_stripe_session_unique_idx
  on public.orders(stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;
create unique index if not exists orders_stripe_payment_intent_unique_idx
  on public.orders(stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;
create unique index if not exists orders_lookup_token_unique_idx
  on public.orders(lookup_token_hash)
  where lookup_token_hash is not null;

-- ────────────────────────────────────────────────────────────
-- ORDER LINE ITEMS — same write restriction as orders
-- ────────────────────────────────────────────────────────────
create table if not exists public.order_items (
  id         bigserial primary key,
  order_id   text not null references public.orders(id) on delete cascade,
  product_id text,
  name       text not null,
  price      numeric(10,2) not null check (price >= 0),
  qty        integer not null default 1 check (qty > 0),
  created_at timestamptz not null default now()
);

create index if not exists order_items_order_id_idx on public.order_items(order_id);
drop index if exists public.order_items_order_product_idx;
create unique index order_items_order_product_idx
  on public.order_items(order_id, product_id);

-- ────────────────────────────────────────────────────────────
-- BOOKINGS
-- Bookings are written by the rate-limited serverless booking API using
-- service_role. A rate-limit trigger remains defense in depth for trusted
-- writes and staff access is managed through the admin allowlist.
-- ────────────────────────────────────────────────────────────
create table if not exists public.bookings (
  id             bigserial primary key,
  service        text not null,
  device_type    text not null default '',
  device_model   text not null default '',
  issue          text not null default '',
  appt_date      text not null,
  appt_time      text not null,
  customer_name  text not null,
  customer_phone text not null,
  customer_email text not null,
  notes          text not null default '',
  status         text not null default 'pending'
                   check (status in ('pending','confirmed','completed','cancelled','no-show')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists bookings_status_idx     on public.bookings(status);
create index if not exists bookings_created_at_idx on public.bookings(created_at desc);
create index if not exists bookings_email_created_idx on public.bookings(customer_email, created_at desc);

-- Rate-limit trigger: block more than 1 booking every 30 seconds per email
create or replace function public.check_booking_rate_limit()
returns trigger language plpgsql as $$
declare
  recent_count integer;
begin
  select count(*) into recent_count
  from public.bookings
  where customer_email = new.customer_email
    and created_at > now() - interval '30 seconds';
  if recent_count > 0 then
    raise exception \'Please wait before submitting another booking.\';
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_rate_limit on public.bookings;
create trigger bookings_rate_limit
  before insert on public.bookings
  for each row execute procedure public.check_booking_rate_limit();

-- ────────────────────────────────────────────────────────────
-- AUTO-UPDATE updated_at on every row change
-- ────────────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger products_updated_at
  before update on public.products
  for each row execute procedure public.touch_updated_at();

create or replace trigger categories_updated_at
  before update on public.categories
  for each row execute procedure public.touch_updated_at();

create or replace trigger orders_updated_at
  before update on public.orders
  for each row execute procedure public.touch_updated_at();

create or replace trigger bookings_updated_at
  before update on public.bookings
  for each row execute procedure public.touch_updated_at();

-- ────────────────────────────────────────────────────────────
-- SITE SETTINGS
-- ────────────────────────────────────────────────────────────
create table if not exists public.site_settings (
  id          text primary key,
  content     jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace trigger site_settings_updated_at
  before update on public.site_settings
  for each row execute procedure public.touch_updated_at();

-- ────────────────────────────────────────────────────────────
-- ROW-LEVEL SECURITY
-- ────────────────────────────────────────────────────────────
alter table public.categories    enable row level security;
alter table public.products      enable row level security;
alter table public.orders        enable row level security;
alter table public.order_items   enable row level security;
alter table public.bookings      enable row level security;
alter table public.site_settings enable row level security;
alter table public.staff_users enable row level security;

-- Remove legacy policies because PostgreSQL combines policies additively.
do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('categories', 'products', 'orders', 'order_items', 'bookings', 'site_settings', 'staff_users')
  loop
    execute format('drop policy if exists %I on %I.%I', policy_record.policyname, policy_record.schemaname, policy_record.tablename);
  end loop;
end;
$$;

-- Categories: public read, admin write
drop policy if exists "public read categories" on public.categories;
drop policy if exists "admin modify categories" on public.categories;
create policy "public read categories" on public.categories for select using (true);
create policy "admin modify categories" on public.categories for all using (public.is_admin()) with check (public.is_admin());

-- Products: public read active only, admin sees + writes everything
drop policy if exists "public read active products" on public.products;
drop policy if exists "admin modify products" on public.products;
create policy "public read active products" on public.products for select using (active = true or public.is_admin());
create policy "admin modify products" on public.products for all using (public.is_admin()) with check (public.is_admin());

-- Site settings: public read, admin write
drop policy if exists "public read site_settings" on public.site_settings;
drop policy if exists "admin modify site_settings" on public.site_settings;
create policy "public read site_settings" on public.site_settings for select using (true);
create policy "admin modify site_settings" on public.site_settings for all using (public.is_admin()) with check (public.is_admin());

-- Bookings: no browser access. The serverless API uses service_role;
-- admin staff users have full access.
drop policy if exists "public create bookings" on public.bookings;
drop policy if exists "admin all bookings" on public.bookings;
create policy "admin all bookings" on public.bookings for all using (public.is_admin()) with check (public.is_admin());

-- Orders: NO public access at all — not even insert. Only the service_role
-- key (used exclusively by your Stripe webhook, server-side) bypasses RLS
-- entirely, so no policy is needed to permit its writes. Admin can read/manage.
drop policy if exists "public create orders" on public.orders;
drop policy if exists "admin all orders" on public.orders;
create policy "admin all orders" on public.orders for all using (public.is_admin()) with check (public.is_admin());

-- Order line items: same lockdown as orders
drop policy if exists "public create order_items" on public.order_items;
drop policy if exists "admin all order_items" on public.order_items;
create policy "admin all order_items" on public.order_items for all using (public.is_admin()) with check (public.is_admin());

-- ────────────────────────────────────────────────────────────
-- CLEANUP: remove the old insecure passcode table if it exists
-- ────────────────────────────────────────────────────────────
drop table if exists public.admin_auth;

-- ────────────────────────────────────────────────────────────
-- NEXT STEPS:
-- 1. Dashboard → Authentication → Users → Add User.
-- 2. From a trusted SQL editor, provision the user's UUID:
--      insert into public.staff_users (user_id, role) values ('USER_UUID', 'admin');
--    Keep public Supabase sign-up disabled unless your product requires it.
-- 3. Add your Stripe secret key + webhook secret to your serverless
--    function's environment variables (NEVER in this database or the
--    frontend .env — those are service-role-only secrets).
-- 4. Click "Seed sample data" in Admin → Settings to populate products.
-- ────────────────────────────────────────────────────────────
`

export default function Settings() {
  const changePassword  = useAdminStore(s => s.changePassword)
  const addToast        = useToastStore(s => s.add)
  const storeRefresh    = useProductStore(s => s.refresh)
  const usingSupabase   = useProductStore(s => s.usingSupabase)
  const storeProducts   = useProductStore(s => s.products)
  const storeCategories = useProductStore(s => s.categories)

  // ── Supabase creds ──
  const [sbUrl,     setSbUrl]     = useState(localStorage.getItem('sb_url')      || '')
  const [sbAnonKey, setSbAnonKey] = useState(localStorage.getItem('sb_anon_key') || '')
  const [connStatus,  setConnStatus]  = useState(null)  // null | 'ok' | 'error'
  const [connMsg,     setConnMsg]     = useState('')
  const [testing,     setTesting]     = useState(false)
  const [seeding,     setSeeding]     = useState(false)
  const [sqlOpen,     setSqlOpen]     = useState(false)
  const [sqlCopied,   setSqlCopied]   = useState(false)

  // ── EmailJS ──
  const [emailjs, setEmailjs] = useState({
    serviceId:       localStorage.getItem('ejs_service')  || '',
    bookingTemplate: localStorage.getItem('ejs_booking')  || '',
    orderTemplate:   localStorage.getItem('ejs_order')    || '',
    publicKey:       localStorage.getItem('ejs_pubkey')   || '',
  })

  // ── Stripe ──
  // Stripe is now configured entirely via backend environment variables
  // (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET) — see the Stripe section below.

  // ── Password ──
  const [currentPw, setCurrentPw] = useState('')
  const [newPw,     setNewPw]     = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw,    setShowPw]    = useState(false)

  // Show current connection status on load
  useEffect(() => {
    if (usingSupabase) { setConnStatus('ok'); setConnMsg('Connected') }
    else if (isSupabaseConfigured()) { setConnStatus('error'); setConnMsg('Configured but not connected — test the connection') }
  }, [usingSupabase])

  const handleSaveSupabase = () => {
    localStorage.setItem('sb_url',      sbUrl.trim())
    localStorage.setItem('sb_anon_key', sbAnonKey.trim())
    resetClient()
    setConnStatus(null)
    addToast('Supabase credentials saved', 'success')
  }

  const handleTestConnection = async () => {
    if (!sbUrl || !sbAnonKey) { addToast('Enter URL and anon key first', 'error'); return }
    localStorage.setItem('sb_url',      sbUrl.trim())
    localStorage.setItem('sb_anon_key', sbAnonKey.trim())
    resetClient()
    setTesting(true)
    setConnStatus(null)
    const result = await testConnection()
    setTesting(false)
    if (result.ok) {
      setConnStatus('ok')
      setConnMsg('Connection successful!')
      addToast('Supabase connected!', 'success')
      storeRefresh()
    } else {
      setConnStatus('error')
      setConnMsg(result.error)
      addToast(`Connection failed: ${result.error}`, 'error')
    }
  }

  const handleSeedData = async () => {
    if (!isSupabaseConfigured()) { addToast('Connect Supabase first', 'error'); return }
    setSeeding(true)
    const result = await sbSeedInitialData(storeProducts, storeCategories)
    setSeeding(false)
    if (result.ok) {
      addToast('Sample data seeded to Supabase!', 'success')
      storeRefresh()
    } else {
      addToast(`Seed failed: ${result.error}`, 'error')
    }
  }

  const handleCopySQL = () => {
    navigator.clipboard.writeText(SCHEMA_SQL).then(() => {
      setSqlCopied(true)
      setTimeout(() => setSqlCopied(false), 2000)
    })
  }

  const handleSaveEmailjs = () => {
    localStorage.setItem('ejs_service', emailjs.serviceId)
    localStorage.setItem('ejs_booking', emailjs.bookingTemplate)
    localStorage.setItem('ejs_order',   emailjs.orderTemplate)
    localStorage.setItem('ejs_pubkey',  emailjs.publicKey)
    addToast('EmailJS settings saved. Update src/lib/config.js to make permanent.', 'success')
  }

  const handleChangePw = async () => {
    if (!newPw || !confirmPw) { addToast('Fill in both password fields', 'error'); return }
    if (newPw !== confirmPw)  { addToast('Passwords do not match', 'error'); return }
    if (newPw.length < 12)    { addToast('Password must be at least 12 characters', 'error'); return }
    const { error } = await changePassword(newPw)
    if (error) {
      addToast(`Failed to update password: ${error.message}`, 'error')
    } else {
      addToast('Password updated successfully via Supabase Auth', 'success')
      setNewPw(''); setConfirmPw('')
    }
  }

  return (
    <div className="page-content admin-page settings-page">
      <div className="row middle-align">
        <h1>Settings</h1>
        <p>Configure your database, API integrations, and admin access.</p>
      </div>

      {/* ── SUPABASE ── */}
      <div className="border settings-section">
        <div className="row">
          <div className="settings-icon"><i style={{fontSize:18}}>database</i></div>
          <div>
            <h2>Supabase Database</h2>
            <p>
              All products, categories, orders, and bookings are stored in Supabase.
              Without this configured, data lives only in this browser's localStorage.
              Sign up free at <a href="https://supabase.com" target="_blank" rel="noreferrer">supabase.com</a>.
            </p>
          </div>
          {/* Connection status pill */}
          {connStatus && (
            <div className={`chip small ${connStatus === 'ok' ? "green-container" : "error-container"}`}>
              {connStatus === 'ok'
                ? <><i style={{fontSize:13}}>check_circle</i> Connected</>
                : <><i style={{fontSize:13}}>cancel</i> Error</>}
            </div>
          )}
          {!connStatus && usingSupabase && (
            <div className={`chip small green-container`}><i style={{fontSize:13}}>check_circle</i> Live</div>
          )}
        </div>

        {/* Step 1 – schema */}
        <div className="row step-row">
          <div className="step-num">1</div>
          <div className="step-body">
            <h3>Create the database schema</h3>
            <p>Open your Supabase project → <strong>SQL Editor</strong> → <strong>New query</strong>, paste the SQL below, and click <strong>Run</strong>. This creates all tables, indexes, triggers, and RLS policies.</p>
            <div className="row settings-action-row">
              <button className="btn border round" style={{fontSize:13}} onClick={() => setSqlOpen(o=>!o)}>
                {sqlOpen ? <i style={{fontSize:14}}>expand_less</i> : <i style={{fontSize:14}}>expand_more</i>}
                {sqlOpen ? 'Collapse SQL' : 'Show SQL'}
              </button>
              <button className="primary round" style={{fontSize:13}} onClick={handleCopySQL}>
                <i style={{fontSize:13}}>content_copy</i> {sqlCopied ? 'Copied!' : 'Copy SQL'}
              </button>
            </div>
            {sqlOpen && (
              <pre className="sql-block">{SCHEMA_SQL}</pre>
            )}
          </div>
        </div>

        {/* Step 2 – credentials */}
        <div className="row step-row">
          <div className="step-num">2</div>
          <div className="step-body">
            <h3>Enter your project credentials</h3>
            <p>Find these in your Supabase project under <strong>Settings → API</strong>.</p>
            <div className="grid">
              <div className="field">
                <label className="label">Project URL</label>
                <input
                  className="input"
                  value={sbUrl}
                  onChange={e => setSbUrl(e.target.value)}
                  placeholder="https://xyzxyz.supabase.co"
                />
              </div>
              <div className="field">
                <label className="label">Anon / Public Key</label>
                <input
                  className="input"
                  value={sbAnonKey}
                  onChange={e => setSbAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIs..."
                />
              </div>
            </div>
            <div className="row settings-action-row">
              <button className="btn border round" onClick={handleSaveSupabase}>
                <i style={{fontSize:14}}>save</i> Save Credentials
              </button>
              <button className="primary round" onClick={handleTestConnection} disabled={testing}>
                {testing
                  ? <><i style={{fontSize:14}} className="rotate">refresh</i> Testing…</>
                  : <><i style={{fontSize:14}}>database</i> Test Connection</>}
              </button>
            </div>
            {connStatus === 'error' && (
              <div className="error-container padding round">
                <i style={{fontSize:14}}>warning</i> {connMsg}
              </div>
            )}
            {connStatus === 'ok' && (
              <div className="green-container padding round">
                <i style={{fontSize:14}}>check_circle</i> {connMsg}
              </div>
            )}
          </div>
        </div>

        {/* Step 3 – seed */}
        <div className="row step-row">
          <div className="step-num">3</div>
          <div className="step-body">
            <h3>Seed your initial data</h3>
            <p>Click the button below to push your current local products and categories up to Supabase. This is a safe upsert — it won't duplicate rows if you've already seeded.</p>
            <div className="row middle-align settings-action-row">
              <button
                className="primary round"
                onClick={handleSeedData}
                disabled={seeding || !isSupabaseConfigured()}
              >
                {seeding
                  ? <><i style={{fontSize:14}} className="rotate">refresh</i> Seeding…</>
                  : <><i style={{fontSize:14}}>database</i> Seed {storeProducts.length} Products & {storeCategories.length} Categories</>}
              </button>
              {!isSupabaseConfigured() && (
                <span className="on-surface-variant-text small-text">Connect Supabase first</span>
              )}
            </div>
          </div>
        </div>

        {/* RLS warning */}
        <div className="orange-container padding round rls-note">
          <i style={{fontSize:14}}>warning</i>
          <div>
            <strong>Security note:</strong> The schema above uses permissive RLS policies so your admin panel (which uses the anon key) can write data. For a production store, move all write operations to a backend using your <strong>service role key</strong> and restrict the anon key to reads only.
          </div>
        </div>
      </div>

      {/* ── EMAILJS ── */}
      <div className="border settings-section">
        <div className="row">
          <div className="settings-icon"><i style={{fontSize:18}}>mail</i></div>
          <div>
            <h2>EmailJS — Booking &amp; Order Notifications</h2>
            <p>Sign up free at <a href="https://www.emailjs.com" target="_blank" rel="noreferrer">emailjs.com</a>. Create two email templates and paste the IDs below. Also update <code>src/lib/config.js</code> for permanent storage.</p>
          </div>
        </div>
        <div className="grid">
          <div className="field">
            <label className="label">Service ID</label>
            <input className="input" value={emailjs.serviceId} onChange={e => setEmailjs(s=>({...s,serviceId:e.target.value}))} placeholder="service_abc123"/>
          </div>
          <div className="field">
            <label className="label">Public Key</label>
            <input className="input" value={emailjs.publicKey} onChange={e => setEmailjs(s=>({...s,publicKey:e.target.value}))} placeholder="your_public_key"/>
          </div>
          <div className="field">
            <label className="label">Booking Template ID</label>
            <input className="input" value={emailjs.bookingTemplate} onChange={e => setEmailjs(s=>({...s,bookingTemplate:e.target.value}))} placeholder="template_booking"/>
          </div>
          <div className="field">
            <label className="label">Order Template ID</label>
            <input className="input" value={emailjs.orderTemplate} onChange={e => setEmailjs(s=>({...s,orderTemplate:e.target.value}))} placeholder="template_order"/>
          </div>
        </div>
        <div className="surface-container-low padding round">
          <h4>Template variables</h4>
          <p><strong>Booking:</strong> <code>{'{{customer_name}}'}</code> <code>{'{{customer_phone}}'}</code> <code>{'{{customer_email}}'}</code> <code>{'{{service_type}}'}</code> <code>{'{{device_type}}'}</code> <code>{'{{device_model}}'}</code> <code>{'{{appointment_date}}'}</code> <code>{'{{appointment_time}}'}</code> <code>{'{{special_notes}}'}</code></p>
          <p><strong>Order:</strong> <code>{'{{order_id}}'}</code> <code>{'{{customer_name}}'}</code> <code>{'{{customer_email}}'}</code> <code>{'{{shipping_address}}'}</code> <code>{'{{order_items}}'}</code> <code>{'{{order_total}}'}</code> <code>{'{{estimated_arrival}}'}</code></p>
        </div>
        <button className="primary round" onClick={handleSaveEmailjs}><i style={{fontSize:14}}>save</i> Save EmailJS Config</button>
      </div>

      {/* ── STRIPE ── */}
      <div className="border settings-section">
        <div className="row">
          <div className="settings-icon"><i style={{fontSize:18}}>credit_card</i></div>
          <div>
            <h2>Stripe — Payments</h2>
            <p>Checkout uses real Stripe-hosted payment pages via serverless functions in <code>/api</code>. Card details never touch this app's frontend or database.</p>
          </div>
        </div>
        <div className="surface-container-low padding round">
          <h4>Setup checklist</h4>
          <p>1. Get your <strong>secret key</strong> from <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noreferrer">dashboard.stripe.com/apikeys</a> (starts with <code>sk_</code>).</p>
          <p>2. In your hosting provider (Vercel/Netlify) → Project Settings → Environment Variables, add <code>STRIPE_SECRET_KEY</code>. <strong>Do not</strong> put this in a <code>VITE_</code> variable or anywhere in the frontend — it must stay server-side only.</p>
          <p>3. Add a webhook endpoint at <code>dashboard.stripe.com/webhooks</code> pointing to <code>https://yourdomain.com/api/stripe-webhook</code>, subscribed to <code>checkout.session.completed</code>. Copy its signing secret into <code>STRIPE_WEBHOOK_SECRET</code>.</p>
          <p>4. Add your Supabase <strong>service_role</strong> key (Dashboard → Project Settings → API) as <code>SUPABASE_SERVICE_ROLE_KEY</code> — this lets the webhook write orders after RLS locked out public writes. Never expose this key to the browser.</p>
          <p>See <code>.env.example</code> for the full list of backend-only variables, and the comments in <code>/api/create-checkout-session.js</code> for a note on validating prices server-side before going live.</p>
        </div>
        <div className="orange-container padding round rls-note">
          <i style={{fontSize:16}}>warning</i>
          <div>
            Orders are only ever created by the Stripe webhook after payment is confirmed — the database rejects any direct order-creation attempt from the browser. This is intentional and required for real payment integrity.
          </div>
        </div>
      </div>

      {/* ── PASSWORD ── */}
      <div className="border settings-section">
        <div className="row">
          <div className="settings-icon"><i style={{fontSize:18}}>key</i></div>
          <div>
            <h2>Change Admin Password</h2>
            {isSupabaseConfigured()
              ? <p>Password is managed via <strong>Supabase Auth</strong>. Enter a new password to update your admin account.</p>
              : <p>Supabase not configured. Set <code>VITE_LOCAL_ADMIN_PW</code> in your <code>.env</code> file to change the local fallback password.</p>
            }
          </div>
        </div>
        {isSupabaseConfigured() ? (
          <>
            <div className="grid">
              <div className="field">
                <label className="label">New Password</label>
                <div style={{position:'relative'}}>
                  <input className="input" type={showPw?'text':'password'} value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="Min. 12 characters" style={{paddingRight:42}}/>
                  <button type="button" style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--md-on-surface-variant)',display:'flex'}} onClick={()=>setShowPw(s=>!s)}>
                    {showPw ? <i style={{fontSize:14}}>visibility_off</i> : <i style={{fontSize:14}}>visibility</i>}
                  </button>
                </div>
              </div>
              <div className="field">
                <label className="label">Confirm New Password</label>
                <input className="input" type="password" value={confirmPw} onChange={e=>setConfirmPw(e.target.value)} placeholder="Repeat new password"/>
              </div>
            </div>
            <button className="primary round" onClick={handleChangePw}><i style={{fontSize:14}}>key</i> Update Password</button>
          </>
        ) : (
          <div className="orange-container padding round rls-note">
            <i style={{fontSize:16}}>warning</i>
            <div>
              <strong>Local mode active.</strong> Add <code>VITE_LOCAL_ADMIN_PW=your-password</code> to your <code>.env</code> file and restart the dev server. Configure Supabase for production-grade authentication.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
