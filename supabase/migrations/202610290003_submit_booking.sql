-- One call from the website creates the booking, matches or creates the customer, schedules it on the
-- POS calendar and opens a draft repair ticket carrying the quoted price.
create or replace function public.submit_booking(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  pid uuid := public.shop_profile_id();
  v_name text := btrim(coalesce(payload->>'name', ''));
  v_email text := lower(btrim(coalesce(payload->>'email', '')));
  v_phone text := btrim(coalesce(payload->>'phone', ''));
  v_digits text := regexp_replace(coalesce(payload->>'phone', ''), '\D', '', 'g');
  v_service text := btrim(coalesce(payload->>'service', ''));
  v_date date;
  v_time text := btrim(coalesce(payload->>'time', ''));
  v_home boolean := coalesce(payload->>'visit_type', 'in-store') = 'home';
  v_device text := btrim(coalesce(payload->>'device_type', ''));
  v_model text := btrim(coalesce(payload->>'device_model', ''));
  v_issue text := btrim(coalesce(payload->>'issue', ''));
  v_addr text := btrim(coalesce(payload->>'home_address', ''));
  v_price numeric := 0;
  v_svc_name text;
  v_cust bigint; v_ticket bigint; v_booking uuid;
begin
  if pid is null then raise exception 'Shop is not configured'; end if;
  if v_name = '' or v_service = '' or v_time = '' then raise exception 'Name, service and time are required'; end if;
  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'A valid email is required'; end if;
  if length(v_digits) < 7 then raise exception 'A valid phone number is required'; end if;
  begin v_date := (payload->>'date')::date; exception when others then raise exception 'A valid date is required'; end;
  if v_date is null or v_date < current_date then raise exception 'Pick a date in the future'; end if;

  -- The quote always comes from the live service list, never from the browser.
  if nullif(payload->>'service_id', '') is not null then
    select price, name into v_price, v_svc_name from public.services where id::text = payload->>'service_id' and active limit 1;
  end if;
  v_price := coalesce(v_price, 0);

  select id into v_cust from public.customers
   where profile_id = pid and ((length(v_digits) >= 7 and regexp_replace(phone, '\D', '', 'g') = v_digits) or (email <> '' and lower(email) = v_email))
   order by id limit 1;
  if v_cust is null then
    insert into public.customers(profile_id, name, phone, email, address, notes, tags)
    values (pid, v_name, v_phone, v_email, v_addr, 'Added from a website booking', '["website"]'::jsonb) returning id into v_cust;
  end if;

  insert into public.tickets(profile_id, customer_id, device, device_model, issue, status, price, notes, services)
  values (pid, v_cust, v_device, v_model, concat_ws(' - ', v_service, nullif(v_issue, '')), 'Open', v_price,
          jsonb_build_array(jsonb_build_object('text', 'Booked on the website for ' || v_date::text || ' at ' || v_time || coalesce(' (' || nullif(btrim(payload->>'notes'), '') || ')', ''), 'date', now())),
          case when v_price > 0 then jsonb_build_array(jsonb_build_object('name', coalesce(v_svc_name, v_service), 'price', v_price, 'qty', 1)) else '[]'::jsonb end)
  returning id into v_ticket;

  insert into public.bookings(profile_id, customer_id, user_id, customer_name, customer_email, customer_phone, service, device_type, device_model,
                              issue, appt_date, appt_time, notes, visit_type, visit_location_type, home_address, status, novaops_ticket_id)
  values (pid, v_cust, auth.uid(), v_name, v_email, v_phone, v_service, v_device, v_model, v_issue, v_date, v_time,
          coalesce(payload->>'notes', ''), case when v_home then 'home' else 'in-store' end, nullif(payload->>'visit_location_type', ''), v_addr, 'pending', v_ticket)
  returning id into v_booking;

  if v_home then
    insert into public.house_calls(profile_id, customer_id, description, address, date, time, status, notes)
    values (pid, v_cust, v_service || ' - ' || v_device, v_addr, v_date, v_time, 'scheduled', 'Website booking ' || v_booking::text);
  else
    insert into public.appointments(profile_id, customer_id, title, description, date, time, status, notes)
    values (pid, v_cust, 'Repair: ' || v_service, v_device || ' ' || v_model, v_date, v_time, 'scheduled', 'Website booking ' || v_booking::text);
  end if;

  return jsonb_build_object('ok', true, 'booking_id', v_booking, 'ticket_id', v_ticket, 'price', v_price);
end $$;
revoke execute on function public.submit_booking(jsonb) from public;
grant execute on function public.submit_booking(jsonb) to anon, authenticated;
