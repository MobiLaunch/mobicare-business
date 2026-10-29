-- Visitors without an account can message the shop from the website chat.
-- Lands in the POS inbox (`messages`, channel 'chat'). Throttled so it can't be used to flood the inbox.
create or replace function public.send_guest_message(p_name text, p_email text, p_phone text, p_body text)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  pid uuid := public.shop_profile_id();
  v_name text := btrim(coalesce(p_name, ''));
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_phone text := btrim(coalesce(p_phone, ''));
  v_digits text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_body text := btrim(coalesce(p_body, ''));
  v_cust bigint; v_id bigint;
begin
  if pid is null then raise exception 'Shop is not configured'; end if;
  if v_name = '' or length(v_name) > 120 then raise exception 'Please enter your name'; end if;
  if v_body = '' or length(v_body) > 2000 then raise exception 'Messages must be 1 to 2000 characters'; end if;
  if v_email = '' and length(v_digits) < 7 then raise exception 'Leave an email or phone number so we can reply'; end if;
  if v_email <> '' and v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'That email address does not look right'; end if;
  if (select count(*) from public.messages where channel = 'chat' and direction = 'inbound' and created_at > now() - interval '1 hour'
        and ((v_email <> '' and lower(customer_email) = v_email) or (v_email = '' and subject like '%' || v_digits || '%'))) >= 5 then
    raise exception 'You have sent a few messages already. We will reply soon.';
  end if;
  if (select count(*) from public.messages where channel = 'chat' and direction = 'inbound' and created_at > now() - interval '1 hour') >= 60 then
    raise exception 'Chat is busy right now. Please call us instead.';
  end if;

  select id into v_cust from public.customers
   where profile_id = pid and ((v_email <> '' and lower(email) = v_email) or (length(v_digits) >= 7 and regexp_replace(phone, '\D', '', 'g') = v_digits))
   order by id limit 1;

  insert into public.messages(profile_id, customer_id, customer_name, customer_email, channel, direction, subject, body)
  values (pid, v_cust, v_name, v_email, 'chat', 'inbound', 'Website chat' || case when v_digits <> '' then ' · ' || v_phone else '' end, v_body)
  returning id into v_id;
  return v_id;
end $$;
revoke execute on function public.send_guest_message(text, text, text, text) from public;
grant execute on function public.send_guest_message(text, text, text, text) to anon, authenticated;
