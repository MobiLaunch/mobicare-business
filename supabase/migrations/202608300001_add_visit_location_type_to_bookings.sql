-- House calls now have separate residential/commercial pricing tiers.
-- Nullable: only meaningful for visit_type = 'home', and existing rows
-- predate the distinction.

alter table if exists public.bookings
  add column if not exists visit_location_type text;
