// seed-prop28-wave7.mjs — data input (NOT a cycle): seed Prop 28 "Wave 7" as
// three campaigns (one per segment) under the Prop 28 initiative, brand Wenger.
// No schema changes, no new features, no deliverable tier. Idempotent: campaigns
// are matched on SF code, so re-running UPDATES in place (3 campaigns, never 6).
// Not wired into any build/dev/deploy step.
//
//   node scripts/seed-prop28-wave7.mjs            # apply (idempotent upsert)
//   node scripts/seed-prop28-wave7.mjs --dry-run  # connect + print plan, no writes
//
// Connection reuses the pooler-discovery approach from scripts/run-sql.mjs: it
// parses SUPABASE_DB_URL (a direct Postgres URL → bypasses RLS) from env or
// .env.local. No service-role key is embedded; server-side only. Never import
// this into client/browser code.
import { readFileSync } from "node:fs";
import { Client } from "pg";

const DRY = process.argv.includes("--dry-run");

/* ── UTM derivation — replicated verbatim from src/lib/utm.ts (the canon source
   of truth) so the stored utm_source/utm_medium match exactly what the app's
   server action would compute. Keep in sync if utm.ts changes. ────────────── */
const slug = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
const MEDIUM_MAP = {
  email: "email", "email sponsorship": "email", "banner ads": "display",
  "search ads": "cpc", webinar: "event", social: "social", newsletter: "email",
};
const deriveMedium = (channel) => MEDIUM_MAP[(channel || "").toLowerCase()] || "referral";
const deriveSource = (vendor, channel) =>
  /owned|direct|n\/a/i.test(vendor || "")
    ? (deriveMedium(channel) === "email" ? "email" : slug(channel))
    : slug(vendor);
const hasSalesforce = (sf) => [sf.sf_code, sf.sf_id, sf.sf_name].some((v) => (v ?? "").trim() !== "");
const resolveSource = (p) => (hasSalesforce(p) ? "salesforce" : deriveSource(p.vendor, p.channel));
const assembleUtm = ({ source, medium, campaign, content }) =>
  `?utm_source=${source}&utm_medium=${medium}&utm_campaign=${campaign}&utm_content=${content}`;

/* ── Wave 7 data ──────────────────────────────────────────────────────────── */
const BRAND_ID = "wenger";
const BRAND_LABEL = "Wenger";
const BRAND_DOT = "#1C3B66"; // navy
const INITIATIVE_NAME = "Prop 28 — California Initiative";
const INITIATIVE_OWNER = "Mark Mireles";
const SF_PARENT_NAME = "Prop 28 2026"; // rollup (reporting only); SF does the actual rollup

const COMMON = {
  brand_id: BRAND_ID,
  channel: "Email Marketing", // NB: not in utm.ts CHANNELS vocab → medium falls back to "referral" (flagged)
  vendor: "N/A (Owned)",
  owner: INITIATIVE_OWNER, // lead owner
  sf_name: null,
  launch_date: "2026-07-15", // the send
  comp_review_due: "2026-07-10", // comps — Chris Klett
  comp_label: "Comps — Chris Klett", // Chris Klett has no column home; parked on the comp marker label
};

const CAMPAIGNS = [
  {
    name: "Prop 28 — Wave 7 · Elementary",
    launch_label: "Wave 7 · Elementary",
    sf_code: "P28-EML-EL",
    sf_id: "701Pr00000k0R0vIAE",
    utm_content: "wave7-elm",
    segment: "Elementary — TK–5 teachers & arts coordinators",
  },
  {
    name: "Prop 28 — Wave 7 · Secondary",
    launch_label: "Wave 7 · Secondary",
    sf_code: "P28-EML-SE",
    sf_id: "701Pr00000k0DR2IAM",
    utm_content: "wave7-sec",
    segment: "Secondary — 6–12 music directors & fine-arts heads",
  },
  {
    name: "Prop 28 — Wave 7 · Purchasing",
    launch_label: "Wave 7 · Purchasing",
    sf_code: "P28-EML-PU",
    sf_id: "701Pr00000k05mpIAA",
    utm_content: "wave7-pur",
    segment: "Purchasing — district purchasers, CBO & procurement",
  },
];

/* ── connection (mirrors scripts/run-sql.mjs) ─────────────────────────────── */
function fromEnvFile(key) {
  if (process.env[key]) return process.env[key];
  try {
    const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of env.split("\n")) {
      const m = line.match(new RegExp(`^\\s*${key}\\s*=\\s*(.+?)\\s*$`));
      if (m) return m[1];
    }
  } catch {}
  return undefined;
}
const directUrl = fromEnvFile("SUPABASE_DB_URL");
if (!directUrl) { console.error("SUPABASE_DB_URL not found in env or .env.local"); process.exit(1); }
const parsed = new URL(directUrl);
const password = decodeURIComponent(parsed.password);
const REF =
  parsed.username.match(/postgres\.([a-z0-9]+)/)?.[1] ||
  parsed.hostname.match(/(?:db\.)?([a-z0-9]+)\.supabase\.co/)?.[1];
const REGIONS = [
  "us-east-1", "us-east-2", "us-west-1", "us-west-2", "ca-central-1",
  "eu-central-1", "eu-west-1", "eu-west-2", "eu-west-3", "eu-north-1",
  "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ap-northeast-2",
  "ap-south-1", "sa-east-1",
];
const candidates = [];
if (!directUrl.includes("db." + REF)) candidates.push(directUrl);
if (REF) for (const p of ["aws-0", "aws-1"]) for (const r of REGIONS)
  candidates.push(`postgresql://postgres.${REF}:${encodeURIComponent(password)}@${p}-${r}.pooler.supabase.com:5432/postgres`);
if (directUrl.includes("db." + REF)) candidates.push(directUrl);
async function connect() {
  for (const c of candidates) {
    try {
      const cl = new Client({ connectionString: c, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 });
      await cl.connect();
      console.log("Connected via", c.replace(/:[^:@/]+@/, ":****@"));
      return cl;
    } catch (e) {
      const reason = e.message.split("\n")[0];
      if (!/ENOTFOUND|ETIMEDOUT|EAI_AGAIN/.test(reason)) console.log("  x ->", reason);
    }
  }
  throw new Error("Could not connect to the database on any candidate host.");
}

/* ── run ──────────────────────────────────────────────────────────────────── */
const db = await connect();
const q = (text, params) => db.query(text, params);
const campCount = async () => (await q("select count(*)::int n from campaigns")).rows[0].n;

try {
  const before = await campCount();
  const beforeProp28 = (await q(
    "select count(*)::int n from campaigns where sf_code = any($1)",
    [CAMPAIGNS.map((c) => c.sf_code)]
  )).rows[0].n;

  if (DRY) console.log("\n*** DRY RUN — no writes ***");
  await q("begin");

  // 1) Brand Wenger (navy). Create if missing; never overwrite an existing one.
  const brand = (await q("select id from brands where id = $1", [BRAND_ID])).rows[0];
  if (!brand) {
    console.log(`brand ${BRAND_ID}: creating (navy ${BRAND_DOT})`);
    // tint/text mirror src/lib/brands.ts (mix toward white .86 / black .5)
    const hx = (h) => { h = h.replace("#", ""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
    const mix = (a, b, t) => "#" + hx(a).map((v, i) => Math.round(v + (hx(b)[i] - v) * t).toString(16).padStart(2, "0")).join("");
    await q("insert into brands (id,label,dot,tint,text) values ($1,$2,$3,$4,$5)",
      [BRAND_ID, BRAND_LABEL, BRAND_DOT, mix(BRAND_DOT, "#ffffff", 0.86), mix(BRAND_DOT, "#000000", 0.5)]);
  } else {
    console.log(`brand ${BRAND_ID}: exists`);
  }

  // 2) Prop 28 initiative — reuse + rename/reassign (per operator decision).
  //    Prefer an exact "Prop 28 — California Initiative"; else the existing
  //    "Prop 28"; else any "Prop 28%"; else create fresh. Then normalize name +
  //    owner to the task spec. Status is left as-is (not part of this task).
  let init = (await q(
    `select id,name,owner,status from initiatives
     where name = $1 or name = 'Prop 28' or name ilike 'Prop 28%'
     order by (name = $1) desc, (name = 'Prop 28') desc limit 1`,
    [INITIATIVE_NAME]
  )).rows[0];
  if (!init) {
    const ins = (await q(
      "insert into initiatives (name,owner,status) values ($1,$2,'Planning') returning id,name,owner,status",
      [INITIATIVE_NAME, INITIATIVE_OWNER]
    )).rows[0];
    init = ins;
    console.log(`initiative: created "${INITIATIVE_NAME}" (owner ${INITIATIVE_OWNER})`);
  } else {
    console.log(`initiative: reusing "${init.name}" (was owner ${init.owner}, status ${init.status}) → renaming to "${INITIATIVE_NAME}", owner ${INITIATIVE_OWNER}`);
    await q("update initiatives set name = $1, owner = $2 where id = $3", [INITIATIVE_NAME, INITIATIVE_OWNER, init.id]);
  }
  const initiative_id = init.id;

  // 3) SF rollup parent (reporting only). Reuse "Prop 28 2026"; create as root if absent.
  let sfp = (await q("select id,name from sf_parents where name = $1", [SF_PARENT_NAME])).rows[0];
  if (!sfp) {
    sfp = (await q("insert into sf_parents (name) values ($1) returning id,name", [SF_PARENT_NAME])).rows[0];
    console.log(`sf_parent: created "${SF_PARENT_NAME}"`);
  } else {
    console.log(`sf_parent: reusing "${SF_PARENT_NAME}"`);
  }
  const sf_parent_id = sfp.id;

  // 4) Upsert campaigns by sf_code; ensure launch/comp events + 0/0 financials.
  const utmReport = [];
  for (const c of CAMPAIGNS) {
    const utm = {
      utm_source: resolveSource({ vendor: COMMON.vendor, channel: COMMON.channel, sf_code: c.sf_code, sf_id: c.sf_id, sf_name: COMMON.sf_name }),
      utm_medium: deriveMedium(COMMON.channel),
      utm_content: c.utm_content,
    };
    const fields = {
      initiative_id,
      brand_id: COMMON.brand_id,
      name: c.name,
      channel: COMMON.channel,
      vendor: COMMON.vendor,
      segment: c.segment,
      owner: COMMON.owner,
      sf_code: c.sf_code,
      sf_id: c.sf_id,
      sf_name: COMMON.sf_name,
      sf_parent_id,
      ...utm,
    };

    const existing = (await q("select id from campaigns where sf_code = $1", [c.sf_code])).rows[0];
    let campaign_id;
    if (existing) {
      campaign_id = existing.id;
      await q(
        `update campaigns set initiative_id=$1, brand_id=$2, name=$3, channel=$4, vendor=$5,
         segment=$6, owner=$7, sf_code=$8, sf_id=$9, sf_name=$10, sf_parent_id=$11,
         utm_source=$12, utm_medium=$13, utm_content=$14 where id=$15`,
        [fields.initiative_id, fields.brand_id, fields.name, fields.channel, fields.vendor,
         fields.segment, fields.owner, fields.sf_code, fields.sf_id, fields.sf_name, fields.sf_parent_id,
         fields.utm_source, fields.utm_medium, fields.utm_content, campaign_id]
      );
      console.log(`campaign ${c.sf_code}: updated`);
    } else {
      campaign_id = (await q(
        `insert into campaigns (initiative_id,brand_id,name,channel,vendor,segment,owner,
         sf_code,sf_id,sf_name,sf_parent_id,utm_source,utm_medium,utm_content)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) returning id`,
        [fields.initiative_id, fields.brand_id, fields.name, fields.channel, fields.vendor,
         fields.segment, fields.owner, fields.sf_code, fields.sf_id, fields.sf_name, fields.sf_parent_id,
         fields.utm_source, fields.utm_medium, fields.utm_content]
      )).rows[0].id;
      console.log(`campaign ${c.sf_code}: inserted`);
    }

    // Events — idempotent by (campaign_id, type, date).
    const ensureEvent = async (type, date, label) => {
      const hit = (await q("select id from events where campaign_id=$1 and type=$2 and date=$3", [campaign_id, type, date])).rows[0];
      if (hit) { await q("update events set label=$1 where id=$2", [label, hit.id]); }
      else { await q("insert into events (campaign_id,type,date,label) values ($1,$2,$3,$4)", [campaign_id, type, date, label]); }
    };
    await ensureEvent("launch", COMMON.launch_date, c.launch_label);
    await ensureEvent("comp", COMMON.comp_review_due, COMMON.comp_label);

    // Financials — 0/0 (trigger seeds this on insert; upsert keeps re-runs clean).
    await q(
      `insert into campaign_financials (campaign_id,leads,pipeline) values ($1,0,0)
       on conflict (campaign_id) do update set leads=0, pipeline=0`,
      [campaign_id]
    );

    utmReport.push({
      name: c.name,
      utm: assembleUtm({ source: utm.utm_source, medium: utm.utm_medium, campaign: c.sf_code, content: utm.utm_content }),
    });
  }

  if (DRY) { await q("rollback"); console.log("\n*** DRY RUN rolled back — nothing written ***"); }
  else await q("commit");

  const after = await campCount();
  console.log("\n── Campaign counts ──");
  console.log(`  total campaigns:        before ${before}  after ${after}`);
  console.log(`  Prop 28 Wave 7 (by SF): before ${beforeProp28}  after ${(await q("select count(*)::int n from campaigns where sf_code = any($1)", [CAMPAIGNS.map((c) => c.sf_code)])).rows[0].n}`);
  console.log("\n── Assembled UTM strings ──");
  for (const r of utmReport) console.log(`  ${r.name}\n    ${r.utm}`);
  console.log("\n── Flags: task fields with no column home (parked or omitted) ──");
  console.log("  • status \"Scheduled\"        — no campaign status column (only initiatives have status). OMITTED.");
  console.log("  • campaign_type \"Nurture\"    — no column. OMITTED.");
  console.log("  • email_subject (per seg)     — no column. OMITTED.");
  console.log("  • audience list + send time   — no column. OMITTED.");
  console.log("  • landing pages P28-WEB       — no column. OMITTED.");
  console.log("  • code/build due 2026-07-13   — no notes/date column. OMITTED (per task).");
  console.log("  • parent SF id 701Pr00000im9XjIAI — sf_parent_id is a name-FK; parked on named parent \"Prop 28 2026\".");
  console.log("  • comp owner Chris Klett      — parked on the comp marker label \"Comps — Chris Klett\".");
  console.log("  • utm_source = salesforce (SF identity forces it) — brief expected `pardot`. FLAGGED, not hardcoded.");
  console.log("  • utm_medium = referral (channel \"Email Marketing\" not in utm.ts MEDIUM_MAP) — FLAGGED.");
} catch (e) {
  await q("rollback");
  console.error("\nFAILED — rolled back. No data changed.\n", e.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
