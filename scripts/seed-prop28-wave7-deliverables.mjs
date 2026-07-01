// seed-prop28-wave7-deliverables.mjs — Cycle 12 re-model (data input, not a cycle).
// Supersedes scripts/seed-prop28-wave7.mjs: Wave 7 becomes ONE campaign (P28-W7)
// with THREE email deliverables (Elementary / Secondary / Purchasing), each
// carrying its own SF member code, utm_content, comp→code→send chain, audience
// list(s), and send time — matching reference/wenger-initiative-campaign-mockup.html.
//
// Idempotent: the campaign is matched on sf_code 'P28-W7' and each deliverable on
// (campaign, sf_code), so re-running updates in place. It also removes the three
// old flat P28-EML-* campaigns (their events/financials cascade). Direct Postgres
// (bypasses RLS); server-side only.
//
//   node scripts/seed-prop28-wave7-deliverables.mjs            # apply
//   node scripts/seed-prop28-wave7-deliverables.mjs --dry-run  # plan only
import { readFileSync } from "node:fs";
import { Client } from "pg";

const DRY = process.argv.includes("--dry-run");

const INITIATIVE_NAME = "Prop 28 — California Initiative";
const SF_PARENT_NAME = "Prop 28 2026";
const LP = "P28-WEB · 701Pr00000iloWLIAY";
const OLD_CAMPAIGN_CODES = ["P28-EML-EL", "P28-EML-SE", "P28-EML-PU"];

// The wave campaign (grouping) + its comp-review milestone.
const CAMPAIGN = {
  sf_code: "P28-W7",
  name: "Prop 28 — Wave 7",
  channel: "Email Marketing",
  vendor: "N/A (Owned)",
  owner: "Mark Mireles",
  comp_due: "2026-07-10",
};

// Three email deliverables (the sends).
const DELIVERABLES = [
  {
    sf_code: "P28-EML-EL",
    name: "Elementary send · TK–5",
    sf_id: "701Pr00000k0R0vIAE",
    sf_name: "Prop 28 — Email Outreach │ Elementary",
    utm_content: "wave7-elm",
    email_subject: "Summer is the quiet window — here's how to use it",
    segment: "Elementary — TK–5 teachers & arts coordinators",
    deliver_at: "2026-07-15T10:00:00-07:00",
    lists: ["CA List_K-5 Arts Educators_2026"],
  },
  {
    sf_code: "P28-EML-SE",
    name: "Secondary send · 6–12",
    sf_id: "701Pr00000k0DR2IAM",
    sf_name: "Prop 28 — Email Outreach │ Secondary",
    utm_content: "wave7-sec",
    email_subject: "Order now, rehearse on it in August",
    segment: "Secondary — 6–12 music directors & fine-arts heads",
    deliver_at: "2026-07-15T10:10:00-07:00",
    lists: ["CA List_6-12 Arts Educators_2026", "CA List_K-12 Theatre Contacts_2026"],
  },
  {
    sf_code: "P28-EML-PU",
    name: "Purchasing send · CBO/procurement",
    sf_id: "701Pr00000k05mpIAA",
    sf_name: "Prop 28 — Email Outreach │ Purchasing",
    utm_content: "wave7-pur",
    email_subject: "Get arts equipment received and installed before day one",
    segment: "Purchasing — district purchasers, CBO & procurement",
    deliver_at: "2026-07-15T10:20:00-07:00",
    lists: ["CA List_K-12 School Leadership_Pur_2026"],
  },
];

// Same comp→code→send chain on every deliverable.
const CHAIN = [
  { kind: "comp", due: "2026-07-10", owner: "Chris Klett" },
  { kind: "code", due: "2026-07-13", owner: "Adam Bengtson" },
  { kind: "send", due: "2026-07-15", owner: "Tami" },
];

/* ── connection (mirrors scripts/run-sql.mjs) ─────────────────────────────── */
function envv(k) {
  if (process.env[k]) return process.env[k];
  try {
    const e = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const l of e.split("\n")) {
      const m = l.match(new RegExp(`^\\s*${k}\\s*=\\s*(.+?)\\s*$`));
      if (m) return m[1];
    }
  } catch {}
  return undefined;
}
const directUrl = envv("SUPABASE_DB_URL");
if (!directUrl) { console.error("SUPABASE_DB_URL not found"); process.exit(1); }
const u = new URL(directUrl);
const pw = decodeURIComponent(u.password);
const REF = u.username.match(/postgres\.([a-z0-9]+)/)?.[1] || u.hostname.match(/(?:db\.)?([a-z0-9]+)\.supabase\.co/)?.[1];
const REGIONS = ["us-east-1","us-east-2","us-west-1","us-west-2","ca-central-1","eu-central-1","eu-west-1","eu-west-2","eu-west-3","eu-north-1","ap-southeast-1","ap-southeast-2","ap-northeast-1","ap-northeast-2","ap-south-1","sa-east-1"];
const candidates = [];
if (!directUrl.includes("db." + REF)) candidates.push(directUrl);
if (REF) for (const p of ["aws-0","aws-1"]) for (const r of REGIONS) candidates.push(`postgresql://postgres.${REF}:${encodeURIComponent(pw)}@${p}-${r}.pooler.supabase.com:5432/postgres`);
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
  throw new Error("no connection");
}

/* ── run ──────────────────────────────────────────────────────────────────── */
const db = await connect();
const q = (t, p) => db.query(t, p);
try {
  await q("begin");

  // Initiative + rollup parent + brand (reuse; never clobber existing).
  const init = (await q(
    `select id from initiatives where name = $1 or name = 'Prop 28' or name ilike 'Prop 28%' order by (name=$1) desc limit 1`,
    [INITIATIVE_NAME]
  )).rows[0];
  if (!init) throw new Error("Prop 28 initiative not found — run the initiative seed first.");
  const sfp = (await q("select id from sf_parents where name = $1", [SF_PARENT_NAME])).rows[0];
  const sf_parent_id = sfp?.id ?? null;

  // Upsert the wave campaign by sf_code. utm_content stays null — deliverables own it.
  let camp = (await q("select id from campaigns where sf_code = $1", [CAMPAIGN.sf_code])).rows[0];
  if (camp) {
    await q(
      `update campaigns set initiative_id=$1, brand_id='wenger', name=$2, channel=$3, vendor=$4,
       owner=$5, sf_parent_id=$6, utm_source='salesforce', utm_medium='email', utm_content=null,
       sf_id=null, sf_name=null, segment=null where id=$7`,
      [init.id, CAMPAIGN.name, CAMPAIGN.channel, CAMPAIGN.vendor, CAMPAIGN.owner, sf_parent_id, camp.id]
    );
    console.log(`campaign ${CAMPAIGN.sf_code}: updated`);
  } else {
    camp = (await q(
      `insert into campaigns (initiative_id, brand_id, name, channel, vendor, owner, sf_code, sf_parent_id, utm_source, utm_medium)
       values ($1,'wenger',$2,$3,$4,$5,$6,$7,'salesforce','email') returning id`,
      [init.id, CAMPAIGN.name, CAMPAIGN.channel, CAMPAIGN.vendor, CAMPAIGN.owner, CAMPAIGN.sf_code, sf_parent_id]
    )).rows[0];
    console.log(`campaign ${CAMPAIGN.sf_code}: inserted`);
  }
  const campaign_id = camp.id;

  // Wave-level comp-review milestone (Jul 10) — the sends themselves come from
  // the deliverables and render on the calendar directly.
  const compHit = (await q("select id from events where campaign_id=$1 and type='comp' and date=$2", [campaign_id, CAMPAIGN.comp_due])).rows[0];
  if (!compHit) await q("insert into events (campaign_id,type,date,label) values ($1,'comp',$2,'Wave 7 comp')", [campaign_id, CAMPAIGN.comp_due]);

  // Deliverables — upsert by (campaign, sf_code); replace chain + lists.
  for (let i = 0; i < DELIVERABLES.length; i++) {
    const d = DELIVERABLES[i];
    const fields = [campaign_id, d.name, d.sf_code, d.sf_id, d.sf_name, d.utm_content, "pardot", d.email_subject, d.segment, LP, d.deliver_at, i];
    let existing = (await q("select id from deliverables where campaign_id=$1 and sf_code=$2", [campaign_id, d.sf_code])).rows[0];
    let did;
    if (existing) {
      did = existing.id;
      await q(
        `update deliverables set campaign_id=$1, name=$2, sf_code=$3, sf_id=$4, sf_name=$5, utm_content=$6,
         utm_source=$7, email_subject=$8, segment=$9, landing_page=$10, deliver_at=$11, sort=$12, kind='email' where id=$13`,
        [...fields, did]
      );
      console.log(`  deliverable ${d.sf_code}: updated`);
    } else {
      did = (await q(
        `insert into deliverables (campaign_id, name, sf_code, sf_id, sf_name, utm_content, utm_source, email_subject, segment, landing_page, deliver_at, sort, kind)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'email') returning id`,
        fields
      )).rows[0].id;
      console.log(`  deliverable ${d.sf_code}: inserted`);
    }

    // Chain — replace.
    await q("delete from deliverable_tasks where deliverable_id=$1", [did]);
    for (const t of CHAIN) await q("insert into deliverable_tasks (deliverable_id,kind,due,owner) values ($1,$2,$3,$4)", [did, t.kind, t.due, t.owner]);

    // Lists — replace (resolve by name).
    await q("delete from deliverable_lists where deliverable_id=$1", [did]);
    for (const name of d.lists) {
      const l = (await q("select id from lists where name=$1", [name])).rows[0];
      if (!l) { console.log(`    ! list not found: ${name}`); continue; }
      await q("insert into deliverable_lists (deliverable_id,list_id) values ($1,$2) on conflict do nothing", [did, l.id]);
    }
  }

  // Remove the old flat P28-EML-* campaigns (events/financials cascade).
  const del = await q("delete from campaigns where sf_code = any($1)", [OLD_CAMPAIGN_CODES]);
  console.log(`removed ${del.rowCount} old flat campaign(s): ${OLD_CAMPAIGN_CODES.join(", ")}`);

  if (DRY) { await q("rollback"); console.log("\n*** DRY RUN rolled back ***"); }
  else await q("commit");

  const counts = {};
  for (const t of ["campaigns", "deliverables", "deliverable_tasks", "deliverable_lists"]) {
    counts[t] = (await q(`select count(*)::int n from ${t}`)).rows[0].n;
  }
  console.log("\n── Counts ──", counts);
} catch (e) {
  await q("rollback");
  console.error("\nFAILED — rolled back.\n", e.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
