// sync-thsca-jira.mjs — Phase D. Mirrors syncCampaignToJira (same shaping, same
// keys) for the THSCA campaign: update existing issues by jira_key, create only
// the tasks with no key, add Whitney as a watcher on comp. E1/E2 have no task
// rows so they never sync. The app's "Upload to Jira" would reconcile any drift.
//
//   CONFIRM=SYNC node scripts/sync-thsca-jira.mjs
import { readFileSync } from "node:fs";
import { Client } from "pg";

if (process.env.CONFIRM !== "SYNC" && !process.argv.includes("--confirm")) {
  console.error("Refusing to run. Use CONFIRM=SYNC.");
  process.exit(1);
}

function envv(k){try{const e=readFileSync(new URL("../.env.local",import.meta.url),"utf8");for(const l of e.split("\n")){const m=l.match(new RegExp(`^\\s*${k}\\s*=\\s*(.+?)\\s*$`));if(m)return m[1];}}catch(e){}return process.env[k];}
const base=envv("JIRA_BASE_URL").replace(/\/$/,""),email=envv("JIRA_EMAIL"),token=envv("JIRA_API_TOKEN"),PROJ=envv("JIRA_PROJECT_KEY")||"MARCOM";
const APP=envv("NEXT_PUBLIC_APP_URL")?.replace(/\/$/,""), WATCH=envv("JIRA_WATCHER_COMP");
const h={Authorization:"Basic "+Buffer.from(`${email}:${token}`).toString("base64"),"Content-Type":"application/json",Accept:"application/json"};
const A={comp:"712020:a8e76fa7-9443-4f8f-8f48-03afd5f47c6d","Chris Klett":"712020:a8e76fa7-9443-4f8f-8f48-03afd5f47c6d","Adam Bengtson":"712020:a8e7cbdf-33ec-45b2-977d-237c336102ff","Tami":"712020:8c7911c2-12d5-4bd4-bdc4-ee85179ae2d3","Tami Roberts":"712020:8c7911c2-12d5-4bd4-bdc4-ee85179ae2d3"};
const STEP={comp:"Design comps",code:"Build, UTM & landing page",send:"Pardot send"};
const fmtReach=n=>Number(n||0).toLocaleString("en-US");

/* shaping mirrors src/lib/jira.ts stepSummary/stepDescription (Cycle 16) */
const summ=(camp,name,kind)=>`[${camp.name}] ${name} — ${STEP[kind]}`;
const utmCampaign=(d,camp)=>(d.sf_code&&d.sf_code.trim())||(camp.override&&camp.override.trim())||camp.sf_code||"SF-CODE";
const utm=(d,camp)=>`?utm_source=pardot&utm_medium=email&utm_campaign=${utmCampaign(d,camp)}&utm_content=${d.utm_content}`;
function desc(camp,d,kind,tasks){
  const L=[],add=(k,v)=>{if(v!=null&&String(v).trim()!=="")L.push(`${k}: ${v}`);};
  const subj=d.email_subject?`"${d.email_subject}"`:"";
  const compDue=(tasks.find(t=>t.kind==="comp")||{}).due;
  if(kind==="comp"){
    add("Subject line",subj); add("Segment",d.segment);
    if(d.lists.length)L.push(`Audience: ${d.lists.map(l=>l.name).join(" + ")} — combined reach ${fmtReach(d.lists.reduce((s,l)=>s+(l.reach||0),0))}`);
    add("Landing page",d.landing_page); add("Notes",d.notes);
  } else if(kind==="code"){
    L.push(`UTM (full query string): ${utm(d,camp)}`);
    add("SF member code",d.sf_code); add("SF Campaign ID",d.sf_id); add("Landing page",d.landing_page);
    add("Comp due",compDue); add("Notes",d.notes);
  } else {
    const sendDue=(tasks.find(t=>t.kind==="send")||{}).due;
    add("Send", d.deliver_at?d.deliver_at:sendDue);
    add("Subject line",subj);
    if(d.sf_name)L.push(`SF campaign: ${d.sf_name}${d.sf_code?` (${d.sf_code})`:""}`);
    if(d.lists.length){L.push("Lists:");for(const l of d.lists)L.push(`- ${l.name} (${fmtReach(l.reach)})`);L.push(`Combined reach: ${fmtReach(d.lists.reduce((s,l)=>s+(l.reach||0),0))}`);}
    add("Setup date",d.setup_date); add("Notes",d.notes);
  }
  L.push("—",`Campaign: ${camp.name} (${camp.sf_code})`);
  if(APP)L.push(`Tracker: ${APP}/?campaign=${camp.id}`);
  return L.join("\n");
}

const u=new URL(envv("SUPABASE_DB_URL")),pw=decodeURIComponent(u.password),REF=u.username.match(/postgres\.([a-z0-9]+)/)?.[1];
const RG=["us-east-1","us-east-2","us-west-1","us-west-2","ca-central-1","eu-central-1","eu-west-1","eu-west-2","eu-west-3","eu-north-1","ap-southeast-1","ap-southeast-2","ap-northeast-1","ap-northeast-2","ap-south-1","sa-east-1"];const CAND=[];for(const p of["aws-0","aws-1"])for(const r of RG)CAND.push(`postgresql://postgres.${REF}:${encodeURIComponent(pw)}@${p}-${r}.pooler.supabase.com:5432/postgres`);
let db;for(const c of CAND){try{const cl=new Client({connectionString:c,ssl:{rejectUnauthorized:false},connectionTimeoutMillis:8000});await cl.connect();db=cl;break;}catch(e){}}
const q=(t,p)=>db.query(t,p);

const camp0=(await q("select id,name,sf_code,sf_id,sf_name,utm_campaign_override from campaigns where sf_code='THSCA-EML'")).rows[0];
const camp={...camp0, override:camp0.utm_campaign_override};
const ds=(await q("select * from deliverables where campaign_id=$1 and kind='email' order by sort",[camp.id])).rows;
let created=0,updated=0,skipped=0; const warnings=[];
for(const d of ds){
  d.lists=(await q("select l.name,l.reach from deliverable_lists dl join lists l on l.id=dl.list_id where dl.deliverable_id=$1",[d.id])).rows;
  const tasks=(await q("select id,kind,due::text,owner,jira_key from deliverable_tasks where deliverable_id=$1",[d.id])).rows;
  for(const t of tasks){
    if(!t.due){skipped++;continue;}
    const fields={summary:summ(camp,d.name,t.kind),description:desc(camp,d,t.kind,tasks),duedate:t.due};
    const acc=A[t.owner]; if(acc)fields.assignee={accountId:acc};
    let key=t.jira_key;
    if(key){
      const r=await fetch(`${base}/rest/api/2/issue/${key}`,{method:"PUT",headers:h,body:JSON.stringify({fields})});
      if(r.status===404){key=null;} else if(!r.ok){warnings.push(`${key}: ${r.status} ${(await r.text()).slice(0,80)}`);continue;} else updated++;
    }
    if(!key){
      const r=await fetch(`${base}/rest/api/2/issue`,{method:"POST",headers:h,body:JSON.stringify({fields:{...fields,project:{key:PROJ},issuetype:{name:"Task"}}})});
      const b=await r.json().catch(()=>({}));
      if(!r.ok){warnings.push(`create ${fields.summary}: ${r.status} ${JSON.stringify(b).slice(0,120)}`);continue;}
      key=b.key; await q("update deliverable_tasks set jira_key=$1 where id=$2",[key,t.id]); created++;
      console.log(`  created ${key}  ${fields.summary}`);
    }
    if(t.kind==="comp"&&WATCH&&key){
      const w=await fetch(`${base}/rest/api/2/issue/${key}/watchers`,{method:"POST",headers:h,body:JSON.stringify(WATCH)});
      if(!w.ok&&w.status!==204)warnings.push(`${key}: watcher ${w.status}`);
    }
  }
}
console.log(`\nSYNC: created ${created} · updated ${updated} · skipped ${skipped}`);
if(warnings.length){console.log("warnings:");warnings.forEach(w=>console.log("  "+w));}
await db.end();
