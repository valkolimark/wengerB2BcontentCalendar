-- 0006_sf_parents.sql — Salesforce reporting parents (rollup references).
-- The app stays two-level (Initiative → Campaign); each campaign just references
-- the SF rollup parent it reports into. sf_parents is a small admin-managed,
-- self-referential controlled vocabulary; Salesforce performs the actual rollup.
--
-- NOTE: sf_id / sf_name (SF Campaign ID / Name) already exist on campaigns from
-- 0005_sf_fields.sql; this migration only adds the parent reference + lookup.
-- Cycle 10.

create table public.sf_parents (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  -- The rollup this parent reports into (null = root). Deeper cycle prevention
  -- (a→b→a) is enforced app-side on create/update.
  parent_id  uuid references public.sf_parents(id) on delete set null,
  created_at timestamptz not null default now(),
  check (parent_id <> id)
);

alter table public.campaigns
  add column sf_parent_id uuid references public.sf_parents(id) on delete set null;

-- RLS: mirror brands — readable by any authenticated user, writable by staff.
alter table public.sf_parents enable row level security;

create policy sf_parents_select on public.sf_parents
  for select to authenticated using (true);
create policy sf_parents_write on public.sf_parents
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Seed the known parents (idempotent). Roots first, then their children.
insert into public.sf_parents (name) values
  ('CONV ALL Campaigns 2026'),
  ('Prop 28 2026')
on conflict (name) do nothing;

insert into public.sf_parents (name, parent_id)
select 'Conv Music Ed 2026', id from public.sf_parents where name = 'CONV ALL Campaigns 2026'
on conflict (name) do nothing;

insert into public.sf_parents (name, parent_id)
select 'Conv Performing Arts 2026', id from public.sf_parents where name = 'CONV ALL Campaigns 2026'
on conflict (name) do nothing;
