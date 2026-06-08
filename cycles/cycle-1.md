# Cycle 1 — Foundation

**Goal:** Stand up the stack, the data model, and the seed, with a bare home
page that proves data round-trips from Supabase. No app UI yet — that starts in
Cycle 2.

**Starting state:** empty repo.

## Delivered

1. **Scaffold** — Next.js (App Router, TS, Tailwind v4, ESLint, `src/`,
   `@/*` alias). _Note: `create-next-app@latest` now installs Next 16, not 15._
2. **shadcn/ui** (neutral base) with `button dialog input select badge
   scroll-area`.
3. **Fonts** — Hanken Grotesk (default UI) + IBM Plex Mono (code/dates) as CSS
   variables.
4. **Tokens & helpers** — `src/lib/brands.ts`, `src/lib/utm.ts`,
   `src/lib/dates.ts`, ported from `reference/ContentTracker.jsx`.
5. **Types** — `src/lib/types.ts`.
6. **Database** — `supabase/migrations/0001_init.sql` (`brands`, `initiatives`,
   `campaigns`, `events`). `campaigns.initiative_id` ON DELETE SET NULL;
   `events.campaign_id` ON DELETE CASCADE. RLS deferred to Cycle 5.
7. **Seed** — `supabase/seed.sql` (7 brands, 7 initiatives, 8 campaigns, 28
   events), generated from the prototype by `scripts/gen-seed.mjs`.
8. **Supabase clients** — `src/lib/supabase/{server,client}.ts` + `.env.example`.
9. **Proof-of-wiring home page** (`/`) — live counts + initiative table.
10. **Docs** — README + CHANGELOG.

## Acceptance checks

- `npm run dev` runs; `/` shows 7 brands, 7 initiatives, 8 campaigns live from
  Supabase.
- `npx tsc --noEmit` clean; `npm run lint` passes.
- `src/lib/brands.ts` has all 7 brands incl. Lutefish in teal.
- `campaigns.initiative_id` is ON DELETE SET NULL; `events.campaign_id`
  cascades.
- README has working setup steps; CHANGELOG has the 0.1.0 block.

## Out of scope (later cycles)

Calendar UI, initiative cards, detail drawer, CRUD modals, searchable pickers,
orphan-adoption UI, global search, Auth, RLS gating, XLSX export/import, Vercel
deploy.
