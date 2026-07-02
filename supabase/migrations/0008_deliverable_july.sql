-- 0008_deliverable_july.sql — Cycle 13: calendar dates + July 2026 load prep.
--
-- Additive reconciliation with the Cycle 12 deliverable tier (deliverable_tasks
-- chain + lists catalog stay canonical — see cycles/cycle-13.md). This migration
-- only adds the fields the July dataset needs plus the per-campaign UTM override.

-- Per-campaign utm_campaign override. When set, utm_campaign uses this slug;
-- otherwise it derives from the SF code (canon default). A deliverable that
-- carries its own SF code still overrides at the deliverable level (Prop 28).
alter table public.campaigns add column if not exists utm_campaign_override text;

-- Deliverable fields the July load needs that Cycle 12 didn't have.
alter table public.deliverables add column if not exists setup_date date;
alter table public.deliverables add column if not exists send_time text;   -- display echo (e.g. "10:00 AM PT")
alter table public.deliverables add column if not exists status text;
alter table public.deliverables add column if not exists notes text;

-- Allow the 'landing' kind (landing pages carry SF ids for reporting/UTM but
-- have no dates, so they never produce calendar events).
alter table public.deliverables drop constraint if exists deliverables_kind_check;
alter table public.deliverables
  add constraint deliverables_kind_check
  check (kind in ('email', 'landing', 'social', 'blog'));
