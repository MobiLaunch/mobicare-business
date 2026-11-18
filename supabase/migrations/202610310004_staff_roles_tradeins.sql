-- Staff also work trade-ins and read the device catalog.
create policy trade_ins_staff on public.trade_ins for all to authenticated using (profile_id = public.staff_owner()) with check (profile_id = public.staff_owner());
create policy device_brands_staff_read on public.device_brands for select to authenticated using (profile_id = public.staff_owner());
create policy device_categories_staff_read on public.device_categories for select to authenticated using (profile_id = public.staff_owner());
create policy device_models_staff_read on public.device_models for select to authenticated using (profile_id = public.staff_owner());
