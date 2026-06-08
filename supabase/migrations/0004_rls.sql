-- 0004_rls.sql — RLS for the content tables.
-- SELECT for any authenticated user (incl. external); INSERT/UPDATE/DELETE for
-- staff (admin or member) only. Anonymous (no session) matches no policy and is
-- denied. Cycle 5.

alter table public.brands enable row level security;
alter table public.initiatives enable row level security;
alter table public.campaigns enable row level security;
alter table public.events enable row level security;

-- brands
create policy brands_select on public.brands
  for select to authenticated using (true);
create policy brands_write on public.brands
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- initiatives
create policy initiatives_select on public.initiatives
  for select to authenticated using (true);
create policy initiatives_write on public.initiatives
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- campaigns
create policy campaigns_select on public.campaigns
  for select to authenticated using (true);
create policy campaigns_write on public.campaigns
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- events
create policy events_select on public.events
  for select to authenticated using (true);
create policy events_write on public.events
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
