// Client-side workbook parser + validator (SheetJS). Parses an uploaded .xlsx
// into a normalized ImportPayload and computes an add/update diff against the
// loaded data — all without writing anything. Persistence is the
// importWorkbook Server Action's job.
import * as XLSX from "xlsx";
import { key } from "./dates";
import type {
  CampaignWithEvents,
  EventType,
  ImportPayload,
  Initiative,
} from "./types";

export type ParseResult = { payload: ImportPayload; errors: string[] };

export type ImportDiff = {
  initiatives: { add: number; update: number };
  campaigns: { add: number; update: number };
  events: { add: number; existing: number };
};

const str = (v: unknown): string => (v == null ? "" : String(v).trim());

const num = (v: unknown): number | undefined => {
  if (v === "" || v == null) return undefined;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : undefined;
};

/** Normalize a cell to an ISO yyyy-mm-dd date, or null if unparseable. */
function normalizeDate(v: unknown): string | null {
  if (v instanceof Date) return key(v);
  if (typeof v === "number") {
    // Excel serial date (days since 1899-12-30).
    const ms = Math.round((v - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return Number.isNaN(d.getTime())
      ? null
      : `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  }
  const s = str(v);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : key(d);
}

type Row = Record<string, unknown>;

function sheetRows(wb: XLSX.WorkBook, name: string, errors: string[]): Row[] {
  const ws = wb.Sheets[name];
  if (!ws) {
    errors.push(`Missing sheet: "${name}".`);
    return [];
  }
  return XLSX.utils.sheet_to_json<Row>(ws, { defval: "" });
}

export async function parseWorkbook(file: File): Promise<ParseResult> {
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const errors: string[] = [];

  const initRows = sheetRows(wb, "Initiatives", errors);
  const campRows = sheetRows(wb, "Campaigns", errors);
  const evRows = sheetRows(wb, "Events", errors);

  const initiatives: ImportPayload["initiatives"] = [];
  initRows.forEach((r, i) => {
    const name = str(r.Name);
    if (!name) {
      errors.push(`Initiatives row ${i + 2}: missing Name — skipped.`);
      return;
    }
    initiatives.push({
      name,
      owner: str(r.Owner) || "Unassigned",
      status: str(r.Status) || "Planning",
    });
  });

  const campaigns: ImportPayload["campaigns"] = [];
  campRows.forEach((r, i) => {
    const name = str(r.Name);
    const sf = str(r["SF Code"]);
    if (!name || !sf) {
      errors.push(
        `Campaigns row ${i + 2}: missing ${!name ? "Name" : "SF Code"} — skipped.`
      );
      return;
    }
    campaigns.push({
      initiative: str(r.Initiative),
      brand: str(r.Brand),
      name,
      channel: str(r.Channel),
      vendor: str(r.Vendor),
      segment: str(r.Segment),
      owner: str(r.Owner) || "Unassigned",
      sf_code: sf,
      utm_source: str(r.utm_source),
      utm_medium: str(r.utm_medium),
      utm_content: str(r.utm_content),
      leads: num(r.Leads),
      pipeline: num(r.Pipeline),
    });
  });

  const events: ImportPayload["events"] = [];
  evRows.forEach((r, i) => {
    const sf = str(r["Campaign SF"]);
    const type = str(r.Type) as EventType;
    const date = normalizeDate(r.Date);
    if (!sf || (type !== "launch" && type !== "comp") || !date) {
      errors.push(
        `Events row ${i + 2}: invalid ${!sf ? "Campaign SF" : type !== "launch" && type !== "comp" ? "Type" : "Date"} — skipped.`
      );
      return;
    }
    events.push({ campaign_sf: sf, type, date, label: str(r.Label) });
  });

  return { payload: { initiatives, campaigns, events }, errors };
}

/** Add/update counts vs. the loaded data (no writes). */
export function diffPayload(
  payload: ImportPayload,
  existing: { initiatives: Initiative[]; campaigns: CampaignWithEvents[] }
): ImportDiff {
  const initNames = new Set(
    existing.initiatives.map((i) => i.name.toLowerCase())
  );
  let initAdd = 0;
  let initUpd = 0;
  for (const i of payload.initiatives) {
    if (initNames.has(i.name.toLowerCase())) initUpd++;
    else initAdd++;
  }

  const bySf = new Map(existing.campaigns.map((c) => [c.sf_code, c]));
  let campAdd = 0;
  let campUpd = 0;
  for (const c of payload.campaigns) {
    if (c.sf_code && bySf.has(c.sf_code)) campUpd++;
    else campAdd++;
  }

  const evKey = (sf: string, t: string, d: string) => `${sf}|${t}|${d}`;
  const existingEvents = new Set<string>();
  for (const c of existing.campaigns)
    for (const e of c.events)
      existingEvents.add(evKey(c.sf_code, e.type, e.date));
  let evAdd = 0;
  let evExisting = 0;
  for (const e of payload.events) {
    if (existingEvents.has(evKey(e.campaign_sf, e.type, e.date))) evExisting++;
    else evAdd++;
  }

  return {
    initiatives: { add: initAdd, update: initUpd },
    campaigns: { add: campAdd, update: campUpd },
    events: { add: evAdd, existing: evExisting },
  };
}
