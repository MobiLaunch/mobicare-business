-- These tables have an updated_at trigger but had no updated_at column, so every UPDATE on them failed
-- (inventory stock changes, appointment and customer edits). Adding the column lets the trigger work.
alter table public.customers add column if not exists updated_at timestamptz not null default now();
alter table public.inventory add column if not exists updated_at timestamptz not null default now();
alter table public.appointments add column if not exists updated_at timestamptz not null default now();
alter table public.house_calls add column if not exists updated_at timestamptz not null default now();
