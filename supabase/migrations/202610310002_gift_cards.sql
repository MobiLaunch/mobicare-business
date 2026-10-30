-- Gift cards / store credit for the POS. Owner-only via RLS; RPCs run as the caller.
create table if not exists public.gift_cards (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null default auth.uid(),
  code text not null unique,
  initial_amount numeric(10,2) not null check (initial_amount > 0),
  balance numeric(10,2) not null check (balance >= 0),
  customer_id bigint,
  note text default '',
  status text not null default 'active' check (status in ('active','void')),
  created_at timestamptz not null default now()
);
create table if not exists public.gift_card_transactions (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.gift_cards(id) on delete cascade,
  profile_id uuid not null default auth.uid(),
  delta numeric(10,2) not null,
  kind text not null check (kind in ('issue','redeem','adjust')),
  sale_ref text,
  created_at timestamptz not null default now()
);
alter table public.gift_cards enable row level security;
alter table public.gift_card_transactions enable row level security;
create policy gift_cards_owner on public.gift_cards for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy gift_card_tx_owner on public.gift_card_transactions for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create or replace function public.issue_gift_card(p_amount numeric, p_customer_id bigint default null, p_sale_ref text default null)
returns public.gift_cards language plpgsql security invoker set search_path = public as $$
declare c public.gift_cards; v_code text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'invalid amount'; end if;
  loop
    v_code := 'GC-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4)) || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4));
    exit when not exists (select 1 from public.gift_cards where code = v_code);
  end loop;
  insert into public.gift_cards(code, initial_amount, balance, customer_id) values (v_code, p_amount, p_amount, p_customer_id) returning * into c;
  insert into public.gift_card_transactions(card_id, delta, kind, sale_ref) values (c.id, p_amount, 'issue', p_sale_ref);
  return c;
end $$;

create or replace function public.redeem_gift_card(p_code text, p_amount numeric, p_sale_ref text default null)
returns numeric language plpgsql security invoker set search_path = public as $$
declare c public.gift_cards;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'invalid amount'; end if;
  update public.gift_cards set balance = balance - p_amount
   where code = upper(trim(p_code)) and status = 'active' and balance >= p_amount
   returning * into c;
  if not found then raise exception 'Gift card not found, void, or balance too low'; end if;
  insert into public.gift_card_transactions(card_id, delta, kind, sale_ref) values (c.id, -p_amount, 'redeem', p_sale_ref);
  return c.balance;
end $$;
revoke all on function public.issue_gift_card(numeric, bigint, text), public.redeem_gift_card(text, numeric, text) from public, anon;
grant execute on function public.issue_gift_card(numeric, bigint, text), public.redeem_gift_card(text, numeric, text) to authenticated;
