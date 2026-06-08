# Cycle 3 — Initiative cards + detail drawer

**Goal:** Add the initiative cards below the calendar (rollups, co-brand) and
the detail drawer that makes events and cards clickable. Read-only — no CRUD.

**Starting state:** end of Cycle 2 (`b2fa6fd`) — live calendar home.

## Delivered

1. **Data layer** — `getCalendarData()` → `getHomeData()` returning `{ brands,
   initiatives, campaigns }`, each campaign with full detail + nested `events`.
   Calendar flattens `campaigns → events` client-side (identical behavior).
2. **Rollups** — `src/lib/rollups.ts`: `rollup(initiativeId, campaigns, today)`
   and `initiativesByUrgency()`. `today` injected (deterministic).
3. **Initiative cards** — `src/components/initiative/`, under the calendar,
   urgency-sorted, co-brand aware (split bar + dots). PUPN shows Wenger +
   GearBoss.
4. **Detail drawer** — `src/components/drawer/DetailDrawer.tsx`, two modes
   (initiative / campaign). Campaign mode shows facts, timeline, and the
   auto-assembled UTM string (via `assembleUtm`, never stored) + copy. Closes on
   scrim, X, and Esc.
5. **Clickability** — `EventChip` + `DayView` rows open campaign mode; shared
   `selected` state lifted to `CalendarHome`.
6. **Financials** — render for everyone behind `canSeeFinancials` (hardcoded
   `true`); Cycle 5 wires it to RLS. No role gating here.

## Anchoring

`today` is server-provided via a `todayKey` prop (`key(new Date())` in
`page.tsx`), so SSR and hydration agree and rollups/outlines are deterministic.

## Acceptance checks

- Clicking a calendar event / DayView row opens campaign mode with correct
  detail + UTM string.
- Cards render under the calendar, urgency-sorted; PUPN shows both brand colors.
- Card → initiative drawer; child rows → campaign mode; breadcrumb returns.
- Progress reads "X of N sent" off real launch dates; leads + pipeline summed.
- Drawer closes via scrim, X, and Esc.
- `tsc` clean; `lint` passes; `build` clean.

## Out of scope (later cycles)

CRUD + pickers + orphan adoption + global search (Cycle 4); Auth + RLS gating
(Cycle 5); XLSX (Cycle 6); Vercel deploy (Cycle 7). Drawer is read-only — no
edit/delete buttons yet.
