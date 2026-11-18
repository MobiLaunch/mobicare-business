-- Read-only public views so the booking wizard can quote live prices from the POS service list
-- without exposing the services table (which also holds labor rates and internal items).
create or replace view public.public_repair_catalog with (security_invoker = false) as
select id::text as id, name, category, price, coalesce(nullif(estimated_minutes, 0), nullif(duration, 0)) as minutes
from public.services
where active and price > 0
  and category in ('Apple Repairs', 'Samsung Repairs', 'Google Repairs', 'Board Repairs', 'Data Services', 'SSD Upgrades', 'House Calls');
grant select on public.public_repair_catalog to anon, authenticated;

create or replace view public.public_device_catalog with (security_invoker = false) as
select id::text as id, brand, category, name, year from public.devices;
grant select on public.public_device_catalog to anon, authenticated;
