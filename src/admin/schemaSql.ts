// Full Supabase schema SQL (v2 — Supabase Auth + hardened RLS), shown to the
// admin as a copy-paste migration script in Settings. Extracted verbatim
// from the original Settings.jsx during the HeroUI v3 rebuild.
export const SCHEMA_SQL = `-- ============================================================
--  Mobicare — Supabase schema v2
--  SECURITY MODEL:
--    - Admin auth = Supabase Auth plus an explicit staff_users allowlist.
--    - Before running this, create your user in:
--      Dashboard → Authentication → Users → Add User, then provision its
--      UUID in staff_users using the trusted SQL note at the end.
--    - Orders are NEVER writable by anonymous clients. They are only
--      created by the create-order/webhook serverless functions
--      (service_role key, server-side), after payment is confirmed. A
--      signed-in customer may read their own order rows (user_id =
--      auth.uid()); anonymous browsers can only read via the short-lived
--      signed lookup token flow.
--    - Bookings are written only by the rate-limited serverless booking API
--      using the service-role key. There is NO public INSERT/UPDATE/DELETE
--      policy on bookings; staff can read/manage all, and a signed-in
--      customer may read their own booking rows (user_id = auth.uid()).
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
  parent_id   text references public.categories(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists categories_parent_id_idx on public.categories(parent_id);

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
-- Written ONLY by the create-order and stripe-webhook serverless functions
-- (service_role key) — create-order inserts once payment is verified, the
-- webhook updates status as Stripe confirms/fails/refunds it. The
-- anon/browser key can never insert, update, or delete rows here — see RLS
-- policies below (customers may only SELECT their own rows).
-- ────────────────────────────────────────────────────────────
create table if not exists public.orders (
  id                       text primary key default gen_random_uuid()::text,
  payment_intent_id text,                         -- idempotency key from Stripe
  user_id          uuid references auth.users(id) on delete set null,
  status           text not null default 'paid'
                     check (status in ('paid','processing','shipped','delivered','cancelled','refunded','payment_failed')),
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
create index if not exists orders_user_id_idx    on public.orders(user_id);
create index if not exists orders_lookup_token_idx on public.orders(lookup_token_hash);
create unique index if not exists orders_payment_intent_id_key
  on public.orders(payment_intent_id)
  where payment_intent_id is not null;
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
  visit_type     text not null default 'in-store',
  visit_location_type text,                   -- 'residential' | 'commercial', home visits only
  home_address   text not null default '',
  user_id        uuid references auth.users(id) on delete set null,
  status         text not null default 'pending'
                   check (status in ('pending','confirmed','completed','cancelled','no-show')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists bookings_status_idx     on public.bookings(status);
create index if not exists bookings_created_at_idx on public.bookings(created_at desc);
create index if not exists bookings_email_created_idx on public.bookings(customer_email, created_at desc);
create index if not exists bookings_user_id_idx on public.bookings(user_id);

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

-- ────────────────────────────────────────────────────────────
-- CATEGORY HIERARCHY DEPTH CAP (2 levels: category -> subcategory only)
-- ────────────────────────────────────────────────────────────
create or replace function public.enforce_category_depth()
returns trigger language plpgsql as $$
declare
  parent_has_parent boolean;
begin
  if new.parent_id is not null then
    if new.parent_id = new.id then
      raise exception 'A category cannot be its own parent.';
    end if;
    select (parent_id is not null) into parent_has_parent
    from public.categories where id = new.parent_id;
    if parent_has_parent then
      raise exception 'Categories only support 2 levels — the selected parent is itself a subcategory.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists categories_enforce_depth on public.categories;
create trigger categories_enforce_depth
  before insert or update on public.categories
  for each row execute procedure public.enforce_category_depth();

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

-- Bookings: no anonymous browser access. The serverless API uses
-- service_role; admin staff users have full access; a signed-in customer
-- may only read their own bookings (never write — that stays service-role).
drop policy if exists "public create bookings" on public.bookings;
drop policy if exists "admin all bookings" on public.bookings;
create policy "admin all bookings" on public.bookings for all using (public.is_admin()) with check (public.is_admin());
create policy "customer read own bookings" on public.bookings for select using (auth.uid() = user_id);

-- Orders: no anonymous browser access, and no customer write access — only
-- the service_role key (used exclusively by your create-order/webhook
-- functions, server-side) can insert or update. Admin can read/manage
-- everything; a signed-in customer may only read their own orders.
drop policy if exists "public create orders" on public.orders;
drop policy if exists "admin all orders" on public.orders;
create policy "admin all orders" on public.orders for all using (public.is_admin()) with check (public.is_admin());
create policy "customer read own orders" on public.orders for select using (auth.uid() = user_id);

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
`;
