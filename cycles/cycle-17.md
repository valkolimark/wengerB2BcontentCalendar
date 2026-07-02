# Cycle 17 — Initiative-level Salesforce campaigns + prepopulated deliverables (v1.9.0)

**Goal:** Enter Salesforce identity **once per initiative** (the rollup **parent**
plus a **child** campaign per channel — email / landing / social, each with
name / SF id / code) so **deliverables prepopulate** their SF fields from the
child matching their kind. Also: **audience lists now render in the Email Send**
role card.

## Delivered

- **Schema `0010_initiative_sf.sql`:** `initiative_sf_campaigns`
  (`initiative_id`, `role` in parent|email|landing|social, `name`, `sf_id`,
  `sf_code`; pk `(initiative_id, role)`) + RLS read=authed / write=staff.
- **Data layer:** `Initiative.sf` (role→{name,sf_id,sf_code} map) attached in
  `getHomeData`; `createInitiative`/`updateInitiative` accept + upsert the four
  SF roles (all-blank role is deleted).
- **InitiativeModal:** a **Salesforce campaigns** section — Parent (rollup) +
  Email / Landing page / Social children, each name + SF id + code.
- **DeliverableModal prepopulation:** a deliverable's SF **Name/ID** (and
  **Code** for new deliverables only) prefill from the initiative's child for the
  deliverable's kind; switching channel fills still-blank fields; the lineage box
  shows **parent rollup → channel child → campaign**. Campaign-level SF stays as a
  legacy fallback. (SF code isn't auto-filled on existing deliverables — a blank
  there intentionally lets `utm_campaign` use the campaign override.)
- **Email Send card** now lists the audience lists (names + reach + combined),
  moved out of the standalone block.
- **Type fix:** `DeliverableKind` / kind options / validation gained `landing`
  (the DB has allowed it since 0008).
- **Backfill (`backfill-initiative-sf.mjs`):** seeded 11 child rows from the
  existing email/landing campaign pairs (THSCA, CC, TIM, TX, US, Music Ed).
  Parent + social left blank (pending). Prop 28 uses per-deliverable SF ids.

## Verification

- `tsc` / lint / `next build` clean. Migration + backfill applied.

## Open / notes

- Parent rollup SF ids and social children are pending (admin fills in the
  Initiative editor). Overlaps with the older `sf_parents` rollup vocabulary
  (Cycle 10) — the new initiative parent carries id + code, which `sf_parents`
  lacks; both coexist.
