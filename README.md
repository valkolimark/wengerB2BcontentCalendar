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

Through **Cycle 2 — Calendar home**: `/` is the real calendar-first home screen
— app bar, a Day/Week/Month toolbar, a brand-filter legend, and a color-coded
calendar driven by live Supabase data. Clickable events / detail drawer,
initiative cards, and CRUD come in later cycles. See [`cycles/`](cycles/) for
the per-cycle plans.

### The calendar home

`/` opens on the **Month** view, defaulting to **June 2026** (where the seed
data lives) so it shows populated on first load:

- **Day / Week / Month** segmented control switches views; prev/next navigates
  by day/week/month; **Today** jumps to the real current month.
- Events are color-coded by brand. **Launches** render filled; **comp-due**
  markers render dashed.
- Click a brand in the legend to hide/show that brand's events live.

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
src/components/calendar/       Calendar UI (CalendarHome, Toolbar, views, chips)
src/lib/types.ts               Domain types
src/lib/brands.ts              Brand tokens + status colors
src/lib/utm.ts                 UTM derivation + assembly
src/lib/dates.ts               Date key/parse/format + grid math
src/lib/queries.ts             Server data access (getCalendarData)
src/lib/supabase/              Server + browser Supabase clients
supabase/migrations/           SQL schema
supabase/seed.sql              Sample data (generated)
cycles/                        Per-cycle build plans
```

## Notes

- **RLS is deferred to Cycle 5.** No row-level security is enabled yet.
- `campaigns.initiative_id` is `ON DELETE SET NULL` (orphan-safe);
  `events.campaign_id` is `ON DELETE CASCADE`.
