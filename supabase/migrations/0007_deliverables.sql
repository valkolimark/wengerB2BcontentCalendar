-- 0007_deliverables.sql — Cycle 12: the deliverable tier.
-- The app becomes three-level: Initiative → Campaign → Deliverable. A campaign
-- fans out to one or more deliverables (the actual sends/assets). Each email
-- deliverable carries its own SF member code + id, utm_content, a comp→code→send
-- hand-off chain, and one-or-more audience lists (summed reach).
--
-- Design source of truth: reference/wenger-initiative-campaign-mockup.html.
--
-- ADDITIVE ONLY. This migration does not drop campaigns.utm_content — that
-- column stays until the app stops reading it, then a follow-up migration drops
-- it (see cycle-12.md). RLS mirrors the Cycle 5 pattern: read = any
-- authenticated user, write = staff (public.is_staff()).

-- Deliverables: the send/asset. utm_campaign derives from sf_code (the SF member
-- code); utm_content is the deliverable-level UTM. utm_source is stored + editable
-- (default 'pardot'; 'salesforce' also allowed). Medium derives from kind app-side.
create table public.deliverables (
  id            uuid primary key default gen_random_uuid(),
  campaign_id   uuid references public.campaigns(id) on delete cascade,
  kind          text not null check (kind in ('email', 'blog', 'social')),
  name          text not null,
  sf_code       text,
  sf_id         text,
  sf_name       text,
  utm_content   text,
  utm_source    text not null default 'pardot' check (utm_source in ('pardot', 'salesforce')),
  email_subject text,
  segment       text,
  landing_page  text,
  deliver_at    timestamptz,
  sort          int not null default 0,
  created_at    timestamptz not null default now()
);

-- The comp → code → send hand-off chain, one row per step per deliverable.
create table public.deliverable_tasks (
  id             uuid primary key default gen_random_uuid(),
  deliverable_id uuid references public.deliverables(id) on delete cascade,
  kind           text not null check (kind in ('comp', 'code', 'send')),
  due            date,
  owner          text,
  unique (deliverable_id, kind)
);

-- Audience lists — a staff-editable controlled vocabulary with stored reach.
-- Seeded below from the prototype's list dictionary; corrections happen in-app.
create table public.lists (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  reach      int not null default 0,
  region     text,
  created_at timestamptz not null default now()
);

-- Many-to-many: a deliverable can target several lists; combined reach is summed.
create table public.deliverable_lists (
  deliverable_id uuid references public.deliverables(id) on delete cascade,
  list_id        uuid references public.lists(id) on delete cascade,
  primary key (deliverable_id, list_id)
);

create index deliverables_campaign_id_idx on public.deliverables (campaign_id);
create index deliverable_tasks_deliverable_id_idx on public.deliverable_tasks (deliverable_id);
create index deliverable_lists_list_id_idx on public.deliverable_lists (list_id);

-- RLS: read = authenticated, write = staff. No financial columns live here.
alter table public.deliverables enable row level security;
alter table public.deliverable_tasks enable row level security;
alter table public.lists enable row level security;
alter table public.deliverable_lists enable row level security;

create policy deliverables_select on public.deliverables
  for select to authenticated using (true);
create policy deliverables_write on public.deliverables
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy deliverable_tasks_select on public.deliverable_tasks
  for select to authenticated using (true);
create policy deliverable_tasks_write on public.deliverable_tasks
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy lists_select on public.lists
  for select to authenticated using (true);
create policy lists_write on public.lists
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy deliverable_lists_select on public.deliverable_lists
  for select to authenticated using (true);
create policy deliverable_lists_write on public.deliverable_lists
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Seed the audience lists (idempotent). Reach is a stored snapshot, editable.
insert into public.lists (name, reach, region) values
  ('Creative Conners List_2026', 6724, 'National'),
  ('AIA Conference on Architecture & Design 2025', 9414, 'National'),
  ('Architect List_5-2024', 30726, 'National'),
  ('College-Univ Presidents/Deans/Decision Makers_8-2025', 5461, 'National'),
  ('Rental - Event List_2-2026', 2414, 'National'),
  ('Hospitality List_5-2024', 960, 'National'),
  ('Worship List_4-2025', 1878, 'National'),
  ('Elementary_Music Teachers_8-2025', 36548, 'National'),
  ('Middle School_Music Teachers_8-2025', 12226, 'National'),
  ('Secondary Music_Teachers_8-2025', 18623, 'National'),
  ('K-12_Music Teachers_6-2026', 24742, 'National'),
  ('K-12_School Principals_8-2025', 80194, 'National'),
  ('K-12_District Superintendents-Purchasing_8-2025', 20060, 'National'),
  ('K-12_Building-Grounds Directors_8-2025', 9630, 'National'),
  ('K-12_Fine Arts Directors & Chairperson_8-2025', 3421, 'National'),
  ('K-12_Drama Teachers_8-2025', 11956, 'National'),
  ('K-12_Dance & Fine Arts Teachers_8-2025', 27885, 'National'),
  ('K-12_ALL Athletic List_Coach-Director-Trainers_6-2026', 125743, 'National'),
  ('K-12_Football Coach-Director-Trainers_8-2025', 57592, 'National'),
  ('K-12_Football Coach-Director-Trainers_ExcludingTX', 47627, 'National'),
  ('CA List_6-12 Arts Educators_2026', 8093, 'California'),
  ('CA List_K-5 Arts Educators_2026', 5327, 'California'),
  ('CA List_K-12 School Leadership_Pur_2026', 16320, 'California'),
  ('CA List_K-12 Theatre Contacts_2026', 2083, 'California'),
  ('TX List_K-12 Athletics-Coaches-Directors-Trainer_6-2026', 1939, 'Texas'),
  ('TX List_K-12 School Principals_6-2026', 6982, 'Texas'),
  ('TX List_K-12 District Superintendents-Purchasing_8-2025', 1596, 'Texas')
on conflict (name) do nothing;
