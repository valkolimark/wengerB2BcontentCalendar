# Wenger B2B Content Calendar

A content calendar and campaign tracker for Wenger's B2B brands — initiatives,
campaigns, launch/comp timelines, derived UTM strings, and lead/pipeline
rollups. Built from the prototype at [`reference/ContentTracker.jsx`](reference/ContentTracker.jsx),
which is the UX source of truth.

## Stack

- **Next.js 16** (App Router, TypeScript, `src/` dir, `@/*` import alias)
- **Tailwind CSS v4** + **shadcn/ui** (neutral base, Radix primitives)
- **Supabase** (Postgres) — data layer via `@supabase/ssr`
- Fonts: **Hanken Grotesk** (UI) and **IBM Plex Mono** (code/dates) via `next/font/google`

## Project status

Through **Cycle 4 — CRUD + search**: `/` is a working editor. Add/edit/delete
brands, initiatives, and campaigns; a searchable initiative picker; orphan
surfacing + adoption; and global search — all persisted to Supabase via Server
Actions. Auth + RLS come next. See [`cycles/`](cycles/) for the per-cycle plans.

### Editing

- **+ Brand** (legend), **+ Initiative** / **+ Campaign** (initiatives header),
  and **edit / delete** buttons in the detail drawer open shadcn `Dialog`
  modals. Writes go through Server Actions; the view refreshes on save.
- **Brands:** pick a color → `tint`/`text` derive automatically. An in-use brand
  can't be deleted.
- **Initiatives:** name / owner / status, with a members list and a campaign
  **adopt** search (orphans first, widening on query). Deleting an initiative
  leaves its campaigns as surfaced orphans, not deleted.
- **Campaigns:** a searchable initiative picker, brand select, and a **live UTM
  preview** (source/medium derive from vendor + channel; campaign = SF code).
  On create, a launch date + auto comp-due (launch − 10d, toggle to manual)
  seed the events. Editing changes metadata only — existing events are kept.
- **Orphans** (campaigns with no initiative) surface in a bar on the home
  screen and can be adopted into an initiative.
- **Global search** filters the initiative cards and surfaces matching
  campaigns; click a result to open it.

### The home screen

`/` opens on the calendar **Month** view, defaulting to **June 2026** (where the
seed data lives) so it shows populated on first load:

- **Day / Week / Month** segmented control switches views; prev/next navigates
  by day/week/month; **Today** jumps to the real current month.
- Events are color-coded by brand. **Launches** render filled; **comp-due**
  markers render dashed. Click a brand in the legend to hide/show its events.
- **Initiative cards** sit under the calendar, sorted by urgency. Each shows a
  progress rollup ("X of N sent"), next milestone, leads + pipeline, owner
  initials, and — for co-branded initiatives — a split accent bar with every
  brand's color.
- **Click anything** — a calendar event, a day-agenda row, or a card — to open
  the **detail drawer**. Campaign mode shows the facts, a timeline, and an
  auto-assembled UTM string (with copy); initiative mode lists child campaigns
  you can drill into, with a breadcrumb back. Close via the scrim, the X, or
  **Esc**.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy the example env file and fill in your Supabase project values
(Project Settings → API):

```bash
cp .env.example .env.local
```

- `NEXT_PUBLIC_SUPABASE_URL` — your project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the public anon key
- `SUPABASE_SERVICE_ROLE_KEY` — server-only; never expose to the browser

### 3. Run the migration + seed

Apply the schema and sample data to your Supabase database. Either paste each
file into the Supabase SQL Editor, or run them with `psql` against your
connection string:

```bash
psql "$DATABASE_URL" -f supabase/migrations/0001_init.sql
psql "$DATABASE_URL" -f supabase/seed.sql
```

> The seed is regenerated from the prototype with `node scripts/gen-seed.mjs`.

### 4. Run the dev server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000). The calendar home opens on
the Month view for June 2026, with the seeded events placed on their dates and
color-coded by brand, pulled live from Supabase.

## Project layout

```
reference/ContentTracker.jsx   Prototype — UX + data source of truth
src/app/page.tsx               Home (server) — fetches data, renders CalendarHome
src/components/calendar/       Calendar UI (CalendarHome shell, Toolbar, views, chips)
src/components/initiative/     Initiative cards (InitiativeCards, InitiativeCard)
src/components/drawer/         Detail drawer (DetailDrawer — campaign + initiative)
src/components/modals/         CRUD modals (Brand/Initiative/Campaign) + pickers
src/components/home/           Global search + orphan bar
src/lib/types.ts               Domain types
src/lib/brands.ts              Brand tokens + status colors + swatches
src/lib/utm.ts                 UTM derivation + assembly + channels
src/lib/dates.ts               Date key/parse/format + grid math
src/lib/rollups.ts             Initiative rollups + urgency sort
src/lib/format.ts              Display formatters (money, initials)
src/lib/queries.ts             Server data access (getHomeData)
src/lib/actions.ts             Server Actions (CRUD + adopt)
src/lib/supabase/              Server + browser Supabase clients
supabase/migrations/           SQL schema
supabase/seed.sql              Sample data (generated)
cycles/                        Per-cycle build plans
```

## Notes

- **RLS is deferred to Cycle 5.** No row-level security is enabled yet.
- `campaigns.initiative_id` is `ON DELETE SET NULL` (orphan-safe);
  `events.campaign_id` is `ON DELETE CASCADE`.
