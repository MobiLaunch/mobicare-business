-- Who rang up a sale or opened a ticket, and loyalty points for customers.
alter table public.pos_sales
  add column if not exists staff_id uuid default auth.uid(),
  add column if not exists staff_name text,
  add column if not exists loyalty_earned integer not null default 0,
  add column if not exists loyalty_redeemed integer not null default 0;
alter table public.tickets add column if not exists created_by_name text;
alter table public.customers add column if not exists loyalty_points integer not null default 0;

create table if not exists public.loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null default coalesce(public.staff_owner(), auth.uid()),
  customer_id bigint not null,
  delta integer not null,
  reason text not null default 'sale',
  sale_ref text,
  created_at timestamptz not null default now()
);
alter table public.loyalty_transactions enable row level security;
create policy loyalty_tx_owner on public.loyalty_transactions for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy loyalty_tx_staff on public.loyalty_transactions for all to authenticated
  using (profile_id = public.staff_owner()) with check (profile_id = public.staff_owner());

-- Adds or removes points atomically; never lets a balance go below zero. Runs as the caller, so RLS applies.
create or replace function public.adjust_loyalty(p_customer bigint, p_delta integer, p_reason text default 'sale', p_sale_ref text default null)
returns integer language plpgsql security invoker set search_path = public as $$
declare bal integer;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_delta is null or p_delta = 0 then
    select loyalty_points into bal from public.customers where id = p_customer;
    return coalesce(bal, 0);
  end if;
  update public.customers set loyalty_points = loyalty_points + p_delta
   where id = p_customer and loyalty_points + p_delta >= 0
   returning loyalty_points into bal;
  if not found then raise exception 'Not enough points, or customer not found'; end if;
  insert into public.loyalty_transactions(customer_id, delta, reason, sale_ref) values (p_customer, p_delta, p_reason, p_sale_ref);
  return bal;
end $$;
revoke all on function public.adjust_loyalty(bigint, integer, text, text) from public, anon;
grant execute on function public.adjust_loyalty(bigint, integer, text, text) to authenticated;
