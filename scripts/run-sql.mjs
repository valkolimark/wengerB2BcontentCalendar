// Run SQL files against the Supabase Postgres DB.
// Usage: node scripts/run-sql.mjs <file.sql> [<file2.sql> ...]
//
// Connection: parses SUPABASE_DB_URL (from env or .env.local) for the project
// ref + password. If the direct host doesn't resolve (new projects only expose
// the pooler), it discovers the regional pooler host automatically.
import { readFileSync } from "node:fs";
import { Client } from "pg";

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

// Pull ref + password out of the provided URL so nothing is hardcoded here.
const parsed = new URL(directUrl);
const password = decodeURIComponent(parsed.password);
const refMatch =
  parsed.username.match(/postgres\.([a-z0-9]+)/)?.[1] ||
  parsed.hostname.match(/(?:db\.)?([a-z0-9]+)\.supabase\.co/)?.[1];
const REF = refMatch;

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

async function tryConnect(connectionString) {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  await client.connect();
  return client;
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Usage: node scripts/run-sql.mjs <file.sql> [...]");
  process.exit(1);
}

let client;
for (const c of candidates) {
  const label = c.replace(/:[^:@/]+@/, ":****@");
  try {
    client = await tryConnect(c);
    console.log("Connected via", label);
    break;
  } catch (e) {
    const reason = e.message.split("\n")[0];
    if (!/ENOTFOUND|ETIMEDOUT|EAI_AGAIN/.test(reason)) {
      console.log("  x", label, "->", reason);
    }
  }
}

if (!client) {
  console.error("Could not connect to the database on any candidate host.");
  process.exit(2);
}

try {
  for (const f of files) {
    const sql = readFileSync(f, "utf8");
    process.stdout.write(`Running ${f} ... `);
    await client.query(sql);
    console.log("ok");
  }
} catch (e) {
  console.error("\nFAILED:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
