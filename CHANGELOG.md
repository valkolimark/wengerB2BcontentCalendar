# Changelog

All notable changes to this project are documented here. This project follows
a cycle-based plan; see [`cycles/`](cycles/).

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
