# Cycle 4 — CRUD + searchable pickers + orphan adoption + global search

**Goal:** Turn the read-only home screen into a working editor. Add/edit/delete
for brands, initiatives, campaigns; searchable initiative picker; orphan
surfacing + adoption; global search.

**Starting state:** end of Cycle 3 (`1e03f3d`).

## Delivered

1. **Server actions** (`src/lib/actions.ts`) — brand/initiative/campaign CRUD +
   `adoptCampaigns`. `deleteBrand` refuses if in use; `deleteInitiative` relies
   on `ON DELETE SET NULL` (campaigns orphan, not deleted). Each
   `revalidatePath('/')`; clients call `router.refresh()`.
2. **BrandModal** — add (color → derived tint/text) + live preview; delete
   (disabled + reason when in use). Entry: "+ Brand" in the legend.
3. **InitiativeModal** — add/edit; members list; adopt search (orphans first,
   widens on query) → `adoptCampaigns` on save.
4. **CampaignModal** — searchable initiative picker; brand select; fields; live
   UTM preview (source/medium derived, campaign = SF code); create adds launch +
   auto comp-due (−10d, toggle) events; edit is metadata-only.
5. **Drawer write affordances** — edit + delete in both modes.
6. **Orphan surfacing** — `OrphanBar` lists unassigned campaigns; each adoptable.
7. **Global search** — filters cards + results strip → open campaign drawer.
8. **New-entry points** — "+ Initiative" / "+ Campaign" in the header.

## Verification

DB-level transactional smoke test (rolled back) confirmed: createCampaign +
events, updateCampaign keeps events, adopt reparents orphan, deleteInitiative
orphans children (SET NULL), deleteCampaign cascades events. SSR shows the
search bar and all + affordances. tsc / lint / build clean.

## Out of scope (later cycles)

Auth + RLS financial gating (Cycle 5) — financials stay behind the hardcoded
`canSeeFinancials` flag; XLSX (Cycle 6); Vercel deploy + hardening (Cycle 7).
