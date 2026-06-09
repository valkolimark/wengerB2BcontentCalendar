# Cycle 10 — Salesforce reporting parents (v1.3.0)

**Goal:** Let a campaign reference *where it reports in Salesforce* (a rollup
parent) without the app modeling a campaign tree. The hierarchy stays
**Initiative → Campaign**; Salesforce does the rollup.

**Spec reconciliation:** authored as "Cycle 8 / v1.1.0" against the v1.0.0
state. Since then Cycle 8 (theming → v1.1.0) and Cycle 9 (SF Campaign ID/Name +
`utm_source=salesforce` → v1.2.0) shipped, plus a v1.2.1 hotfix. So:
- **Renumbered** Cycle 10 → **v1.3.0**; migration **`0006`** (0005 taken).
- **SF Campaign ID/Name already exist** (`sf_id`/`sf_name`, Cycle 9) — reused,
  not duplicated. This cycle adds only the **parent** reference + lookup.
- Locked defaults: parent matched **by name**; SF metadata **kept in JMC**.

## Delivered

1. **Schema** — `0006_sf_parents.sql`: `sf_parents` (self-referential,
   `name unique`, `parent_id` FK SET NULL, `check (parent_id <> id)`) + RLS
   (read = authed, write = staff) + seed; `campaigns.sf_parent_id`.
2. **lib** — `sf.ts` (`sfParentChain` leaf→root, `wouldCycle`); `queries.ts`
   loads `sf_parents`; types extended.
3. **Actions** — `createSfParent`/`updateSfParent` (cycle-guarded)/
   `deleteSfParent`; campaigns persist `sf_parent_id`; importer
   resolves/creates parent by name.
4. **CampaignModal** — SF Parent select + **New parent** (`SfParentModal`) +
   chain preview.
5. **Drawer** — SF ID, SF Name, and parent chain in campaign facts.
6. **Export** — XLSX SF Parent column (Full + JMC); new **Salesforce import
   CSV** (Data menu) emitting the deduped parent chain.

## Verification

- Chain leaf→root; cycle guard (CONV ALL→Music Ed, self-ref rejected; valid
  allowed).
- SF import CSV: one leaf under Music Ed → 3 rows (leaf, Music Ed→CONV ALL,
  CONV ALL→blank); two leaves → 4 rows (parents deduped).
- DB (transactional): `sf_parent_id` persists; `ensureSfParent` idempotent;
  ON DELETE SET NULL nulls dependents. tsc/lint/build clean.

## Out of scope

Campaign Builder wizard; Salesforce API sync; a dedicated SF-parents management
screen beyond the inline `SfParentModal`.
