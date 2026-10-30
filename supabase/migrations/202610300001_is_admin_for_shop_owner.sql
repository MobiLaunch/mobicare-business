-- The website's refund route asks the database whether the caller is staff via is_admin().
-- In the shared database, anyone with a POS profile is the shop owner, so that is the rule.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid())
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
