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

**v1.8.0 — Cycle 16: Actionable Jira handoff.** Synced issues carry **role-scoped
multi-line descriptions**, a **preflight readiness** panel with **fix-in-place**
editing, **step-default assignees**, and a **copy-approval watcher** (Whitney on
comp). New env: `NEXT_PUBLIC_APP_URL`, `JIRA_WATCHER_COMP`.

**v1.7.1 — Cycle 15: Admin user management.** The **Team** page can add people
(email + initial password + role), reset passwords, and remove users.

**v1.7.0 — Cycle 14: Live Jira sync.** A campaign's deliverables push to Jira as
real comp/code/send issues — **create or update**, idempotently (via
`deliverable_tasks.jira_key`) — from the drawer's **Send to Jira** button; CSV
export remains. Needs `JIRA_*` server env (see `.env.example`). Built on:

**v1.6.0 — Cycle 13: Deliverable dates on the calendar + July 2026 load.**
Deliverable **comp / code / send** dates now render on the calendar (amber /
blue dashed + filled brand), with a legend that toggles each marker type;
clicking one opens the drawer on that deliverable. Campaigns gain an optional
`utm_campaign_override`, the AI assistant answers deliverable questions, and the
**July 2026 Campaign Reference** is loaded as the first real dataset. Built on
**v1.5.0 — Cycle 12: Deliverable tier**, where the app became three-level —
**Initiative → Campaign → Deliverable** — with the comp→code→send chain,
**Email-send**/**Coding** role views, **audience lists** (summed reach), and
**Jira export**. Prior: **v1.4.0** (AI assistant), **v1.3.0** (Salesforce rollup
parents), **v1.2.0** (SF Campaign ID/Name), **v1.1.0** (theming), **v1.0.0**.
See [Theming & branding](#theming--branding), [Deployment](#deployment-vercel),
the [Go-live checklist](#go-live-checklist),
[Authentication & roles](#authentication--roles), [Spreadsheet
round-trip](#spreadsheet-export--import), and [`cycles/`](cycles/).

### Editing

- **+ Brand** (legend), **+ Initiative** / **+ Campaign** (initiatives header),
  and **edit / delete** buttons in the detail drawer open shadcn `Dialog`
  modals. Writes go through Server Actions; the view refreshes on save.
- **Brands:** pick a color → `tint`/`text` derive automatically. An in-use brand
  can't be deleted.
- **Initiatives:** name / owner / status, with a members list and a campaign
  **adopt** search (orphans first, widening on query). Deleting an initiative
  leaves its campaigns as surfaced orphans, not deleted.
- **Campaigns:** a searchable initiative picker, brand select, Salesforce
  identity (**SF campaign code**, **SF Campaign ID**, **SF Campaign Name**), and
  a **live UTM preview**. `utm_medium` derives from channel and `utm_campaign` =
  SF code. **`utm_source` rule:** if a campaign carries *any* Salesforce field
  (code / ID / name), `utm_source` is forced to **`salesforce`**; otherwise it
  derives from vendor + channel. The rule is enforced in both the modal preview
  and the server action (one shared resolver, so they can't drift). SF ID/Name
  are metadata only — they never enter the UTM string. On create, a launch date
  + auto comp-due (launch − 10d, toggle to manual) seed the events. Editing
  changes metadata only — existing events are kept.
  - **SF reporting parent:** a campaign can reference the Salesforce rollup
    **parent** it reports into (a dropdown from the `sf_parents` lookup, with a
    **+ New parent** affordance and a `leaf → root` chain preview). It's
    optional and metadata only — the app stays two-level; Salesforce does the
    rollup. Cycle prevention (a→b→a) is enforced when editing a parent.
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
- `ANTHROPIC_API_KEY` — server-only; powers the [AI assistant](#ai-assistant).
  Optional — the app runs without it; only the assistant is disabled.

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

## AI assistant

An **Ask** button in the app bar opens a read-only conversational assistant.
Ask plain-language questions about your own tracker data — "when's the next
email for Prop 28?", "what's the UTM for the Prop 28 secondary campaign?", "what
Salesforce campaign does X report into?" — and it answers from the live data.

**Read-only.** It looks things up; it can't create, edit, or delete anything
(conversational creation is a later cycle). It answers only from tool results
and won't fabricate a code, date, UTM, or number.

**It inherits the same gating — by construction, not a separate check.** The
assistant's tools fetch through the *existing* role-aware data layer
(`getHomeData`), bound to your session — no service-role key, no raw SQL, no new
DB path. So an unentitled caller's tool results carry **no** `leads`/`pipeline`
(RLS strips them before the model ever sees anything), and `external` users get
scrubbed, read-only answers — exactly as the UI already enforces. The assistant
is not a new way for financials to leak.

Powered by Anthropic; set **`ANTHROPIC_API_KEY`** (server-only) to enable it.
The server runs a bounded tool-use loop and streams the answer back; the
conversation lives in the browser only (no chat history is stored). Posting to
`POST /api/assistant` without a session returns **401**.

## Spreadsheet export / import

The app-bar **Data** menu round-trips everything through a `.xlsx` workbook
(SheetJS, client-side). Persistence still goes through role-checked Server
Actions, so RLS applies — the browser never writes to Supabase directly.

### Export (anyone)

Builds a workbook with **Initiatives**, **Campaigns**, and **Events** sheets;
Campaigns includes the SF Campaign ID/Name, **SF Parent** (name), and the
assembled UTM (computed at export, never stored). Filename:
`wenger-content-tracker_YYYY-MM-DD.xlsx`. Two modes:

- **Full export** — includes `Leads` / `Pipeline` **only when you're entitled**
  to financials. A non-entitled user's export has no financial data at all
  (it isn't in their session to begin with).
- **JMC view** — omits the financial columns entirely, for sharing externally.
  (SF metadata is operational, not dollars, so it stays in the JMC view.)
- **Salesforce import (CSV)** — a separate menu item that emits one row per
  campaign with a parent, plus one row per **distinct parent in every chain**
  (deduped), each pointing at its next level up (root = blank), matched **by
  name**. Filename `wenger-sf-import_YYYY-MM-DD.csv`. Outbound only — not
  re-imported.

### Import (admin only)

Pick an `.xlsx`; it's parsed and validated **in the browser** and shown as a
preview (counts to add vs. update, plus skipped rows) — **nothing is written
until you confirm**. On confirm, `importWorkbook` (admin-only; RLS is the
backstop) upserts:

- **brands** by label/id (created if absent), **initiatives** by name,
  **campaigns** by **SF code** (the natural key), **events** by
  (campaign, type, date), and **financials** when the file carries them.

Import is **additive/update-only — no deletes — and idempotent**: re-importing
the same file changes nothing (campaigns match by SF code; events match by
campaign + type + date, so nothing duplicates).

## Theming & branding

The app supports **light and dark** themes. A sun/moon **toggle** sits in the
app bar (and on login); the choice persists to `localStorage` and defaults to
the OS `prefers-color-scheme`. An **inline no-flash script** in `layout.tsx`
sets the theme class on `<html>` before first paint, so there's no flash of the
wrong theme.

The palette is a set of CSS variables in `globals.css` (`:root` for light,
`.dark` for dark) surfaced as Tailwind tokens (`bg-canvas`, `bg-surface`,
`text-ink-muted`, `border-hair`, …), so the **whole** UI re-skins — not just the
shadcn chrome. Text grays are tuned to pass **WCAG AA (≥4.5:1)** in both themes.
Brand `dot`/`tint`/`text` remain inline data, not tokens.

### Logo assets

Brand artwork lives in `public/brand/` with web-safe names:

| File | Use |
| --- | --- |
| `logo-lt.png` | full logo on **light** backgrounds (light-mode app bar) |
| `logo-dk.png` | full logo on **dark** backgrounds (login gradient + dark-mode app bar) |
| `mark.png` | square W-in-circle mark — favicon / compact use |

They're raster PNGs rendered via `next/image` with explicit dimensions so they
stay crisp and don't shift layout. The app bar swaps `logo-lt`/`logo-dk` by the
active theme.

## Deployment (Vercel)

Next 16 is auto-detected; no build config needed. The `xlsx` dependency resolves
from the SheetJS CDN tarball pinned in `package.json` (see [Dependency
notes](#notes)).

1. **Connect the repo** to a Vercel project (Framework: Next.js).
2. **Environment variables** (Project → Settings → Environment Variables):
   | Variable | Scope | Notes |
   | --- | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | All | public |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All | public |
   | `SUPABASE_SERVICE_ROLE_KEY` | Production/Preview (server) | **server-only — never expose**; the app itself doesn't use it, but keep it out of any `NEXT_PUBLIC_*` name |
   | `ANTHROPIC_API_KEY` | Production/Preview (server) | **server-only — never expose**; powers the AI assistant. Never a `NEXT_PUBLIC_*` name. Omit to disable the assistant (it returns 503) |
3. **Deploy a preview**, smoke-test, then **promote to production**.
4. Point Supabase auth at the production domain (below) so login redirects work.

Security headers (HSTS, `X-Content-Type-Options`, `X-Frame-Options: DENY` +
`frame-ancestors 'none'`, `Referrer-Policy`, `Permissions-Policy`, and a CSP
allowing `self`, the Supabase origin, and Google Fonts) are set in
`next.config.ts` and apply to every response.

## Go-live checklist

- [ ] Vercel env vars set; **neither `service_role` nor `ANTHROPIC_API_KEY` is
      in any `NEXT_PUBLIC_*` var** (both server-only).
- [ ] Supabase → Authentication → URL Configuration: **Site URL** and
      **Redirect URLs** set to the Vercel production domain.
- [ ] Supabase → Authentication → Providers → Email: **"Allow new users to sign
      up" is OFF** (accounts are invited).
- [ ] RLS enabled on all 6 tables in the production project (it is, via the
      migrations).
- [ ] Real admin bootstrapped (`update public.profiles set role='admin',
      can_see_financials=true where email='…';`); at least one admin can reach
      `/team`.
- [ ] Throwaway test accounts removed (`admin@`/`member@`/`external@wengertest.com`).
- [ ] Supabase scheduled backups enabled; Vercel runtime logs accessible.
- [ ] Security headers present (`curl -I https://<domain>`).
- [ ] Per-role smoke test in production (admin sees financials; member without
      the flag doesn't; granting via `/team` reveals them; external scrubbed +
      read-only; anonymous → `/login`), and financials are **absent from the
      network payload** for unentitled callers.
- [ ] Export (Full + JMC) and admin import work against the live app.

## Project layout

```
reference/ContentTracker.jsx   Prototype — UX + data source of truth
next.config.ts                 Security headers + CSP, Turbopack root
src/middleware.ts              Auth gate — redirects unauthenticated to /login
src/app/page.tsx               Home (server) — fetches data, renders CalendarHome
src/app/error.tsx              Global error boundary
src/app/not-found.tsx          404 page
src/app/loading.tsx            Home loading state
src/app/login/                 Sign-in page
src/app/team/                  Admin-only Team view (roles + financial access)
src/components/calendar/       Calendar UI (CalendarHome shell, Toolbar, views, chips)
src/components/initiative/     Initiative cards (InitiativeCards, InitiativeCard)
src/components/drawer/         Detail drawer (DetailDrawer — campaign + initiative)
src/components/modals/         CRUD modals (Brand/Initiative/Campaign) + pickers
src/components/home/           Global search + orphan bar
src/components/team/           Team table (role + financial-flag management)
src/components/data/           Data menu (export) + import modal (preview)
src/lib/types.ts               Domain types
src/lib/xlsx-export.ts         Build a workbook from loaded data (client)
src/lib/xlsx-import.ts         Parse + validate + diff an uploaded workbook (client)
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
- **SheetJS (`xlsx`)** is installed from the SheetJS CDN tarball
  (`xlsx-0.20.3.tgz`) pinned in `package.json`, **not** npm. The npm `xlsx` is
  frozen at 0.18.5 with a published advisory; the CDN build is the maintainer's
  recommended, patched distribution. It resolves from `package.json` in CI.
- `npm audit` reports 2 moderate advisories in Next's transitive `postcss`
  (CSS-stringify XSS). The only offered "fix" downgrades Next to 9.x — declined;
  it doesn't apply to our usage (we never stringify untrusted CSS). Tracked, not
  patched, to avoid breaking the framework.
- `campaigns.initiative_id` is `ON DELETE SET NULL` (orphan-safe);
  `events.campaign_id` is `ON DELETE CASCADE`.
