# Changelog

All notable changes to this project are documented here. This project follows
a cycle-based plan; see [`cycles/`](cycles/).

## Maintenance — 2026-07-02 — THSCA 2026 E3–PS3 load + Jira update sync

Data only (no version bump, no schema/app change). Reconciled the THSCA 2026
campaign to the E3–PS3 creative brief and pushed the comp/code/send chain to
Jira **without duplicating** existing MARCOM issues.

- **Campaign:** renamed to `THSCA 2026 — Email`, `utm_campaign_override` locked to
  `thsca2026` (supersedes the earlier `tx-athletics-2026` assumption — that slug
  belongs to the separate TX Athletics sequence).
- **Deliverables:** 5 existing reconciled **in place** (matched old→new
  `utm_content`, preserving `deliverable_tasks` + `jira_key`s): thsca-e3→E3,
  thsca-preshow→E4, thsca-midshow→E5, thsca-postshow1→PS1, thsca-postshow2→PS2.
  Added E1/E2 (status `sent`, `deliver_at` set, **no task rows** → never sync)
  and PS3. Owners: comp Chris Klett; code + send Tami Roberts.
- **Jira keys adopted:** 0 (nothing orphaned). **Retained:** MARCOM-87/88/90 (E3),
  93/98/107 (E4), 113/115/117 (E5/PS1/PS2 sends). **Created:** MARCOM-118–126
  (E5/PS1/PS2 comp+code, PS3 comp/code/send). Sync rerun = 0 created / 18 updated.
  Whitney Winkels added as watcher on comp issues.
- **Scripts:** `seed-thsca-e3-ps3.mjs` (CONFIRM=SEED), `adopt-thsca-jira-keys.mjs`
  (CONFIRM=ADOPT), `sync-thsca-jira.mjs` (CONFIRM=SYNC). Prop 28 untouched
  (verified by id diff).
- **Open (loaded as pending, not invented):** subject locks (Mark/Nick;
  Subject A loaded as proposed), landing-page URLs (Adam), E5 drawing-close time,
  PS1 winner name, parent rollup SF ID (Mark), list reaches, sweepstakes
  official-rules owner (blocks E3). Campaign-level note (copy approver **Nick
  Wobig**) has no `campaigns.notes` column — recorded here, not stored.

## [1.8.1] — 2026-07-02 — Deliverable SF auto-populate

- The deliverable editor now **auto-fills SF Campaign ID / Name from the parent
  campaign** when the deliverable has none (still editable), and shows the SF
  **lineage** (initiative rollup → campaign → this send). The SF *member code* is
  deliberately not inherited — a blank there is what lets `utm_campaign` fall back
  to the campaign's override.

## [1.8.0] — Cycle 16 — 2026-07-02 — Actionable Jira handoff

Every synced Jira issue is now self-sufficient for its assignee. No schema
changes. (Spec called this "Cycle 15"; renumbered to 16 — 15 was admin users.)

### Added / Changed

- **Role-scoped descriptions:** `stepDescription` now emits a multi-line block
  per step — Design / Coding / Email-send info cards in text — with a common
  footer (`Campaign …` + a `Tracker:` deep link when `NEXT_PUBLIC_APP_URL` is
  set). Shared byte-identically by CSV export and live sync.
- **Preflight readiness:** the export modal shows blockers (undated step → will
  skip; send with no lists; code UTM can't assemble) and warnings (missing
  subject / landing page; blank or unknown owner) grouped by deliverable, with
  **fix-in-place** — each row opens the deliverable editor stacked over the modal
  and re-checks on save. Blockers don't gate Send.
- **Step-default assignees:** blank owners fall back to comp → Chris Klett,
  code → Adam Bengtson, send → Tami Roberts (CSV + live sync).
- **Copy-approval watcher:** comp issues get Whitney Winkels as a watcher
  (`JIRA_WATCHER_COMP` accountId); non-fatal — failures surface as sync warnings.
- **Config:** `NEXT_PUBLIC_APP_URL`, `JIRA_WATCHER_COMP` (see `.env.example`).

## [1.7.1] — Cycle 15 — 2026-07-02 — Admin user management

The **Team** page can now **add people** to the calendar, not just edit roles.

### Added

- **Add a user** card (admin only): email + generated/editable initial password
  + role + financial toggle → creates the login immediately (no verification
  email) and shows the credentials to hand off.
- Per-user **reset password** and **remove** actions.
- `createUser` / `resetUserPassword` / `deleteUser` server actions (admin-gated),
  backed by a new `server-only` service-role admin client
  (`src/lib/supabase/admin.ts`) using the Supabase Auth Admin API.

## [1.7.0] — Cycle 14 — 2026-07-02 — Live Jira sync ("Send to Jira")

A campaign's deliverables can now be pushed to Jira as real comp/code/send
issues — **create or update**, idempotently — not just previewed + CSV-exported.

### Added

- **Schema** (`0009_jira_key.sql`): `deliverable_tasks.jira_key` (idempotency —
  update when present, create when absent). The 32 issues created earlier
  (MARCOM-86…117) were backfilled so the app updates rather than duplicates them.
- **`src/lib/jira-server.ts`** (`server-only`): Jira Cloud REST v2 client (Basic
  auth via API token), create/update, owner→accountId mapping.
- **`syncCampaignToJira(campaignId)`** server action (staff only): create-or-update
  each dated comp/code/send step, store keys, return created/updated/errors.
- **UI:** `JiraExportModal` gains a **Send to Jira** button (spinner → created/
  updated counts + clickable issue links); CSV is now secondary. Shown only when
  Jira is configured (`getHomeData.jiraConfigured`).
- **Config:** `JIRA_BASE_URL` / `JIRA_EMAIL` / `JIRA_API_TOKEN` / `JIRA_PROJECT_KEY`
  (server-only) + public `NEXT_PUBLIC_JIRA_BASE_URL` (see `.env.example`).

### Notes

Live sync needs a Jira API token in the app's server env (Vercel) — the button
hides and CSV still works until it's set. The live create/update path wasn't
executed from the app this cycle (no token in env); it mirrors the payloads that
succeeded in the earlier one-off run.

## [1.6.0] — Cycle 13 — 2026-07-01 — Deliverable dates on the calendar + July 2026 load

Deliverable **comp / code / send** dates now render on the calendar, campaigns
gain a `utm_campaign_override`, the assistant answers deliverable questions, and
the July 2026 Campaign Reference is loaded as the first real dataset (the
acceptance fixture). Built on the Cycle-12 deliverable model (`deliverable_tasks`
chain + `lists` catalog) — see [`cycles/cycle-13.md`](cycles/cycle-13.md).

### Added

- **Schema** (`0008_deliverable_july.sql`): `campaigns.utm_campaign_override`;
  `deliverables` gains `setup_date`, `send_time`, `status`, `notes` and a
  `'landing'` kind.
- **Calendar** renders deliverable **send** (filled brand), **comp** (amber
  dashed) and **code** (blue dashed) markers alongside campaign launch/comp. A
  five-way legend toggles each marker type (client-side). Clicking a deliverable
  marker opens the drawer focused on that deliverable.
- **UTM override + fallback:** `utm_campaign` = the deliverable's own SF code if
  it has one (Prop 28), else `campaign.utm_campaign_override`, else derive from
  the campaign SF code. Campaign form gains the optional override field.
- **Assistant** answers deliverable questions — `get_campaign` returns each
  deliverable (send date/time, comp→code→send chain, subject, segment, lists,
  own UTM); `list_upcoming_events` includes sends (type `send`). Still read-only.
- **July 2026 seed** (`scripts/seed-july-2026.mjs`, guarded `CONFIRM=SEED`,
  idempotent): 6 initiatives, 10 campaigns (4 landing, no dates → no events),
  11 email deliverables with their chains. **Prop 28 left untouched.**

### Notes / carried

`utm_campaign` slugs for TIM/TX/US athletics and the TX Summer Show brand
(Wenger) are assumptions pending confirmation; THSCA mid/post comp+code dates and
TXFN's 7 remaining sends are undated; initiative-level parent SF ids and
campaign-level window notes have no column and were not stored.

## [1.5.0] — Cycle 12 — 2026-07-01 — Deliverable tier

The third tier the app always deferred: **Initiative → Campaign → Deliverable.**
A campaign fans out to one or more **deliverables** (email/blog/social) — the
actual sends. Design source: `reference/wenger-initiative-campaign-mockup.html`.

### Added

- **Schema** (`0007_deliverables.sql`): `deliverables`, `deliverable_tasks`
  (comp→code→send chain), `lists` (27 seeded, staff-editable audience lists with
  stored reach), `deliverable_lists` join. RLS read = authed, write = staff.
- **Deliverable view** in the campaign drawer — expandable cards with the
  comp→code→send chain, **Email-send** / **Coding** role cards, audience-list
  chips with combined reach, and per-deliverable UTM copy. `DeliverableModal`
  for create/edit (kind, SF member code/id, `utm_content`, editable
  `utm_source`, subject, segment, landing page, PT send time, chain, lists).
- **Calendar** now shows deliverable **sends** (solid brand marker) alongside
  campaign launch/comp.
- **Jira export** (`lib/jira.ts` + `JiraExportModal`): each email deliverable →
  comp/code/send tasks with owner, due, and metadata; preview + CSV.
- **UTM (deliverable):** `utm_campaign` = deliverable SF member code,
  `utm_medium` from kind, `utm_source` stored/editable (`pardot`|`salesforce`,
  default pardot) — supersedes the campaign-level "SF identity → salesforce" rule
  for deliverables.

### Changed

- `getHomeData` joins deliverables (+ tasks + lists) under campaigns and loads
  the lists vocab. `CampaignWithEvents` gains `deliverables[]`.
- **Wave 7 re-modeled** from three flat campaigns into one `P28-W7` campaign +
  three email deliverables (`scripts/seed-prop28-wave7-deliverables.mjs`,
  idempotent). `campaigns.utm_content` **kept** (not dropped) — it still serves
  simple single-send campaigns; deliverables carry their own.

## Maintenance — 2026-07-01

- Reset calendar data (`campaigns_only`): cleared `campaigns`, `campaign_financials`,
  and `events` so it can be remade. `brands` and `initiatives` kept. Backup written
  under `backups/`; rerunnable guarded script at `scripts/reset-calendar.mjs`. No
  schema, RLS, or behavior changes.
- Seeded Prop 28 "Wave 7" — three Wenger campaigns (Elementary / Secondary /
  Purchasing) under the Prop 28 initiative, with Jul 15 launches + Jul 10
  comp-review markers. Idempotent (upsert on SF code) via
  `scripts/seed-prop28-wave7.mjs`. No schema/RLS/behavior changes.

## [1.4.0] — Cycle 11 — 2026-06-16 — AI assistant (read-only)

A conversational, read-only assistant over the live tracker data. An **Ask**
button in the app bar opens a chat panel; the user asks plain-language questions
("when's the next email for Prop 28?", "what's the UTM for …?", "what SF campaign
does X report into?") and the assistant answers from the data via tools. No
writes this cycle (conversational creation is Cycle 12); no schema/RLS changes.

**The one invariant:** the assistant's tools fetch **only** through the existing
role-aware data layer (`getHomeData`), bound to the caller's session — no
service-role key, no raw SQL, no new DB path — so it inherits financial gating
for free (an unentitled session's tool results carry no `leads`/`pipeline`; RLS
strips them before the model sees anything).

### Added

- Dependency `@anthropic-ai/sdk`; **server-only** `ANTHROPIC_API_KEY`
  (`.env.example` + README env table / go-live checklist). Never a
  `NEXT_PUBLIC_*` name; verified absent from the client bundle.
- `src/lib/assistant/model.ts` — single `ASSISTANT_MODEL` constant + loop bounds.
- `src/app/api/assistant/route.ts` — POST handler: authenticates via
  `getCurrentProfile` (no profile → **401**; missing key → 503), runs a bounded
  (≤ 6 iterations, capped `max_tokens`) Anthropic tool-use loop server-side
  against the role-aware snapshot, and streams the final text back. Conversation
  state is client-side (no persistence).
- `src/lib/assistant/tools.ts` — read-only tools over one `getHomeData`
  snapshot: `get_overview`, `search_campaigns`, `get_campaign` (facts + SF parent
  chain via `sfParentChain` + live `assembleUtm`), `get_initiative` (rollup +
  children), `list_upcoming_events`. `leads`/`pipeline` are included **only when
  entitled** (absent otherwise — RLS, not a client mask).
- `src/lib/assistant/system.ts` — server-dated system prompt: brand vocabulary +
  routing hints; answer only from tool results; never invent codes/dates/UTMs/
  numbers; read-only.
- `src/components/assistant/AssistantPanel.tsx` — slide-in chat panel (drawer
  styling language) opened from the app-bar **Ask** button; streaming render,
  busy/error states; IBM Plex Mono for echoed UTMs/codes. Available to all
  authenticated roles (external users get scrubbed answers).

### Changed

- `middleware` now returns a JSON **401** for unauthenticated `/api/*` requests
  (instead of redirecting to the `/login` HTML page), so fetch clients — and the
  `/api/assistant` 401 acceptance check — behave correctly. Page redirects are
  unchanged.

## [1.3.0] — Cycle 10 — 2026-06-08 — Salesforce reporting parents

Campaigns can reference a Salesforce rollup parent; the app stays two-level and
Salesforce does the rollup. (Spec'd as "Cycle 8 / 1.1.0" against the v1.0.0
state; renumbered — SF Campaign ID/Name already landed in Cycle 9, so this
cycle adds only the parent reference + lookup + chain/CSV.)

### Added

- `sf_parents` lookup (self-referential chain) + RLS (`0006_sf_parents.sql`):
  readable by any authenticated user, writable by staff; seeded `CONV ALL
  Campaigns 2026` → `Conv Music Ed 2026` / `Conv Performing Arts 2026`, and
  `Prop 28 2026`.
- `campaigns.sf_parent_id` (FK → `sf_parents`, ON DELETE SET NULL).
- `src/lib/sf.ts` — `sfParentChain` (leaf→root) and `wouldCycle` guard.
- Server actions `createSfParent` / `updateSfParent` (cycle-guarded) /
  `deleteSfParent`; `createCampaign` / `updateCampaign` persist `sf_parent_id`.
- Campaign modal: **SF Parent** select (+ **New parent** via `SfParentModal`)
  with a `leaf → root` chain preview.
- Drawer: SF parent chain in the campaign facts.
- **Salesforce import CSV** export (Data menu) — campaigns + the deduped parent
  chain (`Name`, `Parent Campaign` by name, `Type`, `Status`).

### Changed

- XLSX Campaigns sheet carries **SF Parent** (name) in Full + JMC.
- Importer reads the SF Parent column; resolves/creates the parent by name
  (as a root). Still additive/idempotent.

## [1.2.0] — Cycle 9 — 2026-06-08 — Salesforce campaign fields + source rule

Capture a campaign's real Salesforce identity and force `utm_source =
salesforce` when present.

### Added

- **Schema** (`0005_sf_fields.sql`): `sf_id` and `sf_name` on `campaigns`
  (nullable, metadata only — not part of the UTM string). `sf_code` unchanged
  (still `utm_campaign`).
- **Source rule** (`resolveSource` in `utm.ts`): `utm_source = "salesforce"` if
  any of `sf_code`/`sf_id`/`sf_name` is non-empty; otherwise the existing
  vendor/channel derivation. Enforced in both the modal preview and the server
  action via one shared resolver (no client/server drift).
- **CampaignModal:** SF Campaign ID + Name inputs grouped with the SF code; the
  live UTM preview flips to `salesforce` as soon as any SF field is filled and
  reverts when all are cleared (with a "source = salesforce" badge).
- **DetailDrawer:** SF ID + Name surfaced in the campaign facts (when present).
- **Round-trip:** export adds **SF ID** / **SF Name** columns; import reads them
  (campaigns still match by `sf_code`). Additive/idempotent — no duplicates.
- Types: `sf_id`/`sf_name` added to `Campaign`, `CampaignInput`, and the import
  payload.

## [1.1.0] — Cycle 8 — 2026-06-08 — Theming & branding

A real light/dark theme, fixed text contrast, and Wenger branding.

### Added

- **Light/dark theming.** A lightweight `ThemeProvider` (no `next-themes`)
  toggles `class="dark"` on `<html>`, persists to `localStorage`, and defaults
  to `prefers-color-scheme`. An **inline no-flash script** in `layout.tsx` sets
  the theme before first paint. A sun/moon `ThemeToggle` sits in the app bar and
  on login.
- **Theme-reactive palette.** The custom palette moved to CSS variables in
  `:root` / `.dark` (canvas, surface, ink + text grays, hair/line/cell, …),
  surfaced as `@theme inline` tokens — so the **whole** app re-skins in dark
  mode, not just shadcn chrome.
- **Branding.** Wenger logos in `public/brand/` (`logo-lt`/`logo-dk`/`mark`);
  the app bar swaps the logo by theme; favicon/metadata point at `mark.png`.
- **Login rebrand.** Dark navy radial gradient, `logo-dk`, a glass card, and
  light, legible text.

### Fixed

- **Washed-out text.** Resolved the duplicate `--color-muted` (the warm-gray
  text token was shadowed by shadcn's near-white `muted`); renamed it to
  `--color-ink-muted` and migrated `text-muted` usages. shadcn `bg-muted` /
  `muted-foreground` left intact for the UI primitives.
- **Contrast.** Darkened `faint`, `muted2`, and the renamed muted to pass
  **WCAG AA (≥4.5:1)** on the canvas in both themes (verified: light 4.6–8.5:1,
  dark 5.2–12:1).

## 1.0.0 — Cycle 7: Production deploy + hardening

The v1.0 release — the Excel replacement, hardened for production.

### Added

- **Security headers + CSP** (`next.config.ts`): HSTS, `X-Content-Type-Options:
  nosniff`, `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'`,
  `Referrer-Policy`, `Permissions-Policy`, and a Content-Security-Policy
  allowing `self`, the Supabase origin (REST + realtime), and Google Fonts.
- **Error handling:** `app/error.tsx` (global boundary, no detail leaks),
  `app/not-found.tsx` (404), and `app/loading.tsx`.
- **Docs:** README deployment section + go-live checklist; dependency-hardening
  notes (SheetJS CDN rationale; the Next/postcss audit advisory, tracked).

### Hardening / ops

- Pre-deploy audit: clean-install build confirms the SheetJS CDN tarball
  resolves; `SUPABASE_SERVICE_ROLE_KEY` confirmed absent from `src/` (the app
  runs on the anon key + cookies + RLS) and from git history; `.env.local`
  gitignored and untracked.
- Mark Mireles bootstrapped as `admin` (full financials + role management).

### Operational steps (require dashboard access — see go-live checklist)

- Vercel project connect + env vars + deploy/promote; Supabase Site URL /
  redirect URLs + signup-off; remove throwaway test accounts; scheduled
  backups; production per-role verification.

## 0.6.0 — Cycle 6: XLSX export / import

Round-trip the data to and from a `.xlsx` workbook (SheetJS) for the existing
spreadsheet workflow.

### Added

- **XLSX helpers:** `xlsx` dependency (SheetJS); `src/lib/xlsx-export.ts`
  (build a multi-sheet workbook client-side) and `src/lib/xlsx-import.ts`
  (parse + validate + diff an uploaded workbook — no writes).
- **Export** — Initiatives / Campaigns / Events sheets; Campaigns carries the
  assembled UTM (computed at export, never stored) and `Leads`/`Pipeline` only
  when entitled. Filename `wenger-content-tracker_YYYY-MM-DD.xlsx`. Two modes:
  **Full** (financials when entitled) and **JMC view** (financials omitted).
- **Export UI** — a **Data** menu in the app bar (Full export / JMC view);
  client-side build → download, no server round-trip.
- **Import (admin)** — a file picker that parses client-side, validates the
  sheets/columns, and shows an add/update **preview** before anything is
  written; an admin-only `importWorkbook` Server Action upserts brands (by
  label/id), initiatives (by name), campaigns (by SF code), events (by
  campaign+type+date), and financials when present. Additive/update-only — no
  deletes — and idempotent. Returns a report of applied + skipped/failed rows.
- `ImportPayload` and `ImportReport` types.

### Security / safety

- SheetJS runs client-side; persistence still flows through role-checked Server
  Actions, so RLS applies (import rejects non-admins; financial writes are
  admin-only). A non-entitled user's export can't contain dollars because the
  data isn't in their session.

## 0.5.0 — Cycle 5: Auth + RLS financial gating

Real authentication and server-enforced financial access control.

### Added

- **Profiles + roles** (`0002_auth.sql`): `profiles` (role `admin`/`member`/
  `external` + `can_see_financials`), a trigger that auto-creates a profile per
  `auth.users`, and SECURITY DEFINER helpers (`is_admin`, `is_staff`,
  `has_financial_access`).
- **Financials boundary** (`0003_financials.sql`): `leads`/`pipeline` moved off
  `campaigns` into a separate `campaign_financials` table (seed values migrated;
  a trigger auto-creates a 0/0 row per new campaign).
- **RLS** (`0003` + `0004_rls.sql`) on every table: content readable by any
  authenticated user, writes for staff; `campaign_financials` SELECT only with
  financial access, writes admin-only; `profiles` self-read + admin-manage;
  anonymous denied.
- **Auth flow** (`@supabase/ssr`): `middleware.ts` refreshes the session and
  redirects unauthenticated users to `/login`; a `/login` page and a `signOut`
  action. Public signup disabled (invite + SQL bootstrap).
- **Auth helpers** (`src/lib/auth.ts`): `getCurrentProfile`, `requireStaff`,
  `requireAdmin`, `entitledToFinancials`.
- **Admin Team view** (`/team`, admin-only): set roles + toggle
  `can_see_financials` via admin-only Server Actions.

### Changed

- `getHomeData()` is role-aware: content for everyone; financials fetched +
  merged only when entitled (RLS denies the rows otherwise). The hardcoded
  `canSeeFinancials` is replaced by the session-derived value.
- App bar shows the real user + role + sign-out (and a Team link for admins),
  replacing the prototype's fake switcher. Write affordances (+buttons, drawer
  edit/delete) are hidden for `external`.
- Every mutating Server Action now verifies the caller's role server-side
  (staff for content; admin for role changes) — defense in depth atop RLS.
- `Role` type is now `admin`/`member`/`external`; `Profile` type added.

### Security

Financial data is absent from the server response for unentitled callers — RLS
SELECT denies it, verified with real per-role sessions (member without the flag
and external both receive zero financial rows; granting the flag makes them
appear).

## 0.4.0 — Cycle 4: CRUD + searchable pickers + orphan adoption + global search

The read-only home screen becomes a working editor, persisted to Supabase.

### Added

- **Server Actions** (`src/lib/actions.ts`): `createBrand`/`updateBrand`/
  `deleteBrand` (delete refuses if any campaign uses the brand),
  `createInitiative`/`updateInitiative`/`deleteInitiative` (delete relies on
  `ON DELETE SET NULL` → campaigns become orphans), `createCampaign`/
  `updateCampaign`/`deleteCampaign`, and `adoptCampaigns`. Each validates
  required fields and `revalidatePath('/')`.
- **Modals** (`src/components/modals/`, shadcn `Dialog`):
  - `BrandModal` — add a brand (color → derived tint/text) with live preview;
    delete existing (disabled + reason when in use).
  - `InitiativeModal` — add/edit (name/owner/status), members list, and a
    campaign adopt search (orphans first, widening on query). On save,
    `adoptCampaigns` reparents the queued campaigns.
  - `CampaignModal` — searchable initiative picker, brand select, fields, a live
    UTM preview (source/medium from vendor/channel, campaign = SF code), and on
    create a launch date + auto comp-due (launch − 10d, toggle to manual) that
    seed events. Edit is metadata-only; existing events are untouched.
- **Drawer write affordances:** edit + delete buttons in both drawer modes.
- **Orphan surfacing:** `OrphanBar` on the home screen lists unassigned
  campaigns and opens each for adoption.
- **Global search:** `GlobalSearch` over initiatives + campaigns — filters the
  cards (initiative stays if a child matches) and surfaces matching campaigns in
  a results strip (click → open the campaign drawer), with clear + count.
- **New-entry points:** "+ Initiative" / "+ Campaign" in the initiatives header;
  "+ Brand" in the legend.
- `CampaignInput` type; `SWATCHES` (brands.ts) and `CHANNELS` (utm.ts).

### Changed

- Writes use Server Actions + `router.refresh()`; client state (open modal,
  `selected`, search query) stays client-side.
- `InitiativeCards` now renders a passed-in (filtered) list; the section header
  moved to `CalendarHome` to host the +buttons, search, and orphan bar.
- Financials still render for everyone behind `canSeeFinancials` (Cycle 5).

## 0.3.0 — Cycle 3: Initiative cards + detail drawer

The home screen becomes navigable: initiative cards under the calendar and a
clickable detail drawer. Read-only — no CRUD yet.

### Added

- **Rollups:** `src/lib/rollups.ts` — pure `rollup(initiativeId, campaigns,
  today)` → `{ brands, progress, sent, total, next, leads, pipeline, count }`,
  plus `initiativesByUrgency()` (nearest upcoming milestone first). `today` is
  injected so callers stay deterministic.
- **Formatters:** `src/lib/format.ts` — `fmtMoney`, `initials`.
- **Initiative cards** (`src/components/initiative/`): `InitiativeCards` +
  `InitiativeCard`, under the calendar, sorted by urgency. Co-brand aware (split
  accent bar + multiple dots); shows status, brand-colored progress, next
  milestone, "X of N sent", leads + pipeline, owner initials. Clicking opens the
  initiative drawer.
- **Detail drawer** (`src/components/drawer/DetailDrawer.tsx`): slide-in panel,
  two modes. Initiative mode → brand/co-brand header, status, owner, progress,
  financials, child campaign list. Campaign mode → breadcrumb to parent, facts
  (channel/vendor/segment/owner/SF code), financials, sorted event timeline, and
  the auto-assembled UTM string (via `assembleUtm`, never stored) with a copy
  button. Closes on scrim click, X, and Esc.
- **Clickability:** `EventChip` and `DayView` rows open the drawer in campaign
  mode. Shared `selected` state lifted to `CalendarHome`.

### Changed

- **Data layer:** `getCalendarData()` → `getHomeData()` returning
  `{ brands, initiatives, campaigns }` with each campaign carrying full detail +
  nested `events`. The calendar flattens `campaigns → events` client-side
  (identical calendar behavior).
- `today` is now server-provided (`todayKey` prop) for deterministic SSR,
  replacing the Cycle 2 post-mount effect.
- Financials render for everyone behind a single `canSeeFinancials` flag
  (hardcoded `true`) — Cycle 5 wires it to RLS.
- `CampaignWithEvents`, `EventLite`, and `Selected` types added.

## 0.2.0 — Cycle 2: Calendar home

The calendar-first home screen, driven by live Supabase data.

### Added

- **Data access:** `src/lib/queries.ts` — `getCalendarData()` returns
  `{ brands, events }`, with each event flattened from the events → campaigns →
  brands join (`{ id, date, type, label, brandId, campaignId, campaignName }`).
- **Home:** `app/page.tsx` (server) fetches calendar data and renders the client
  `<CalendarHome>`; all interactivity is client-side.
- **Calendar components** under `src/components/calendar/`:
  - `CalendarHome` — owns `view` (month/week/day, default month), `cursor`, and
    `hiddenBrands`; builds the by-day event map; renders app bar, toolbar,
    legend, and the active view.
  - `Toolbar` — period title, prev/next, Today, Day/Week/Month segmented control.
  - `BrandLegend` — per-brand toggle chips + launch/comp-due key.
  - `MonthView` — 6-week Sunday-start grid, dimmed out-of-month days, today
    outline, up to 3 chips per cell + "+N more".
  - `WeekView` — 7 columns for the cursor's week.
  - `DayView` — agenda list with a friendly empty state.
  - `EventChip` — brand-tinted; launch filled, comp-due dashed (display-only).
- **Calendar logic:** grid math + day keys added to `src/lib/dates.ts`
  (`startOfWeek`, `monthGridDays`, `weekDays`). `cursor` defaults to June 2026;
  Today jumps to the real current month; the today-outline uses the real date.
- **Theme tokens:** prototype neutral palette (canvas, navy, hairlines) added to
  `@theme` in `globals.css`. Brand colors remain inline (data, not classes).
- `CalendarEvent` type added to `src/lib/types.ts`.

### Changed

- `/` now renders the calendar home, replacing the Cycle 1 proof-of-wiring page.
- `CLAUDE.md` stack line corrected to "Next.js 16 (App Router) + Tailwind v4".
- README documents the calendar home and how to view it.

## 0.1.0 — Cycle 1: Foundation

The stack, data model, seed, and a proof-of-wiring home page.

### Added

- **Scaffold:** Next.js 16 (App Router, TypeScript, Tailwind v4, ESLint,
  `src/` dir, `@/*` import alias).
- **shadcn/ui** (neutral base, Radix primitives): `button`, `dialog`, `input`,
  `select`, `badge`, `scroll-area`.
- **Fonts:** Hanken Grotesk (default UI) and IBM Plex Mono (code/dates) via
  `next/font/google`, exposed as `--font-sans` / `--font-mono`.
- **Tokens & helpers** ported from `reference/ContentTracker.jsx`:
  - `src/lib/brands.ts` — 7 brands (incl. Lutefish in teal) with `tintOf`/
    `textOf` derive helpers and the status color map.
  - `src/lib/utm.ts` — `deriveSource`, `deriveMedium`, `assembleUtm`.
  - `src/lib/dates.ts` — date key/parse/format helpers.
- **Types:** `src/lib/types.ts` — `Brand`, `Initiative`, `Campaign`,
  `CampaignEvent`, `Role`.
- **Database:** `supabase/migrations/0001_init.sql` — `brands`, `initiatives`,
  `campaigns`, `events`. `campaigns.initiative_id` is `ON DELETE SET NULL`
  (orphan-safe); `events.campaign_id` is `ON DELETE CASCADE`. RLS deferred to
  Cycle 5.
- **Seed:** `supabase/seed.sql` (generated by `scripts/gen-seed.mjs`) — 7
  brands, 7 initiatives, 8 campaigns, 28 events, mirroring the prototype.
- **Supabase clients:** `src/lib/supabase/server.ts` and `client.ts`, plus
  `.env.example`.
- **Home page** (`/`): server component that fetches brands, initiatives, and
  campaigns live from Supabase and renders counts plus an initiative table with
  campaign counts and brand dots.
- **Docs:** README (overview, stack, setup) and this CHANGELOG.

### Out of scope (later cycles)

Calendar UI, initiative cards, detail drawer, CRUD modals, searchable pickers,
orphan-adoption UI, global search, Auth, RLS gating, XLSX export/import, Vercel
deploy.
