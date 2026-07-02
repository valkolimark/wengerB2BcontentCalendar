# Cycle 14 — Live Jira sync ("Send to Jira") (v1.7.0)

**Goal:** From a campaign, push its deliverables' comp → code → send steps to Jira
as real issues — **create or update**, idempotently — instead of only previewing
+ exporting CSV.

**Starting state:** end of Cycle 13 (`v1.6.0`). Builds on the deliverable tier
(`deliverable_tasks` chain) and the existing `JiraExportModal` (preview + CSV).

## Delivered

1. **Schema — `0009_jira_key.sql`:** `deliverable_tasks.jira_key`. Null = not yet
   synced; set = the Jira issue this step maps to. This is the idempotency key —
   present → **update**, absent → **create**. Backfilled the 32 issues created
   manually earlier (MARCOM-86…117) by `(utm_content, kind)` so the app updates
   them rather than duplicating.
2. **Jira client — `src/lib/jira-server.ts`** (`server-only`): reads
   `JIRA_BASE_URL` / `JIRA_EMAIL` / `JIRA_API_TOKEN` / `JIRA_PROJECT_KEY`; Basic
   auth; REST **v2** (plain-text descriptions). `createIssue` / `updateIssue`
   (404 on update → recreate), owner→accountId map (`JIRA_ASSIGNEES` override),
   `jiraConfigured()`.
3. **Shared shaping — `src/lib/jira.ts`:** extracted `stepSummary` /
   `stepDescription` so the CSV export and the live sync emit identical
   summaries/descriptions.
4. **Action — `syncCampaignToJira(campaignId)`** (staff only): loads the
   campaign's email deliverables + dated tasks, create-or-updates each by
   `jira_key`, stores new keys, returns `{created, updated, skipped, errors,
   issues[]}`. Undated steps are skipped (not scheduled work).
5. **UI:** `JiraExportModal` gains a **Send to Jira** primary action (spinner →
   created/updated counts + clickable issue chips + per-row errors); **CSV** is
   now secondary. The button shows only when `jiraConfigured` (surfaced via
   `getHomeData`); otherwise a hint explains how to enable it. Reached from the
   campaign drawer's **Jira** button.

## Auth / setup (required for live sync)

The deployed app needs its **own** Jira credentials (the MCP path used for the
one-off backfill is not available at runtime). Create an API token, then set
`JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_PROJECT_KEY` (+ public
`NEXT_PUBLIC_JIRA_BASE_URL`) in `.env.local` and in Vercel. Until then the button
is hidden and CSV export still works. Assignees default to Chris Klett / Adam
Bengtson / Tami Roberts.

## Verification

- `tsc` / lint / `next build` clean. `server-only` guards the token module.
- Migration + backfill applied; all 32 existing tasks carry their `jira_key`
  (0 nulls), so a first "Send to Jira" **updates** them, not duplicates.
- Live create/update path was **not** executed from the app (needs the token in
  env) — logic mirrors the payloads that succeeded via the earlier one-off run.

## Out of scope

Webhooks / two-way sync from Jira; transitioning issue status; grouping issues
under an epic/parent; wiring create-on-campaign-create (a new campaign has no
deliverables yet — sync from the drawer once deliverables exist).
