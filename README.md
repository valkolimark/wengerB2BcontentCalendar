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

This is **Cycle 1 — Foundation**: the stack, data model, seed, and a bare
proof-of-wiring home page that round-trips data from Supabase. There is no app
UI yet — the calendar, cards, drawers, and CRUD start in Cycle 2. See
[`cycles/`](cycles/) for the per-cycle plans.

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

Visit [http://localhost:3000](http://localhost:3000). The home page should show
**7 brands, 7 initiatives, 8 campaigns** pulled live from Supabase, plus a
table of initiatives with their campaign counts and brand dots.

## Project layout

```
reference/ContentTracker.jsx   Prototype — UX + data source of truth
src/lib/types.ts               Domain types
src/lib/brands.ts              Brand tokens + status colors
src/lib/utm.ts                 UTM derivation + assembly
src/lib/dates.ts               Date key/parse/format helpers
src/lib/supabase/              Server + browser Supabase clients
supabase/migrations/           SQL schema
supabase/seed.sql              Sample data (generated)
cycles/                        Per-cycle build plans
```

## Notes

- **RLS is deferred to Cycle 5.** No row-level security is enabled yet.
- `campaigns.initiative_id` is `ON DELETE SET NULL` (orphan-safe);
  `events.campaign_id` is `ON DELETE CASCADE`.
