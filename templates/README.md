# Initiative + Deliverables CSV

One row per **deliverable**. The initiative and its Salesforce campaigns repeat
on each of that initiative's rows. Get a pre-filled copy from the app:
**Data → Deliverables template (CSV)** — it exports current data, so you edit
and re-upload. Apply it via **Data → Import deliverables (CSV)** (admin).

## How it matches / updates

- **Initiative** is matched by name (created if new). Owner/Status update only
  when provided.
- **Salesforce campaigns**: the `SF Parent / Email / Landing / Social` columns
  set the initiative's rollup parent and per-channel child campaigns. A role
  with any value is upserted; a fully-blank role is left alone.
- **Deliverable** is matched by **Campaign SF Code + utm_content**. If the
  Campaign SF Code doesn't exist, the row is skipped (create the campaign first).
- **Scalar fields** the CSV carries are authoritative — a **blank cell clears**
  that field. (The template pre-fills current values, so only blank on purpose.)
- **Comp/Code/Send** each upsert when a Due or Owner is present; a fully-blank
  step is left untouched (so a linked Jira issue isn't disturbed).
- **Audience Lists** (semicolon-separated) replace the deliverable's lists;
  unknown list names are created with reach 0.

## Columns

| Column | Notes |
|---|---|
| Initiative | required · match/create key |
| Initiative Owner / Status | updated when present |
| SF Parent Name / ID / Code | rollup parent campaign |
| SF Email/Landing/Social Name / ID / Code | per-channel child; deliverables inherit their kind's child |
| Campaign SF Code | required for a deliverable row · must exist |
| Campaign Name | reference only (ignored on import) |
| Deliverable Kind | email · landing · social · blog |
| Deliverable Name | |
| utm_content | required for a deliverable row · match key within the campaign |
| Deliverable SF Code / ID / Name | blank inherits the initiative's channel child |
| Email Subject / Segment / Landing Page / Send Time / Status | |
| Deliver At | ISO `YYYY-MM-DD` (or with time) |
| Comp/Code/Send Due | ISO `YYYY-MM-DD` |
| Comp/Code/Send Owner | e.g. Chris Klett · Tami Roberts |
| Audience Lists | `List A; List B` |

An **initiative-only** row (no Campaign SF Code / utm_content) just updates the
initiative + its SF campaigns.
