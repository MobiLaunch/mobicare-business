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
    addToast('EmailJS settings saved and ready for bookings.', 'success')
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
    <div id="admin-settings-page" className="admin-page settings-page">
      {/* Header Section */}
      <div id="settings-header-section" className="admin-page-header row wrap middle-align">
        <div className="admin-page-heading">
          <span className="chip small primary-container margin-bottom-s">System Configuration</span>
          <h2 className="admin-page-title">Store & Integration Settings</h2>
          <p className="admin-page-description on-surface-variant-text">
            Manage your cloud database credentials, payment webhooks, notification engines, and admin credentials.
          </p>
        </div>
      </div>

      {/* ── SUPABASE SECTION ── */}
      <div
        id="settings-supabase-card"
        style={{
          background: 'var(--surface-container-low)',
          borderRadius: 28,
          border: '1px solid color-mix(in srgb, var(--outline-variant) 50%, transparent)',
          padding: 32,
          marginBottom: 28,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)'
        }}
      >
        <div className="row middle-align" style={{ marginBottom: 24, gap: 16 }}>
          <div
            className="primary-container"
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <i className="primary-text" style={{ fontSize: 26 }}>database</i>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: '0 0 4px', fontWeight: 800, fontSize: '1.3rem' }}>Supabase Cloud Database</h3>
            <p className="on-surface-variant-text" style={{ margin: 0, fontSize: 14 }}>
              Persist products, categories, orders, and repair bookings in real-time.
            </p>
          </div>
          {connStatus && (
            <div className={`chip ${connStatus === 'ok' ? 'green-container' : 'error-container'}`} style={{ fontWeight: 700 }}>
              {connStatus === 'ok'
                ? <><i style={{ fontSize: 16 }}>check_circle</i> Connected</>
                : <><i style={{ fontSize: 16 }}>cancel</i> Connection Error</>}
            </div>
          )}
          {!connStatus && usingSupabase && (
            <div className="chip green-container" style={{ fontWeight: 700 }}>
              <i style={{ fontSize: 16 }}>check_circle</i> Supabase Live
            </div>
          )}
        </div>

        {/* Step 1 – Schema */}
        <div className="row gap-m" style={{ marginBottom: 28 }}>
          <div
            className="primary-container"
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              flexShrink: 0
            }}
          >
            1
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4 style={{ margin: '0 0 6px', fontWeight: 800 }}>Execute Database Schema SQL</h4>
            <p className="on-surface-variant-text" style={{ margin: '0 0 12px', fontSize: 14 }}>
              Copy the SQL migration script below, navigate to your Supabase <strong>SQL Editor</strong>, paste, and click <strong>Run</strong>.
            </p>
            <div className="row gap-s" style={{ marginBottom: 12 }}>
              <button className="border round small" style={{ fontWeight: 700 }} onClick={() => setSqlOpen(o => !o)}>
                <i>{sqlOpen ? 'expand_less' : 'expand_more'}</i>
                <span>{sqlOpen ? 'Collapse SQL Schema' : 'View SQL Schema'}</span>
              </button>
              <button className="primary round small" style={{ fontWeight: 700 }} onClick={handleCopySQL}>
                <i>content_copy</i>
                <span>{sqlCopied ? 'Copied to Clipboard!' : 'Copy SQL Script'}</span>
              </button>
            </div>
            {sqlOpen && (
              <pre
                style={{
                  background: 'var(--surface-container-highest)',
                  padding: 16,
                  borderRadius: 16,
                  fontSize: 12,
                  maxHeight: 320,
                  overflowY: 'auto',
                  border: '1px solid color-mix(in srgb, var(--outline-variant) 40%, transparent)'
                }}
              >
                {SCHEMA_SQL}
              </pre>
            )}
          </div>
        </div>

        {/* Step 2 – Credentials */}
        <div className="row gap-m" style={{ marginBottom: 28 }}>
          <div
            className="primary-container"
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              flexShrink: 0
            }}
          >
            2
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4 style={{ margin: '0 0 6px', fontWeight: 800 }}>Project API Credentials</h4>
            <p className="on-surface-variant-text" style={{ margin: '0 0 16px', fontSize: 14 }}>
              Located in your Supabase project under <strong>Project Settings → API</strong>.
            </p>
            <div className="grid" style={{ rowGap: 14, columnGap: 14, marginBottom: 16 }}>
              <div className="s12 m6 field label border round">
                <input
                  value={sbUrl}
                  onChange={e => setSbUrl(e.target.value)}
                  placeholder=" "
                />
                <label>Project URL (https://your-project.supabase.co)</label>
              </div>
              <div className="s12 m6 field label border round">
                <input
                  value={sbAnonKey}
                  onChange={e => setSbAnonKey(e.target.value)}
                  placeholder=" "
                />
                <label>Anon / Public API Key</label>
              </div>
            </div>
            <div className="row gap-s middle-align">
              <button className="border round" style={{ fontWeight: 700 }} onClick={handleSaveSupabase}>
                <i>save</i>
                <span>Save API Credentials</span>
              </button>
              <button className="primary round" style={{ fontWeight: 700 }} onClick={handleTestConnection} disabled={testing}>
                <i>{testing ? 'sync' : 'database'}</i>
                <span>{testing ? 'Testing Connection…' : 'Test Connection'}</span>
              </button>
            </div>
            {connStatus === 'error' && (
              <div className="error-container row middle-align gap-s" style={{ marginTop: 12, borderRadius: 16, padding: '10px 16px' }}>
                <i>warning</i>
                <span style={{ fontSize: 13 }}>{connMsg}</span>
              </div>
            )}
            {connStatus === 'ok' && (
              <div className="green-container row middle-align gap-s" style={{ marginTop: 12, borderRadius: 16, padding: '10px 16px' }}>
                <i>check_circle</i>
                <span style={{ fontSize: 13 }}>{connMsg}</span>
              </div>
            )}
          </div>
        </div>

        {/* Step 3 – Seed Initial Data */}
        <div className="row gap-m">
          <div
            className="primary-container"
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              flexShrink: 0
            }}
          >
            3
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4 style={{ margin: '0 0 6px', fontWeight: 800 }}>Seed Initial Catalog Data</h4>
            <p className="on-surface-variant-text" style={{ margin: '0 0 16px', fontSize: 14 }}>
              Push your local products and categories up to Supabase database tables.
            </p>
            <div className="row middle-align gap-m">
              <button
                className="primary round"
                style={{ fontWeight: 700 }}
                onClick={handleSeedData}
                disabled={seeding || !isSupabaseConfigured()}
              >
                <i>{seeding ? 'sync' : 'cloud_upload'}</i>
                <span>
                  {seeding
                    ? 'Seeding Catalog…'
                    : `Seed ${storeProducts.length} Products & ${storeCategories.length} Categories`}
                </span>
              </button>
              {!isSupabaseConfigured() && (
                <span className="on-surface-variant-text" style={{ fontSize: 13 }}>Connect Supabase first</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── EMAILJS NOTIFICATIONS SECTION ── */}
      <div
        id="settings-emailjs-card"
        style={{
          background: 'var(--surface-container-low)',
          borderRadius: 28,
          border: '1px solid color-mix(in srgb, var(--outline-variant) 50%, transparent)',
          padding: 32,
          marginBottom: 28,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)'
        }}
      >
        <div className="row middle-align" style={{ marginBottom: 20, gap: 16 }}>
          <div
            className="secondary-container"
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <i className="secondary-text" style={{ fontSize: 24 }}>mail</i>
          </div>
          <div>
            <h3 style={{ margin: '0 0 4px', fontWeight: 800, fontSize: '1.3rem' }}>EmailJS Notifications</h3>
            <p className="on-surface-variant-text" style={{ margin: 0, fontSize: 14 }}>
              Send automated confirmation emails for new repair bookings and store checkout orders.
            </p>
          </div>
        </div>

        <div className="grid" style={{ rowGap: 14, columnGap: 14, marginBottom: 20 }}>
          <div className="s12 m6 field label border round">
            <input value={emailjs.serviceId} onChange={e => setEmailjs(s => ({ ...s, serviceId: e.target.value }))} placeholder=" " />
            <label>EmailJS Service ID</label>
          </div>
          <div className="s12 m6 field label border round">
            <input value={emailjs.publicKey} onChange={e => setEmailjs(s => ({ ...s, publicKey: e.target.value }))} placeholder=" " />
            <label>Public Key</label>
          </div>
          <div className="s12 m6 field label border round">
            <input value={emailjs.bookingTemplate} onChange={e => setEmailjs(s => ({ ...s, bookingTemplate: e.target.value }))} placeholder=" " />
            <label>Booking Template ID</label>
          </div>
          <div className="s12 m6 field label border round">
            <input value={emailjs.orderTemplate} onChange={e => setEmailjs(s => ({ ...s, orderTemplate: e.target.value }))} placeholder=" " />
            <label>Order Template ID</label>
          </div>
        </div>

        <button className="primary round" style={{ fontWeight: 700 }} onClick={handleSaveEmailjs}>
          <i>save</i>
          <span>Save EmailJS Settings</span>
        </button>
      </div>

      {/* ── STRIPE PAYMENTS SECTION ── */}
      <div
        id="settings-stripe-card"
        style={{
          background: 'var(--surface-container-low)',
          borderRadius: 28,
          border: '1px solid color-mix(in srgb, var(--outline-variant) 50%, transparent)',
          padding: 32,
          marginBottom: 28,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)'
        }}
      >
        <div className="row middle-align" style={{ marginBottom: 20, gap: 16 }}>
          <div
            className="tertiary-container"
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <i className="tertiary-text" style={{ fontSize: 24 }}>credit_card</i>
          </div>
          <div>
            <h3 style={{ margin: '0 0 4px', fontWeight: 800, fontSize: '1.3rem' }}>Stripe Payment Integration</h3>
            <p className="on-surface-variant-text" style={{ margin: 0, fontSize: 14 }}>
              Secure checkout sessions via serverless webhooks in <code>/api</code>.
            </p>
          </div>
        </div>

        <div style={{ background: 'var(--surface-container-high)', borderRadius: 20, padding: 20 }}>
          <h5 style={{ margin: '0 0 8px', fontWeight: 800 }}>Stripe Production Checklist</h5>
          <p style={{ margin: '0 0 6px', fontSize: 13 }}>
            1. Obtain Secret Key from <strong>dashboard.stripe.com/apikeys</strong> (starts with <code>sk_</code>).
          </p>
          <p style={{ margin: '0 0 6px', fontSize: 13 }}>
            2. Configure environment variable <code>STRIPE_SECRET_KEY</code> in hosting platform.
          </p>
          <p style={{ margin: 0, fontSize: 13 }}>
            3. Point Stripe Webhook to <code>/api/stripe-webhook</code> listening for <code>checkout.session.completed</code>.
          </p>
        </div>
      </div>

      {/* ── SECURITY / PASSWORD SECTION ── */}
      <div
        id="settings-password-card"
        style={{
          background: 'var(--surface-container-low)',
          borderRadius: 28,
          border: '1px solid color-mix(in srgb, var(--outline-variant) 50%, transparent)',
          padding: 32,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)'
        }}
      >
        <div className="row middle-align" style={{ marginBottom: 20, gap: 16 }}>
          <div
            className="primary-container"
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <i className="primary-text" style={{ fontSize: 24 }}>key</i>
          </div>
          <div>
            <h3 style={{ margin: '0 0 4px', fontWeight: 800, fontSize: '1.3rem' }}>Admin Account Security</h3>
            <p className="on-surface-variant-text" style={{ margin: 0, fontSize: 14 }}>
              {isSupabaseConfigured()
                ? 'Update your administrator account password via Supabase Auth.'
                : 'Local fallback access mode active.'}
            </p>
          </div>
        </div>

        {isSupabaseConfigured() ? (
          <div>
            <div className="grid" style={{ rowGap: 14, columnGap: 14, marginBottom: 20 }}>
              <div className="s12 m6 field label border round">
                <input type={showPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)} placeholder=" " />
                <label>New Password (min 12 chars)</label>
              </div>
              <div className="s12 m6 field label border round">
                <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder=" " />
                <label>Confirm New Password</label>
              </div>
            </div>
            <button className="primary round" style={{ fontWeight: 700 }} onClick={handleChangePw}>
              <i>key</i>
              <span>Update Password</span>
            </button>
          </div>
        ) : (
          <div className="orange-container row middle-align gap-s" style={{ borderRadius: 16, padding: '12px 16px' }}>
            <i style={{ fontSize: 20 }}>warning</i>
            <span style={{ fontSize: 13 }}>
              Local development mode active. Set <code>VITE_LOCAL_ADMIN_PW</code> in your <code>.env</code> file.
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

