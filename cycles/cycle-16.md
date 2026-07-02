# Cycle 16 — Actionable Jira handoff (v1.8.0)

**Numbering:** the pasted spec called this "Cycle 15", but 15 was taken by admin
user management (v1.7.1), so this is **Cycle 16**. Version is **v1.8.0** as
specified.

**Goal:** Make every synced Jira issue self-sufficient for its assignee — (A)
role-scoped multi-line descriptions, (B) a preflight readiness check with
fix-in-place editing, (C) step-default assignees + a copy-approval watcher.

**Starting state:** end of Cycle 14 (`v1.7.0`) Jira sync. **No schema changes.**

## Delivered

- **A — role-scoped descriptions** (`jira.ts` `stepDescription`, pure & shared by
  CSV + live sync): comp = "Information for Design" (subject/segment/audience/LP/
  notes); code = "Information for Coding" (full UTM/SF code/SF id/LP/comp due/
  notes); send = "Information for Email Send" (send time/subject/SF campaign/
  lists one-per-line/combined reach/setup/notes). Empty lines omitted. Common
  footer: `Campaign: name (sf_code)` + `Tracker: {NEXT_PUBLIC_APP_URL}/?campaign=id`
  (Tracker omitted when the env is unset). `stepSummary` unchanged.
- **B — preflight readiness** (`jira.ts` `jiraReadiness`, pure): blockers
  (undated step → will skip; send with no lists; code UTM can't assemble) and
  warnings (no subject on comp/send; no landing on code; blank owner → default;
  unknown owner → unassigned). Surfaced in `JiraExportModal` above the preview
  (blockers red, warnings amber, grouped by deliverable; green "Ready — N will
  sync" when clean). **Fix-in-place:** each readiness row + each preview row
  opens `DeliverableModal` stacked over the export modal; on save the export
  modal stays open and readiness re-derives from fresh data. Manual **Re-check**.
  Blockers don't gate Send (unblocked steps still sync).
- **C — assignment** — `STEP_DEFAULT_OWNER` (comp Chris / code Adam / send Tami)
  fills a blank owner in both CSV and live sync. **Copy-approval watcher:**
  after comp create/update, `addWatcher` adds Whitney Winkels
  (`JIRA_WATCHER_COMP` accountId; unset = skip). Non-fatal — failures become
  `JiraSyncReport.warnings`, surfaced amber in the modal, never failing the issue.
- **Config:** `NEXT_PUBLIC_APP_URL` (Tracker deep link) + `JIRA_WATCHER_COMP`
  (`.env.example`, README).

## Verification

- `tsc` / lint / `next build` clean. `stepDescription`, `jiraReadiness`,
  `syncStepCount`, `STEP_DEFAULT_OWNER`, `knownOwner` are pure, exported, and used
  by both CSV and live-sync paths (no duplicated shaping in `actions.ts`).
- Live: multi-line description round-trips through Jira REST v2 (MARCOM-90, 5
  lines, newlines preserved); `addWatcher` adds Whitney to a comp issue
  (MARCOM-86 → 204, watcher present). Watcher failure path is caught → warning.

## Out of scope

Drift detection, bulk/initiative sync, comp→code→send issue links/epics, Jira
status pull-back, calendar UX items, an editable in-app assignee table
(`JIRA_ASSIGNEES` env override remains the mechanism).
