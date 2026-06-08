-- 0001_init.sql — Cycle 1 schema for the Wenger B2B content calendar.
--
-- RLS: deferred to Cycle 5. No row-level security is enabled in this cycle;
-- Auth + RLS gating arrives later. Do not rely on this schema for access
-- control yet.

-- gen_random_uuid() lives in pgcrypto (already present on Supabase, but keep
-- this explicit so the migration is self-contained).
create extension if not exists pgcrypto;

-- Brands are a small, stable lookup keyed by a human-readable text id.
create table brands (
  id    text primary key,
  label text not null,
  dot   text not null,
  tint  text not null,
  text  text not null
);

-- Initiatives are brand-agnostic: brands are derived from their campaigns.
create table initiatives (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  owner      text not null default 'Unassigned',
  status     text not null default 'Planning',
  created_at timestamptz not null default now()
);

-- Campaigns carry the brand and all UTM/SF metadata.
-- initiative_id is ON DELETE SET NULL so deleting an initiative surfaces its
-- campaigns as orphans (adoptable later) rather than silently losing them.
create table campaigns (
  id            uuid primary key default gen_random_uuid(),
  initiative_id uuid references initiatives(id) on delete set null,
  brand_id      text references brands(id),
  name          text not null,
  channel       text,
  vendor        text,
  segment       text,
  owner         text,
  sf_code       text,
  utm_source    text,
  utm_medium    text,
  utm_content   text,
  leads         int not null default 0,
  pipeline      int not null default 0
);

-- Events are launches and comp-due markers on a campaign's timeline.
-- ON DELETE CASCADE: deleting a campaign removes its events.
create table events (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  type        text check (type in ('launch', 'comp')),
  date        date,
  label       text
);

-- Helpful indexes for the foreign-key lookups the app relies on.
create index campaigns_initiative_id_idx on campaigns (initiative_id);
create index campaigns_brand_id_idx on campaigns (brand_id);
create index events_campaign_id_idx on events (campaign_id);
