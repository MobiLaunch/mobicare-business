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
