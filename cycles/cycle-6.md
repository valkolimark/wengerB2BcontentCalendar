# Cycle 6 — XLSX export / import

**Goal:** Round-trip the data to/from a `.xlsx` workbook (SheetJS) for the
existing workbook/SharePoint workflow. Export respects financial entitlement
(with a scrubbed JMC view); import is admin-gated, previewed, and idempotent.

**Starting state:** end of Cycle 5 (`3ed3bcd`) — auth + RLS; financials in
`campaign_financials`, merged only when entitled.

## Toolchain / safety

- SheetJS (`xlsx`, from the SheetJS CDN — patched 0.20.3) runs **client-side**
  for build + parse. Persistence goes through role-checked Server Actions, so
  RLS applies; the browser never writes to Supabase directly.
- Financial scrubbing is enforced at the data layer: an unentitled caller has no
  financial rows, so their export can't contain dollars. The "JMC view" option
  is for an entitled admin generating a shareable file.
- Import is additive/update-only (no deletes) and idempotent.

## Delivered

1. **XLSX helpers** — `xlsx-export.ts` (build) and `xlsx-import.ts`
   (parse + validate + `diffPayload`).
2. **Export** — Initiatives / Campaigns / Events sheets; assembled UTM column;
   `Leads`/`Pipeline` only when entitled. Full vs JMC modes.
3. **Export UI** — app-bar **Data** menu.
4. **Import preview** (admin) — parse + validate client-side; add/update counts
   + skipped rows shown before any write.
5. **Import apply** — admin-only `importWorkbook`: upserts brands (label/id),
   initiatives (name), campaigns (SF code), events (campaign+type+date),
   financials when present; report of applied/skipped; no deletes;
   `revalidatePath('/')`.

## Verification

- Workbook round-trip (build → parse) reproduced 7 / 8 / 28 rows exactly, zero
  adds; UTM assembled; financials present in Full, absent in JMC.
- DB idempotency (transactional): re-import of the same file → 0 adds, all 28
  events skipped; a new campaign+event added once, re-apply added 0, no
  duplicate events. tsc / lint / build clean.

## Out of scope (later cycles)

Legacy per-brand-tab layout + ~53,700 formulas; deletes via import; a
media-plan-specific column mapper; Vercel deploy + hardening (Cycle 7).
