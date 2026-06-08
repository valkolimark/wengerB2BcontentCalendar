# Cycle 8 — Theming & branding (v1.1.0)

**Goal:** Fix washed-out text, make the app theme-reactive with a real
light/dark toggle, rebrand the login to a dark navy gradient, and brand the app
with the real Wenger logos.

**Starting state:** end of Cycle 7 (`v1.0.0`) — theme layer light-only in
practice (hardcoded hex; `.dark` only covered shadcn tokens).

## Delivered

1. **Contrast + token fix** — resolved the duplicate `--color-muted` (warm-gray
   text token was shadowed by shadcn's near-white `muted`): renamed to
   `--color-ink-muted`, migrated `text-muted` usages, left shadcn `bg-muted`/
   `muted-foreground` intact. Darkened `faint`/`muted2`/ink-muted to pass WCAG
   AA (≥4.5:1) on the canvas in both themes.
2. **Theme-reactive palette + toggle** — palette promoted to CSS vars in
   `:root`/`.dark`, surfaced via `@theme inline`; `bg-white`/inline light hexes
   migrated to themed tokens (`bg-surface`, `var(--color-hover/cell/selected)`,
   …) so the whole app re-skins. `ThemeProvider` (no next-themes) + inline
   no-flash script in `layout.tsx` + `ThemeToggle` (sun/moon) in app bar + login.
3. **Login rebrand** — dark navy radial gradient, `logo-dk`, glass card, light
   legible text.
4. **Logo branding** — app bar swaps `logo-lt`/`logo-dk` by theme; favicon /
   metadata → `mark.png`. Logos placed in `public/brand/` (web-safe names).

## Verification

- tsc / lint / build clean.
- Contrast (WCAG AA) measured ≥4.5:1 for ink-muted/muted2/faint/ink-soft on
  canvas + surface in both themes (light 4.6–8.5:1, dark 5.2–12:1).
- No-flash script inlined in served HTML; login renders the gradient + logo;
  all `public/brand/*` assets serve 200.

## Out of scope

Per-brand dark-mode tint recalibration; mobile chrome theming beyond layout.
