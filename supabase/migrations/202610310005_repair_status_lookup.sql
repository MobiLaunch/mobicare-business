-- Public repair status lookup: ticket number + last 4 digits of the phone on file returns only the
-- repair's stage. Wrong guesses are logged; 5 misses on a ticket within 15 minutes locks it for a while.
create table if not exists public.repair_lookup_attempts (
  id bigint generated always as identity primary key,
  ticket_id bigint not null,
  at timestamptz not null default now()
);
create index if not exists repair_lookup_attempts_ticket_at on public.repair_lookup_attempts (ticket_id, at);
alter table public.repair_lookup_attempts enable row level security;

create or replace function public.lookup_repair_status(p_ticket bigint, p_phone text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  d text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  t record;
  cphone text;
  stage text;
begin
  if p_ticket is null or length(d) < 4 then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;
  delete from public.repair_lookup_attempts where at < now() - interval '1 day';
  if (select count(*) from public.repair_lookup_attempts where at > now() - interval '1 minute') > 120 then
    return jsonb_build_object('ok', false, 'reason', 'busy');
  end if;
  if (select count(*) from public.repair_lookup_attempts where ticket_id = p_ticket and at > now() - interval '15 minutes') >= 5 then
    return jsonb_build_object('ok', false, 'reason', 'locked');
  end if;

  select tk.id, tk.device, tk.device_model, tk.status, tk.updated_at, tk.customer_id into t from public.tickets tk where tk.id = p_ticket;
  if found then
    select regexp_replace(coalesce(c.phone, ''), '\D', '', 'g') into cphone from public.customers c where c.id = t.customer_id;
  end if;

  if not found or cphone is null or length(cphone) < 4 or right(cphone, 4) <> right(d, 4) then
    insert into public.repair_lookup_attempts(ticket_id) values (p_ticket);
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  stage := case
    when lower(t.status) ~ 'deliver|closed|picked' then 'done'
    when lower(t.status) ~ 'complete|ready|finished' then 'ready'
    when lower(t.status) ~ 'part|waiting' then 'waiting_parts'
    when lower(t.status) ~ 'progress|repair|bench' then 'in_progress'
    else 'received'
  end;
  return jsonb_build_object('ok', true, 'ticket', t.id, 'device', trim(coalesce(t.device, '') || ' ' || coalesce(t.device_model, '')), 'status', t.status, 'stage', stage, 'updated_at', t.updated_at);
end $$;
revoke all on function public.lookup_repair_status(bigint, text) from public;
grant execute on function public.lookup_repair_status(bigint, text) to anon, authenticated;
