-- 0005_sf_fields.sql — Salesforce campaign identity on campaigns.
-- sf_id + sf_name are metadata only; they do NOT enter the UTM string. sf_code
-- is unchanged and remains the utm_campaign value. When any SF field is present,
-- the app forces utm_source = 'salesforce' (enforced in the server action).
-- Cycle 9.

alter table public.campaigns add column sf_id text;
alter table public.campaigns add column sf_name text;
