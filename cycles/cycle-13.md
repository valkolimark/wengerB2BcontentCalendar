# Cycle 13 — Deliverable dates on the calendar + July 2026 load (v1.6.0)

**Goal:** Render deliverable **comp / code / send** dates on the calendar, add a
per-campaign `utm_campaign_override`, extend the AI assistant to answer
deliverable questions, then load the Campaign Reference (July 2026 v2) as the
first real dataset. **July 2026 month view is the acceptance fixture.**

**Starting state:** end of Cycle 12 (`v1.5.0`) — the deliverable tier already
exists (`deliverables` + `deliverable_tasks` chain + `lists` catalog +
`deliverable_lists`). Prop 28 is already re-modeled to one `P28-W7` campaign +
three deliverables and **must not be touched**.

## Reconciliation with the pasted spec (important)

The cycle spec was authored against the pre-Cycle-12 state (Prop 28 as three
flat campaigns; a flat deliverables table with comp/code/send *columns* and
`audience_lists text[]`). Cycle 12 already shipped a richer model. Per operator
decision we **map onto the Cycle-12 tables** instead of adding the spec's flat
columns:

| Spec (flat) | As-built (Cycle 12 model) |
| --- | --- |
| `comp_due/comp_owner/code_due/code_owner/send_owner` | `deliverable_tasks` rows (kind comp/code/send · `due` · `owner`) |
| `send_date` + `send_time` | `deliverables.deliver_at` (timestamptz) + new `send_time` echo |
| `audience_lists text[]` | `lists` catalog + `deliverable_lists` join (already seeded) |
| `sf_campaign_name` | existing `deliverables.sf_name` |
| `sequence_no` | existing `deliverables.sort` |
| `setup_date`, `status`, `notes` | **added** this cycle |

Both models yield the **same calendar, UTMs, and Step-D result**.

## Delivered

1. **Schema — `0008_deliverable_july.sql`:** `campaigns.utm_campaign_override`;
   `deliverables` gains `setup_date`, `send_time`, `status`, `notes` and a
   `'landing'` kind. RLS unchanged (deliverables already read = authed / write =
   staff, which equals "readable iff parent campaign readable" since campaigns
   are readable by all authenticated).
2. **UTM (override + deliverable fallback).** For a deliverable:
   `utm_campaign = derive(deliverable.sf_code)` when it has its own SF code
   (Prop 28), else `campaign.utm_campaign_override ?? derive(campaign.sf_code)`
   (July campaigns). `utm_medium` from kind; `utm_source` stored (pardot default).
   Campaign form gains an optional override field.
3. **Calendar.** Deliverable **send** (filled brand), **comp** (amber dashed),
   **code** (blue dashed) markers alongside campaign launch/comp. Legend with
   five toggles (Campaign: Launches, Comp-review due · Deliverables: Comp due,
   Code due, Sends), all on, client-side hide/show. Clicking a deliverable
   marker opens the drawer focused on that deliverable (the two role blocks:
   **Information for Email Send** / **Information for Coding**).
4. **Assistant.** Tools + system prompt extended so it answers deliverable
   questions (next send, a send's UTM/subject/segment/lists, the comp/code/send
   chain). Read-only; financial gating unchanged.
5. **Seed — `scripts/seed-july-2026.mjs`** (guarded `CONFIRM=SEED`, idempotent).
   Brands (Wenger/JRClancy/GearBoss/Creative Conners); six initiatives; campaigns
   upserted on SF code with overrides; deliverables upserted on
   `campaign_id + utm_content`, chain → `deliverable_tasks`, audience →
   `deliverable_lists`, send date+time → `deliver_at`. Landing campaigns:
   `Web/Landing`, no dates → no calendar events. **Prop 28 untouched.**

## Parameters (from the spec)

`THSCA_PLACEMENT=own_initiative` · `TX_SUMMER_SHOW=under_conv_music_ed` ·
`UTM_CAMPAIGN_POLICY=override_where_documented_else_derive` ·
owners comp Chris Klett / code Adam Bengtson / send Tami ·
`TX_SUMMER_SHOW_BRAND=Wenger` (assumption).

## Verify (July 2026 fixture)

Sends: Jul 7 THSCA E3 · Jul 8 TIM · Jul 9 TX handoff + US five-tips · Jul 14 CC
E3 + THSCA pre-show + TX Summer Show · Jul 15 Prop 28 ×3 (pre-existing) · Jul 20
THSCA mid-show · Jul 22 US GearBoss + THSCA post-show 1 · Jul 29 THSCA
post-show 2. Comp/code dashed on their dates. `THSCA-EML` = 5 deliverables under
one campaign. Landing campaigns emit no events. Toggling Sends hides only sends.
Prop 28 rows unmodified (id diff). Re-run idempotent. `tsc`/lint/build/dev clean.

## Open items carried (flagged, not resolved)

[PROPOSED] utm_campaign slugs (TIM/TX/US athletics); TX Summer Show brand =
Wenger (assumed); THSCA mid/post comp+code dates unassigned; TXFN 7 more sends
undated; audience-list multi-select UI polish; Jul 22 overlap suppression is
Mark's call.
