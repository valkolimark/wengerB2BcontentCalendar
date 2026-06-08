# Cycle 9 — Salesforce campaign fields + source rule (v1.2.0)

**Goal:** Capture a campaign's real Salesforce identity — SF Campaign ID + SF
Campaign Name, alongside the SF code — and force `utm_source = salesforce`
whenever a campaign carries Salesforce info.

**Decision (chat):** **A — presence-based.** Any of `sf_code`/`sf_id`/`sf_name`
non-empty → `utm_source = salesforce`; clearing all reverts to the vendor/channel
derivation.

## Delivered

1. **Schema** — `0005_sf_fields.sql`: `sf_id`, `sf_name` on `campaigns`
   (nullable, metadata only).
2. **Types** — `sf_id`/`sf_name` on `Campaign`, `CampaignInput`, import payload.
3. **Source rule** — `resolveSource()` in `utm.ts`, used by both the modal
   preview and `utmFields` in the action (one shared resolver → no drift).
4. **CampaignModal** — SF ID + Name inputs grouped with SF code; live preview
   flips/reverts; "source = salesforce" badge.
5. **DetailDrawer** — SF ID + Name in campaign facts (when present).
6. **Round-trip** — export adds SF ID/Name columns; import reads them; still
   matched by `sf_code`; idempotent.

## Verification

- Truth table: any SF field → `salesforce`; whitespace-only → not; cleared →
  reverts to derivation.
- DB (transactional): create w/ SF stores `salesforce`, w/o SF stores the
  derived source; update clearing SF reverts; `sf_id`/`sf_name` persist.
- xlsx round-trip: SF ID + Name survive export → parse; `utm_source` stable.
- tsc / lint / build clean.

## Out of scope

Option B (explicit "Tracked in Salesforce" checkbox) — not chosen; would be a
one-line trigger swap.
