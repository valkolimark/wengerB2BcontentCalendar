-- 0003_financials.sql — split financials into an RLS-gated table.
-- leads/pipeline move off `campaigns` (which everyone may read) into
-- `campaign_financials`, so the numbers are a separate resource the RLS SELECT
-- can deny outright. Cycle 5.

create table public.campaign_financials (
  campaign_id uuid primary key references public.campaigns(id) on delete cascade,
  leads int not null default 0,
  pipeline int not null default 0
);

-- Migrate existing seed values across before dropping the columns.
insert into public.campaign_financials (campaign_id, leads, pipeline)
select id, leads, pipeline from public.campaigns
on conflict (campaign_id) do nothing;

alter table public.campaigns drop column leads;
alter table public.campaigns drop column pipeline;

-- Every new campaign gets a 0/0 financials row. SECURITY DEFINER so staff who
-- aren't financial writers can still create campaigns without an RLS failure.
create or replace function public.handle_new_campaign()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.campaign_financials (campaign_id) values (new.id)
  on conflict (campaign_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_campaign_created on public.campaigns;
create trigger on_campaign_created
  after insert on public.campaigns
  for each row execute function public.handle_new_campaign();

-- RLS: SELECT only with financial access (admin OR can_see_financials);
-- writes admin only.
alter table public.campaign_financials enable row level security;

create policy fin_select on public.campaign_financials
  for select to authenticated
  using (public.has_financial_access());

create policy fin_admin_write on public.campaign_financials
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
