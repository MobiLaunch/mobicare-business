-- ============================================================================
-- MobiCare + NovaOps — Additive Suite Polish, Order Tracking & Square Terminal
-- Builds cleanly and idempotently on top of 202608270001 .. 202610310008.
-- Zero destructive drops or column type rewrites.
-- ============================================================================

-- ── 1. Auth Sign-Up Trigger & Admin Guard ───────────────────────────────────
-- Staff must NEVER receive a `profiles` row (202610310003_staff_roles.sql).
-- Shop owners (`businessName` metadata or `account_type = 'shop_owner'`) get `profiles`.
-- Storefront sign-ups get `customer_profiles`.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_type text := lower(coalesce(new.raw_user_meta_data->>'account_type', ''));
begin
  if v_account_type = 'staff' then
    return new;
  elsif (new.raw_user_meta_data ? 'businessName') or v_account_type = 'shop_owner' then
    insert into public.profiles (id, email, business_name)
    values (
      new.id,
      coalesce(new.email, ''),
      coalesce(
        nullif(new.raw_user_meta_data->>'businessName', ''),
        nullif(new.raw_user_meta_data->>'business_name', ''),
        ''
      )
    )
    on conflict (id) do nothing;
  else
    insert into public.customer_profiles (id, full_name, phone)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'full_name', ''),
      coalesce(new.raw_user_meta_data->>'phone', '')
    )
    on conflict (id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Ensure any accidental legacy staff profile row never grants owner/admin access.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid()
  )
  and not exists (
    select 1 from public.staff_members where user_id = auth.uid()
  )
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ── 2. Additive Columns for MobiCare & NovaOps Features ─────────────────────

-- Optional saved checkout address fields for storefront customers
alter table if exists public.customer_profiles
  add column if not exists email   text not null default '',
  add column if not exists address text not null default '',
  add column if not exists city    text not null default '',
  add column if not exists state   text not null default '',
  add column if not exists zip     text not null default '';

-- Staff lock-screen PINs
alter table if exists public.staff_members
  add column if not exists pin text not null default '';

-- Storefront order fulfilment method, carrier tracking & refund totals
alter table if exists public.orders
  add column if not exists shipping_method text not null default 'standard',
  add column if not exists tracking_number text not null default '',
  add column if not exists refunded_amount numeric(10,2) not null default 0;

-- Customer tax-exempt flag
alter table if exists public.customers
  add column if not exists tax_exempt boolean not null default false;

-- Repair ticket intake checklist, passcode, structured services & warranty window
alter table if exists public.tickets
  add column if not exists services         jsonb       not null default '[]'::jsonb,
  add column if not exists device_passcode  text        not null default '',
  add column if not exists intake_checklist jsonb       not null default '{}'::jsonb,
  add column if not exists warranty_days    integer     not null default 90,
  add column if not exists warranty_start   timestamptz;

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
end $$;

alter table if exists public.tickets
  alter column warranty_days set default 90;

-- Register sale discounts, cash tendered/change & Square payment/Terminal IDs
alter table if exists public.pos_sales
  add column if not exists discount             numeric(10,2) not null default 0,
  add column if not exists cash_tendered        numeric(10,2),
  add column if not exists change_due           numeric(10,2),
  add column if not exists square_payment_id    text,
  add column if not exists terminal_checkout_id text;

-- Square Web Payments & paired Square Terminal metadata
alter table if exists public.square_config
  add column if not exists application_id       text not null default '',
  add column if not exists terminal_device_id   text not null default '',
  add column if not exists terminal_device_name text not null default '';

-- Shared product catalog columns (`category` <-> `category_id`, `inventory_id`, `profile_id`)
alter table if exists public.products
  add column if not exists profile_id   uuid,
  add column if not exists inventory_id bigint references public.inventory(id) on delete set null,
  add column if not exists category_id  text;

create index if not exists products_category_id_idx on public.products(category_id);

-- Optional customer user link on chat messages
alter table if exists public.messages
  add column if not exists user_id uuid references auth.users(id) on delete set null;

-- ── 3. Gift Cards (`gift_cards.id uuid` + `gift_card_transactions`) ─────────
-- Stamp owner's profile_id whether called by owner or active staff (matches loyalty_transactions).
alter table if exists public.gift_cards
  alter column profile_id set default coalesce(public.staff_owner(), auth.uid());

alter table if exists public.gift_card_transactions
  alter column profile_id set default coalesce(public.staff_owner(), auth.uid());

create or replace function public.refund_gift_card(
  p_code   text,
  p_amount numeric,
  p_ref    text default null
)
returns numeric
language plpgsql
security invoker
set search_path = public
as $$
declare
  c public.gift_cards;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'invalid amount'; end if;

  update public.gift_cards
     set balance = balance + p_amount
   where code = upper(trim(p_code))
     and status = 'active'
   returning * into c;

  if not found then
    raise exception 'Gift card not found or void';
  end if;

  insert into public.gift_card_transactions (card_id, delta, kind, sale_ref)
  values (c.id, p_amount, 'adjust', p_ref);

  return c.balance;
end $$;

revoke all on function public.refund_gift_card(text, numeric, text) from public, anon;
grant execute on function public.refund_gift_card(text, numeric, text) to authenticated;

-- ── 4. Inventory <-> Storefront Sync, Refund Restock & Category Hierarchy ───

-- Backfill `category_id` and `category` on existing products and keep them mirrored.
update public.products
   set category_id = category
 where category_id is null and category is not null;

update public.products
   set category = category_id
 where category is null and category_id is not null;

create or replace function public.sync_product_category_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.category    := nullif(btrim(coalesce(new.category, '')), '');
  new.category_id := nullif(btrim(coalesce(new.category_id, '')), '');

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
end $$;

drop trigger if exists products_sync_category on public.products;
create trigger products_sync_category
  before insert or update on public.products
  for each row execute function public.sync_product_category_fields();

revoke execute on function public.sync_product_category_fields() from public, anon, authenticated;

-- Mirror POS stock, name, and price updates onto linked shop products, logging stock movements.
create or replace function public.inventory_stock_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.item_type, 'product') <> 'service' then
    if new.stock is distinct from old.stock then
      insert into public.stock_movements (profile_id, inventory_id, item_name, delta, stock_after, reason, ref)
      values (
        new.profile_id,
        new.id,
        new.name,
        coalesce(new.stock, 0) - coalesce(old.stock, 0),
        coalesce(new.stock, 0),
        coalesce(nullif(current_setting('app.stock_reason', true), ''), 'adjustment'),
        nullif(current_setting('app.stock_ref', true), '')
      );
    end if;

    if new.stock is distinct from old.stock
       or new.name is distinct from old.name
       or new.price is distinct from old.price then
      update public.products
         set stock      = greatest(coalesce(new.stock, 0), 0),
             name       = coalesce(nullif(btrim(new.name), ''), name),
             price      = greatest(coalesce(new.price, 0), 0),
             updated_at = now()
       where inventory_id = new.id;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists inventory_stock_changed on public.inventory;
create trigger inventory_stock_changed
  after update of stock, name, price on public.inventory
  for each row execute function public.inventory_stock_changed();

revoke execute on function public.inventory_stock_changed() from public, anon, authenticated;

-- Restock inventory / products when an order is cancelled, fails payment, OR is refunded via Stripe.
-- (`order_item_take_stock` from 202610290001 remains untouched so stock is never double-deducted.)
create or replace function public.order_restock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  li       record;
  p        record;
  v_reason text;
begin
  if new.status in ('cancelled', 'payment_failed', 'refunded')
     and old.status not in ('cancelled', 'payment_failed', 'refunded')
     and not old.stock_restored then
    v_reason := case when new.status = 'refunded' then 'web_order_refunded' else 'web_order_cancelled' end;
    for li in
      select product_id, qty
      from public.order_items
      where order_id = new.id and product_id is not null
    loop
      select id, inventory_id into p
      from public.products
      where id::text = li.product_id::text;
      if found then
        perform set_config('app.stock_reason', v_reason, true);
        perform set_config('app.stock_ref', new.id::text, true);
        if p.inventory_id is not null then
          update public.inventory set stock = coalesce(stock, 0) + li.qty where id = p.inventory_id;
        else
          update public.products set stock = stock + li.qty, updated_at = now() where id = p.id;
        end if;
        perform set_config('app.stock_reason', '', true);
        perform set_config('app.stock_ref', '', true);
      end if;
    end loop;
    update public.orders set stock_restored = true where id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists order_restock on public.orders;
create trigger order_restock
  after update of status on public.orders
  for each row execute function public.order_restock();

revoke execute on function public.order_restock() from public, anon, authenticated;

-- Enforce 2-level category hierarchy in both directions (including moving a parent that already has children).
create or replace function public.enforce_category_depth()
returns trigger
language plpgsql
security definer
set search_path = public
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
end $$;

drop trigger if exists categories_enforce_depth on public.categories;
create trigger categories_enforce_depth
  before insert or update on public.categories
  for each row execute function public.enforce_category_depth();

revoke execute on function public.enforce_category_depth() from public, anon, authenticated;

-- ── 5. Public Repair & Device Catalog Views ─────────────────────────────────
-- Expose all active priced services so custom categories in NovaOps ('Services', 'Repairs', etc.) quote live.
create or replace view public.public_repair_catalog with (security_invoker = false) as
select
  id::text as id,
  name,
  category,
  price,
  coalesce(nullif(estimated_minutes, 0), nullif(duration, 0)) as minutes
from public.services
where active and price > 0;

grant select on public.public_repair_catalog to anon, authenticated;

-- Include custom POS `device_models` alongside `devices` in `public_device_catalog`.
alter table if exists public.devices
  add column if not exists year integer;

create or replace view public.public_device_catalog with (security_invoker = false) as
select
  d.id::text as id,
  d.brand,
  d.category,
  d.name,
  d.year
from public.devices d
union
select
  ('dm-' || dm.id::text) as id,
  dm.brand,
  dm.category,
  dm.name,
  null
from public.device_models dm
where not exists (
  select 1
  from public.devices d2
  where lower(d2.brand) = lower(dm.brand)
    and lower(d2.category) = lower(dm.category)
    and lower(d2.name) = lower(dm.name)
);

grant select on public.public_device_catalog to anon, authenticated;

-- ── 6. Square Public Config, Guest Order Lookup & Chat Read-State RPCs ──────

-- Safe public Square config for both Shop Owner and active Staff (never exposes `access_token`).
create or replace function public.get_square_public_config()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_owner uuid := coalesce(
    public.staff_owner(),
    (select p.id from public.profiles p where p.id = auth.uid())
  );
  v_row public.square_config%rowtype;
begin
  if v_owner is null then
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
end $$;

revoke all on function public.get_square_public_config() from public, anon;
grant execute on function public.get_square_public_config() to authenticated;

-- Public storefront order status lookup verified by email, 5-digit ZIP, or phone last 4 digits.
-- (`public.lookup_repair_status` from 202610310005 remains intact.)
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
  v_oid    text := btrim(regexp_replace(coalesce(p_order_id, ''), '^\s*#\s*', ''));
  v_verify text := btrim(coalesce(p_verify, ''));
  v_digits text := regexp_replace(coalesce(p_verify, ''), '\D', '', 'g');
begin
  if length(v_oid) < 4 or v_verify = '' then
    return;
  end if;

  return query
  select
    o.id::text as id,
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
          'product_id', oi.product_id::text,
          'name', oi.name,
          'price', oi.price,
          'qty', oi.qty
        )
        order by oi.id
      )
      from public.order_items oi
      where oi.order_id::text = o.id::text
    ), '[]'::jsonb) as items,
    o.created_at,
    o.updated_at
  from public.orders o
  where (
    lower(o.id::text) = lower(v_oid)
    or lower(o.id::text) like lower(v_oid) || '%'
  )
  and (
    (position('@' in v_verify) > 0 and o.customer_email <> '' and lower(o.customer_email) = lower(v_verify))
    or (
      length(v_digits) = 5
      and length(regexp_replace(coalesce(o.shipping_zip, ''), '\D', '', 'g')) >= 5
      and left(regexp_replace(coalesce(o.shipping_zip, ''), '\D', '', 'g'), 5) = v_digits
    )
    or (
      length(v_digits) >= 4
      and length(regexp_replace(coalesce(o.customer_phone, ''), '\D', '', 'g')) >= 4
      and right(regexp_replace(coalesce(o.customer_phone, ''), '\D', '', 'g'), 4) = right(v_digits, 4)
    )
  )
  order by o.created_at desc
  limit 1;
end $$;

revoke all on function public.lookup_order_status(text, text) from public;
grant execute on function public.lookup_order_status(text, text) to anon, authenticated;

-- Marks outbound shop chat replies as read for the signed-in storefront customer.
create or replace function public.mark_customer_messages_read()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid     uuid := auth.uid();
  v_email text;
  v_count integer := 0;
begin
  if uid is null then
    return 0;
  end if;

  select email into v_email from auth.users where id = uid;
  if coalesce(btrim(v_email), '') = '' then
    return 0;
  end if;

  update public.messages
     set read = true,
         updated_at = now()
   where channel = 'chat'
     and direction = 'outbound'
     and read = false
     and lower(customer_email) = lower(v_email);

  get diagnostics v_count = row_count;
  return v_count;
end $$;

revoke all on function public.mark_customer_messages_read() from public, anon;
grant execute on function public.mark_customer_messages_read() to authenticated;

-- Normalize chat `customer_email` to lowercase and link `user_id` automatically when available.
create or replace function public.messages_normalize_chat()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.profile_id is null then
    new.profile_id := public.shop_profile_id();
  end if;

  if new.channel = 'chat' then
    new.customer_email := lower(btrim(coalesce(new.customer_email, '')));
    if new.user_id is null then
      if new.direction = 'inbound' and auth.uid() is not null then
        new.user_id := auth.uid();
      elsif new.direction = 'outbound' and new.customer_email <> '' then
        select u.id into new.user_id
        from auth.users u
        where lower(u.email) = new.customer_email
        limit 1;
      end if;
    end if;
  end if;

  return new;
end $$;

drop trigger if exists messages_normalize_chat on public.messages;
create trigger messages_normalize_chat
  before insert on public.messages
  for each row execute function public.messages_normalize_chat();

revoke execute on function public.messages_normalize_chat() from public, anon, authenticated;

-- ── 7. RLS Policy Alignments (`orders`, `order_items`, `messages`, `settings`) ─

-- `orders`: customer reads own; shop owner reads & updates fulfilment/tracking.
drop policy if exists orders_customer_read on public.orders;
create policy orders_customer_read on public.orders
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists orders_owner_read on public.orders;
create policy orders_owner_read on public.orders
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid()));

drop policy if exists orders_owner_update on public.orders;
create policy orders_owner_update on public.orders
  for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid()))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid()));

-- `order_items`: customer reads own order's line items; shop owner reads all.
drop policy if exists order_items_customer_read on public.order_items;
create policy order_items_customer_read on public.order_items
  for select to authenticated
  using (exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and o.user_id = auth.uid()
  ));

drop policy if exists order_items_owner_read on public.order_items;
create policy order_items_owner_read on public.order_items
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid()));

-- `messages`: allow signed-in customers to subscribe to Realtime updates on their own chat thread.
drop policy if exists messages_customer_chat_read on public.messages;
create policy messages_customer_chat_read on public.messages
  for select to authenticated
  using (
    channel = 'chat'
    and coalesce(auth.jwt() ->> 'email', '') <> ''
    and lower(customer_email) = lower(auth.jwt() ->> 'email')
  );

-- `settings`: backfill any legacy NULL profile_id, then remove `OR profile_id IS NULL` leak
-- while preserving `settings_staff_read` from 202610310003.
update public.settings
   set profile_id = public.shop_profile_id()
 where profile_id is null
   and public.shop_profile_id() is not null;

drop policy if exists "settings_owner" on public.settings;
create policy "settings_owner" on public.settings
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- ── 8. Storage (`site-media`) Policies for Owner & Active Staff ─────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-media',
  'site-media',
  true,
  52428800,
  array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml','image/avif','video/mp4','video/webm']
)
on conflict (id) do nothing;

drop policy if exists site_media_public_read on storage.objects;
create policy site_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'site-media');

drop policy if exists site_media_staff_insert on storage.objects;
create policy site_media_staff_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'site-media' and public.staff_owner() is not null);

drop policy if exists site_media_staff_update on storage.objects;
create policy site_media_staff_update on storage.objects
  for update to authenticated
  using (bucket_id = 'site-media' and public.staff_owner() is not null)
  with check (bucket_id = 'site-media' and public.staff_owner() is not null);

drop policy if exists site_media_owner_delete on storage.objects;
create policy site_media_owner_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'site-media' and exists (select 1 from public.profiles p where p.id = auth.uid()));

-- ── 9. Supabase Realtime Publication (Idempotent) ───────────────────────────
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
      'pos_sales',
      'gift_cards'
    ]
    loop
      if exists (
        select 1
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relname = tbl
          and c.relkind = 'r'
      ) and not exists (
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
end $$;
