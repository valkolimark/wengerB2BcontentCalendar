@AGENTS.md

# Wenger B2B Content Calendar — project canon

Content calendar + campaign tracker for Wenger's B2B brands. The prototype at
`reference/ContentTracker.jsx` is the UX source of truth; the deliverable-tier
design lives in `reference/wenger-initiative-campaign-mockup.html`.

## Hierarchy (three tiers, since Cycle 12)

**Initiative → Campaign → Deliverable.**
- **Initiative** — strategic umbrella, brand-agnostic (brands inherited from its
  campaigns); references a Salesforce rollup parent (`sf_parents`).
- **Campaign** — one wave / convention / single send; brand set here; `sf_code`
  is the campaign's SF grouping.
- **Deliverable** — the actual send/asset (email/blog/social). Carries its own SF
  member code (→ `utm_campaign`), `utm_content`, editable `utm_source`
  (`pardot`|`salesforce`, default pardot), a comp→code→send task chain, and
  audience `lists` (summed reach). `utm_content` also still exists at the
  campaign level for simple single-send campaigns with no deliverables.

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
  `src/lib/brands.ts`; UTM logic in `src/lib/utm.ts`; deliverable helpers
  (chain order, reach, PT send time) in `src/lib/deliverables.ts`; Jira export in
  `src/lib/jira.ts`; domain types in `src/lib/types.ts`.
- Deliverable UTM: `utm_medium` derives from kind (email→email); `utm_source` is
  stored + editable (unlike campaigns, deliverables don't force `salesforce`);
  `utm_campaign` = the deliverable's own SF code if set, else the campaign's
  `utm_campaign_override`, else derive from the campaign SF code (Cycle 13).
- Calendar renders deliverable comp/code/send dates (from the `deliverable_tasks`
  chain + send date) alongside campaign launch/comp; a legend toggles each.
- RLS: content tables are read = authenticated, write = staff
  (`public.is_staff()`); financials are gated separately.

See `cycles/` for the per-cycle build plans.
