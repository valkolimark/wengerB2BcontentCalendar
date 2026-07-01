# Cycle 12 — Deliverable tier (Initiative → Campaign → Deliverable)

**Goal:** Add the third tier the app has always deferred. A campaign fans out
to one or more **deliverables** (the actual sends/assets). Each email deliverable
carries its own SF member code, `utm_content`, a **comp → code → send** hand-off
chain with owners, role views for the send/coding teams, and one-or-more
**audience lists** with summed reach. Design source of truth:
`reference/wenger-initiative-campaign-mockup.html`.

**Starting state:** end of Cycle 11 (`v1.4.0`), plus the July-2026 maintenance
reset + Prop 28 "Wave 7" seed. Builds on `campaigns`/`events`, the UTM layer
(`utm.ts`), SF parents (`sf.ts`, Cycle 10), SF identity (Cycle 9), and the
detail drawer / campaign modal.

## Spec reconciliation (read before building)

- **Numbering.** Cycle 11 earmarked "Cycle 12 = conversational creation (writes)
  on the assistant tool layer." The operator has prioritized the deliverable
  tier surfaced by the mockup, so **this is Cycle 12**; conversational creation
  shifts to **Cycle 13+**. Rename if you prefer to keep 12 reserved.
- **This breaks the two-level canon on purpose.** CLAUDE.md/README state
  "Initiative → Campaign; two-level." Every prior task said *"do NOT add a
  deliverable tier — a future cycle will."* **This is that cycle.** CLAUDE.md,
  AGENTS.md, and README must be updated to describe three tiers.
- **`utm_content` gains a deliverable home.** The mockup's Rosetta says
  **`utm_content` = the deliverable**, so deliverables get their own. As-built we
  **kept** `campaigns.utm_content` too (for simple single-send campaigns), so it
  now exists at both tiers rather than moving wholesale. See re-model note.
- **`0007`** is the next free migration number.

## Model (locked)

| Tier | Is | SF | UTM |
|---|---|---|---|
| Initiative | strategic umbrella, brand-agnostic | parent SF campaign (rollup, `sf_parents`) | — |
| Campaign | one wave / convention / single send; brand set here | the wave's SF campaign (`sf_code` → grouping) | — |
| **Deliverable** | one email / blog / social asset | child SF **member** (own code + SF id) | `utm_campaign` = deliverable SF code · `utm_content` = deliverable |

> Wave 7 becomes **one** campaign (`P28-W7`) with **three** deliverables
> (`P28-EML-EL/-SE/-PU`, `wave7-elm/-sec/-pur`) — not three campaigns.

## Delivered

1. **Schema — `0007_deliverables.sql`:**
   - `deliverables` (`id`, `campaign_id` FK **ON DELETE CASCADE**, `kind` check
     `email|blog|social`, `name`, `sf_code`, `sf_id`, `sf_name`, `utm_content`,
     `utm_source` (default `pardot`, check `pardot|salesforce`),
     `email_subject`, `segment`, `landing_page`, `deliver_at timestamptz`,
     `sort` int, `created_at`). Index on `campaign_id`.
   - `deliverable_tasks` (`id`, `deliverable_id` FK CASCADE, `kind` check
     `comp|code|send`, `due date`, `owner text`) — the hand-off chain.
   - `lists` (`id`, `name unique`, `reach int`, `region text` —
     National/California/Texas) **seeded** from the mockup's `LISTS` dictionary
     **and staff-editable** (name/reach corrections, add/remove — see UI/Actions);
     `deliverable_lists` (`deliverable_id`, `list_id`, pk both) join.
   - **Data re-model:** the three Wave 7 campaigns → one `P28-W7` campaign +
     three email deliverables (`scripts/seed-prop28-wave7-deliverables.mjs`,
     supersedes `scripts/seed-prop28-wave7.mjs`). Financials/RLS untouched.
     **As-built:** `campaigns.utm_content` was **kept, not dropped** — it still
     serves simple single-send campaigns that have no deliverables; deliverables
     carry their own `utm_content`. So `utm_content` lives at both levels.
   - RLS (Cycle 5 pattern): `deliverables`/`deliverable_tasks`/`lists`/
     `deliverable_lists` readable by authenticated, writable by staff. No
     financial columns here.

2. **lib** — `types.ts` gains `Deliverable`, `DeliverableTask`, `List`;
   `queries.ts` `getHomeData` joins deliverables (+ tasks + lists) under
   campaigns; `utm.ts` gains a deliverable-aware assemble (per D2: source
   `pardot|salesforce`, medium `email`, campaign = deliverable SF code);
   a `deliverables.ts` helper for reach summation + chain ordering.

3. **Actions** — `create/update/deleteDeliverable`, task upserts, list
   attach/detach, **`create/update/deleteList`** (staff, for reach/name
   corrections); campaign create/update no longer writes `utm_content`.
   Importer extended: deliverables keyed by SF code, lists by name, idempotent.

4. **UI** — expandable **campaign → deliverable** tree in the detail drawer
   matching the mockup: deliverable card → comp/code/send **chain**, the two
   **role cards** ("Information for Email Send" / "Information for Coding"), and
   the **audience-list** chips with combined reach. New-campaign modal gains the
   "Deliverables & audience lists" sub-form (kind, name, multi-list picker with
   live reach, live UTM preview).

5. **Calendar** — month/week/day surface deliverable **sends** (from
   `deliver_at`) **alongside** the existing campaign launch/comp markers (augment,
   not replace).

6. **Export — Jira** — per email deliverable emit **comp / code / send** tasks
   (owner + due + metadata in the description), mirroring the mockup's export
   modal. Sits beside the existing XLSX / SF-CSV exports.

7. **Docs** — CLAUDE.md, AGENTS.md, README, CHANGELOG updated to three tiers;
   `v1.5.0`.

## Locked decisions (operator-confirmed)

- **D1 — SF layering / `utm_campaign`.** `utm_campaign` = the **deliverable's SF
  code** (`P28-EML-EL`); the campaign `sf_code` (`P28-W7`) is the wave grouping.
- **D2 — UTM source/medium.** `utm_medium` = **`email`** for email deliverables.
  `utm_source` is a **stored, editable** deliverable field, **default `pardot`**,
  allowed **`pardot` or `salesforce`** (either is acceptable). This **supersedes
  the Cycle 9 "any SF identity → `salesforce`" rule** for deliverable-level UTMs
  — update `utm.ts` accordingly and note it in README/CLAUDE.md.
- **D3 — Calendar.** Deliverable **sends show on the calendar** (from
  `deliver_at`), **alongside** — not replacing — campaign launch/comp markers.
- **D4 — Lists.** **Seed** the audience lists from the mockup dictionary **and**
  make them **staff-editable** for corrections (name/reach; add/remove).

## Verification (planned)

- `tsc --noEmit`, lint, `next build` clean.
- Migration transactional; `deliverables`/tasks/lists FKs cascade; re-model
  yields **1** `P28-W7` campaign + **3** deliverables (re-run idempotent).
- A Wave 7 email deliverable renders chain + both role cards + its list with the
  right combined reach; UTM assembles to
  `?utm_source=pardot&utm_medium=email&utm_campaign=P28-EML-EL&utm_content=wave7-elm`
  (source editable to `salesforce`).
- A deliverable's `deliver_at` shows as a send marker on the July 2026 grid; a
  staff edit to a list's reach updates the deliverable's combined-reach total.
- Jira export for Wave 7 → 3 emails × (comp/code/send) = 9 tasks, owners Chris /
  Adam / Tami.
- RLS unchanged for financials; new tables read=authed / write=staff.

## Out of scope

Conversational creation of deliverables (Cycle 13); real Salesforce/Pardot API
sync; live Jira API (export stays preview/CSV like today); per-list dynamic
counts (reach is stored, not queried).
