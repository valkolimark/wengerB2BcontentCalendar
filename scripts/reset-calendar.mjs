// reset-calendar.mjs — data-maintenance: clear campaign/deliverable data so the
// calendar can be remade. NOT a feature. Schema, brands, auth users, and RLS
// policies are never touched.
//
// GUARDED: dry-run by default. It will connect, print row counts, and write a
// timestamped backup, but it will NOT delete anything unless you pass
// CONFIRM=RESET. It is intentionally NOT wired into any build/dev/deploy step.
//
//   node scripts/reset-calendar.mjs                 # dry run: counts + backup only
//   CONFIRM=RESET node scripts/reset-calendar.mjs   # actually delete (one txn)
//
// RESET_LEVEL controls how deep the reset goes (default campaigns_only):
//   campaigns_only  → delete deliverables + events + campaign_financials + campaigns.
//                     KEEP brands and initiatives (initiatives go empty).
//   full_hierarchy  → the above, PLUS delete initiatives. KEEP brands only.
// Override per-run with RESET_LEVEL=full_hierarchy in the env.
//
// Connection reuses the pooler-discovery approach from scripts/run-sql.mjs:
// it parses SUPABASE_DB_URL (a direct Postgres URL → bypasses RLS) from the
// env or .env.local. No service-role key is embedded here and nothing is
// hardcoded. This file is server-side only; never import it into client code.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { Client } from "pg";

const RESET_LEVEL = process.env.RESET_LEVEL || "campaigns_only";
const CONFIRMED = process.env.CONFIRM === "RESET";
if (!["campaigns_only", "full_hierarchy"].includes(RESET_LEVEL)) {
  console.error(`Unknown RESET_LEVEL "${RESET_LEVEL}" (expected campaigns_only | full_hierarchy)`);
  process.exit(1);
}

// ── env / connection ────────────────────────────────────────────────────────
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
if (!directUrl) {
  console.error("SUPABASE_DB_URL not found in env or .env.local");
  process.exit(1);
}

const parsed = new URL(directUrl);
const password = decodeURIComponent(parsed.password);
const REF =
  parsed.username.match(/postgres\.([a-z0-9]+)/)?.[1] ||
  parsed.hostname.match(/(?:db\.)?([a-z0-9]+)\.supabase\.co/)?.[1];

const REGIONS = [
  "us-east-1", "us-east-2", "us-west-1", "us-west-2",
  "ca-central-1", "eu-central-1", "eu-west-1", "eu-west-2", "eu-west-3",
  "eu-north-1", "ap-southeast-1", "ap-southeast-2", "ap-northeast-1",
  "ap-northeast-2", "ap-south-1", "sa-east-1",
];

const candidates = [];
if (!directUrl.includes("db." + REF)) candidates.push(directUrl);
if (REF) {
  for (const prefix of ["aws-0", "aws-1"]) {
    for (const region of REGIONS) {
      candidates.push(
        `postgresql://postgres.${REF}:${encodeURIComponent(password)}@${prefix}-${region}.pooler.supabase.com:5432/postgres`
      );
    }
  }
}
if (directUrl.includes("db." + REF)) candidates.push(directUrl);

async function connect() {
  for (const c of candidates) {
    const label = c.replace(/:[^:@/]+@/, ":****@");
    try {
      const client = new Client({
        connectionString: c,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 8000,
      });
      await client.connect();
      console.log("Connected via", label);
      return client;
    } catch (e) {
      const reason = e.message.split("\n")[0];
      if (!/ENOTFOUND|ETIMEDOUT|EAI_AGAIN/.test(reason)) console.log("  x", label, "->", reason);
    }
  }
  throw new Error("Could not connect to the database on any candidate host.");
}

// ── helpers ─────────────────────────────────────────────────────────────────
// Never-deleted reference table plus the resettable set, child → parent.
const ALL_TABLES = ["brands", "initiatives", "campaigns", "campaign_financials", "events", "deliverables"];
// Order matters: children first so explicit deletes never trip a FK.
const DELETE_ORDER = ["deliverables", "events", "campaign_financials", "campaigns"];
const BACKUP_TABLES = ["initiatives", "campaigns", "campaign_financials", "events", "deliverables"];

async function existingTables(client) {
  const { rows } = await client.query(
    `select table_name from information_schema.tables
     where table_schema = 'public' and table_name = any($1)`,
    [ALL_TABLES]
  );
  return new Set(rows.map((r) => r.table_name));
}

async function counts(client, present) {
  const out = {};
  for (const t of ALL_TABLES) {
    if (!present.has(t)) { out[t] = null; continue; } // null = table absent
    const { rows } = await client.query(`select count(*)::int as n from ${t}`);
    out[t] = rows[0].n;
  }
  return out;
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

function toCsv(rows) {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v) => {
    if (v === null || v === undefined) return "";
    const s = v instanceof Date ? v.toISOString() : typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n") + "\n";
}

function printCounts(title, c) {
  console.log(`\n${title}`);
  for (const t of ALL_TABLES) {
    console.log(`  ${t.padEnd(20)} ${c[t] === null ? "(absent)" : c[t]}`);
  }
}

// ── run ─────────────────────────────────────────────────────────────────────
const client = await connect();
try {
  const present = await existingTables(client);
  const before = await counts(client, present);
  printCounts("Row counts (before):", before);
  console.log(`\nRESET_LEVEL = ${RESET_LEVEL}    mode = ${CONFIRMED ? "EXECUTE (CONFIRM=RESET)" : "DRY RUN"}`);

  // Backup — always, before any delete. If this fails we never reach delete.
  const backupDir = new URL("../backups/", import.meta.url);
  mkdirSync(backupDir, { recursive: true });
  const ts = stamp();
  const bundle = { generatedAt: new Date().toISOString(), resetLevel: RESET_LEVEL, tables: {} };
  const captured = {};
  for (const t of BACKUP_TABLES) {
    if (!present.has(t)) continue;
    const { rows } = await client.query(`select * from ${t}`);
    bundle.tables[t] = rows;
    captured[t] = rows.length;
    writeFileSync(new URL(`calendar-backup-${ts}-${t}.csv`, backupDir), toCsv(rows));
  }
  const jsonPath = new URL(`calendar-backup-${ts}.json`, backupDir);
  writeFileSync(jsonPath, JSON.stringify(bundle, null, 2) + "\n");
  console.log("\nBackup written:");
  console.log("  " + jsonPath.pathname);
  for (const t of Object.keys(captured)) {
    console.log(`  backups/calendar-backup-${ts}-${t}.csv  (${captured[t]} rows)`);
  }

  if (!CONFIRMED) {
    console.log("\nDRY RUN — no rows deleted. Re-run with CONFIRM=RESET to execute the delete.");
    process.exit(0);
  }

  // Delete — one transaction, child → parent. Roll back on any error.
  const toDelete = DELETE_ORDER.filter((t) => present.has(t));
  if (RESET_LEVEL === "full_hierarchy" && present.has("initiatives")) toDelete.push("initiatives");
  console.log("\nDeleting (single transaction): " + toDelete.join(" → "));
  await client.query("begin");
  try {
    for (const t of toDelete) {
      const res = await client.query(`delete from ${t}`);
      console.log(`  delete from ${t.padEnd(20)} ${res.rowCount} rows`);
    }
    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    console.error("\nDELETE FAILED — rolled back. No data changed.\n", e.message);
    process.exit(1);
  }

  const after = await counts(client, present);
  console.log("\n── Before / After ──");
  console.log(`  ${"table".padEnd(20)} ${"before".padStart(8)} ${"after".padStart(8)}`);
  for (const t of ALL_TABLES) {
    const b = before[t] === null ? "-" : before[t];
    const a = after[t] === null ? "-" : after[t];
    console.log(`  ${t.padEnd(20)} ${String(b).padStart(8)} ${String(a).padStart(8)}`);
  }
} finally {
  await client.end();
}
