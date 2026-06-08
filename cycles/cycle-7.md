# Cycle 7 — Vercel deploy + hardening (v1.0.0)

**Goal:** Ship to production on Vercel, harden, and cut **v1.0.0** — the Excel
replacement live, secured, and verified per role.

**Starting state:** end of Cycle 6 (`7f13328`) — full app, clean build.

## Delivered (in-repo, autonomous)

1. **Pre-deploy audit** — clean-install build confirms the SheetJS CDN tarball
   resolves; `service_role` confirmed absent from `src/` and git history;
   `.env.local` gitignored + untracked.
2. **Security headers + CSP** (`next.config.ts`) — HSTS, nosniff, frame DENY +
   `frame-ancestors 'none'`, Referrer-Policy, Permissions-Policy, and a CSP
   allowing `self`, the Supabase origin (REST + wss), and Google Fonts. Verified
   via `curl -I`; the app still serves under the policy.
3. **Error/edge handling** — `app/error.tsx`, `app/not-found.tsx`,
   `app/loading.tsx`; unauthenticated → `/login` confirmed.
4. **Dependency hardening** — documented the SheetJS CDN choice and the
   Next/postcss audit advisory (declined breaking downgrade); lockfile committed.
5. **Admin bootstrap** — Mark Mireles promoted to `admin`.
6. **Release docs** — README deploy section + go-live checklist; CHANGELOG
   `1.0.0`.

## Requires dashboard access (handed off — go-live checklist)

- Vercel: connect repo, set env vars (`service_role` server-only), deploy
  preview → promote to production.
- Supabase: Site URL + redirect URLs → Vercel domain; "Allow new users to sign
  up" OFF; confirm RLS on all 6 tables; enable scheduled backups.
- Remove the three throwaway test accounts after production verification.
- Production per-role verification (admin/member/external/anonymous);
  financials network-absent for the unentitled; export + import against live.

## Tag

`v1.0.0` — cut once the production deploy + per-role verification pass.

## Beyond v1.0 (parked)

Custom domain + DNS; SSO/SAML; legacy-workbook formula-fidelity export; a
media-plan import mapper; Sentry/APM; mobile wrappers.
