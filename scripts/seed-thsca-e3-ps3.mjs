// seed-thsca-e3-ps3.mjs — data cycle (no schema/app change). Reconciles the
// THSCA 2026 campaign's deliverables to the E3–PS3 creative brief and loads
// E1/E2 (sent) + PS3 (new). Existing deliverables are RENAMED/UPDATED IN PLACE
// (matched by old→new utm_content) so their deliverable_tasks and jira_keys are
// preserved — never delete+reinsert. Prop 28 is untouched.
//
//   CONFIRM=SEED node scripts/seed-thsca-e3-ps3.mjs      # apply
//   node scripts/seed-thsca-e3-ps3.mjs --dry-run         # plan only (rolls back)
import { readFileSync } from "node:fs";
import { Client } from "pg";

const DRY = process.argv.includes("--dry-run");
if (!DRY && process.env.CONFIRM !== "SEED" && !process.argv.includes("--confirm")) {
  console.error("Refusing to run. Use CONFIRM=SEED (or --dry-run).");
  process.exit(1);
}

const SF_ID = "701Pr00000nXb9UIAS";
const FULL_TX = "THSCA — Full Texas list";
const OWN = { comp: "Chris Klett", code: "Tami Roberts", send: "Tami Roberts" };

// old_utm = the pre-rename utm_content to match (null for brand-new).
// tasks: [kind, due|null]. E1/E2 carry NO tasks (already sent).
const D = [
  { sort: 0, old: null, utm: "e1-save-the-date", name: "E1 — Save the date / how to win", status: "sent", deliver_at: "2026-06-09", tasks: [], lists: [], segment: null, send_time: null, subject: null, notes: null, landing: null },
  { sort: 1, old: null, utm: "e2-problem-value", name: "E2 — Problem / value", status: "sent", deliver_at: "2026-06-23", tasks: [], lists: [], segment: null, send_time: null, subject: null, notes: null, landing: null },
  { sort: 2, old: "thsca-e3", utm: "e3-plan-visit", name: "E3 — Plan visit + booth reveal",
    tasks: [["comp", "2026-07-02"], ["code", "2026-07-03"], ["send", "2026-07-07"]], lists: [FULL_TX],
    segment: "Pre-show — full TX list", send_time: "a.m.", subject: "Your THSCA game plan — find us at Booth #362",
    notes: "EXPEDITE — comp due Jul 2 for Jul 7 send; effectively in production. CTA: booth-booking page (Adam confirms URL). Sweepstakes official rules must exist before this send." },
  { sort: 3, old: "thsca-preshow", utm: "e4-final-preshow", name: "E4 — Final pre-show",
    tasks: [["comp", "2026-07-13"], ["code", "2026-07-14"], ["send", "2026-07-16"]], lists: [FULL_TX],
    segment: "Pre-show — full TX list", send_time: "a.m.", subject: "See you in Houston this weekend",
    notes: "CTA: how-to-win page (Adam confirms URL)." },
  { sort: 4, old: "thsca-midshow", utm: "e5-midshow", name: "E5 — Mid-show nudge",
    tasks: [["comp", "2026-07-15"], ["code", "2026-07-16"], ["send", "2026-07-20"]], lists: [FULL_TX],
    segment: "Pre-show — full TX list · Live — Mon a.m.", send_time: "Mon a.m.", subject: "Still time to win the cart — Booth #362",
    notes: "Pre-build before show; only variable is drawing close [time] — pending. CTA: booth map (Adam confirms URL)." },
  { sort: 5, old: "thsca-postshow1", utm: "ps1-thankyou", name: "PS1 — Thank you + fast follow-up",
    tasks: [["comp", "2026-07-17"], ["code", "2026-07-21"], ["send", "2026-07-22"]], lists: ["THSCA — Booth leads (post-show)"],
    segment: "Booth leads — segmented by problem/role/timeline", send_time: "a.m.", subject: "Great to meet you at THSCA",
    notes: "48-hr rule exception — template/comp Jul 17, code finalized post-show Jul 21, deploy Jul 22. Winner name + booth-survey segmentation drop in post-show. CTA: free-layout form (Adam confirms URL)." },
  { sort: 6, old: "thsca-postshow2", utm: "ps2-value", name: "PS2 — Value content",
    tasks: [["comp", "2026-07-24"], ["code", "2026-07-27"], ["send", "2026-07-29"]], lists: ["THSCA — Un-booked leads (post-show)"],
    segment: "Un-booked leads", send_time: "a.m.", subject: "How top Texas programs organize their equipment rooms",
    notes: "Mirrors as wk-of-Jul-28 social carousel (Mara). CTA: free-layout form (Adam confirms URL)." },
  { sort: 7, old: null, utm: "ps3-nextcycle", name: "PS3 — Next-cycle nurture",
    tasks: [["comp", "2026-08-07"], ["code", "2026-08-10"], ["send", "2026-08-12"]], lists: ["THSCA — All leads · 6–12 mo band"],
    segment: "All leads — 6–12 mo timeline band", send_time: "a.m.", subject: "The best time to plan an upgrade is before budget season",
    notes: "Next-cycle nurture — spring budget framing, no hard sell. Priority: 6–12 mo band. CTA: free-layout form (Adam confirms URL)." },
];

/* ── connection ── */
function envv(k){try{const e=readFileSync(new URL("../.env.local",import.meta.url),"utf8");for(const l of e.split("\n")){const m=l.match(new RegExp(`^\\s*${k}\\s*=\\s*(.+?)\\s*$`));if(m)return m[1];}}catch(e){}return process.env[k];}
const u=new URL(envv("SUPABASE_DB_URL")),pw=decodeURIComponent(u.password),REF=u.username.match(/postgres\.([a-z0-9]+)/)?.[1];
const RG=["us-east-1","us-east-2","us-west-1","us-west-2","ca-central-1","eu-central-1","eu-west-1","eu-west-2","eu-west-3","eu-north-1","ap-southeast-1","ap-southeast-2","ap-northeast-1","ap-northeast-2","ap-south-1","sa-east-1"];const CAND=[];for(const p of["aws-0","aws-1"])for(const r of RG)CAND.push(`postgresql://postgres.${REF}:${encodeURIComponent(pw)}@${p}-${r}.pooler.supabase.com:5432/postgres`);
let db;for(const c of CAND){try{const cl=new Client({connectionString:c,ssl:{rejectUnauthorized:false},connectionTimeoutMillis:8000});await cl.connect();db=cl;break;}catch(e){}}
const q=(t,p)=>db.query(t,p);

try {
  await q("begin");
  const camp=(await q("select id from campaigns where sf_code='THSCA-EML'")).rows[0];
  if(!camp) throw new Error("THSCA-EML campaign not found");
  await q("update campaigns set name='THSCA 2026 — Email', utm_campaign_override='thsca2026', brand_id='gearboss' where id=$1",[camp.id]);
  console.log("campaign: updated name → 'THSCA 2026 — Email', utm_campaign_override=thsca2026");

  const ensureList=async(name)=>{
    let r=(await q("select id from lists where name=$1",[name])).rows[0];
    if(!r) r=(await q("insert into lists (name,reach,region) values ($1,0,'Texas') returning id",[name])).rows[0];
    return r.id;
  };

  for(const d of D){
    const codes=[d.utm, d.old].filter(Boolean);
    let row=(await q("select id from deliverables where campaign_id=$1 and utm_content = any($2) limit 1",[camp.id,codes])).rows[0];
    const fields=[camp.id,d.name,d.utm,SF_ID,d.subject,d.segment,d.send_time,d.status||null,d.deliver_at||null,d.notes,d.sort];
    if(row){
      await q(`update deliverables set campaign_id=$1,name=$2,utm_content=$3,kind='email',utm_source='pardot',sf_id=$4,sf_code=null,
        email_subject=$5,segment=$6,send_time=$7,status=$8,deliver_at=$9,landing_page=null,setup_date=null,notes=$10,sort=$11 where id=$12`,[...fields,row.id]);
      console.log(`deliverable ${d.utm}: updated in place (${d.old||'—'} → ${d.utm}) [id ${row.id.slice(0,8)}]`);
    } else {
      row=(await q(`insert into deliverables (campaign_id,name,utm_content,kind,utm_source,sf_id,email_subject,segment,send_time,status,deliver_at,notes,sort)
        values ($1,$2,$3,'email','pardot',$4,$5,$6,$7,$8,$9,$10,$11) returning id`,fields)).rows[0];
      console.log(`deliverable ${d.utm}: inserted [id ${row.id.slice(0,8)}]`);
    }
    const did=row.id;

    // Tasks — upsert by (deliverable_id, kind); NEVER delete (preserves jira_key).
    for(const [kind,due] of d.tasks){
      const ex=(await q("select id from deliverable_tasks where deliverable_id=$1 and kind=$2",[did,kind])).rows[0];
      if(ex) await q("update deliverable_tasks set due=$1, owner=$2 where id=$3",[due,OWN[kind],ex.id]);
      else await q("insert into deliverable_tasks (deliverable_id,kind,due,owner) values ($1,$2,$3,$4)",[did,kind,due,OWN[kind]]);
    }
    // Lists — set to brief set (idempotent).
    await q("delete from deliverable_lists where deliverable_id=$1",[did]);
    for(const name of d.lists){ const lid=await ensureList(name); await q("insert into deliverable_lists (deliverable_id,list_id) values ($1,$2) on conflict do nothing",[did,lid]); }
  }

  if(DRY){ await q("rollback"); console.log("\n*** DRY RUN rolled back ***"); }
  else await q("commit");

  console.log("\nFLAG: campaign-level note (copy approver Nick Wobig; parent rollup SF ID pending) has no `campaigns.notes` column — recorded in CHANGELOG/CLAUDE, not stored.");
  const n=(await q("select count(*)::int c from deliverables where campaign_id=$1",[camp.id])).rows[0].c;
  console.log(`THSCA deliverables now: ${n}`);
} catch(e){ await q("rollback"); console.error("FAILED — rolled back.\n",e.message); process.exitCode=1; }
finally{ await db.end(); }
