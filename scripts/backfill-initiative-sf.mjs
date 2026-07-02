// backfill-initiative-sf.mjs — seed initiative_sf_campaigns from the existing
// per-channel campaigns. For each initiative, the Email campaign becomes the
// `email` child and the Web/Landing campaign becomes the `landing` child
// (name = sf_name, sf_id, sf_code). Parent + social are left blank (pending).
// Idempotent: only fills a role that isn't already set. Prop 28 (one campaign,
// per-deliverable SF ids) is skipped — nothing to derive.
//
//   CONFIRM=BACKFILL node scripts/backfill-initiative-sf.mjs   # apply
//   node scripts/backfill-initiative-sf.mjs --dry-run
import { readFileSync } from "node:fs";
import { Client } from "pg";

const DRY = process.argv.includes("--dry-run");
if (!DRY && process.env.CONFIRM !== "BACKFILL" && !process.argv.includes("--confirm")) {
  console.error("Refusing to run. Use CONFIRM=BACKFILL (or --dry-run).");
  process.exit(1);
}

function envv(k){try{const e=readFileSync(new URL("../.env.local",import.meta.url),"utf8");for(const l of e.split("\n")){const m=l.match(new RegExp(`^\\s*${k}\\s*=\\s*(.+?)\\s*$`));if(m)return m[1];}}catch(e){}return process.env[k];}
const u=new URL(envv("SUPABASE_DB_URL")),pw=decodeURIComponent(u.password),REF=u.username.match(/postgres\.([a-z0-9]+)/)?.[1];
const RG=["us-east-1","us-east-2","us-west-1","us-west-2","ca-central-1","eu-central-1","eu-west-1","eu-west-2","eu-west-3","eu-north-1","ap-southeast-1","ap-southeast-2","ap-northeast-1","ap-northeast-2","ap-south-1","sa-east-1"];const CAND=[];for(const p of["aws-0","aws-1"])for(const r of RG)CAND.push(`postgresql://postgres.${REF}:${encodeURIComponent(pw)}@${p}-${r}.pooler.supabase.com:5432/postgres`);
let db;for(const c of CAND){try{const cl=new Client({connectionString:c,ssl:{rejectUnauthorized:false},connectionTimeoutMillis:8000});await cl.connect();db=cl;break;}catch(e){}}
const q=(t,p)=>db.query(t,p);

const isEmail = (c) => /email/i.test(c.channel || "") && !/landing|web/i.test(c.channel || "");
const isLanding = (c) => /web\/landing|landing/i.test(c.channel || "");

try {
  await q("begin");
  const inits = (await q("select id,name from initiatives order by name")).rows;
  let set = 0;
  for (const i of inits) {
    const camps = (await q("select channel,sf_id,sf_code,sf_name from campaigns where initiative_id=$1", [i.id])).rows;
    const existing = new Set((await q("select role from initiative_sf_campaigns where initiative_id=$1", [i.id])).rows.map(r => r.role));
    const put = async (role, c) => {
      if (existing.has(role)) return;
      if (!c || (!c.sf_id && !c.sf_code && !c.sf_name)) return;
      await q("insert into initiative_sf_campaigns (initiative_id,role,name,sf_id,sf_code) values ($1,$2,$3,$4,$5) on conflict (initiative_id,role) do nothing",
        [i.id, role, c.sf_name || null, c.sf_id || null, c.sf_code || null]);
      console.log(`  ${i.name} · ${role} ← ${c.sf_code || "(no code)"} / ${c.sf_id || "(no id)"}`);
      set++;
    };
    await put("email", camps.find(isEmail));
    await put("landing", camps.find(isLanding));
  }
  if (DRY) { await q("rollback"); console.log(`\n*** DRY RUN — would set ${set} rows ***`); }
  else { await q("commit"); console.log(`\nset ${set} initiative SF child rows`); }
} catch (e) { await q("rollback"); console.error("FAILED — rolled back.\n", e.message); process.exitCode = 1; }
finally { await db.end(); }
