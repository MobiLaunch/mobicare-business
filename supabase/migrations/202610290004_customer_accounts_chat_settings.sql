-- Aligns the website's customer-facing tables with the POS database.
-- Additive: customers get their own profile table instead of landing in the POS `profiles`
-- (which holds shop-owner settings), chat goes straight into the POS `messages` inbox,
-- and the Site editor content gets a home.

create table if not exists public.customer_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.customer_profiles enable row level security;
create policy customer_profiles_self on public.customer_profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
-- Anyone with a POS profile is shop staff.
create policy customer_profiles_staff_read on public.customer_profiles for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid()));

-- POS sign-ups carry businessName and keep creating POS profiles; website sign-ups create customer profiles.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.raw_user_meta_data ? 'businessName' then
    insert into public.profiles (id, email, business_name)
    values (new.id, new.email, coalesce(new.raw_user_meta_data->>'businessName', ''))
    on conflict (id) do nothing;
  else
    insert into public.customer_profiles (id, full_name, phone)
    values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), coalesce(new.raw_user_meta_data->>'phone', ''))
    on conflict (id) do nothing;
  end if;
  return new;
end $$;

create table if not exists public.site_settings (
  id text primary key,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;
create policy site_settings_public_read on public.site_settings for select to anon, authenticated using (true);
create policy site_settings_staff_write on public.site_settings for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid()))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid()));

-- Customers can read their own website bookings.
create policy bookings_customer_read on public.bookings for select to authenticated using (user_id = auth.uid());

-- Website chat lands in the POS inbox (`messages`, channel 'chat').
create or replace function public.send_customer_message(p_body text)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  pid uuid := public.shop_profile_id();
  v_email text; v_name text; v_cust bigint; v_id bigint;
  v_body text := btrim(coalesce(p_body, ''));
begin
  if uid is null then raise exception 'Sign in to send a message'; end if;
  if v_body = '' or length(v_body) > 2000 then raise exception 'Messages must be 1 to 2000 characters'; end if;
  select email into v_email from auth.users where id = uid;
  select full_name into v_name from public.customer_profiles where id = uid;
  select id into v_cust from public.customers where profile_id = pid and lower(email) = lower(v_email) and email <> '' order by id limit 1;
  insert into public.messages(profile_id, customer_id, customer_name, customer_email, channel, direction, subject, body)
  values (pid, v_cust, coalesce(v_name, ''), coalesce(v_email, ''), 'chat', 'inbound', 'Website chat', v_body)
  returning id into v_id;
  return v_id;
end $$;
revoke execute on function public.send_customer_message(text) from public, anon;
grant execute on function public.send_customer_message(text) to authenticated;

create or replace function public.my_customer_messages()
returns table(id bigint, body text, direction text, read boolean, customer_name text, customer_email text, ticket_id bigint, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select m.id, m.body, m.direction, m.read, m.customer_name, m.customer_email, m.ticket_id, m.created_at
  from public.messages m
  where m.channel = 'chat' and auth.uid() is not null
    and lower(m.customer_email) = lower((select u.email from auth.users u where u.id = auth.uid()))
  order by m.created_at
$$;
revoke execute on function public.my_customer_messages() from public, anon;
grant execute on function public.my_customer_messages() to authenticated;

-- Existing website tables now use the same shop owner.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
