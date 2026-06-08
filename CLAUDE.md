@AGENTS.md

# Wenger B2B Content Calendar — project canon

Content calendar + campaign tracker for Wenger's B2B brands. The prototype at
`reference/ContentTracker.jsx` is the UX source of truth.

## Stack

Next.js 16 (App Router) + Tailwind v4 (CSS-first; theme tokens live in `@theme`
in `src/app/globals.css`, not a `tailwind.config.js`). shadcn/ui (neutral base,
Radix primitives). Supabase (Postgres) via `@supabase/ssr`. Fonts: Hanken
Grotesk (UI) and IBM Plex Mono (code/dates).

## Conventions

- Brand `dot`/`tint`/`text` are data — apply them via inline `style`. Use
  Tailwind utilities for layout/spacing/type only; don't generate Tailwind
  classes from arbitrary hex.
- Date/grid math lives in `src/lib/dates.ts`; brand/status tokens in
  `src/lib/brands.ts`; UTM logic in `src/lib/utm.ts`; domain types in
  `src/lib/types.ts`.
- RLS is deferred to Cycle 5 — no row-level security yet.

See `cycles/` for the per-cycle build plans.
