// Initiative + deliverables CSV — one row per deliverable, with the initiative
// and its Salesforce campaigns repeated on each of its rows. Downloading the
// current data IS the fill-in template; editing + re-uploading updates in place.
// Build is pure (client download); parse uses SheetJS (handles CSV).
import * as XLSX from "xlsx";
import type {
  CampaignWithEvents,
  DeliverableTaskKind,
  Initiative,
  SfRole,
} from "./types";
import { taskOf } from "./deliverables";

// Exact header order. Keep in sync with the parser + the static template file.
export const CSV_HEADERS = [
  "Initiative",
  "Initiative Owner",
  "Initiative Status",
  "SF Parent Name",
  "SF Parent ID",
  "SF Parent Code",
  "SF Email Name",
  "SF Email ID",
  "SF Email Code",
  "SF Landing Name",
  "SF Landing ID",
  "SF Landing Code",
  "SF Social Name",
  "SF Social ID",
  "SF Social Code",
  "Campaign SF Code",
  "Campaign Name",
  "Deliverable Kind",
  "Deliverable Name",
  "utm_content",
  "Deliverable SF Code",
  "Deliverable SF ID",
  "Deliverable SF Name",
  "Email Subject",
  "Segment",
  "Landing Page",
  "Send Time",
  "Status",
  "Deliver At",
  "Comp Due",
  "Comp Owner",
  "Code Due",
  "Code Owner",
  "Send Due",
  "Send Owner",
  "Audience Lists",
] as const;

export type CsvSf = { name: string; sf_id: string; sf_code: string };
export type CsvRow = {
  initiative: string;
  initiativeOwner: string;
  initiativeStatus: string;
  sf: Record<SfRole, CsvSf>;
  campaignSfCode: string;
  campaignName: string;
  kind: string;
  name: string;
  utm_content: string;
  sf_code: string;
  sf_id: string;
  sf_name: string;
  email_subject: string;
  segment: string;
  landing_page: string;
  send_time: string;
  status: string;
  deliver_at: string;
  tasks: Record<DeliverableTaskKind, { due: string; owner: string }>;
  lists: string[];
};

export type CsvParseResult = { rows: CsvRow[]; errors: string[] };

/* ------------------------------- build ---------------------------------- */

const esc = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const cell = (v: string | null | undefined) => esc(v == null ? "" : String(v));

/**
 * Build the CSV from current data — one row per deliverable. Optionally scope to
 * a single initiative (by id); otherwise every initiative's deliverables. A
 * deliverable-less campaign still emits one row so its shape is visible/editable.
 */
export function buildDeliverableCsv(
  initiatives: Initiative[],
  campaigns: CampaignWithEvents[],
  onlyInitiativeId?: string
): string {
  const initById = new Map(initiatives.map((i) => [i.id, i]));
  const lines: string[] = [CSV_HEADERS.map(esc).join(",")];

  const scoped = onlyInitiativeId
    ? campaigns.filter((c) => c.initiative_id === onlyInitiativeId)
    : campaigns;

  for (const c of scoped) {
    const init = c.initiative_id ? initById.get(c.initiative_id) : undefined;
    const sf = init?.sf ?? {};
    const g = (role: SfRole, k: "name" | "sf_id" | "sf_code") => sf[role]?.[k] ?? "";
    const initCols = [
      init?.name ?? "",
      init?.owner ?? "",
      init?.status ?? "",
      g("parent", "name"), g("parent", "sf_id"), g("parent", "sf_code"),
      g("email", "name"), g("email", "sf_id"), g("email", "sf_code"),
      g("landing", "name"), g("landing", "sf_id"), g("landing", "sf_code"),
      g("social", "name"), g("social", "sf_id"), g("social", "sf_code"),
    ];

    const delivs = c.deliverables.length ? c.deliverables : [null];
    for (const d of delivs) {
      const t = (k: DeliverableTaskKind) => (d ? taskOf(d.tasks, k) : undefined);
      lines.push(
        [
          ...initCols,
          c.sf_code ?? "",
          c.name ?? "",
          d?.kind ?? "",
          d?.name ?? "",
          d?.utm_content ?? "",
          d?.sf_code ?? "",
          d?.sf_id ?? "",
          d?.sf_name ?? "",
          d?.email_subject ?? "",
          d?.segment ?? "",
          d?.landing_page ?? "",
          d?.send_time ?? "",
          d?.status ?? "",
          d?.deliver_at ?? "",
          t("comp")?.due ?? "", t("comp")?.owner ?? "",
          t("code")?.due ?? "", t("code")?.owner ?? "",
          t("send")?.due ?? "", t("send")?.owner ?? "",
          (d?.lists ?? []).map((l) => l.name).join("; "),
        ]
          .map(cell)
          .join(",")
      );
    }
  }
  // Prepend a UTF-8 BOM so Excel opens the em dashes / accents correctly.
  return "﻿" + lines.join("\r\n") + "\r\n";
}

/* ------------------------------- parse ---------------------------------- */

const S = (v: unknown) => (v == null ? "" : String(v).trim());
const pad = (n: number) => String(n).padStart(2, "0");

// Accepts an ISO string, a JS Date, or an Excel serial number → yyyy-mm-dd.
function normDate(v: unknown): string {
  if (v instanceof Date)
    return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  if (typeof v === "number") {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000)); // Excel serial
    return Number.isNaN(d.getTime())
      ? ""
      : `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }
  const s = S(v);
  if (!s) return "";
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(s);
  return Number.isNaN(d.getTime())
    ? s
    : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export async function parseDeliverableCsv(file: File): Promise<CsvParseResult> {
  // Decode as UTF-8 text so em dashes / accents survive, then parse as a string
  // workbook (avoids codepage guessing).
  const text = new TextDecoder("utf-8").decode(await file.arrayBuffer());
  const wb = XLSX.read(text, { type: "string" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
  const errors: string[] = [];
  const rows: CsvRow[] = [];

  raw.forEach((r, i) => {
    const ln = i + 2;
    const initiative = S(r["Initiative"]);
    const campaignSfCode = S(r["Campaign SF Code"]);
    const utm = S(r["utm_content"]);
    const name = S(r["Deliverable Name"]);
    // A row needs an initiative; a deliverable row also needs a campaign + utm.
    if (!initiative) {
      errors.push(`Row ${ln}: missing Initiative — skipped.`);
      return;
    }
    if ((name || utm) && (!campaignSfCode || !utm)) {
      errors.push(`Row ${ln}: a deliverable needs both Campaign SF Code and utm_content — skipped.`);
      return;
    }
    const sfRole = (n: string): CsvSf => ({
      name: S(r[`SF ${n} Name`]),
      sf_id: S(r[`SF ${n} ID`]),
      sf_code: S(r[`SF ${n} Code`]),
    });
    rows.push({
      initiative,
      initiativeOwner: S(r["Initiative Owner"]),
      initiativeStatus: S(r["Initiative Status"]),
      sf: {
        parent: sfRole("Parent"),
        email: sfRole("Email"),
        landing: sfRole("Landing"),
        social: sfRole("Social"),
      },
      campaignSfCode,
      campaignName: S(r["Campaign Name"]),
      kind: S(r["Deliverable Kind"]).toLowerCase(),
      name,
      utm_content: utm,
      sf_code: S(r["Deliverable SF Code"]),
      sf_id: S(r["Deliverable SF ID"]),
      sf_name: S(r["Deliverable SF Name"]),
      email_subject: S(r["Email Subject"]),
      segment: S(r["Segment"]),
      landing_page: S(r["Landing Page"]),
      send_time: S(r["Send Time"]),
      status: S(r["Status"]),
      deliver_at: normDate(r["Deliver At"]),
      tasks: {
        comp: { due: normDate(r["Comp Due"]), owner: S(r["Comp Owner"]) },
        code: { due: normDate(r["Code Due"]), owner: S(r["Code Owner"]) },
        send: { due: normDate(r["Send Due"]), owner: S(r["Send Owner"]) },
      },
      lists: S(r["Audience Lists"])
        .split(/[;\n]/)
        .map((s) => s.trim())
        .filter(Boolean),
    });
  });

  return { rows, errors };
}
