-- Adds a self-referencing parent_id to support a 2-level Category ->
-- Subcategory hierarchy. A subcategory (parent_id set) may not itself have
-- children — enforced primarily in the admin UI (Categories.tsx only offers
-- parent_id IS NULL categories as parent choices) and backstopped here by a
-- trigger in case of direct SQL-editor edits (schemaSql.ts's own admin
-- instructions point at raw SQL access to this table).

alter table if exists public.categories
  add column if not exists parent_id text references public.categories(id) on delete set null;

create index if not exists categories_parent_id_idx on public.categories(parent_id);

create or replace function public.enforce_category_depth()
returns trigger language plpgsql as $$
declare
  parent_has_parent boolean;
begin
  if new.parent_id is not null then
    if new.parent_id = new.id then
      raise exception 'A category cannot be its own parent.';
    end if;
    select (parent_id is not null) into parent_has_parent
    from public.categories where id = new.parent_id;
    if parent_has_parent then
      raise exception 'Categories only support 2 levels — the selected parent is itself a subcategory.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists categories_enforce_depth on public.categories;
create trigger categories_enforce_depth
  before insert or update on public.categories
  for each row execute procedure public.enforce_category_depth();

-- ────────────────────────────────────────────────────────────────────────
-- Data backfill: this store already had an ad hoc, asymmetric attempt at
-- brand subcategories — "cases" (id kept as-is) was really "Cases - Apple",
-- with a separate "cases---samsung" row bolted on as Samsung's cases, and
-- the same pattern for screen protectors. No product rows need to change:
-- every existing product's `category` value already points at "cases",
-- "cases---samsung", "screen-protectors", or "screen-protectors---samsung"
-- — only these category rows' names/hierarchy change below.
-- ────────────────────────────────────────────────────────────────────────

insert into public.categories (id, name, description, icon, sort_order, parent_id)
values ('phone-cases', 'Cases', 'MagSafe | Clear TPU | Armored for all life''s adventures.', 'Package', 0, null)
on conflict (id) do nothing;

update public.categories
  set name = 'Apple Cases', parent_id = 'phone-cases'
  where id = 'cases';

update public.categories
  set name = 'Samsung Cases', parent_id = 'phone-cases'
  where id = 'cases---samsung';

insert into public.categories (id, name, description, icon, sort_order, parent_id)
values ('screen-protection', 'Screen Protectors', 'Firstline defense for increasingly more expensive devices.', 'ShieldCheck', 0, null)
on conflict (id) do nothing;

update public.categories
  set name = 'Apple Screen Protectors', icon = 'Apple', parent_id = 'screen-protection'
  where id = 'screen-protectors';

update public.categories
  set name = 'Samsung Screen Protectors', icon = 'Smartphone', parent_id = 'screen-protection'
  where id = 'screen-protectors---samsung';
