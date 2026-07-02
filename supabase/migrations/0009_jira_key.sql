-- 0009_jira_key.sql — Cycle 14: Jira sync idempotency.
-- Each deliverable_task can map to one Jira issue. The key lets "Send to Jira"
-- UPDATE the existing issue instead of creating a duplicate. Null = not synced.
alter table public.deliverable_tasks add column if not exists jira_key text;
