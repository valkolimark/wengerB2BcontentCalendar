# Changelog

All notable changes to this project are documented here. This project follows
a cycle-based plan; see [`cycles/`](cycles/).

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
