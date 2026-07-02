-- 0010_initiative_sf.sql — Salesforce campaigns defined at the initiative level.
-- An initiative carries its SF **parent** (rollup) campaign and a **child**
-- campaign per channel (email / landing / social) — each with a name, SF id, and
-- code. Deliverables prepopulate their SF fields from the child matching their
-- kind, so SF identity is entered once per initiative, not per send.

create table public.initiative_sf_campaigns (
  initiative_id uuid not null references public.initiatives(id) on delete cascade,
  role          text not null check (role in ('parent', 'email', 'landing', 'social')),
  name          text,
  sf_id         text,
  sf_code       text,
  primary key (initiative_id, role)
);

-- RLS: readable by any authenticated user, writable by staff (mirrors content).
alter table public.initiative_sf_campaigns enable row level security;
create policy isf_select on public.initiative_sf_campaigns
  for select to authenticated using (true);
create policy isf_write on public.initiative_sf_campaigns
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
