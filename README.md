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

Through **Cycle 5 — Auth + RLS financial gating**: the app requires login, and
financial visibility (leads + pipeline $) is enforced server-side via
Row-Level Security — the numbers are *absent from the response* for anyone not
entitled, not merely hidden. See [Authentication & roles](#authentication--roles)
and [`cycles/`](cycles/).

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

### 3. Run the migrations + seed

Apply the schema and sample data to your Supabase database. Paste each file into
the Supabase SQL Editor in order, or use the bundled runner (reads
`SUPABASE_DB_URL` from `.env.local`):

```bash
node scripts/run-sql.mjs \
  supabase/migrations/0001_init.sql \
  supabase/migrations/0002_auth.sql \
  supabase/migrations/0003_financials.sql \
  supabase/migrations/0004_rls.sql \
  supabase/seed.sql
```

> Run the seed **before** `0003` if starting fresh, or run `0001` + seed first,
> then `0002`–`0004` (financials migrate from the seeded columns). The seed is
> regenerated from the prototype with `node scripts/gen-seed.mjs`.

### 4. Enable auth + bootstrap the first admin

This app requires login (Cycle 5). In the Supabase dashboard:

1. **Authentication → Providers → Email**: keep email/password enabled.
2. **Disable public signups** (Authentication → Providers → Email → turn off
   "Allow new users to sign up"). Accounts are invited by an admin.
3. Invite yourself (Authentication → Users → Invite) or create a user, then
   **promote the first admin** by SQL:

   ```sql
   update public.profiles
   set role = 'admin', can_see_financials = true
   where email = 'you@example.com';
   ```

See [Authentication & roles](#authentication--roles) for the full model.

### 5. Run the dev server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000). You'll be redirected to
`/login`; sign in with an invited account. The calendar home then opens on the
Month view for June 2026, with the seeded events color-coded by brand.

## Authentication & roles

Login is required (cookie-based Supabase Auth via `@supabase/ssr`); `middleware.ts`
redirects unauthenticated requests to `/login`. Every `auth.users` row gets a
`profiles` row (via trigger) with a `role` and a `can_see_financials` flag.

| Role | Content read | Write | Financials |
| --- | --- | --- | --- |
| **admin** | ✅ | ✅ | ✅ always; manages roles (`/team`) |
| **member** | ✅ | ✅ | only if granted `can_see_financials` |
| **external** | ✅ | ❌ | ❌ never |

**Financial access** = `role = 'admin' OR can_see_financials = true`. An admin
(e.g. Jackie) grants the flag to a member from the admin-only **`/team`** view.

### How gating is enforced

Financials (`leads`, `pipeline`) live in a separate `campaign_financials` table,
not on `campaigns`. **Row-Level Security** is the backstop:

- `campaign_financials` SELECT is allowed only with financial access — so an
  unentitled caller's query returns **no rows**: the numbers are absent from the
  response, not hidden in the client.
- Content tables (`brands`/`initiatives`/`campaigns`/`events`): SELECT for any
  authenticated user; writes only for staff (admin/member).
- `profiles`: a user reads their own row; admins read/write all.
- Anonymous (no session) matches no policy → denied.

Server Actions also re-check the caller's role server-side (defense in depth);
RLS is the authoritative backstop. The client role flag only hides UI.

## Project layout

```
reference/ContentTracker.jsx   Prototype — UX + data source of truth
src/middleware.ts              Auth gate — redirects unauthenticated to /login
src/app/page.tsx               Home (server) — fetches data, renders CalendarHome
src/app/login/                 Sign-in page
src/app/team/                  Admin-only Team view (roles + financial access)
src/components/calendar/       Calendar UI (CalendarHome shell, Toolbar, views, chips)
src/components/initiative/     Initiative cards (InitiativeCards, InitiativeCard)
src/components/drawer/         Detail drawer (DetailDrawer — campaign + initiative)
src/components/modals/         CRUD modals (Brand/Initiative/Campaign) + pickers
src/components/home/           Global search + orphan bar
src/components/team/           Team table (role + financial-flag management)
src/lib/types.ts               Domain types
src/lib/auth.ts                Session/profile helpers + role guards
src/lib/brands.ts              Brand tokens + status colors + swatches
src/lib/utm.ts                 UTM derivation + assembly + channels
src/lib/dates.ts               Date key/parse/format + grid math
src/lib/rollups.ts             Initiative rollups + urgency sort
src/lib/format.ts              Display formatters (money, initials)
src/lib/queries.ts             Server data access (getHomeData, role-aware)
src/lib/actions.ts             Server Actions (CRUD + adopt + auth/team)
src/lib/supabase/              Server / browser / middleware Supabase clients
supabase/migrations/           SQL schema + auth + financials + RLS
supabase/seed.sql              Sample data (generated)
cycles/                        Per-cycle build plans
```

## Notes

- **RLS is enabled on all tables** (Cycle 5). Financials are gated server-side.
- `campaigns.initiative_id` is `ON DELETE SET NULL` (orphan-safe);
  `events.campaign_id` is `ON DELETE CASCADE`.
