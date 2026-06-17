# Cycle 11 — Vivid theme: color & motion (v1.4.0)

**Goal:** Ship "Vivid" — a high-color, animated skin for the calendar home — as
an **opt-in third theme** alongside light/dark. The seven brand colors become
the palette hero (gradients, tints, glows); motion is used to orient (where am
I, what just changed), never to decorate. Presentation only: no schema, no
data, no entitlement/RLS changes.

**Source of truth:** the *Color & Motion — design spec* + the interactive
mockup (`wenger-content-tracker-mockup.html`). Brand identity stays **data,
applied via inline `style`** — we do not generate Tailwind classes from
arbitrary hex (project canon).

**Starting state:** end of Cycle 10 (`v1.3.0`). Cycle 8's theme system
(light/dark + the `--color-ink-muted`/`faint`/`muted2` contrast fixes) is the
foundation Vivid branches off — that dependency is **met**.

## Spec reconciliation

- **Numbered** Cycle 11 → **v1.4.0**. No migration (presentation only; `0006`
  was the last, taken by Cycle 10).
- **`grad` is derived, not invented.** The spec's gradient stops were
  placeholders. Real brand hexes already live in `src/lib/brands.ts`
  (`dot` per brand, Creative Conners locked to `#E0721F`). Plan derives each
  brand's `grad` from its `dot` via the existing `mix()` helper —
  `[mix(dot,'#ffffff',.18), mix(dot,'#000000',.22)]` (tune in review) — so no
  design handoff or new palette is needed and brands stay single-sourced.
- **Theme switch is binary today.** `ThemeProvider` stores `"light" | "dark"`,
  toggles a `.dark` class, and a no-flash script in `layout.tsx` reads
  `localStorage.theme`. Vivid makes this a **3-state** control, so the type,
  the toggle UI, and the no-flash script all change (see Decisions).

## Decisions to confirm before build

1. **Vivid as opt-in third theme (recommended), not the default.** Keeps the
   locked "brand-neutral chrome, brand-as-data" baseline as default; promoting
   Vivid is a later call.
2. **Vivid ⟂ light/dark — mutually exclusive, not a layer.** The mockup scopes
   the treatment under a single `[data-theme="vivid"]`. Recommend Vivid be its
   own mode (own light value set) rather than a skin that multiplies across
   light *and* dark — far less surface, matches the mockup. (If a dark-Vivid is
   wanted later, that's a follow-up.)
3. **Ambient blobs: ship or mockup-only?** Cheap but the most decorative
   element. Recommend **ship, gated** — one `<VividBackdrop>` layer at
   `z-index:-1`, killed by `prefers-reduced-motion`. Confirm on perf + taste.
4. **`grad` derivation vs. hand-picked stops** — confirm the derived approach
   above is acceptable, or supply real stops to swap in.
5. **Seed leads/pipeline numbers** — spec flags the mockup figures as invented.
   Vivid only *animates* (count-up) whatever the cards already render, so this
   is not a blocker; no change unless real figures are supplied.

## Planned work

1. **`src/lib/brands.ts`** — add `grad: [string, string]` to each `Brand`
   (derived from `dot` via `mix()`); add a `tint(hex, α)` helper returning
   `rgba(...)` at arbitrary alpha (for `.08–.40` surfaces/glows). Keep
   `tintOf`/`textOf` as-is. Extend the `Brand` type in `src/lib/types.ts`.
2. **`src/app/globals.css`** — motion tokens (`--ease: cubic-bezier(.32,.72,0,1)`,
   `--ease-spring: cubic-bezier(.34,1.56,.64,1)`), keyframes (load-in, view
   cross-fade, month slide, chip pop, card mount, progress fill, count-up,
   drawer slide, today pulse, blob drift), and a `[data-theme="vivid"]` scope
   for the gradient/tint treatment + value vars. Mirror the duration scale
   (micro 120–160 / standard 250–400 / entrance 400–600 / ambient 26–34s) and
   index-based stagger (cells `i×45ms`, cards `idx×70ms`) as utility
   classes/vars.
3. **`prefers-reduced-motion: reduce` block** — collapse all
   animation/transition durations to ~0 and stop blob drift. Color holds; only
   motion is removed. Non-negotiable, ships with the theme.
4. **Theme switch → 3-state.** `ThemeProvider` value `"light" | "dark" |
   "vivid"`; apply via `data-theme="vivid"` on `<html>` (keep `.dark` for
   dark); update the no-flash script in `layout.tsx` to read + apply the
   persisted value; `ThemeToggle` becomes a 3-way control (cycle or segmented).
   Persist the choice in `localStorage.theme`.
5. **Component class additions only (no structural/data changes):**
   - **Event chips** — launch = full `grad` fill + white text + `tint(.35–.4)`
     drop shadow; comp-due = no fill, dashed `dot` border, `tint(.10)` bg, brand
     text; co-branded (e.g. PUPN) = hard-split two-brand gradient + split dot.
     Pop-in on render, lift+glow on hover.
   - **Initiative cards** — gradient accent bar (split when co-branded), brand
     glow on hover + accent-bar shimmer, progress bar fills 0→% (1.1s),
     leads/pipeline count up (~900ms ease-out), gradient status pill
     (active→green, planning→slate, soon→orange).
   - **Detail drawer** — brand-tinted header, gradient financial tiles,
     cascading timeline rows, spring slide-in, close button rotate-on-hover.
     UTM box stays derived/never stored.
   - **Legend** — chips on `tint(.08–.13)`; greyscale+dim when toggled off; dots
     scale on hover.
   - **Toolbar** — animated period title (fade on change); spring seg pill;
     active-press nav feedback.
   - **Calendar cells** — striped dim out-of-month; today = gradient date badge
     + soft pulsing ring (the one looping animation).
   - **App bar** — frosted/translucent blur; gradient W mark; green role pill.
   - **`<VividBackdrop>`** — five blurred brand blobs, `z-index:-1`, drift
     `26–34s` (decision #3).

## Acceptance checks

- Toggling to Vivid restyles **without layout shift**; light, dark, and the
  neutral baseline are unchanged.
- `prefers-reduced-motion: reduce` kills **all** motion (including blob drift);
  color treatment holds.
- Co-branded initiatives/campaigns render the two-brand split correctly (chip +
  dot + card accent bar); brand set still derives from child campaigns.
- No-flash: refreshing while in Vivid paints Vivid immediately (no light→vivid
  flash), same as the existing dark path.
- Financial gating unaffected — Vivid is presentation only; RLS/entitlement
  paths untouched.
- `tsc --noEmit` + lint clean; `npm run dev` clean; production build clean.

## Out of scope

- Promoting Vivid to the default (decision #1 keeps it opt-in).
- A dark-mode variant of Vivid (decision #2 — Vivid is its own mode).
- Any schema/data/seed change; reworking real leads/pipeline figures (decision
  #5) beyond animating what cards already show.
