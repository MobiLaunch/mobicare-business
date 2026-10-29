-- Shared shop foundation: one database for the website and the NovaOps POS.
-- Additive only. Nothing is dropped, renamed or rewritten.

-- The shop is single-tenant: the first profile owns every row the website writes.
create or replace function public.shop_profile_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.profiles order by created_at asc limit 1
$$;
revoke execute on function public.shop_profile_id() from public, anon, authenticated;

-- Website rows are written by anonymous visitors or the service role and carry
-- no owner. Stamp them with the shop's profile so the POS and admin can see them.
create or replace function public.stamp_shop_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.profile_id is null then new.profile_id := public.shop_profile_id(); end if;
  return new;
end $$;

drop trigger if exists stamp_profile on public.bookings;
create trigger stamp_profile before insert on public.bookings for each row execute function public.stamp_shop_profile();
drop trigger if exists stamp_profile on public.orders;
create trigger stamp_profile before insert on public.orders for each row execute function public.stamp_shop_profile();
drop trigger if exists stamp_profile on public.products;
create trigger stamp_profile before insert on public.products for each row execute function public.stamp_shop_profile();
drop trigger if exists stamp_profile on public.categories;
create trigger stamp_profile before insert on public.categories for each row execute function public.stamp_shop_profile();

-- order_items.id had no default, so every line-item insert from the site failed.
create sequence if not exists public.order_items_id_seq owned by public.order_items.id;
select setval('public.order_items_id_seq', coalesce((select max(id) from public.order_items), 0) + 1, false);
alter table public.order_items alter column id set default nextval('public.order_items_id_seq');

-- One stock count: a shop product can point at a POS inventory item.
alter table public.products add column if not exists inventory_id bigint references public.inventory(id) on delete set null;
create unique index if not exists products_inventory_id_key on public.products(inventory_id) where inventory_id is not null;
alter table public.orders add column if not exists stock_restored boolean not null default false;

create table if not exists public.stock_movements (
  id bigint generated always as identity primary key,
  profile_id uuid not null,
  inventory_id bigint references public.inventory(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  item_name text not null default '',
  delta integer not null,
  stock_after integer not null,
  reason text not null default 'adjustment',
  ref text,
  created_at timestamptz not null default now()
);
create index if not exists stock_movements_item_idx on public.stock_movements(inventory_id, created_at desc);
alter table public.stock_movements enable row level security;
drop policy if exists stock_movements_owner on public.stock_movements;
create policy stock_movements_owner on public.stock_movements for select to authenticated using (profile_id = auth.uid());

-- Every change to a POS stock count is logged, then mirrored onto its shop product.
create or replace function public.inventory_stock_changed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.item_type, 'product') <> 'service' and new.stock is distinct from old.stock then
    insert into public.stock_movements(profile_id, inventory_id, item_name, delta, stock_after, reason, ref)
    values (new.profile_id, new.id, new.name, coalesce(new.stock, 0) - coalesce(old.stock, 0), coalesce(new.stock, 0),
            coalesce(nullif(current_setting('app.stock_reason', true), ''), 'adjustment'),
            nullif(current_setting('app.stock_ref', true), ''));
    update public.products set stock = greatest(coalesce(new.stock, 0), 0), updated_at = now() where inventory_id = new.id;
  end if;
  return new;
end $$;
drop trigger if exists inventory_stock_changed on public.inventory;
create trigger inventory_stock_changed after update of stock on public.inventory for each row execute function public.inventory_stock_changed();

-- Linking a product pulls its stock (and SKU if blank) from the POS item.
create or replace function public.product_link_sync()
returns trigger language plpgsql security definer set search_path = public as $$
declare inv record;
begin
  if new.inventory_id is not null then
    select stock, sku into inv from public.inventory where id = new.inventory_id;
    if found then
      new.stock := greatest(coalesce(inv.stock, 0), 0);
      if coalesce(new.sku, '') = '' then new.sku := coalesce(inv.sku, ''); end if;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists product_link_sync on public.products;
create trigger product_link_sync before insert or update of inventory_id on public.products for each row execute function public.product_link_sync();

-- A web order takes stock from the shared count; cancelling or a failed payment puts it back.
create or replace function public.order_item_take_stock()
returns trigger language plpgsql security definer set search_path = public as $$
declare p record;
begin
  if new.product_id is null then return new; end if;
  select id, inventory_id into p from public.products where id = new.product_id;
  if not found then return new; end if;
  perform set_config('app.stock_reason', 'web_order', true);
  perform set_config('app.stock_ref', new.order_id, true);
  if p.inventory_id is not null then
    update public.inventory set stock = greatest(coalesce(stock, 0) - new.qty, 0) where id = p.inventory_id;
  else
    update public.products set stock = greatest(stock - new.qty, 0), updated_at = now() where id = p.id;
    insert into public.stock_movements(profile_id, product_id, item_name, delta, stock_after, reason, ref)
    select profile_id, id, name, -new.qty, stock, 'web_order', new.order_id from public.products where id = p.id;
  end if;
  perform set_config('app.stock_reason', '', true);
  perform set_config('app.stock_ref', '', true);
  return new;
end $$;
drop trigger if exists order_item_take_stock on public.order_items;
create trigger order_item_take_stock after insert on public.order_items for each row execute function public.order_item_take_stock();

create or replace function public.order_restock()
returns trigger language plpgsql security definer set search_path = public as $$
declare li record; p record;
begin
  if new.status in ('cancelled', 'payment_failed') and old.status not in ('cancelled', 'payment_failed') and not old.stock_restored then
    for li in select product_id, qty from public.order_items where order_id = new.id and product_id is not null loop
      select id, inventory_id into p from public.products where id = li.product_id;
      if found then
        perform set_config('app.stock_reason', 'web_order_cancelled', true);
        perform set_config('app.stock_ref', new.id, true);
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
create trigger order_restock after update of status on public.orders for each row execute function public.order_restock();
