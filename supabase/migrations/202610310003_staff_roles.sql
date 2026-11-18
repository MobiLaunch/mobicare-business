-- Staff accounts: sign-ins that work the shop's data (register, tickets, inventory, customers)
-- but get no access to revenue/orders, expenses, payment keys, social tokens or settings.
-- Additive only: new table, helper, and extra permissive policies. Staff must NOT have a profiles row
-- (existing policies treat any profiles row as an owner/staff admin).
create table if not exists public.staff_members (
  user_id uuid primary key,
  owner_id uuid not null,
  name text default '',
  email text default '',
  role text not null default 'staff' check (role in ('staff')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.staff_members enable row level security;
create policy staff_members_owner on public.staff_members for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy staff_members_self_read on public.staff_members for select to authenticated
  using (user_id = auth.uid());

create or replace function public.staff_owner() returns uuid
language sql stable security definer set search_path = public as $$
  select owner_id from public.staff_members where user_id = auth.uid() and active
$$;
revoke all on function public.staff_owner() from public, anon;
grant execute on function public.staff_owner() to authenticated;

do $$
declare t text;
begin
  foreach t in array array['tickets','customers','inventory','house_calls','vendor_repairs','appointments','services','gift_cards','gift_card_transactions','bookings','messages','categories','products'] loop
    execute format('create policy %I on public.%I for all to authenticated using (profile_id = public.staff_owner()) with check (profile_id = public.staff_owner())', t || '_staff', t);
  end loop;
end $$;
create policy settings_staff_read on public.settings for select to authenticated using (profile_id = public.staff_owner());
-- Register: staff can ring up and look at sales but not edit/void/refund them.
create policy pos_sales_staff_read on public.pos_sales for select to authenticated using (profile_id = public.staff_owner());
create policy pos_sales_staff_insert on public.pos_sales for insert to authenticated with check (profile_id = public.staff_owner());
create policy stock_movements_staff_read on public.stock_movements for select to authenticated using (profile_id = public.staff_owner());
