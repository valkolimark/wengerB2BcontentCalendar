# Cycle 5 — Auth + RLS financial gating

**Goal:** Real authentication; financial visibility (leads + pipeline $) gated
server-side by RLS so a tampered client can never retrieve numbers it isn't
entitled to. Admins (Mark, Jackie) grant financial access.

**Starting state:** end of Cycle 4 (`5052835`) — financials hardcoded visible.

## Security principle

Gating is enforced **server-side via RLS**, never client code alone. Financial
data is *absent from the response* for the unentitled — not merely hidden.
Server Actions re-check role (defense in depth); RLS is the backstop.

## Role model

`profiles` per `auth.users`: `role` (`admin`/`member`/`external`) +
`can_see_financials`. Financial access = `role = 'admin' OR can_see_financials`.
External never.

## Delivered

1. **0002_auth.sql** — `profiles`, new-user trigger, RLS helper functions,
   profiles RLS.
2. **0003_financials.sql** — `campaign_financials` (leads/pipeline moved off
   `campaigns`, seed migrated), auto-row trigger, financials RLS.
3. **0004_rls.sql** — RLS on brands/initiatives/campaigns/events (read =
   authenticated, write = staff).
4. **Auth flow** — `@supabase/ssr` middleware + `/login` + `signOut`. Public
   signup disabled; first admin promoted by SQL.
5. **Role-aware reads** — `getHomeData()` merges financials only when entitled.
6. **Role-aware UI** — real user/role + sign-out in the app bar; write
   affordances hidden for external.
7. **Server Action hardening** — `requireStaff`/`requireAdmin` on every mutation.
8. **/team** (admin-only) — set roles + toggle financial access.

## Verification

Real per-role sessions (admin/member/external) confirmed:
- content readable by all authenticated (8 campaigns each);
- `campaign_financials`: admin 8, member-without-flag 0, external 0;
- granting the flag → member sees 8;
- external INSERT denied, member INSERT allowed;
- anonymous sees 0.
Middleware: unauthenticated `/` and `/team` → 307 → `/login`. tsc/lint/build clean.

## Out of scope (later cycles)

XLSX (Cycle 6); Vercel deploy + hardening (Cycle 7). Not now: invites, SSO,
password-reset UI, public signup, per-brand permissions.
