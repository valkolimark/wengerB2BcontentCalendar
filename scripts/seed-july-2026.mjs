// seed-july-2026.mjs — Cycle 13 data load (Campaign Reference, July 2026 v2).
// Loads the July production calendar as the acceptance fixture: initiatives,
// campaigns (with utm_campaign overrides), and email deliverables with their
// comp→code→send chains. Maps onto the Cycle-12 model (deliverable_tasks +
// deliverable_lists) per cycles/cycle-13.md — NOT flat columns.
//
// PROP 28 IS NOT TOUCHED. This script never reads or writes P28-* rows.
//
// GUARDED + idempotent: campaigns upsert on SF code, deliverables on
// (campaign_id, utm_content); chain/lists are replace-on-save. Requires an
// explicit confirmation. Direct Postgres (bypasses RLS); server-side only —
// never import SUPABASE_SERVICE_ROLE_KEY into client code. Not wired into build.
//
//   CONFIRM=SEED node scripts/seed-july-2026.mjs      # apply
//   node scripts/seed-july-2026.mjs --dry-run         # plan only (rolls back)
import { readFileSync } from "node:fs";
import { Client } from "pg";

const DRY = process.argv.includes("--dry-run");
const CONFIRMED = process.env.CONFIRM === "SEED" || process.argv.includes("--confirm");
if (!CONFIRMED && !DRY) {
  console.error("Refusing to run without confirmation. Use CONFIRM=SEED or --confirm (or --dry-run).");
  process.exit(1);
}

const OWN = { comp: "Chris Klett", code: "Adam Bengtson", send: "Tami" };

// Brands (id · label · dot). Created only if missing; existing rows untouched.
const BRANDS = [
  { id: "wenger", label: "Wenger", dot: "#1C3B66" },
  { id: "jrclancy", label: "JRClancy", dot: "#2E6B3E" },
  { id: "gearboss", label: "GearBoss", dot: "#B22234" },
  { id: "cc", label: "Creative Conners", dot: "#E0721F" },
];

// Initiatives (name). NOTE: the doc's per-initiative "parent SF id" (701…) has
// no column on `initiatives` in the current schema — flagged, not stored.
const INITIATIVES = [
  "CC 2026 Summer Pricing Promo",
  "Conv THSCA 2026 - Athletic Show",
  "2026 JR Clancy TIM Program",
  "TX — Athletics - Marching 2026",
  "US - Athletics Marching 2026",
  "Conv Music Ed 2026",
];

// Campaigns: sf_code · initiative · brand · sf_id · override · channel.
// Landing campaigns use channel Web/Landing and carry no deliverables → no events.
const CAMPAIGNS = [
  { sf_code: "CC26SP-EML", init: "CC 2026 Summer Pricing Promo", brand: "cc", sf_id: "701Pr00000n3v2NIAQ", override: "cc-summer-build-2026", channel: "Email", name: "CC Summer Pricing — Email" },
  { sf_code: "CC26SP-LP", init: "CC 2026 Summer Pricing Promo", brand: "cc", sf_id: "701Pr00000n4GefIAE", override: "cc-summer-build-2026", channel: "Web/Landing", name: "CC Summer Pricing — Landing" },
  { sf_code: "THSCA-EML", init: "Conv THSCA 2026 - Athletic Show", brand: "gearboss", sf_id: "701Pr00000nXb9UIAS", override: "thsca2026", channel: "Email", name: "Conv THSCA 2026 — Email" },
  { sf_code: "THSCA-WEB", init: "Conv THSCA 2026 - Athletic Show", brand: "gearboss", sf_id: "701Pr00000oL3qvIAC", override: "thsca2026", channel: "Web/Landing", name: "Conv THSCA 2026 — Landing" },
  { sf_code: "TIM-EML", init: "2026 JR Clancy TIM Program", brand: "jrclancy", sf_id: "701Pr00000iotnxIAA", override: "tim-2026", channel: "Email", name: "JR Clancy TIM — Email" },
  { sf_code: "TXFN-EML", init: "TX — Athletics - Marching 2026", brand: "gearboss", sf_id: "701Pr00000l5D86IAE", override: "tx-athletics-2026", channel: "Email", name: "TX Friday Night — Email" },
  { sf_code: "TXFN-WEB", init: "TX — Athletics - Marching 2026", brand: "gearboss", sf_id: "701Pr00000lhmeGIAQ", override: "tx-athletics-2026", channel: "Web/Landing", name: "TX Friday Night — Landing" },
  { sf_code: "USAM-EML", init: "US - Athletics Marching 2026", brand: "gearboss", sf_id: "701Pr00000lhfMiIAI", override: "us-athletics-2026", channel: "Email", name: "US Athletics Marching — Email" },
  { sf_code: "USAM-WEB", init: "US - Athletics Marching 2026", brand: "gearboss", sf_id: "701Pr00000liM3NIAU", override: "us-athletics-2026", channel: "Web/Landing", name: "US Athletics Marching — Landing" },
  { sf_code: "TXSM26-CON", init: "Conv Music Ed 2026", brand: "wenger", sf_id: "701Pr00000hScftIAC", override: null, channel: "Email", name: "Texas Summer Show — Email" },
];

// Deliverables: campaign sf_code · utm_content · name · dates (2026) · extras.
// comp/code/send become deliverable_tasks; send always dated (drives the marker).
const D = (o) => ({ setup: null, subject: null, segment: null, notes: null, send_time: null, lists: [], comp: null, code: null, ...o });
const DELIVERABLES = [
  D({ sf: "THSCA-EML", utm: "thsca-e3", name: "E3 · Plan your visit / booth reveal", comp: "2026-07-02", code: "2026-07-03", setup: "2026-07-06", send: "2026-07-07", sort: 0, subject: "THSCA is in 2 weeks. Here's what to see at booth #362" }),
  D({ sf: "THSCA-EML", utm: "thsca-preshow", name: "Final pre-show blast", comp: "2026-07-09", code: "2026-07-10", setup: "2026-07-13", send: "2026-07-14", sort: 1 }),
  D({ sf: "THSCA-EML", utm: "thsca-midshow", name: "Mid-show / in-show email", send: "2026-07-20", sort: 2 }),
  D({ sf: "THSCA-EML", utm: "thsca-postshow1", name: "Post-show 1", send: "2026-07-22", sort: 3 }),
  D({ sf: "THSCA-EML", utm: "thsca-postshow2", name: "Post-show 2", send: "2026-07-29", sort: 4 }),
  D({ sf: "TIM-EML", utm: "tim-green-jul8", name: "TIM email (green fonts)", comp: "2026-06-30", code: "2026-07-06", send: "2026-07-08", sort: 0 }),
  D({ sf: "TXFN-EML", utm: "txfn-handoff", name: "Football equipment handoff", send: "2026-07-09", sort: 0, notes: "Single SF child for all 8 TX Friday Night sends; per-wave via utm_content. 7 more sends undated. Comp date confirm w/ Adam." }),
  D({ sf: "USAM-EML", utm: "usam-fivetips", name: "Five tips for streamlining", send: "2026-07-09", send_time: "AM", sort: 0, lists: ["K-12_ALL Athletic List_Coach-Director-Trainers_6-2026"], notes: "Comps in hand; lists uploaded Jun 29." }),
  D({ sf: "USAM-EML", utm: "usam-gearboss", name: "US GearBoss email", comp: "2026-07-17", code: "2026-07-20", send: "2026-07-22", sort: 1 }),
  D({ sf: "CC26SP-EML", utm: "cc-spp-e3", name: "Email 3 — Spikemark Console", comp: "2026-07-09", code: "2026-07-10", setup: "2026-07-13", send: "2026-07-14", sort: 0, notes: "Expedited — Adam on vacation week of Jul 13; comps approve same day Jul 9, code back to Tami EOD Jul 10." }),
  D({ sf: "TXSM26-CON", utm: "txsm-announce", name: "Show announcement", comp: "2026-07-09", code: "2026-07-10", setup: "2026-07-13", send: "2026-07-14", sort: 0, notes: "Show Jul 16–18, San Antonio, TX" }),
];

/* ── UTM preview (mirrors src/lib/utm.ts) ─────────────────────────────────── */
const assembleUtm = (d, camp) => {
  const cmp = (d.own_sf && d.own_sf.trim()) || (camp.override && camp.override.trim()) || camp.sf_code;
  return `?utm_source=pardot&utm_medium=email&utm_campaign=${cmp}&utm_content=${d.utm}`;
};

/* ── connection (mirrors scripts/run-sql.mjs) ─────────────────────────────── */
function envv(k) {
  if (process.env[k]) return process.env[k];
  try {
    const e = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const l of e.split("\n")) { const m = l.match(new RegExp(`^\\s*${k}\\s*=\\s*(.+?)\\s*$`)); if (m) return m[1]; }
  } catch {}
  return undefined;
}
const directUrl = envv("SUPABASE_DB_URL");
if (!directUrl) { console.error("SUPABASE_DB_URL not found"); process.exit(1); }
const u = new URL(directUrl), pw = decodeURIComponent(u.password);
const REF = u.username.match(/postgres\.([a-z0-9]+)/)?.[1] || u.hostname.match(/(?:db\.)?([a-z0-9]+)\.supabase\.co/)?.[1];
const REGIONS = ["us-east-1","us-east-2","us-west-1","us-west-2","ca-central-1","eu-central-1","eu-west-1","eu-west-2","eu-west-3","eu-north-1","ap-southeast-1","ap-southeast-2","ap-northeast-1","ap-northeast-2","ap-south-1","sa-east-1"];
const cands = [];
if (!directUrl.includes("db." + REF)) cands.push(directUrl);
if (REF) for (const p of ["aws-0","aws-1"]) for (const r of REGIONS) cands.push(`postgresql://postgres.${REF}:${encodeURIComponent(pw)}@${p}-${r}.pooler.supabase.com:5432/postgres`);
if (directUrl.includes("db." + REF)) cands.push(directUrl);
async function connect() {
  for (const c of cands) {
    try { const cl = new Client({ connectionString: c, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 }); await cl.connect(); console.log("Connected via", c.replace(/:[^:@/]+@/, ":****@")); return cl; }
    catch (e) { const r = e.message.split("\n")[0]; if (!/ENOTFOUND|ETIMEDOUT|EAI_AGAIN/.test(r)) console.log("  x ->", r); }
  }
  throw new Error("no connection");
}
const hx = (h) => { h = h.replace("#", ""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const mix = (a, b, t) => "#" + hx(a).map((v, i) => Math.round(v + (hx(b)[i] - v) * t).toString(16).padStart(2, "0")).join("");

/* ── run ──────────────────────────────────────────────────────────────────── */
const db = await connect();
const q = (t, p) => db.query(t, p);
const countAll = async () => {
  const o = {};
  for (const t of ["initiatives", "campaigns", "deliverables", "deliverable_tasks", "deliverable_lists"]) o[t] = (await q(`select count(*)::int n from ${t}`)).rows[0].n;
  return o;
};
try {
  const before = await countAll();
  if (DRY) console.log("\n*** DRY RUN — will roll back ***");
  await q("begin");

  for (const b of BRANDS)
    await q("insert into brands (id,label,dot,tint,text) values ($1,$2,$3,$4,$5) on conflict (id) do nothing", [b.id, b.label, b.dot, mix(b.dot, "#ffffff", 0.86), mix(b.dot, "#000000", 0.5)]);

  const initId = {};
  for (const name of INITIATIVES) {
    let row = (await q("select id from initiatives where name=$1", [name])).rows[0];
    if (!row) row = (await q("insert into initiatives (name,owner,status) values ($1,'Mark Mireles','Planning') returning id", [name])).rows[0];
    initId[name] = row.id;
  }

  const campId = {};
  for (const c of CAMPAIGNS) {
    const vals = [initId[c.init], c.brand, c.name, c.channel, "N/A (Owned)", c.sf_code, c.sf_id, c.override, "salesforce", "email"];
    let row = (await q("select id from campaigns where sf_code=$1", [c.sf_code])).rows[0];
    if (row) {
      await q("update campaigns set initiative_id=$1, brand_id=$2, name=$3, channel=$4, vendor=$5, sf_id=$7, utm_campaign_override=$8, utm_source=$9, utm_medium=$10 where sf_code=$6", vals);
    } else {
      row = (await q("insert into campaigns (initiative_id,brand_id,name,channel,vendor,sf_code,sf_id,utm_campaign_override,utm_source,utm_medium) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id", vals)).rows[0];
    }
    campId[c.sf_code] = row.id;
  }

  const campBySf = Object.fromEntries(CAMPAIGNS.map((c) => [c.sf_code, c]));
  for (const d of DELIVERABLES) {
    const cid = campId[d.sf];
    const f = [cid, d.name, d.utm, d.subject, d.segment, d.setup, d.send_time, d.notes, d.sort];
    let row = (await q("select id from deliverables where campaign_id=$1 and utm_content=$2", [cid, d.utm])).rows[0];
    if (row) {
      await q("update deliverables set campaign_id=$1, name=$2, utm_content=$3, email_subject=$4, segment=$5, setup_date=$6, send_time=$7, notes=$8, sort=$9, kind='email', utm_source='pardot' where id=$10", [...f, row.id]);
    } else {
      row = (await q("insert into deliverables (campaign_id,name,utm_content,email_subject,segment,setup_date,send_time,notes,sort,kind,utm_source) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'email','pardot') returning id", f)).rows[0];
    }
    const did = row.id;

    // Chain — replace (only dated steps; send always dated).
    await q("delete from deliverable_tasks where deliverable_id=$1", [did]);
    const steps = [["comp", d.comp, OWN.comp], ["code", d.code, OWN.code], ["send", d.send, OWN.send]];
    for (const [kind, due, owner] of steps) if (due) await q("insert into deliverable_tasks (deliverable_id,kind,due,owner) values ($1,$2,$3,$4)", [did, kind, due, owner]);

    // Lists — replace (resolve by name; catalog seeded in 0007).
    await q("delete from deliverable_lists where deliverable_id=$1", [did]);
    for (const name of d.lists) {
      const l = (await q("select id from lists where name=$1", [name])).rows[0];
      if (l) await q("insert into deliverable_lists (deliverable_id,list_id) values ($1,$2) on conflict do nothing", [did, l.id]);
      else console.log(`  ! list not found: ${name}`);
    }
  }

  if (DRY) { await q("rollback"); console.log("*** rolled back ***"); }
  else await q("commit");

  const after = await countAll();
  console.log("\n── Counts (before → after) ──");
  for (const t of Object.keys(before)) console.log(`  ${t.padEnd(20)} ${before[t]} → ${after[t]}`);

  console.log("\n── Assembled UTM per dated deliverable ──");
  for (const d of DELIVERABLES) console.log(`  ${d.send}  ${d.name}\n    ${assembleUtm(d, campBySf[d.sf])}`);

  console.log("\n── Flags (no schema home; not stored) ──");
  console.log("  • Initiative parent SF ids (701…) — no column on initiatives.");
  console.log("  • Campaign-level window/show notes — campaigns have no notes column.");
  console.log("  • sf_campaign_name echo — campaign SF names not provided in the doc.");
  console.log("  • [PROPOSED] utm_campaign slugs (TIM/TX/US) + TX Summer Show brand (Wenger) — confirm w/ Mark.");
} catch (e) {
  await q("rollback");
  console.error("\nFAILED — rolled back.\n", e.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
