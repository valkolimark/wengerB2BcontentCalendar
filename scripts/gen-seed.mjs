// One-off generator for supabase/seed.sql.
// Mirrors reference/ContentTracker.jsx seed data exactly, computing brand
// tint/text with the same tintOf/textOf logic and assigning stable UUIDs so
// foreign keys resolve. Run: node scripts/gen-seed.mjs
import { writeFileSync } from "node:fs";

/* color helpers (identical to src/lib/brands.ts) */
const hx = (h) => { h = h.replace("#", ""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const mix = (a, b, t) => { const A = hx(a), B = hx(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
const tintOf = (dot) => mix(dot, "#ffffff", 0.86);
const textOf = (dot) => mix(dot, "#000000", 0.5);

const BRANDS = [
  { id: "wenger", label: "Wenger", dot: "#1C3B66" },
  { id: "jrclancy", label: "JRClancy", dot: "#2E6B3E" },
  { id: "gearboss", label: "GearBoss", dot: "#B22234" },
  { id: "cc", label: "Creative Conners", dot: "#E0721F" },
  { id: "txscenic", label: "Texas Scenic", dot: "#3E5871" },
  { id: "lutefish", label: "Lutefish", dot: "#0E7C86" },
  { id: "corp", label: "Corporate", dot: "#4A5568" },
].map((b) => ({ ...b, tint: tintOf(b.dot), text: textOf(b.dot) }));

// Stable UUIDs keyed by the prototype's slug ids.
const INIT_UUID = {
  prop28: "11111111-1111-1111-1111-111111111101",
  txfn: "11111111-1111-1111-1111-111111111102",
  gbath: "11111111-1111-1111-1111-111111111103",
  jrcrig: "11111111-1111-1111-1111-111111111104",
  ccspk: "11111111-1111-1111-1111-111111111105",
  pupn: "11111111-1111-1111-1111-111111111106",
  txs: "11111111-1111-1111-1111-111111111107",
};
const CAMP_UUID = {
  "c-prop": "22222222-2222-2222-2222-222222222201",
  "c-txfn": "22222222-2222-2222-2222-222222222202",
  "c-gb": "22222222-2222-2222-2222-222222222203",
  "c-jrc": "22222222-2222-2222-2222-222222222204",
  "c-cc": "22222222-2222-2222-2222-222222222205",
  "c-pupn-w": "22222222-2222-2222-2222-222222222206",
  "c-pupn-g": "22222222-2222-2222-2222-222222222207",
  "c-txs": "22222222-2222-2222-2222-222222222208",
};

const INITIATIVES = [
  { id: "prop28", name: "Prop 28", owner: "Whitney Winkels", status: "In flight" },
  { id: "txfn", name: "TX Friday Night Ready", owner: "Mark Mireles", status: "Launching soon" },
  { id: "gbath", name: "GearBoss athletics push", owner: "Pete Veal", status: "On track" },
  { id: "jrcrig", name: "JRClancy rigging spotlight", owner: "Whitney Winkels", status: "In review" },
  { id: "ccspk", name: "Creative Conners Spikemark", owner: "Unassigned", status: "Planning" },
  { id: "pupn", name: "PUPN facilities feature", owner: "Mark Mireles", status: "On track" },
  { id: "txs", name: "Texas Scenic search", owner: "Mark Mireles", status: "On track" },
];

const CAMPAIGNS = [
  { id: "c-prop", initiativeId: "prop28", brand: "wenger", name: "Prop 28 — email waves", channel: "Email", vendor: "N/A (Owned)", segment: "Elementary; Secondary; Purchasing", owner: "Whitney Winkels", sf: "WEN-2026-PROP28", utm: { source: "email", medium: "email", content: "wave4-urgency" }, leads: 142, pipeline: 86000, events: [
    { type: "comp", date: "2026-05-08", label: "W1 comp" }, { type: "launch", date: "2026-05-13", label: "Prop 28 W1" },
    { type: "launch", date: "2026-05-20", label: "Prop 28 W2" }, { type: "launch", date: "2026-05-27", label: "Prop 28 W3" },
    { type: "comp", date: "2026-06-05", label: "W4 comp" }, { type: "launch", date: "2026-06-10", label: "Prop 28 W4" },
    { type: "launch", date: "2026-06-17", label: "Prop 28 W5" }, { type: "launch", date: "2026-06-24", label: "Prop 28 W6" },
    { type: "launch", date: "2026-07-01", label: "Prop 28 W7" }, { type: "launch", date: "2026-07-08", label: "Prop 28 W8" },
  ] },
  { id: "c-txfn", initiativeId: "txfn", brand: "corp", name: "TXFN — weekly email", channel: "Email", vendor: "N/A (Owned)", segment: "TX K-12 Athletics", owner: "Mark Mireles", sf: "CORP-2026-TXFN-EML", utm: { source: "email", medium: "email", content: "wave1-urgency" }, leads: 0, pipeline: 0, events: [
    { type: "comp", date: "2026-06-12", label: "TXFN review" }, { type: "launch", date: "2026-06-19", label: "TXFN wk1" },
    { type: "launch", date: "2026-06-26", label: "TXFN wk2" }, { type: "launch", date: "2026-07-03", label: "TXFN wk3" }, { type: "launch", date: "2026-07-10", label: "TXFN wk4" },
  ] },
  { id: "c-gb", initiativeId: "gbath", brand: "gearboss", name: "AirPro Elite banner", channel: "Banner Ads", vendor: "LinkedIn", segment: "Athletic Directors", owner: "Pete Veal", sf: "GB-2026-ATH", utm: { source: "linkedin", medium: "display", content: "airpro-elite" }, leads: 58, pipeline: 41000, events: [
    { type: "comp", date: "2026-06-10", label: "GB comp" }, { type: "launch", date: "2026-06-17", label: "GB banner" }, { type: "launch", date: "2026-07-15", label: "GB refresh" },
  ] },
  { id: "c-jrc", initiativeId: "jrcrig", brand: "jrclancy", name: "Rigging spotlight email", channel: "Email Sponsorship", vendor: "SBO", segment: "Theatre Facilities", owner: "Whitney Winkels", sf: "JRC-2026-RIG", utm: { source: "sbo", medium: "email", content: "rigging-spotlight" }, leads: 23, pipeline: 19000, events: [
    { type: "comp", date: "2026-06-18", label: "JRClancy comp" }, { type: "launch", date: "2026-06-24", label: "Rigging email" },
  ] },
  { id: "c-cc", initiativeId: "ccspk", brand: "cc", name: "Spikemark control demo", channel: "Webinar", vendor: "Direct", segment: "Production Managers", owner: "Unassigned", sf: "CCN-2026-SPK", utm: { source: "webinar", medium: "event", content: "spikemark-demo" }, leads: 0, pipeline: 0, events: [
    { type: "comp", date: "2026-06-13", label: "Spikemark comp" }, { type: "launch", date: "2026-06-22", label: "Spikemark" },
  ] },
  { id: "c-pupn-w", initiativeId: "pupn", brand: "wenger", name: "PUPN — Wenger feature", channel: "Email Sponsorship", vendor: "PUPN", segment: "Facilities Directors", owner: "Mark Mireles", sf: "WEN-2026-PUPN", utm: { source: "pupn", medium: "email", content: "facilities-wenger" }, leads: 19, pipeline: 14000, events: [
    { type: "comp", date: "2026-06-15", label: "PUPN-W comp" }, { type: "launch", date: "2026-06-29", label: "PUPN Wenger" },
  ] },
  { id: "c-pupn-g", initiativeId: "pupn", brand: "gearboss", name: "PUPN — GearBoss feature", channel: "Email Sponsorship", vendor: "PUPN", segment: "Athletic Facilities", owner: "Pete Veal", sf: "GB-2026-PUPN", utm: { source: "pupn", medium: "email", content: "facilities-gearboss" }, leads: 12, pipeline: 9000, events: [
    { type: "comp", date: "2026-06-16", label: "PUPN-G comp" }, { type: "launch", date: "2026-07-06", label: "PUPN GearBoss" },
  ] },
  { id: "c-txs", initiativeId: "txs", brand: "txscenic", name: "Stage systems search", channel: "Search Ads", vendor: "Google", segment: "Higher Ed Theatre", owner: "Mark Mireles", sf: "TXS-2026-SRCH", utm: { source: "google", medium: "cpc", content: "stage-systems" }, leads: 31, pipeline: 22000, events: [
    { type: "launch", date: "2026-05-21", label: "TXS search" }, { type: "launch", date: "2026-07-09", label: "TXS search" },
  ] },
];

const q = (v) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);

let out = `-- seed.sql — sample data for the Wenger B2B content calendar.
-- Generated by scripts/gen-seed.mjs from reference/ContentTracker.jsx.
-- Idempotent: safe to re-run (truncates first).

truncate table events, campaigns, initiatives, brands restart identity cascade;

-- brands (7)
insert into brands (id, label, dot, tint, text) values
`;
out += BRANDS.map((b) => `  (${q(b.id)}, ${q(b.label)}, ${q(b.dot)}, ${q(b.tint)}, ${q(b.text)})`).join(",\n") + ";\n\n";

out += `-- initiatives (7)
insert into initiatives (id, name, owner, status) values
`;
out += INITIATIVES.map((i) => `  (${q(INIT_UUID[i.id])}, ${q(i.name)}, ${q(i.owner)}, ${q(i.status)})`).join(",\n") + ";\n\n";

out += `-- campaigns (8)
insert into campaigns (id, initiative_id, brand_id, name, channel, vendor, segment, owner, sf_code, utm_source, utm_medium, utm_content, leads, pipeline) values
`;
out += CAMPAIGNS.map((c) =>
  `  (${q(CAMP_UUID[c.id])}, ${q(INIT_UUID[c.initiativeId])}, ${q(c.brand)}, ${q(c.name)}, ${q(c.channel)}, ${q(c.vendor)}, ${q(c.segment)}, ${q(c.owner)}, ${q(c.sf)}, ${q(c.utm.source)}, ${q(c.utm.medium)}, ${q(c.utm.content)}, ${c.leads}, ${c.pipeline})`
).join(",\n") + ";\n\n";

const eventRows = CAMPAIGNS.flatMap((c) => c.events.map((e) => `  (${q(CAMP_UUID[c.id])}, ${q(e.type)}, ${q(e.date)}, ${q(e.label)})`));
out += `-- events (${eventRows.length})
insert into events (campaign_id, type, date, label) values
`;
out += eventRows.join(",\n") + ";\n";

writeFileSync(new URL("../supabase/seed.sql", import.meta.url), out);
console.log("Wrote supabase/seed.sql");
console.log(`brands=${BRANDS.length} initiatives=${INITIATIVES.length} campaigns=${CAMPAIGNS.length} events=${eventRows.length}`);
console.log("brand tint/text:");
for (const b of BRANDS) console.log(`  ${b.id}: dot=${b.dot} tint=${b.tint} text=${b.text}`);
