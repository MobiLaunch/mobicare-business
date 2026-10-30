-- Closes anonymous access to customer and ticket data.
-- Before this, anyone with the public API key could read every customer (including driver's licence numbers)
-- and every ticket, and any signed-in website customer could edit website_settings.
-- The customer portal now goes through the narrow functions below instead.

drop policy if exists "Anon read customers" on public.customers;
drop policy if exists "Anon insert customers" on public.customers;
drop policy if exists "Anon lookup ticket by number" on public.tickets;
drop policy if exists "Anon insert appointments" on public.appointments;
drop policy if exists "Anon insert house_calls" on public.house_calls;
drop policy if exists "Auth users manage website_settings" on public.website_settings;
create policy website_settings_owner_manage on public.website_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Ticket status check: needs the ticket number AND matching contact details, and returns only status fields.
create or replace function public.portal_ticket_lookup(p_ticket bigint, p_contact text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_contact text := lower(btrim(coalesce(p_contact, '')));
  v_digits text := right(regexp_replace(coalesce(p_contact, ''), '\D', '', 'g'), 10);
  t record;
begin
  if p_ticket is null or (v_contact = '' ) then return null; end if;
  select tk.id, tk.device, tk.device_model, tk.issue, tk.status, tk.priority, tk.price, tk.created_at, tk.updated_at,
         c.email, c.phone, c.name
    into t
    from public.tickets tk join public.customers c on c.id = tk.customer_id
   where tk.id = p_ticket;
  if not found then return null; end if;
  if not ((t.email <> '' and lower(t.email) = v_contact)
       or (length(v_digits) >= 7 and right(regexp_replace(coalesce(t.phone, ''), '\D', '', 'g'), 10) = v_digits)) then
    return null;
  end if;
  return jsonb_build_object('id', t.id, 'device', t.device, 'device_model', t.device_model, 'issue', t.issue, 'status', t.status,
    'priority', t.priority, 'price', t.price, 'created_at', t.created_at, 'updated_at', t.updated_at, 'customer_name', t.name);
end $$;
revoke execute on function public.portal_ticket_lookup(bigint, text) from public;
grant execute on function public.portal_ticket_lookup(bigint, text) to anon, authenticated;

-- Repair request from the customer portal: matches or creates the customer, opens a ticket. Throttled.
create or replace function public.portal_submit_request(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  pid uuid := public.shop_profile_id();
  v_name text := btrim(coalesce(payload->>'name', ''));
  v_email text := lower(btrim(coalesce(payload->>'email', '')));
  v_phone text := btrim(coalesce(payload->>'phone', ''));
  v_digits text := regexp_replace(coalesce(payload->>'phone', ''), '\D', '', 'g');
  v_cust bigint; v_ticket bigint;
begin
  if pid is null then raise exception 'Shop is not configured'; end if;
  if v_name = '' or length(v_name) > 120 then raise exception 'Please enter your name'; end if;
  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'A valid email is required'; end if;
  if btrim(coalesce(payload->>'issue', '')) = '' then raise exception 'Please describe the problem'; end if;
  if (select count(*) from public.tickets where profile_id = pid and issue like '[Online Booking%' and created_at > now() - interval '1 hour') >= 40 then
    raise exception 'Requests are busy right now. Please call us.';
  end if;

  select id into v_cust from public.customers
   where profile_id = pid and ((email <> '' and lower(email) = v_email) or (length(v_digits) >= 7 and regexp_replace(phone, '\D', '', 'g') = v_digits))
   order by id limit 1;
  if v_cust is null then
    insert into public.customers(profile_id, name, phone, email, notes, tags)
    values (pid, v_name, v_phone, v_email, 'Added from the customer portal', '["portal"]'::jsonb) returning id into v_cust;
  end if;

  insert into public.tickets(profile_id, customer_id, device, device_model, issue, status, priority, price, notes)
  values (pid, v_cust, left(coalesce(payload->>'device', ''), 120), left(coalesce(payload->>'device_model', ''), 120),
          left('[Online Booking' || case when coalesce(payload->>'service', '') <> '' then ' - ' || (payload->>'service') else '' end || '] ' || (payload->>'issue'), 1000),
          'Open', 'normal', 0,
          jsonb_build_array(jsonb_build_object('text', 'Online booking request. Service: ' || coalesce(nullif(payload->>'service', ''), 'Not specified') || '. Preferred date: ' || coalesce(nullif(payload->>'date', ''), 'Flexible') || '.', 'date', now())))
  returning id into v_ticket;
  return jsonb_build_object('ok', true, 'ticket_id', v_ticket);
end $$;
revoke execute on function public.portal_submit_request(jsonb) from public;
grant execute on function public.portal_submit_request(jsonb) to anon, authenticated;

create or replace function public.portal_ticket_count()
returns bigint language sql stable security definer set search_path = public as $$ select count(*) from public.tickets $$;
revoke execute on function public.portal_ticket_count() from public;
grant execute on function public.portal_ticket_count() to anon, authenticated;

-- Social-account tokens were readable by anyone holding the public key; only the service role may call this.
revoke execute on function public.get_platform_connection(uuid, text) from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
