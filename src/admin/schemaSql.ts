// Unified Supabase schema SQL (MobiCare + NovaOps shared database)
export const SCHEMA_SQL = `-- ============================================================================
-- MobiCare + NovaOps — UNIFIED SUITE MIGRATION
-- ============================================================================
-- Safe and idempotent to run on a brand-new OR existing Supabase project
-- shared by MobiCare (storefront + admin) and NovaOps (POS + repair shop).
--
-- Dashboard -> SQL Editor -> New query -> paste -> Run
-- ============================================================================

create extension if not exists "pgcrypto";

-- ────────────────────────────────────────────────────────────────────────────
-- 0. GENERIC TIMESTAMP TRIGGER HELPERS
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. ROLE & ACCOUNT SEPARATION TABLES
--    - profiles          : Shop owner business profile (NEVER storefront customers)
--    - customer_profiles : Storefront customer accounts
--    - staff_users       : Explicit MobiCare admin/staff allowlist
--    - staff_members     : NovaOps team accounts scoped to a shop owner
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  email               text         not null default '',
  full_name           text         not null default '',
  business_name       text         not null default '',
  phone               text         not null default '',
  address             text         not null default '',
  currency            text         not null default '$',
  tax_rate            numeric(5,2) not null default 0,
  statuses            text         not null default 'Open, In Progress, Waiting for Parts, Completed, Delivered',
  pin                 text         not null default '1234',
  square_access_token text         not null default '',
  square_location_id  text         not null default '',
  square_sandbox      boolean      not null default false,
  services            jsonb        not null default '[]'::jsonb,
  expenses            jsonb        not null default '[]'::jsonb,
  display_slides      jsonb        not null default '[]'::jsonb,
  display_config      jsonb        not null default '{}'::jsonb,
  created_at          timestamptz  not null default now(),
  updated_at          timestamptz  not null default now()
);

alter table public.profiles add column if not exists full_name           text         not null default '';
alter table public.profiles add column if not exists business_name       text         not null default '';
alter table public.profiles add column if not exists phone               text         not null default '';
alter table public.profiles add column if not exists address             text         not null default '';
alter table public.profiles add column if not exists currency            text         not null default '$';
alter table public.profiles add column if not exists tax_rate            numeric(5,2) not null default 0;
alter table public.profiles add column if not exists statuses            text         not null default 'Open, In Progress, Waiting for Parts, Completed, Delivered';
alter table public.profiles add column if not exists pin                 text         not null default '1234';
alter table public.profiles add column if not exists square_access_token text         not null default '';
alter table public.profiles add column if not exists square_location_id  text         not null default '';
alter table public.profiles add column if not exists square_sandbox      boolean      not null default false;
alter table public.profiles add column if not exists services            jsonb        not null default '[]'::jsonb;
alter table public.profiles add column if not exists expenses            jsonb        not null default '[]'::jsonb;
alter table public.profiles add column if not exists display_slides      jsonb        not null default '[]'::jsonb;
alter table public.profiles add column if not exists display_config      jsonb        not null default '{}'::jsonb;

create or replace trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create table if not exists public.customer_profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text        not null default '',
  phone      text        not null default '',
  email      text        not null default '',
  address    text        not null default '',
  city       text        not null default '',
  state      text        not null default '',
  zip        text        not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_profiles add column if not exists full_name  text        not null default '';
alter table public.customer_profiles add column if not exists phone      text        not null default '';
alter table public.customer_profiles add column if not exists email      text        not null default '';
alter table public.customer_profiles add column if not exists address    text        not null default '';
alter table public.customer_profiles add column if not exists city       text        not null default '';
alter table public.customer_profiles add column if not exists state      text        not null default '';
alter table public.customer_profiles add column if not exists zip        text        not null default '';
alter table public.customer_profiles add column if not exists created_at timestamptz not null default now();
alter table public.customer_profiles add column if not exists updated_at timestamptz not null default now();

create index if not exists customer_profiles_email_idx on public.customer_profiles (lower(email));

create or replace trigger customer_profiles_updated_at
  before update on public.customer_profiles
  for each row execute function public.set_updated_at();

create table if not exists public.staff_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text        not null default 'admin' check (role in ('admin', 'staff')),
  enabled    boolean     not null default true,
  created_at timestamptz not null default now()
);

revoke all on table public.staff_users from anon, authenticated;

create table if not exists public.staff_members (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  owner_id   uuid        not null references auth.users(id) on delete cascade,
  name       text        not null default '',
  email      text        not null default '',
  pin        text        not null default '',
  role       text        not null default 'staff',
  active     boolean     not null default true,
  created_at timestamptz not null default now()
);

alter table public.staff_members add column if not exists name       text        not null default '';
alter table public.staff_members add column if not exists email      text        not null default '';
alter table public.staff_members add column if not exists pin        text        not null default '';
alter table public.staff_members add column if not exists role       text        not null default 'staff';
alter table public.staff_members add column if not exists active     boolean     not null default true;
alter table public.staff_members add column if not exists created_at timestamptz not null default now();

create index if not exists staff_members_owner_id_idx on public.staff_members (owner_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. SECURITY-DEFINER ROLE HELPERS & AUTH SIGN-UP TRIGGER
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.shop_owner_id()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_owner uuid;
begin
  if v_uid is null then
    return null;
  end if;

  select sm.owner_id into v_owner
  from public.staff_members sm
  where sm.user_id = v_uid
    and sm.active = true
  limit 1;

  if v_owner is not null then
    return v_owner;
  end if;

  if exists (select 1 from public.profiles p where p.id = v_uid) then
    return v_uid;
  end if;

  if exists (
    select 1
    from public.staff_users su
    where su.user_id = v_uid
      and su.enabled = true
  ) then
    select p.id into v_owner
    from public.profiles p
    order by p.created_at asc
    limit 1;
    return v_owner;
  end if;

  return null;
end;
$$;

revoke all on function public.shop_owner_id() from public;
grant execute on function public.shop_owner_id() to anon, authenticated, service_role;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.staff_users su
      where su.user_id = auth.uid()
        and su.enabled = true
        and su.role = 'admin'
    )
    or (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
      )
      and not exists (
        select 1
        from public.staff_members sm
        where sm.user_id = auth.uid()
      )
    );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

create or replace function public.is_shop_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.staff_members sm
      where sm.user_id = auth.uid()
        and sm.active = true
    )
    or exists (
      select 1
      from public.staff_users su
      where su.user_id = auth.uid()
        and su.enabled = true
    );
$$;

revoke all on function public.is_shop_member() from public;
grant execute on function public.is_shop_member() to anon, authenticated, service_role;

-- Trigger on auth.users: strictly separates shop_owner, staff, and customer sign-ups
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_type text := lower(coalesce(new.raw_user_meta_data->>'account_type', ''));
  v_full_name    text := coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '');
  v_biz_name     text := coalesce(
                           nullif(new.raw_user_meta_data->>'businessName', ''),
                           nullif(new.raw_user_meta_data->>'business_name', ''),
                           v_full_name
                         );
  v_phone        text := coalesce(new.raw_user_meta_data->>'phone', '');
  v_address      text := coalesce(new.raw_user_meta_data->>'address', '');
  v_currency     text := coalesce(nullif(new.raw_user_meta_data->>'currency', ''), '$');
begin
  if v_account_type = 'shop_owner' then
    insert into public.profiles (id, email, full_name, business_name, phone, address, currency)
    values (
      new.id,
      coalesce(new.email, ''),
      v_full_name,
      v_biz_name,
      v_phone,
      v_address,
      v_currency
    )
    on conflict (id) do nothing;

    insert into public.staff_users (user_id, role, enabled)
    values (new.id, 'admin', true)
    on conflict (user_id) do update
      set role = 'admin', enabled = true;

  elsif v_account_type = 'staff' then
    -- Provisioned into public.staff_members by /api/staff; never give a profiles row.
    null;

  else
    -- Storefront customer (account_type = 'customer' or omitted)
    insert into public.customer_profiles (id, full_name, phone, email)
    values (
      new.id,
      v_full_name,
      v_phone,
      coalesce(new.email, '')
    )
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ────────────────────────────────────────────────────────────────────────────
-- 3. NOVAOPS CORE & SHARED TABLES
-- ────────────────────────────────────────────────────────────────────────────

-- settings
create table if not exists public.settings (
  id            bigserial    primary key,
  profile_id    uuid         references auth.users(id) on delete cascade,
  business_name text         not null default '',
  email         text         not null default '',
  phone         text         not null default '',
  address       text         not null default '',
  currency      text         not null default '$',
  tax_rate      numeric(5,2) not null default 0,
  statuses      text         not null default 'Open, In Progress, Waiting for Parts, Completed, Delivered',
  created_at    timestamptz  not null default now(),
  updated_at    timestamptz  not null default now()
);

alter table public.settings add column if not exists profile_id    uuid         references auth.users(id) on delete cascade;
alter table public.settings add column if not exists business_name text         not null default '';
alter table public.settings add column if not exists email         text         not null default '';
alter table public.settings add column if not exists phone         text         not null default '';
alter table public.settings add column if not exists address       text         not null default '';
alter table public.settings add column if not exists currency      text         not null default '$';
alter table public.settings add column if not exists tax_rate      numeric(5,2) not null default 0;
alter table public.settings add column if not exists statuses      text         not null default 'Open, In Progress, Waiting for Parts, Completed, Delivered';
alter table public.settings add column if not exists created_at    timestamptz  not null default now();
alter table public.settings add column if not exists updated_at    timestamptz  not null default now();

create index if not exists settings_profile_id_idx on public.settings (profile_id);

create or replace trigger settings_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

-- customers
create table if not exists public.customers (
  id              bigserial   primary key,
  profile_id      uuid        not null references auth.users(id) on delete cascade,
  name            text        not null default '',
  phone           text        not null default '',
  email           text        not null default '',
  address         text        not null default '',
  drivers_license text        not null default '',
  tags            text[]      not null default '{}',
  notes           text        not null default '',
  loyalty_points  integer     not null default 0,
  tax_exempt      boolean     not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.customers add column if not exists loyalty_points integer not null default 0;
alter table public.customers add column if not exists tax_exempt     boolean not null default false;

create index if not exists customers_profile_id_idx on public.customers (profile_id);
create index if not exists customers_email_idx      on public.customers (profile_id, email);
create index if not exists customers_name_idx       on public.customers (profile_id, name);

create or replace trigger customers_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

-- tickets
create table if not exists public.tickets (
  id                 bigserial     primary key,
  profile_id         uuid          not null references auth.users(id) on delete cascade,
  customer_id        bigint        references public.customers(id) on delete set null,
  device             text          not null default '',
  device_model       text          not null default '',
  device_description text          not null default '',
  device_passcode    text          not null default '',
  issue              text          not null default '',
  status             text          not null default 'Open',
  priority           text          not null default 'normal',
  price              numeric(10,2) not null default 0,
  serial_number      text          not null default '',
  warranty_days      integer       not null default 90,
  warranty_start     timestamptz,
  services           jsonb         not null default '[]'::jsonb,
  intake_checklist   jsonb         not null default '{}'::jsonb,
  created_by_name    text          not null default '',
  photos             jsonb         not null default '[]'::jsonb,
  signature          text,
  notes              jsonb         not null default '[]'::jsonb,
  parts              jsonb         not null default '[]'::jsonb,
  payments           jsonb         not null default '[]'::jsonb,
  time_log           jsonb         not null default '[]'::jsonb,
  tracking           jsonb,
  diagnostics        jsonb,
  created_at         timestamptz   not null default now(),
  updated_at         timestamptz   not null default now()
);

alter table public.tickets add column if not exists services         jsonb       not null default '[]'::jsonb;
alter table public.tickets add column if not exists created_by_name  text        not null default '';
alter table public.tickets add column if not exists device_passcode  text        not null default '';
alter table public.tickets add column if not exists intake_checklist jsonb       not null default '{}'::jsonb;
alter table public.tickets add column if not exists warranty_days    integer     not null default 90;
alter table public.tickets add column if not exists warranty_start   timestamptz;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tickets'
      and column_name = 'warranty_start'
      and data_type = 'date'
  ) then
    alter table public.tickets
      alter column warranty_start type timestamptz
      using warranty_start::timestamptz;
  end if;
end;
$$;

alter table public.tickets alter column warranty_days set default 90;

create index if not exists tickets_profile_id_idx  on public.tickets (profile_id);
create index if not exists tickets_status_idx      on public.tickets (profile_id, status);
create index if not exists tickets_customer_id_idx on public.tickets (customer_id);
create index if not exists tickets_created_at_idx  on public.tickets (profile_id, created_at desc);

create or replace trigger tickets_updated_at
  before update on public.tickets
  for each row execute function public.set_updated_at();

-- inventory
create table if not exists public.inventory (
  id          bigserial     primary key,
  profile_id  uuid          not null references auth.users(id) on delete cascade,
  name        text          not null default '',
  sku         text          not null default '',
  category    text          not null default 'Parts',
  model       text          not null default '',
  stock       integer       not null default 0,
  low         integer       not null default 5,
  cost        numeric(10,2) not null default 0,
  price       numeric(10,2) not null default 0,
  item_type   text          not null default 'product',
  description text          not null default '',
  created_at  timestamptz   not null default now(),
  updated_at  timestamptz   not null default now()
);

alter table public.inventory add column if not exists item_type   text not null default 'product';
alter table public.inventory add column if not exists description text not null default '';

create index if not exists inventory_profile_id_idx on public.inventory (profile_id);
create index if not exists inventory_sku_idx        on public.inventory (profile_id, sku) where sku <> '';

create or replace trigger inventory_updated_at
  before update on public.inventory
  for each row execute function public.set_updated_at();

-- services
create table if not exists public.services (
  id                bigserial     primary key,
  profile_id        uuid          not null references auth.users(id) on delete cascade,
  name              text          not null default '',
  category          text          not null default 'Services',
  description       text          not null default '',
  price             numeric(10,2) not null default 0,
  estimated_minutes integer       not null default 0,
  duration          integer       not null default 0,
  active            boolean       not null default true,
  created_at        timestamptz   not null default now(),
  updated_at        timestamptz   not null default now()
);

create index if not exists services_profile_id_idx on public.services (profile_id);
create index if not exists services_active_idx     on public.services (profile_id, active) where active = true;

create or replace trigger services_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

-- expenses
create table if not exists public.expenses (
  id          bigserial     primary key,
  profile_id  uuid          not null references auth.users(id) on delete cascade,
  description text          not null default '',
  amount      numeric(10,2) not null default 0,
  category    text          not null default 'Overhead',
  date        date          not null default current_date,
  created_at  timestamptz   not null default now(),
  updated_at  timestamptz   not null default now()
);

create index if not exists expenses_profile_id_idx on public.expenses (profile_id);
create index if not exists expenses_date_idx       on public.expenses (profile_id, date desc);

create or replace trigger expenses_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();

-- house_calls
create table if not exists public.house_calls (
  id          bigserial   primary key,
  profile_id  uuid        not null references auth.users(id) on delete cascade,
  customer_id bigint      references public.customers(id) on delete set null,
  description text        not null default '',
  address     text        not null default '',
  date        date,
  time        text        not null default '',
  status      text        not null default 'scheduled',
  notes       text        not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists house_calls_profile_id_idx on public.house_calls (profile_id);
create index if not exists house_calls_date_idx       on public.house_calls (profile_id, date);

create or replace trigger house_calls_updated_at
  before update on public.house_calls
  for each row execute function public.set_updated_at();

-- appointments
create table if not exists public.appointments (
  id          bigserial   primary key,
  profile_id  uuid        not null references auth.users(id) on delete cascade,
  customer_id bigint      references public.customers(id) on delete set null,
  title       text        not null default '',
  description text        not null default '',
  date        date,
  time        text        not null default '',
  status      text        not null default 'scheduled',
  notes       text        not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists appointments_profile_id_idx on public.appointments (profile_id);
create index if not exists appointments_date_idx       on public.appointments (profile_id, date);

create or replace trigger appointments_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

-- vendor_repairs
create table if not exists public.vendor_repairs (
  id              bigserial   primary key,
  profile_id      uuid        not null references auth.users(id) on delete cascade,
  customer_id     bigint      references public.customers(id) on delete set null,
  device          text        not null default '',
  issue           text        not null default '',
  vendor          text        not null default '',
  ticket_ref      text        not null default '',
  tracking_number text        not null default '',
  status          text        not null default 'Preparing to Ship',
  sent_date       date,
  est_return      date,
  notes           text        not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists vendor_repairs_profile_id_idx on public.vendor_repairs (profile_id);

create or replace trigger vendor_repairs_updated_at
  before update on public.vendor_repairs
  for each row execute function public.set_updated_at();

-- device_brands, device_categories, device_models, devices
create table if not exists public.device_brands (
  id         bigserial   primary key,
  profile_id uuid        not null references auth.users(id) on delete cascade,
  name       text        not null,
  icon_url   text,
  created_at timestamptz not null default now(),
  unique (profile_id, name)
);

create index if not exists idx_device_brands_profile on public.device_brands (profile_id);

create table if not exists public.device_categories (
  id         bigserial   primary key,
  profile_id uuid        not null references auth.users(id) on delete cascade,
  name       text        not null,
  emoji      text        not null default '📦',
  created_at timestamptz not null default now(),
  unique (profile_id, name)
);

create index if not exists idx_device_categories_profile on public.device_categories (profile_id);

create table if not exists public.device_models (
  id         bigserial   primary key,
  profile_id uuid        not null references auth.users(id) on delete cascade,
  brand      text        not null,
  category   text        not null,
  name       text        not null,
  created_at timestamptz not null default now(),
  unique (profile_id, brand, category, name)
);

create index if not exists idx_device_models_profile on public.device_models (profile_id);

create table if not exists public.devices (
  id           bigserial   primary key,
  brand        text        not null,
  category     text        not null,
  name         text        not null,
  model_number text        not null default '',
  created_at   timestamptz not null default now(),
  unique (brand, category, name)
);

alter table public.devices add column if not exists model_number text not null default '';
create index if not exists idx_devices_brand_category on public.devices (brand, category);

-- Seed core device catalog entries idempotently
insert into public.devices (brand, category, name) values
  ('Apple', 'Smartphone', 'iPhone 16 Pro Max'),
  ('Apple', 'Smartphone', 'iPhone 16 Pro'),
  ('Apple', 'Smartphone', 'iPhone 16 Plus'),
  ('Apple', 'Smartphone', 'iPhone 16'),
  ('Apple', 'Smartphone', 'iPhone 15 Pro Max'),
  ('Apple', 'Smartphone', 'iPhone 15 Pro'),
  ('Apple', 'Smartphone', 'iPhone 15 Plus'),
  ('Apple', 'Smartphone', 'iPhone 15'),
  ('Apple', 'Smartphone', 'iPhone 14 Pro Max'),
  ('Apple', 'Smartphone', 'iPhone 14 Pro'),
  ('Apple', 'Smartphone', 'iPhone 14'),
  ('Apple', 'Smartphone', 'iPhone 13'),
  ('Apple', 'Tablet', 'iPad Pro 13-inch'),
  ('Apple', 'Tablet', 'iPad Air 11-inch'),
  ('Apple', 'Tablet', 'iPad 10th Gen'),
  ('Apple', 'Laptop', 'MacBook Air M3'),
  ('Apple', 'Laptop', 'MacBook Pro 14-inch'),
  ('Apple', 'Smartwatch', 'Apple Watch Series 10'),
  ('Samsung', 'Smartphone', 'Galaxy S24 Ultra'),
  ('Samsung', 'Smartphone', 'Galaxy S24+'),
  ('Samsung', 'Smartphone', 'Galaxy S24'),
  ('Samsung', 'Smartphone', 'Galaxy S23 Ultra'),
  ('Samsung', 'Smartphone', 'Galaxy S23'),
  ('Samsung', 'Smartphone', 'Galaxy Z Fold 6'),
  ('Samsung', 'Smartphone', 'Galaxy Z Flip 6'),
  ('Samsung', 'Smartphone', 'Galaxy A54 5G'),
  ('Samsung', 'Tablet', 'Galaxy Tab S9'),
  ('Google', 'Smartphone', 'Pixel 9 Pro XL'),
  ('Google', 'Smartphone', 'Pixel 9 Pro'),
  ('Google', 'Smartphone', 'Pixel 9'),
  ('Google', 'Smartphone', 'Pixel 8 Pro'),
  ('Google', 'Smartphone', 'Pixel 8')
on conflict (brand, category, name) do nothing;

-- trade_ins
create table if not exists public.trade_ins (
  id                bigserial     primary key,
  profile_id        uuid          not null references auth.users(id) on delete cascade,
  customer_id       bigint        references public.customers(id) on delete set null,
  brand             text          not null default '',
  model             text          not null default '',
  model_number      text          not null default '',
  imei              text          not null default '',
  storage           text          not null default '',
  color             text          not null default '',
  condition_grade   text          not null default 'Good',
  age_years         numeric(4,1)  not null default 0,
  screen_condition  text          not null default 'Perfect',
  battery_health    integer       not null default 80,
  functional_issues text[]        not null default '{}',
  cosmetic_issues   text[]        not null default '{}',
  accessories       text[]        not null default '{}',
  icloud_locked     boolean       not null default false,
  frp_locked        boolean       not null default false,
  market_price      numeric(10,2),
  repair_cost_est   numeric(10,2),
  offer_price       numeric(10,2),
  estimated_resale  numeric(10,2),
  estimated_profit  numeric(10,2),
  status            text          not null default 'Pending',
  notes             text          not null default '',
  created_at        timestamptz   not null default now(),
  updated_at        timestamptz   not null default now()
);

create index if not exists idx_trade_ins_profile  on public.trade_ins (profile_id);
create index if not exists idx_trade_ins_customer on public.trade_ins (customer_id);
create index if not exists idx_trade_ins_status   on public.trade_ins (status);

create or replace trigger trade_ins_updated_at
  before update on public.trade_ins
  for each row execute function public.set_updated_at();

-- pos_sales
create table if not exists public.pos_sales (
  id                   bigserial     primary key,
  profile_id           uuid          not null references auth.users(id) on delete cascade,
  customer_id          bigint        references public.customers(id) on delete set null,
  items                jsonb         not null default '[]'::jsonb,
  subtotal             numeric(10,2) not null default 0,
  discount             numeric(10,2) not null default 0,
  tax                  numeric(10,2) not null default 0,
  total                numeric(10,2) not null default 0,
  payment_method       text          not null default 'Cash',
  cash_tendered        numeric(10,2),
  change_due           numeric(10,2),
  square_payment_id    text,
  terminal_checkout_id text,
  staff_name           text          not null default '',
  loyalty_earned       integer       not null default 0,
  loyalty_redeemed     integer       not null default 0,
  note                 text          not null default '',
  status               text          not null default 'completed',
  created_at           timestamptz   not null default now()
);

alter table public.pos_sales add column if not exists staff_name           text          not null default '';
alter table public.pos_sales add column if not exists loyalty_earned       integer       not null default 0;
alter table public.pos_sales add column if not exists loyalty_redeemed     integer       not null default 0;
alter table public.pos_sales add column if not exists discount             numeric(10,2) not null default 0;
alter table public.pos_sales add column if not exists cash_tendered        numeric(10,2);
alter table public.pos_sales add column if not exists change_due           numeric(10,2);
alter table public.pos_sales add column if not exists square_payment_id    text;
alter table public.pos_sales add column if not exists terminal_checkout_id text;

create index if not exists idx_pos_sales_profile    on public.pos_sales (profile_id);
create index if not exists idx_pos_sales_customer   on public.pos_sales (customer_id);
create index if not exists idx_pos_sales_created_at on public.pos_sales (created_at desc);

-- square_config + safe public config RPC
create table if not exists public.square_config (
  id                   bigserial   primary key,
  profile_id           uuid        not null references auth.users(id) on delete cascade,
  access_token         text        not null default '',
  location_id          text        not null default '',
  application_id       text        not null default '',
  sandbox              boolean     not null default false,
  terminal_device_id   text        not null default '',
  terminal_device_name text        not null default '',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (profile_id)
);

alter table public.square_config add column if not exists application_id       text    not null default '';
alter table public.square_config add column if not exists terminal_device_id   text    not null default '';
alter table public.square_config add column if not exists terminal_device_name text    not null default '';

create or replace trigger square_config_updated_at
  before update on public.square_config
  for each row execute function public.set_updated_at();

create or replace function public.get_square_public_config()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_owner uuid := public.shop_owner_id();
  v_row   public.square_config%rowtype;
begin
  if v_owner is null or not public.is_shop_member() then
    return jsonb_build_object(
      'configured', false,
      'location_id', '',
      'application_id', '',
      'sandbox', false,
      'terminal_device_id', '',
      'terminal_device_name', ''
    );
  end if;

  select * into v_row
  from public.square_config
  where profile_id = v_owner
  limit 1;

  if not found then
    return jsonb_build_object(
      'configured', false,
      'location_id', '',
      'application_id', '',
      'sandbox', false,
      'terminal_device_id', '',
      'terminal_device_name', ''
    );
  end if;

  return jsonb_build_object(
    'configured', (coalesce(v_row.access_token, '') <> '' and coalesce(v_row.location_id, '') <> ''),
    'location_id', coalesce(v_row.location_id, ''),
    'application_id', coalesce(v_row.application_id, ''),
    'sandbox', coalesce(v_row.sandbox, false),
    'terminal_device_id', coalesce(v_row.terminal_device_id, ''),
    'terminal_device_name', coalesce(v_row.terminal_device_name, '')
  );
end;
$$;

revoke all on function public.get_square_public_config() from public;
grant execute on function public.get_square_public_config() to authenticated, service_role;

-- messages (shared email, SMS, and website live chat)
create table if not exists public.messages (
  id               bigserial   primary key,
  profile_id       uuid        references auth.users(id) on delete cascade,
  user_id          uuid        references auth.users(id) on delete set null,
  customer_id      bigint      references public.customers(id) on delete set null,
  customer_name    text        not null default '',
  customer_email   text        not null default '',
  channel          text        not null default 'email',
  direction        text        not null default 'outbound',
  subject          text        not null default '',
  body             text        not null default '',
  ticket_id        bigint      references public.tickets(id) on delete set null,
  gmail_message_id text        unique,
  read             boolean     not null default false,
  delivered        boolean     not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.messages alter column profile_id drop not null;
alter table public.messages add column if not exists user_id          uuid references auth.users(id) on delete set null;
alter table public.messages add column if not exists gmail_message_id text;

create unique index if not exists messages_gmail_message_id_key
  on public.messages (gmail_message_id)
  where gmail_message_id is not null;
create index if not exists messages_profile_id_idx     on public.messages (profile_id);
create index if not exists messages_user_id_idx        on public.messages (user_id) where user_id is not null;
create index if not exists messages_customer_id_idx    on public.messages (profile_id, customer_id);
create index if not exists messages_customer_email_idx on public.messages (profile_id, customer_email);
create index if not exists messages_created_at_idx     on public.messages (profile_id, created_at desc);
create index if not exists messages_ticket_id_idx      on public.messages (ticket_id) where ticket_id is not null;

create or replace function public.messages_fill_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.profile_id is null then
    select p.id into new.profile_id
    from public.profiles p
    order by p.created_at asc
    limit 1;
  end if;

  if new.channel = 'chat' and new.user_id is null then
    if new.direction = 'inbound' and auth.uid() is not null then
      new.user_id := auth.uid();
    elsif new.direction = 'outbound' and coalesce(new.customer_email, '') <> '' then
      select m.user_id into new.user_id
      from public.messages m
      where m.channel = 'chat'
        and lower(m.customer_email) = lower(new.customer_email)
        and m.user_id is not null
      order by m.created_at desc
      limit 1;

      if new.user_id is null then
        select cp.id into new.user_id
        from public.customer_profiles cp
        where lower(cp.email) = lower(new.customer_email)
        limit 1;
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists messages_fill_defaults_trg on public.messages;
create trigger messages_fill_defaults_trg
  before insert on public.messages
  for each row execute function public.messages_fill_defaults();

create or replace trigger messages_updated_at
  before update on public.messages
  for each row execute function public.set_updated_at();

-- Brand Manager & Social tables (NovaOps)
create table if not exists public.brand_settings (
  id                    uuid        primary key default gen_random_uuid(),
  profile_id            uuid        not null references auth.users(id) on delete cascade,
  portal_enabled        boolean     not null default false,
  portal_slug           text        not null default '',
  welcome_message       text        not null default '',
  booking_enabled       boolean     not null default false,
  booking_open          text        not null default '09:00',
  booking_close         text        not null default '17:00',
  slot_duration         integer     not null default 30,
  auto_response_enabled boolean     not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (profile_id)
);

create or replace trigger brand_settings_updated_at
  before update on public.brand_settings
  for each row execute function public.set_updated_at();

create table if not exists public.social_connections (
  id               uuid        primary key default gen_random_uuid(),
  profile_id       uuid        not null references auth.users(id) on delete cascade,
  platform         text        not null,
  platform_id      text,
  handle           text,
  access_token     text,
  refresh_token    text,
  token_expires_at timestamptz,
  scopes           text[]      not null default '{}',
  connected        boolean     not null default true,
  meta             jsonb       not null default '{}'::jsonb,
  last_synced_at   timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (profile_id, platform)
);

revoke select (access_token, refresh_token) on public.social_connections from authenticated, anon;

create or replace trigger social_connections_updated_at
  before update on public.social_connections
  for each row execute function public.set_updated_at();

create table if not exists public.social_interactions (
  id              uuid        primary key default gen_random_uuid(),
  profile_id      uuid        not null references auth.users(id) on delete cascade,
  platform        text        not null,
  platform_ref_id text,
  author_name     text        not null default '',
  author_id       text,
  type            text        not null default 'Review',
  content         text        not null default '',
  rating          integer     check (rating is null or (rating between 1 and 5)),
  sentiment       text        not null default 'neutral',
  likes           integer,
  url             text,
  unread          boolean     not null default true,
  starred         boolean     not null default false,
  archived        boolean     not null default false,
  our_reply       text,
  reply_posted_at timestamptz,
  reply_posted_to text,
  interaction_at  timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists social_interactions_profile_id_idx   on public.social_interactions (profile_id);
create index if not exists social_interactions_platform_idx     on public.social_interactions (profile_id, platform);
create index if not exists social_interactions_unread_idx       on public.social_interactions (profile_id, unread) where unread = true;
create index if not exists social_interactions_platform_ref_idx on public.social_interactions (platform, platform_ref_id) where platform_ref_id is not null;

create or replace trigger social_interactions_updated_at
  before update on public.social_interactions
  for each row execute function public.set_updated_at();

create table if not exists public.social_posts (
  id                uuid        primary key default gen_random_uuid(),
  profile_id        uuid        not null references auth.users(id) on delete cascade,
  content           text        not null default '',
  targets           text[]      not null default '{}',
  media_urls        text[]      not null default '{}',
  status            text        not null default 'draft',
  scheduled_for     timestamptz,
  published_at      timestamptz,
  platform_post_ids jsonb       not null default '{}'::jsonb,
  error_message     text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists social_posts_profile_id_idx on public.social_posts (profile_id);
create index if not exists social_posts_scheduled_idx  on public.social_posts (profile_id, scheduled_for) where status = 'scheduled';

create or replace trigger social_posts_updated_at
  before update on public.social_posts
  for each row execute function public.set_updated_at();

create table if not exists public.auto_response_rules (
  id            uuid        primary key default gen_random_uuid(),
  profile_id    uuid        not null references auth.users(id) on delete cascade,
  trigger_type  text        not null,
  trigger_value text        not null,
  response_text text        not null default '',
  enabled       boolean     not null default true,
  sort_order    integer     not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create or replace trigger auto_response_rules_updated_at
  before update on public.auto_response_rules
  for each row execute function public.set_updated_at();

create table if not exists public.social_sync_log (
  id            uuid        primary key default gen_random_uuid(),
  profile_id    uuid        not null references auth.users(id) on delete cascade,
  platform      text        not null,
  sync_type     text        not null default 'pull',
  status        text        not null default 'ok',
  items_synced  integer     not null default 0,
  error_message text,
  meta          jsonb       not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists social_sync_log_profile_platform_idx
  on public.social_sync_log (profile_id, platform, created_at desc);

create or replace function public.get_platform_connection(
  p_profile_id uuid,
  p_platform   text
)
returns table (
  id               uuid,
  platform_id      text,
  handle           text,
  access_token     text,
  refresh_token    text,
  token_expires_at timestamptz,
  scopes           text[],
  meta             jsonb
)
language sql
security definer
stable
set search_path = public
as $$
  select
    id, platform_id, handle,
    access_token, refresh_token, token_expires_at,
    scopes, meta
  from public.social_connections
  where profile_id = p_profile_id
    and platform   = p_platform
    and connected  = true
  limit 1;
$$;

revoke execute on function public.get_platform_connection(uuid, text) from public, authenticated, anon;
grant execute on function public.get_platform_connection(uuid, text) to service_role;

create or replace function public.log_connection_sync()
returns trigger
language plpgsql
as $$
begin
  if new.last_synced_at is distinct from old.last_synced_at then
    insert into public.social_sync_log (profile_id, platform, sync_type, status, items_synced)
    values (new.profile_id, new.platform, 'pull', 'ok', 0);
  end if;
  return new;
end;
$$;

drop trigger if exists social_connection_sync_log on public.social_connections;
create trigger social_connection_sync_log
  after update on public.social_connections
  for each row execute function public.log_connection_sync();

-- ────────────────────────────────────────────────────────────────────────────
-- 4. GIFT CARDS, GIFT CARD TRANSACTIONS & LOYALTY RPCS
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.gift_cards (
  id             bigserial     primary key,
  profile_id     uuid          references auth.users(id) on delete cascade,
  code           text          unique not null,
  initial_value  numeric(10,2) not null default 0,
  initial_amount numeric(10,2) not null default 0,
  balance        numeric(10,2) not null check (balance >= 0),
  status         text          not null default 'active',
  customer_id    bigint        references public.customers(id) on delete set null,
  recipient_name text          not null default '',
  note           text          not null default '',
  created_at     timestamptz   not null default now(),
  updated_at     timestamptz   not null default now()
);

alter table public.gift_cards add column if not exists profile_id     uuid          references auth.users(id) on delete cascade;
alter table public.gift_cards add column if not exists initial_value  numeric(10,2) not null default 0;
alter table public.gift_cards add column if not exists initial_amount numeric(10,2) not null default 0;
alter table public.gift_cards add column if not exists recipient_name text          not null default '';
alter table public.gift_cards add column if not exists note           text          not null default '';
alter table public.gift_cards add column if not exists updated_at     timestamptz   not null default now();

create index if not exists gift_cards_profile_id_idx on public.gift_cards (profile_id);
create index if not exists gift_cards_code_idx       on public.gift_cards (upper(code));

create or replace function public.sync_gift_card_initial_fields()
returns trigger
language plpgsql
as $$
begin
  if coalesce(new.initial_value, 0) = 0 and coalesce(new.initial_amount, 0) > 0 then
    new.initial_value := new.initial_amount;
  elsif coalesce(new.initial_amount, 0) = 0 and coalesce(new.initial_value, 0) > 0 then
    new.initial_amount := new.initial_value;
  end if;
  return new;
end;
$$;

drop trigger if exists gift_cards_sync_initial on public.gift_cards;
create trigger gift_cards_sync_initial
  before insert or update on public.gift_cards
  for each row execute function public.sync_gift_card_initial_fields();

create or replace trigger gift_cards_updated_at
  before update on public.gift_cards
  for each row execute function public.set_updated_at();

create table if not exists public.gift_card_txns (
  id           bigserial     primary key,
  gift_card_id bigint        not null references public.gift_cards(id) on delete cascade,
  profile_id   uuid          references auth.users(id) on delete cascade,
  amount       numeric(10,2) not null,
  txn_type     text          not null default 'redeem',
  reference    text          not null default '',
  created_at   timestamptz   not null default now()
);

create index if not exists gift_card_txns_card_id_idx on public.gift_card_txns (gift_card_id);

create or replace function public.issue_gift_card(
  p_amount         numeric,
  p_customer_id    bigint default null,
  p_sale_ref       text   default '',
  p_recipient_name text   default '',
  p_note           text   default '',
  p_code           text   default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := public.shop_owner_id();
  v_amt   numeric(10,2) := round(coalesce(p_amount, 0), 2);
  v_code  text := upper(trim(coalesce(p_code, '')));
  v_card  public.gift_cards%rowtype;
  v_raw   text;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not public.is_shop_member() then
    raise exception 'Only shop members may issue gift cards.';
  end if;

  if v_amt <= 0 then
    raise exception 'Gift card amount must be greater than zero.';
  end if;

  if v_code = '' then
    loop
      v_raw := upper(encode(gen_random_bytes(4), 'hex'));
      v_code := 'GC-' || substr(v_raw, 1, 4) || '-' || substr(v_raw, 5, 4);
      exit when not exists (select 1 from public.gift_cards where upper(code) = v_code);
    end loop;
  end if;

  insert into public.gift_cards (
    profile_id, code, initial_value, initial_amount, balance, status, customer_id, recipient_name, note
  )
  values (
    v_owner, v_code, v_amt, v_amt, v_amt, 'active', p_customer_id, coalesce(p_recipient_name, ''), coalesce(p_note, '')
  )
  returning * into v_card;

  insert into public.gift_card_txns (gift_card_id, profile_id, amount, txn_type, reference)
  values (v_card.id, v_owner, v_amt, 'issue', coalesce(p_sale_ref, ''));

  return to_jsonb(v_card);
end;
$$;

revoke all on function public.issue_gift_card(numeric, bigint, text, text, text, text) from public;
grant execute on function public.issue_gift_card(numeric, bigint, text, text, text, text) to authenticated, service_role;

create or replace function public.redeem_gift_card(
  p_code     text,
  p_amount   numeric,
  p_sale_ref text default ''
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner   uuid := public.shop_owner_id();
  v_amt     numeric(10,2) := round(coalesce(p_amount, 0), 2);
  v_card    public.gift_cards%rowtype;
  v_new_bal numeric(10,2);
begin
  if coalesce(auth.role(), '') <> 'service_role' and not public.is_shop_member() then
    raise exception 'Only shop members may redeem gift cards.';
  end if;

  if v_amt <= 0 then
    raise exception 'Redemption amount must be greater than zero.';
  end if;

  select * into v_card
  from public.gift_cards
  where upper(trim(code)) = upper(trim(coalesce(p_code, '')))
    and (profile_id = v_owner or profile_id is null or v_owner is null)
  for update;

  if not found then
    raise exception 'Gift card not found.';
  end if;

  if v_card.status <> 'active' then
    raise exception 'Gift card is % and cannot be redeemed.', v_card.status;
  end if;

  if v_card.balance < v_amt then
    raise exception 'Insufficient gift card balance (available: %).', v_card.balance;
  end if;

  v_new_bal := round(v_card.balance - v_amt, 2);

  update public.gift_cards
  set balance = v_new_bal,
      updated_at = now()
  where id = v_card.id;

  insert into public.gift_card_txns (gift_card_id, profile_id, amount, txn_type, reference)
  values (v_card.id, coalesce(v_card.profile_id, v_owner), -v_amt, 'redeem', coalesce(p_sale_ref, ''));

  return v_new_bal;
end;
$$;

revoke all on function public.redeem_gift_card(text, numeric, text) from public;
grant execute on function public.redeem_gift_card(text, numeric, text) to authenticated, service_role;

create or replace function public.refund_gift_card(
  p_code   text,
  p_amount numeric,
  p_ref    text default ''
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner   uuid := public.shop_owner_id();
  v_amt     numeric(10,2) := round(coalesce(p_amount, 0), 2);
  v_card    public.gift_cards%rowtype;
  v_new_bal numeric(10,2);
begin
  if coalesce(auth.role(), '') <> 'service_role' and not public.is_shop_member() then
    raise exception 'Only shop members may refund gift cards.';
  end if;

  if v_amt <= 0 then
    raise exception 'Refund amount must be greater than zero.';
  end if;

  select * into v_card
  from public.gift_cards
  where upper(trim(code)) = upper(trim(coalesce(p_code, '')))
    and (profile_id = v_owner or profile_id is null or v_owner is null)
  for update;

  if not found then
    raise exception 'Gift card not found.';
  end if;

  if v_card.status = 'void' then
    raise exception 'Cannot refund onto a voided gift card.';
  end if;

  v_new_bal := round(v_card.balance + v_amt, 2);

  update public.gift_cards
  set balance = v_new_bal,
      status = 'active',
      updated_at = now()
  where id = v_card.id;

  insert into public.gift_card_txns (gift_card_id, profile_id, amount, txn_type, reference)
  values (v_card.id, coalesce(v_card.profile_id, v_owner), v_amt, 'refund', coalesce(p_ref, ''));

  return v_new_bal;
end;
$$;

revoke all on function public.refund_gift_card(text, numeric, text) from public;
grant execute on function public.refund_gift_card(text, numeric, text) to authenticated, service_role;

drop function if exists public.adjust_loyalty(bigint, integer);
drop function if exists public.adjust_loyalty(bigint, integer, text, text);

create or replace function public.adjust_loyalty(
  p_customer_id bigint  default null,
  p_delta       integer default 0,
  p_customer    bigint  default null,
  p_reason      text    default '',
  p_sale_ref    text    default ''
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner   uuid    := public.shop_owner_id();
  v_cid     bigint  := coalesce(p_customer_id, p_customer);
  v_current integer;
  v_next    integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not public.is_shop_member() then
    raise exception 'Only shop members may adjust loyalty points.';
  end if;

  if v_cid is null then
    raise exception 'Customer ID is required.';
  end if;

  select coalesce(loyalty_points, 0) into v_current
  from public.customers
  where id = v_cid
    and (profile_id = v_owner or v_owner is null)
  for update;

  if not found then
    raise exception 'Customer not found.';
  end if;

  if p_reason = 'sale' and (v_current + coalesce(p_delta, 0)) < 0 then
    raise exception 'Insufficient loyalty points.';
  end if;

  v_next := greatest(0, v_current + coalesce(p_delta, 0));

  update public.customers
  set loyalty_points = v_next,
      updated_at = now()
  where id = v_cid;

  return v_next;
end;
$$;

revoke all on function public.adjust_loyalty(bigint, integer, bigint, text, text) from public;
grant execute on function public.adjust_loyalty(bigint, integer, bigint, text, text) to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 5. MOBICARE STOREFRONT TABLES (CATEGORIES, PRODUCTS, ORDERS, BOOKINGS, SITE_SETTINGS)
-- ────────────────────────────────────────────────────────────────────────────

-- categories
create table if not exists public.categories (
  id          text primary key,
  name        text        not null,
  description text        not null default '',
  icon        text        not null default 'Star',
  sort_order  integer     not null default 0,
  parent_id   text        references public.categories(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.categories add column if not exists parent_id text references public.categories(id) on delete set null;
create index if not exists categories_parent_id_idx on public.categories(parent_id);

create or replace trigger categories_updated_at
  before update on public.categories
  for each row execute function public.touch_updated_at();

create or replace function public.enforce_category_depth()
returns trigger
language plpgsql
as $$
declare
  parent_has_parent boolean;
begin
  if new.parent_id is not null then
    if new.parent_id = new.id then
      raise exception 'A category cannot be its own parent.';
    end if;

    if new.id is not null and exists (
      select 1 from public.categories where parent_id = new.id
    ) then
      raise exception 'Cannot move a category that has subcategories under another category.';
    end if;

    select (parent_id is not null) into parent_has_parent
    from public.categories
    where id = new.parent_id;

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
  for each row execute function public.enforce_category_depth();

-- Ensure baseline top-level categories exist so product inserts and website toggles work immediately
insert into public.categories (id, name, description, icon, sort_order, parent_id) values
  ('chargers', 'Chargers', 'Fast charging solutions', 'Zap', 0, null),
  ('cases', 'Cases', 'Protection for every style', 'Shield', 1, null),
  ('screen-protectors', 'Screen Protectors', 'Guard your display', 'Layers', 2, null),
  ('cables', 'Cables', 'Connect everything', 'Cable', 3, null),
  ('audio', 'Audio', 'Sound without wires', 'Headphones', 4, null),
  ('power', 'Power Banks', 'Power on the go', 'Battery', 5, null),
  ('accessories', 'Accessories', 'Desk and lifestyle gear', 'Star', 6, null)
on conflict (id) do nothing;

-- products
create table if not exists public.products (
  id            text primary key default gen_random_uuid()::text,
  profile_id    uuid          references auth.users(id) on delete set null,
  inventory_id  bigint        unique references public.inventory(id) on delete set null,
  name          text          not null,
  category      text          default 'accessories' references public.categories(id) on delete set null,
  category_id   text,
  price         numeric(10,2) not null check (price >= 0),
  compare_price numeric(10,2) check (compare_price is null or compare_price >= 0),
  stock         integer       not null default 0 check (stock >= 0),
  sku           text          unique,
  description   text          not null default '',
  images        text[]        not null default '{}',
  tags          text[]        not null default '{}',
  featured      boolean       not null default false,
  active        boolean       not null default true,
  weight        numeric(6,3),
  shipping_days jsonb         not null default '{"min":3,"max":7}'::jsonb,
  created_at    timestamptz   not null default now(),
  updated_at    timestamptz   not null default now()
);

alter table public.products add column if not exists inventory_id bigint unique references public.inventory(id) on delete set null;
alter table public.products add column if not exists category_id  text;
alter table public.products add column if not exists profile_id   uuid references auth.users(id) on delete set null;
alter table public.products alter column category drop not null;
alter table public.products alter column category set default 'accessories';

create index if not exists products_category_idx     on public.products(category);
create index if not exists products_category_id_idx  on public.products(category_id);
create index if not exists products_inventory_id_idx on public.products(inventory_id) where inventory_id is not null;
create index if not exists products_active_idx       on public.products(active);
create index if not exists products_featured_idx     on public.products(featured);

update public.products
set category_id = category
where category_id is null and category is not null;

update public.products
set category = category_id
where category is null and category_id is not null;

create or replace function public.sync_product_category_fields()
returns trigger
language plpgsql
as $$
begin
  new.category    := nullif(trim(coalesce(new.category, '')), '');
  new.category_id := nullif(trim(coalesce(new.category_id, '')), '');

  if tg_op = 'UPDATE' then
    if new.category is distinct from old.category and new.category_id is not distinct from old.category_id then
      new.category_id := new.category;
    elsif new.category_id is distinct from old.category_id and new.category is not distinct from old.category then
      new.category := new.category_id;
    end if;
  end if;

  if new.category is null and new.category_id is not null then
    new.category := new.category_id;
  elsif new.category_id is null and new.category is not null then
    new.category_id := new.category;
  end if;

  return new;
end;
$$;

drop trigger if exists products_sync_category on public.products;
create trigger products_sync_category
  before insert or update on public.products
  for each row execute function public.sync_product_category_fields();

create or replace trigger products_updated_at
  before update on public.products
  for each row execute function public.touch_updated_at();

-- orders
create table if not exists public.orders (
  id                      text primary key default gen_random_uuid()::text,
  payment_intent_id       text,
  user_id                 uuid          references auth.users(id) on delete set null,
  status                  text          not null default 'paid'
                            check (status in ('paid','processing','shipped','delivered','cancelled','refunded','payment_failed')),
  customer_name           text          not null default '',
  customer_email          text          not null default '',
  customer_phone          text          not null default '',
  shipping_method         text          not null default 'standard',
  tracking_number         text          not null default '',
  shipping_address        text          not null default '',
  shipping_city           text          not null default '',
  shipping_state          text          not null default '',
  shipping_zip            text          not null default '',
  subtotal                numeric(10,2) not null default 0,
  shipping_cost           numeric(10,2) not null default 0,
  tax                     numeric(10,2) not null default 0,
  total                   numeric(10,2) not null default 0,
  refunded_amount         numeric(10,2) not null default 0,
  notes                   text,
  lookup_token_hash       text          unique,
  lookup_token_expires_at timestamptz,
  created_at              timestamptz   not null default now(),
  updated_at              timestamptz   not null default now()
);

alter table public.orders add column if not exists payment_intent_id       text;
alter table public.orders add column if not exists shipping_method         text          not null default 'standard';
alter table public.orders add column if not exists tracking_number         text          not null default '';
alter table public.orders add column if not exists refunded_amount         numeric(10,2) not null default 0;
alter table public.orders add column if not exists lookup_token_hash       text          unique;
alter table public.orders add column if not exists lookup_token_expires_at timestamptz;

create index if not exists orders_status_idx       on public.orders(status);
create index if not exists orders_created_at_idx   on public.orders(created_at desc);
create index if not exists orders_user_id_idx      on public.orders(user_id);
create index if not exists orders_lookup_token_idx on public.orders(lookup_token_hash);
create unique index if not exists orders_payment_intent_id_key
  on public.orders(payment_intent_id)
  where payment_intent_id is not null;
create unique index if not exists orders_lookup_token_unique_idx
  on public.orders(lookup_token_hash)
  where lookup_token_hash is not null;

create or replace trigger orders_updated_at
  before update on public.orders
  for each row execute function public.touch_updated_at();

-- order_items
create table if not exists public.order_items (
  id         bigserial     primary key,
  order_id   text          not null references public.orders(id) on delete cascade,
  product_id text,
  name       text          not null,
  price      numeric(10,2) not null check (price >= 0),
  qty        integer       not null default 1 check (qty > 0),
  created_at timestamptz   not null default now()
);

create index if not exists order_items_order_id_idx on public.order_items(order_id);
create unique index if not exists order_items_order_product_idx
  on public.order_items(order_id, product_id);

-- bookings
create table if not exists public.bookings (
  id                  bigserial   primary key,
  service             text        not null,
  device_type         text        not null default '',
  device_model        text        not null default '',
  issue               text        not null default '',
  appt_date           text        not null,
  appt_time           text        not null,
  customer_name       text        not null,
  customer_phone      text        not null,
  customer_email      text        not null,
  notes               text        not null default '',
  visit_type          text        not null default 'in-store',
  visit_location_type text,
  home_address        text        not null default '',
  user_id             uuid        references auth.users(id) on delete set null,
  novaops_ticket_id   bigint      references public.tickets(id) on delete set null,
  status              text        not null default 'pending'
                        check (status in ('pending','confirmed','completed','cancelled','no-show')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.bookings add column if not exists visit_location_type text;
alter table public.bookings add column if not exists novaops_ticket_id   bigint references public.tickets(id) on delete set null;

create index if not exists bookings_status_idx        on public.bookings(status);
create index if not exists bookings_created_at_idx    on public.bookings(created_at desc);
create index if not exists bookings_date_time_idx     on public.bookings(appt_date, appt_time);
create index if not exists bookings_email_created_idx on public.bookings(customer_email, created_at desc);
create index if not exists bookings_user_id_idx       on public.bookings(user_id);

create or replace function public.check_booking_rate_limit()
returns trigger
language plpgsql
as $$
declare
  recent_count integer;
begin
  select count(*) into recent_count
  from public.bookings
  where customer_email = new.customer_email
    and created_at > now() - interval '30 seconds';

  if recent_count > 0 then
    raise exception 'Please wait before submitting another booking.';
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_rate_limit on public.bookings;
create trigger bookings_rate_limit
  before insert on public.bookings
  for each row execute function public.check_booking_rate_limit();

create or replace trigger bookings_updated_at
  before update on public.bookings
  for each row execute function public.touch_updated_at();

-- site_settings
create table if not exists public.site_settings (
  id         text primary key,
  content    jsonb       not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace trigger site_settings_updated_at
  before update on public.site_settings
  for each row execute function public.touch_updated_at();

drop table if exists public.admin_auth;

-- ────────────────────────────────────────────────────────────────────────────
-- 6. TWO-WAY STOCK SYNC TRIGGERS & ATOMIC STOCK + PUBLIC STATUS LOOKUP RPCS
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.fn_sync_inventory_to_product()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if pg_trigger_depth() = 1 then
    update public.products
    set stock      = greatest(0, coalesce(new.stock, 0)),
        name       = new.name,
        price      = greatest(0, coalesce(new.price, 0)),
        updated_at = now()
    where inventory_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_inventory_to_product on public.inventory;
create trigger sync_inventory_to_product
  after update of stock, name, price on public.inventory
  for each row execute function public.fn_sync_inventory_to_product();

create or replace function public.fn_sync_product_to_inventory()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.inventory_id is not null and pg_trigger_depth() = 1 then
    update public.inventory
    set stock      = greatest(0, coalesce(new.stock, 0)),
        updated_at = now()
    where id = new.inventory_id;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_product_to_inventory on public.products;
create trigger sync_product_to_inventory
  after update of stock on public.products
  for each row execute function public.fn_sync_product_to_inventory();

create or replace function public.decrement_product_stock(
  p_product_id text,
  p_qty        integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role'
     and current_user not in ('postgres', 'supabase_admin')
     and not public.is_shop_member() then
    raise exception 'Forbidden';
  end if;

  if p_product_id is null or p_qty is null or p_qty <= 0 then
    return false;
  end if;

  update public.products
  set stock      = stock - p_qty,
      updated_at = now()
  where id = p_product_id
    and stock >= p_qty;

  return found;
end;
$$;

revoke all on function public.decrement_product_stock(text, integer) from public, anon;
grant execute on function public.decrement_product_stock(text, integer) to authenticated, service_role;

create or replace function public.restore_product_stock(
  p_product_id text,
  p_qty        integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role'
     and current_user not in ('postgres', 'supabase_admin')
     and not public.is_shop_member() then
    raise exception 'Forbidden';
  end if;

  if p_product_id is null or p_qty is null or p_qty <= 0 then
    return;
  end if;

  update public.products
  set stock      = stock + p_qty,
      updated_at = now()
  where id = p_product_id;
end;
$$;

revoke all on function public.restore_product_stock(text, integer) from public, anon;
grant execute on function public.restore_product_stock(text, integer) to authenticated, service_role;

-- Public repair ticket status lookup (verified by last 4 digits of customer phone)
create or replace function public.lookup_ticket_status(
  p_ticket_id   bigint,
  p_phone_last4 text
)
returns table (
  id             bigint,
  device         text,
  device_model   text,
  issue          text,
  status         text,
  price          numeric,
  paid           numeric,
  warranty_days  integer,
  warranty_start timestamptz,
  updated_at     timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_digits text := regexp_replace(coalesce(p_phone_last4, ''), '[^0-9]', '', 'g');
  v_last4  text;
begin
  if p_ticket_id is null or length(v_digits) < 4 then
    return;
  end if;

  v_last4 := right(v_digits, 4);

  return query
  select
    t.id,
    t.device,
    t.device_model,
    t.issue,
    t.status,
    t.price,
    coalesce((
      select sum(coalesce((elem->>'amount')::numeric, 0))
      from jsonb_array_elements(
        case when jsonb_typeof(t.payments) = 'array' then t.payments else '[]'::jsonb end
      ) as elem
    ), 0)::numeric as paid,
    t.warranty_days,
    t.warranty_start,
    t.updated_at
  from public.tickets t
  join public.customers c on c.id = t.customer_id
  where t.id = p_ticket_id
    and length(regexp_replace(coalesce(c.phone, ''), '[^0-9]', '', 'g')) >= 4
    and right(regexp_replace(coalesce(c.phone, ''), '[^0-9]', '', 'g'), 4) = v_last4
  limit 1;
end;
$$;

revoke all on function public.lookup_ticket_status(bigint, text) from public;
grant execute on function public.lookup_ticket_status(bigint, text) to anon, authenticated, service_role;

-- Public storefront order status lookup (verified by email OR phone last 4 digits)
create or replace function public.lookup_order_status(
  p_order_id text,
  p_verify   text
)
returns table (
  id              text,
  status          text,
  shipping_method text,
  tracking_number text,
  subtotal        numeric,
  shipping_cost   numeric,
  tax             numeric,
  total           numeric,
  refunded_amount numeric,
  shipping_city   text,
  shipping_state  text,
  items           jsonb,
  created_at      timestamptz,
  updated_at      timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_oid    text := trim(leading '#' from trim(coalesce(p_order_id, '')));
  v_verify text := trim(coalesce(p_verify, ''));
  v_digits text := regexp_replace(coalesce(p_verify, ''), '[^0-9]', '', 'g');
begin
  if length(v_oid) < 4 or v_verify = '' then
    return;
  end if;

  return query
  select
    o.id,
    o.status,
    o.shipping_method,
    o.tracking_number,
    o.subtotal,
    o.shipping_cost,
    o.tax,
    o.total,
    o.refunded_amount,
    o.shipping_city,
    o.shipping_state,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'product_id', oi.product_id,
          'name', oi.name,
          'price', oi.price,
          'qty', oi.qty
        )
        order by oi.id
      )
      from public.order_items oi
      where oi.order_id = o.id
    ), '[]'::jsonb) as items,
    o.created_at,
    o.updated_at
  from public.orders o
  where (
    lower(o.id) = lower(v_oid)
    or lower(o.id) like lower(v_oid) || '%'
  )
  and (
    (position('@' in v_verify) > 0 and o.customer_email <> '' and lower(o.customer_email) = lower(v_verify))
    or (
      length(v_digits) = 5
      and length(regexp_replace(coalesce(o.shipping_zip, ''), '[^0-9]', '', 'g')) >= 5
      and left(regexp_replace(coalesce(o.shipping_zip, ''), '[^0-9]', '', 'g'), 5) = v_digits
    )
    or (
      length(v_digits) >= 4
      and length(regexp_replace(coalesce(o.customer_phone, ''), '[^0-9]', '', 'g')) >= 4
      and right(regexp_replace(coalesce(o.customer_phone, ''), '[^0-9]', '', 'g'), 4) = right(v_digits, 4)
    )
  )
  order by o.created_at desc
  limit 1;
end;
$$;

revoke all on function public.lookup_order_status(text, text) from public;
grant execute on function public.lookup_order_status(text, text) to anon, authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 7. UNIFIED ROW-LEVEL SECURITY POLICIES
-- ────────────────────────────────────────────────────────────────────────────

alter table public.profiles            enable row level security;
alter table public.customer_profiles   enable row level security;
alter table public.staff_users         enable row level security;
alter table public.staff_members       enable row level security;
alter table public.settings            enable row level security;
alter table public.customers           enable row level security;
alter table public.tickets             enable row level security;
alter table public.inventory           enable row level security;
alter table public.services            enable row level security;
alter table public.expenses            enable row level security;
alter table public.house_calls         enable row level security;
alter table public.appointments        enable row level security;
alter table public.vendor_repairs      enable row level security;
alter table public.device_brands       enable row level security;
alter table public.device_categories   enable row level security;
alter table public.device_models       enable row level security;
alter table public.devices             enable row level security;
alter table public.trade_ins           enable row level security;
alter table public.pos_sales           enable row level security;
alter table public.square_config       enable row level security;
alter table public.messages            enable row level security;
alter table public.brand_settings      enable row level security;
alter table public.social_connections  enable row level security;
alter table public.social_interactions enable row level security;
alter table public.social_posts        enable row level security;
alter table public.auto_response_rules enable row level security;
alter table public.social_sync_log     enable row level security;
alter table public.gift_cards          enable row level security;
alter table public.gift_card_txns      enable row level security;
alter table public.categories          enable row level security;
alter table public.products            enable row level security;
alter table public.orders              enable row level security;
alter table public.order_items         enable row level security;
alter table public.bookings            enable row level security;
alter table public.site_settings       enable row level security;

-- Drop existing policies cleanly so re-runs never accumulate stale/leaky policies
do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles', 'customer_profiles', 'staff_users', 'staff_members',
        'settings', 'customers', 'tickets', 'inventory', 'services',
        'expenses', 'house_calls', 'appointments', 'vendor_repairs',
        'device_brands', 'device_categories', 'device_models', 'devices',
        'trade_ins', 'pos_sales', 'square_config', 'messages',
        'brand_settings', 'social_connections', 'social_interactions',
        'social_posts', 'auto_response_rules', 'social_sync_log',
        'gift_cards', 'gift_card_txns',
        'categories', 'products', 'orders', 'order_items', 'bookings', 'site_settings'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end;
$$;

-- profiles: shop owner row only
create policy "profiles_owner"
  on public.profiles for all
  using (id = auth.uid())
  with check (id = auth.uid());

-- customer_profiles: customer owns their row; shop members can read
create policy "customer_profiles_self_select"
  on public.customer_profiles for select
  using (id = auth.uid() or public.is_shop_member());

create policy "customer_profiles_self_insert"
  on public.customer_profiles for insert
  with check (id = auth.uid());

create policy "customer_profiles_self_update"
  on public.customer_profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- staff_members: staff can read own membership; shop owner / admin manages team
create policy "staff_members_read"
  on public.staff_members for select
  using (user_id = auth.uid() or owner_id = auth.uid() or public.is_admin());

create policy "staff_members_owner_manage"
  on public.staff_members for all
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

-- settings: scoped strictly to shop_owner_id() (no profile_id IS NULL leak)
create policy "settings_shop_access"
  on public.settings for all
  using (profile_id = public.shop_owner_id())
  with check (profile_id = public.shop_owner_id());

-- NovaOps operational tables: owner AND active staff (profile_id = shop_owner_id())
create policy "customers_shop_access"
  on public.customers for all
  using (profile_id = public.shop_owner_id())
  with check (profile_id = public.shop_owner_id());

create policy "tickets_shop_access"
  on public.tickets for all
  using (profile_id = public.shop_owner_id())
  with check (profile_id = public.shop_owner_id());

create policy "inventory_shop_access"
  on public.inventory for all
  using (profile_id = public.shop_owner_id())
  with check (profile_id = public.shop_owner_id());

create policy "expenses_shop_access"
  on public.expenses for all
  using (profile_id = public.shop_owner_id())
  with check (profile_id = public.shop_owner_id());

create policy "house_calls_shop_access"
  on public.house_calls for all
  using (profile_id = public.shop_owner_id())
  with check (profile_id = public.shop_owner_id());

create policy "appointments_shop_access"
  on public.appointments for all
  using (profile_id = public.shop_owner_id())
  with check (profile_id = public.shop_owner_id());

create policy "vendor_repairs_shop_access"
  on public.vendor_repairs for all
  using (profile_id = public.shop_owner_id())
  with check (profile_id = public.shop_owner_id());

create policy "trade_ins_shop_access"
  on public.trade_ins for all
  using (profile_id = public.shop_owner_id())
  with check (profile_id = public.shop_owner_id());

create policy "pos_sales_shop_access"
  on public.pos_sales for all
  using (profile_id = public.shop_owner_id())
  with check (profile_id = public.shop_owner_id());

-- services & device catalog: public SELECT for storefront/BookingWizard + shop member CRUD
create policy "services_public_read"
  on public.services for select
  using (active = true or profile_id = public.shop_owner_id());

create policy "services_shop_access"
  on public.services for all
  using (profile_id = public.shop_owner_id())
  with check (profile_id = public.shop_owner_id());

create policy "device_brands_public_read"
  on public.device_brands for select
  using (true);

create policy "device_brands_shop_access"
  on public.device_brands for all
  using (profile_id = public.shop_owner_id())
  with check (profile_id = public.shop_owner_id());

create policy "device_categories_public_read"
  on public.device_categories for select
  using (true);

create policy "device_categories_shop_access"
  on public.device_categories for all
  using (profile_id = public.shop_owner_id())
  with check (profile_id = public.shop_owner_id());

create policy "device_models_public_read"
  on public.device_models for select
  using (true);

create policy "device_models_shop_access"
  on public.device_models for all
  using (profile_id = public.shop_owner_id())
  with check (profile_id = public.shop_owner_id());

create policy "devices_public_read"
  on public.devices for select
  using (true);

create policy "devices_shop_access"
  on public.devices for all
  using (public.is_shop_member())
  with check (public.is_shop_member());

-- square_config: owner/admin only (staff read safe metadata via get_square_public_config RPC)
create policy "square_config_owner_only"
  on public.square_config for all
  using (profile_id = auth.uid() or (profile_id = public.shop_owner_id() and public.is_admin()))
  with check (profile_id = auth.uid() or (profile_id = public.shop_owner_id() and public.is_admin()));

-- messages: shop members manage inbox; signed-in storefront customers read own chat & post inbound chat
create policy "messages_shop_all"
  on public.messages for all
  using (public.is_shop_member() and (profile_id = public.shop_owner_id() or profile_id is null))
  with check (public.is_shop_member() and (profile_id = public.shop_owner_id() or profile_id is null));

create policy "messages_customer_select"
  on public.messages for select
  using (auth.uid() is not null and user_id = auth.uid());

create policy "messages_customer_insert_chat"
  on public.messages for insert
  with check (
    auth.uid() is not null
    and user_id = auth.uid()
    and channel = 'chat'
    and direction = 'inbound'
  );

create policy "messages_customer_mark_read"
  on public.messages for update
  using (
    auth.uid() is not null
    and user_id = auth.uid()
    and channel = 'chat'
    and direction = 'outbound'
  )
  with check (
    auth.uid() is not null
    and user_id = auth.uid()
    and channel = 'chat'
    and direction = 'outbound'
  );

-- Brand Manager & social policies
create policy "brand_settings_shop_access"
  on public.brand_settings for all
  using (profile_id = public.shop_owner_id())
  with check (profile_id = public.shop_owner_id());

create policy "social_connections_owner_only"
  on public.social_connections for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy "social_interactions_shop_access"
  on public.social_interactions for all
  using (profile_id = public.shop_owner_id())
  with check (profile_id = public.shop_owner_id());

create policy "social_posts_shop_access"
  on public.social_posts for all
  using (profile_id = public.shop_owner_id())
  with check (profile_id = public.shop_owner_id());

create policy "auto_response_rules_shop_access"
  on public.auto_response_rules for all
  using (profile_id = public.shop_owner_id())
  with check (profile_id = public.shop_owner_id());

create policy "social_sync_log_shop_access"
  on public.social_sync_log for all
  using (profile_id = public.shop_owner_id())
  with check (profile_id = public.shop_owner_id());

-- gift_cards & gift_card_txns
create policy "gift_cards_shop_access"
  on public.gift_cards for all
  using (public.is_shop_member() and (profile_id = public.shop_owner_id() or profile_id is null))
  with check (public.is_shop_member() and (profile_id = public.shop_owner_id() or profile_id is null));

create policy "gift_card_txns_shop_access"
  on public.gift_card_txns for all
  using (public.is_shop_member() and (profile_id = public.shop_owner_id() or profile_id is null))
  with check (public.is_shop_member() and (profile_id = public.shop_owner_id() or profile_id is null));

-- Storefront tables
create policy "public_read_categories"
  on public.categories for select
  using (true);

create policy "admin_modify_categories"
  on public.categories for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "public_read_active_products"
  on public.products for select
  using (active = true or public.is_shop_member());

create policy "shop_modify_products"
  on public.products for all
  using (public.is_shop_member())
  with check (public.is_shop_member());

create policy "public_read_site_settings"
  on public.site_settings for select
  using (true);

create policy "admin_modify_site_settings"
  on public.site_settings for all
  using (public.is_admin())
  with check (public.is_admin());

-- orders: customer reads own; shop members read & update status/tracking; admins full access
create policy "customer_read_own_orders"
  on public.orders for select
  using (auth.uid() is not null and auth.uid() = user_id);

create policy "shop_member_read_orders"
  on public.orders for select
  using (public.is_shop_member());

create policy "shop_member_update_orders"
  on public.orders for update
  using (public.is_shop_member())
  with check (public.is_shop_member());

create policy "admin_all_orders"
  on public.orders for all
  using (public.is_admin())
  with check (public.is_admin());

-- order_items: customer reads own order's items; shop members read; admins full access
create policy "customer_read_own_order_items"
  on public.order_items for select
  using (
    auth.uid() is not null
    and exists (
      select 1
      from public.orders o
      where o.id = order_items.order_id
        and o.user_id = auth.uid()
    )
  );

create policy "shop_member_read_order_items"
  on public.order_items for select
  using (public.is_shop_member());

create policy "admin_all_order_items"
  on public.order_items for all
  using (public.is_admin())
  with check (public.is_admin());

-- bookings: customer reads own; shop members read & update; admins full access
create policy "customer_read_own_bookings"
  on public.bookings for select
  using (auth.uid() is not null and auth.uid() = user_id);

create policy "shop_member_read_bookings"
  on public.bookings for select
  using (public.is_shop_member());

create policy "shop_member_update_bookings"
  on public.bookings for update
  using (public.is_shop_member())
  with check (public.is_shop_member());

create policy "admin_all_bookings"
  on public.bookings for all
  using (public.is_admin())
  with check (public.is_admin());

-- ────────────────────────────────────────────────────────────────────────────
-- 8. STORAGE BUCKET (site-media) & STORAGE RLS POLICIES
-- ────────────────────────────────────────────────────────────────────────────

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'storage'
      and table_name = 'buckets'
  ) then
    insert into storage.buckets (id, name, public)
    values ('site-media', 'site-media', true)
    on conflict (id) do update set public = true;

    execute 'drop policy if exists "site_media_public_read" on storage.objects';
    execute 'create policy "site_media_public_read" on storage.objects for select using (bucket_id = ''site-media'')';

    execute 'drop policy if exists "site_media_shop_insert" on storage.objects';
    execute 'create policy "site_media_shop_insert" on storage.objects for insert to authenticated with check (bucket_id = ''site-media'' and public.is_shop_member())';

    execute 'drop policy if exists "site_media_shop_update" on storage.objects';
    execute 'create policy "site_media_shop_update" on storage.objects for update to authenticated using (bucket_id = ''site-media'' and public.is_shop_member()) with check (bucket_id = ''site-media'' and public.is_shop_member())';

    execute 'drop policy if exists "site_media_shop_delete" on storage.objects';
    execute 'create policy "site_media_shop_delete" on storage.objects for delete to authenticated using (bucket_id = ''site-media'' and public.is_shop_member())';
  end if;
end;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 9. SUPABASE REALTIME PUBLICATION (IDEMPOTENT)
-- ────────────────────────────────────────────────────────────────────────────

do $$
declare
  tbl text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach tbl in array array[
      'orders',
      'bookings',
      'messages',
      'products',
      'inventory',
      'tickets',
      'customers',
      'house_calls',
      'appointments',
      'services',
      'vendor_repairs',
      'expenses',
      'settings',
      'pos_sales',
      'gift_cards',
      'social_interactions',
      'social_connections',
      'social_posts'
    ]
    loop
      if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = tbl
      ) then
        execute format('alter publication supabase_realtime add table public.%I', tbl);
      end if;
    end loop;
  end if;
end;
$$;
`;
