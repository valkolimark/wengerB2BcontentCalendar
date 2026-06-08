# Cycle 2 — Calendar home

**Goal:** Replace the proof-of-wiring page with the real calendar-first home
screen from `reference/ContentTracker.jsx`: app bar, Day/Week/Month toolbar,
brand-filter legend, and a color-coded calendar driven by live Supabase data.

**Starting state:** end of Cycle 1 (stack, data model, seed, plain counts page).

## Delivered

1. **Data access** — `src/lib/queries.ts` `getCalendarData()` → `{ brands,
   events }`, events flattened from the events → campaigns → brands join.
2. **Home wiring** — `app/page.tsx` (server) fetches and renders the client
   `<CalendarHome>`; interactivity is client-side.
3. **Components** under `src/components/calendar/`: `CalendarHome`, `Toolbar`,
   `BrandLegend`, `MonthView`, `WeekView`, `DayView`, `EventChip`
   (display-only — the drawer is Cycle 3).
4. **Calendar logic** — grid math/day keys in `src/lib/dates.ts`
   (`startOfWeek`, `monthGridDays`, `weekDays`); by-day map respects
   `hiddenBrands`; `cursor` defaults to June 2026; Today → real current month;
   today-outline uses the real current date.
5. **Housekeeping** — `CLAUDE.md` stack line → "Next.js 16 (App Router) +
   Tailwind v4".
6. **Docs** — README (calendar home + how to view) + CHANGELOG 0.2.0.

## Visual language

Warm off-white canvas (`#FAFAF7`), white cards, navy accent (`#1C3B66`),
hairline borders, segmented control, today pill — reproduced in Tailwind v4
theme tokens (`@theme` in `globals.css`). Brand `dot`/`tint`/`text` applied
inline (data, not classes).

## Acceptance checks

- `/` renders the calendar home: month view by default, June 2026 events on
  correct dates, color-coded by brand.
- Day/Week/Month toggles views; prev/next navigates; Today → current month.
- Launches filled, comp-due dashed, correct brand colors.
- Legend brand click hides/shows that brand's events live.
- `npx tsc --noEmit` clean; `npm run lint` passes.

## Out of scope (later cycles)

Clickable events / detail drawer (Cycle 3), initiative cards (Cycle 3), CRUD +
pickers + orphan adoption + global search (Cycle 4), Auth + RLS (Cycle 5), XLSX
(Cycle 6), Vercel deploy (Cycle 7).
