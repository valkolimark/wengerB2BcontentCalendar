// adopt-thsca-jira-keys.mjs — Phase C no-duplicate guard. For every dated THSCA
// task whose jira_key is null, find an existing MARCOM issue whose summary
// EXACTLY equals the new stepSummary (or the pre-rename summary) and adopt its
// key. Zero → WILL CREATE. Two+ → AMBIGUOUS (no write, stop). NO Jira writes.
//
//   CONFIRM=ADOPT node scripts/adopt-thsca-jira-keys.mjs      # adopt
//   node scripts/adopt-thsca-jira-keys.mjs --dry-run          # report only
import { readFileSync } from "node:fs";
import { Client } from "pg";

const DRY = process.argv.includes("--dry-run");
if (!DRY && process.env.CONFIRM !== "ADOPT" && !process.argv.includes("--confirm")) {
  console.error("Refusing to run. Use CONFIRM=ADOPT (or --dry-run).");
  process.exit(1);
}

const STEP = { comp: "Design comps", code: "Build, UTM & landing page", send: "Pardot send" };
const NEW_CAMP = "THSCA 2026 — Email";
const OLD_CAMP = "Conv THSCA 2026 — Email";
// pre-rename deliverable names by current utm_content (for the fallback summary).
const OLD_NAME = {
  "e3-plan-visit": "E3 · Plan your visit / booth reveal",
  "e4-final-preshow": "Final pre-show blast",
  "e5-midshow": "Mid-show / in-show email",
  "ps1-thankyou": "Post-show 1",
  "ps2-value": "Post-show 2",
};
const sum = (camp, name, kind) => `[${camp}] ${name} — ${STEP[kind]}`;

function envv(k){try{const e=readFileSync(new URL("../.env.local",import.meta.url),"utf8");for(const l of e.split("\n")){const m=l.match(new RegExp(`^\\s*${k}\\s*=\\s*(.+?)\\s*$`));if(m)return m[1];}}catch(e){}return process.env[k];}
const u=new URL(envv("SUPABASE_DB_URL")),pw=decodeURIComponent(u.password),REF=u.username.match(/postgres\.([a-z0-9]+)/)?.[1];
const RG=["us-east-1","us-east-2","us-west-1","us-west-2","ca-central-1","eu-central-1","eu-west-1","eu-west-2","eu-west-3","eu-north-1","ap-southeast-1","ap-southeast-2","ap-northeast-1","ap-northeast-2","ap-south-1","sa-east-1"];const CAND=[];for(const p of["aws-0","aws-1"])for(const r of RG)CAND.push(`postgresql://postgres.${REF}:${encodeURIComponent(pw)}@${p}-${r}.pooler.supabase.com:5432/postgres`);
let db;for(const c of CAND){try{const cl=new Client({connectionString:c,ssl:{rejectUnauthorized:false},connectionTimeoutMillis:8000});await cl.connect();db=cl;break;}catch(e){}}
const q=(t,p)=>db.query(t,p);

// Pull all MARCOM summaries → keys (exact match, count for ambiguity).
const base=envv("JIRA_BASE_URL").replace(/\/$/,""),email=envv("JIRA_EMAIL"),token=envv("JIRA_API_TOKEN");
const h={Authorization:"Basic "+Buffer.from(`${email}:${token}`).toString("base64"),Accept:"application/json"};
const bysummary=new Map();
let startAt=0;
while(true){
  const r=await fetch(`${base}/rest/api/3/search/jql?jql=${encodeURIComponent("project=MARCOM")}&maxResults=100&startAt=${startAt}&fields=summary`,{headers:h});
  const j=await r.json();
  for(const i of (j.issues||[])){ const s=i.fields.summary; if(!bysummaryHas(s)) bysummary.set(s,[]); bysummary.get(s).push(i.key); }
  if(!j.issues || j.issues.length<100 || j.isLast) break; startAt+=100;
}
function bysummaryHas(s){return bysummary.has(s);}

const cid=(await q("select id from campaigns where sf_code='THSCA-EML'")).rows[0].id;
const tasks=(await q(`select t.id,t.kind,t.due::text due,t.owner,t.jira_key,d.name,d.utm_content
  from deliverable_tasks t join deliverables d on d.id=t.deliverable_id
  where d.campaign_id=$1 and t.due is not null order by d.sort, case t.kind when 'comp' then 1 when 'code' then 2 else 3 end`,[cid])).rows;

console.log("task · owner · due · jira_key · action");
let adopted=0, willCreate=0, ambiguous=0;
for(const t of tasks){
  if(t.jira_key){ console.log(`  ${t.utm_content}/${t.kind}  ${t.owner}  ${t.due}  ${t.jira_key}  update`); continue; }
  const newS=sum(NEW_CAMP,t.name,t.kind);
  const oldS=OLD_NAME[t.utm_content]?sum(OLD_CAMP,OLD_NAME[t.utm_content],t.kind):null;
  const keys=[...new Set([...(bysummary.get(newS)||[]),...(oldS?(bysummary.get(oldS)||[]):[])])];
  if(keys.length===1){
    if(!DRY) await q("update deliverable_tasks set jira_key=$1 where id=$2",[keys[0],t.id]);
    console.log(`  ${t.utm_content}/${t.kind}  ${t.owner}  ${t.due}  ${keys[0]}  ADOPTED`); adopted++;
  } else if(keys.length===0){
    console.log(`  ${t.utm_content}/${t.kind}  ${t.owner}  ${t.due}  (none)  WILL CREATE`); willCreate++;
  } else {
    console.log(`  ${t.utm_content}/${t.kind}  ${t.owner}  ${t.due}  AMBIGUOUS [${keys.join(", ")}] — NOT written`); ambiguous++;
  }
}
console.log(`\nadopted ${adopted} · will create ${willCreate} · ambiguous ${ambiguous}${DRY?"  (dry-run: no DB writes)":""}`);
if(ambiguous) console.log("STOP: resolve AMBIGUOUS rows with Mark before syncing.");
await db.end();
