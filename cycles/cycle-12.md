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
- **`utm_content` moves down a tier.** It currently lives on `campaigns`
  (`0001`); the mockup's Rosetta says **`utm_content` = the deliverable**. After
  this cycle `utm_content` is a **deliverable** field. See migration strategy.
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
     `email_subject`, `segment`, `landing_page`, `deliver_at timestamptz`,
     `sort` int, `created_at`). Index on `campaign_id`.
   - `deliverable_tasks` (`id`, `deliverable_id` FK CASCADE, `kind` check
     `comp|code|send`, `due date`, `owner text`) — the hand-off chain.
   - `lists` (`id`, `name unique`, `reach int`, `region text` —
     National/California/Texas) seeded from the mockup's `LISTS` dictionary;
     `deliverable_lists` (`deliverable_id`, `list_id`, pk both) join.
   - **Data migration:** move `campaigns.utm_content` → a per-campaign
     single deliverable where sensible, then **drop `campaigns.utm_content`**.
     Re-model the three Wave 7 campaigns into one `P28-W7` campaign + three email
     deliverables (supersedes `scripts/seed-prop28-wave7.mjs`). Financials/RLS
     untouched.
   - RLS (Cycle 5 pattern): `deliverables`/`deliverable_tasks`/`lists`/
     `deliverable_lists` readable by authenticated, writable by staff. No
     financial columns here.

2. **lib** — `types.ts` gains `Deliverable`, `DeliverableTask`, `List`;
   `queries.ts` `getHomeData` joins deliverables (+ tasks + lists) under
   campaigns; `utm.ts` gains a deliverable-aware assemble (see decision D2);
   a `deliverables.ts` helper for reach summation + chain ordering.

3. **Actions** — `create/update/deleteDeliverable`, task upserts, list
   attach/detach; campaign create/update no longer writes `utm_content`.
   Importer extended: deliverables keyed by SF code, lists by name, idempotent.

4. **UI** — expandable **campaign → deliverable** tree in the detail drawer
   matching the mockup: deliverable card → comp/code/send **chain**, the two
   **role cards** ("Information for Email Send" / "Information for Coding"), and
   the **audience-list** chips with combined reach. New-campaign modal gains the
   "Deliverables & audience lists" sub-form (kind, name, multi-list picker with
   live reach, live UTM preview).

5. **Calendar** — month/week/day surface deliverable **sends** (and optionally
   comp/code due) alongside campaign launch/comp. Decide overlay vs. replace
   (D3).

6. **Export — Jira** — per email deliverable emit **comp / code / send** tasks
   (owner + due + metadata in the description), mirroring the mockup's export
   modal. Sits beside the existing XLSX / SF-CSV exports.

7. **Docs** — CLAUDE.md, AGENTS.md, README, CHANGELOG updated to three tiers;
   `v1.5.0`.

## Open decisions (lock with operator before coding)

- **D1 — SF layering.** Confirm: deliverable = SF **member** with its own code
  (`P28-EML-EL`) + id (`701Pr00000k0R0vIAE`); campaign `sf_code` (`P28-W7`) is
  the wave grouping. `utm_campaign` derives from the **deliverable** SF code.
- **D2 — UTM source/medium.** The mockup shows **`utm_source=pardot`,
  `utm_medium=email`** for email deliverables. This **overrides** the Cycle 9
  rule ("any SF identity → `utm_source=salesforce`"). Proposed: email
  deliverables → `pardot`/`email` (Pardot is the sending platform); non-email or
  no-SF fall back to the existing derivation. Needs sign-off — it changes an
  established rule.
- **D3 — Calendar.** Do deliverable sends **replace** or **augment** the
  campaign launch/comp markers on the grid?
- **D4 — Lists as data vs. vocab.** Seed `lists` from the mockup dictionary now,
  or make it staff-editable this cycle?

## Verification (planned)

- `tsc --noEmit`, lint, `next build` clean.
- Migration transactional; `deliverables`/tasks/lists FKs cascade; re-model
  yields **1** `P28-W7` campaign + **3** deliverables (re-run idempotent).
- A Wave 7 email deliverable renders chain + both role cards + its list with the
  right combined reach; UTM assembles to `…utm_campaign=P28-EML-EL&utm_content=wave7-elm`
  with the D2-agreed source/medium.
- Jira export for Wave 7 → 3 emails × (comp/code/send) = 9 tasks, owners Chris /
  Adam / Tami.
- RLS unchanged for financials; new tables read=authed / write=staff.

## Out of scope

Conversational creation of deliverables (Cycle 13); real Salesforce/Pardot API
sync; live Jira API (export stays preview/CSV like today); per-list dynamic
counts (reach is stored, not queried).
