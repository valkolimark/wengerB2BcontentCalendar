// Client-side workbook builder (SheetJS). Produces a multi-sheet .xlsx from the
// loaded data. Financial columns are included only when the caller is entitled
// AND not in scrubbed (JMC) mode — and an unentitled caller has no financial
// data to begin with, so the scrubbed shape is guaranteed regardless.
import * as XLSX from "xlsx";
import { assembleUtm } from "./utm";
import { key } from "./dates";
import { sfParentChain } from "./sf";
import type {
  Brand,
  CampaignWithEvents,
  Initiative,
  SfParent,
} from "./types";

export type ExportInput = {
  brands: Brand[];
  initiatives: Initiative[];
  campaigns: CampaignWithEvents[];
  sfParents: SfParent[];
  includeFinancials: boolean;
};

export function buildWorkbook({
  brands,
  initiatives,
  campaigns,
  sfParents,
  includeFinancials,
}: ExportInput): XLSX.WorkBook {
  const brandLabel = new Map(brands.map((b) => [b.id, b.label]));
  const initName = new Map(initiatives.map((i) => [i.id, i.name]));
  const sfParentName = new Map(sfParents.map((p) => [p.id, p.name]));

  const initRows = initiatives.map((i) => ({
    Name: i.name,
    Owner: i.owner,
    Status: i.status,
  }));

  const campRows = campaigns.map((c) => {
    const row: Record<string, string | number> = {
      Initiative: c.initiative_id ? initName.get(c.initiative_id) ?? "" : "",
      Brand: brandLabel.get(c.brand_id) ?? c.brand_id,
      Name: c.name,
      Channel: c.channel,
      Vendor: c.vendor,
      Segment: c.segment,
      Owner: c.owner,
      "SF Code": c.sf_code,
      "SF ID": c.sf_id ?? "",
      "SF Name": c.sf_name ?? "",
      "SF Parent": c.sf_parent_id ? sfParentName.get(c.sf_parent_id) ?? "" : "",
      utm_source: c.utm_source,
      utm_medium: c.utm_medium,
      utm_content: c.utm_content,
      // Assembled at export time — never stored.
      UTM: assembleUtm({
        source: c.utm_source,
        medium: c.utm_medium,
        campaign: c.sf_code,
        content: c.utm_content,
      }),
    };
    if (includeFinancials) {
      row.Leads = c.leads;
      row.Pipeline = c.pipeline;
    }
    return row;
  });

  const eventRows = campaigns.flatMap((c) =>
    c.events.map((e) => ({
      "Campaign SF": c.sf_code,
      Type: e.type,
      Date: e.date,
      Label: e.label,
    }))
  );

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(initRows),
    "Initiatives"
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(campRows),
    "Campaigns"
  );
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(eventRows), "Events");
  return wb;
}

/** Build the workbook and trigger a browser download. */
export function exportWorkbook(input: ExportInput) {
  const wb = buildWorkbook(input);
  XLSX.writeFile(wb, `wenger-content-tracker_${key(new Date())}.xlsx`);
}

/* --------------------- Salesforce import CSV (outbound) ------------------- */

type SfRow = {
  Name: string;
  "Parent Campaign": string;
  Type: string;
  Status: string;
};

/**
 * Build the Salesforce import rows: one row per campaign that reports into a
 * parent, plus one row per distinct parent across every campaign's chain
 * (deduped), so each rollup appears once. Parent is matched **by name**
 * (parents may not exist in SF yet — this file creates them top-down). Parent
 * rows carry their own next-level-up parent (root = blank).
 */
export function buildSfImportRows(
  campaigns: CampaignWithEvents[],
  sfParents: SfParent[]
): SfRow[] {
  const rows: SfRow[] = [];
  const seenParents = new Set<string>();

  for (const c of campaigns) {
    if (!c.sf_parent_id) continue;
    const chain = sfParentChain(c.sf_parent_id, sfParents); // leaf → root
    if (chain.length === 0) continue;

    // Leaf row: the campaign, reporting into its immediate parent.
    rows.push({
      Name: c.sf_name?.trim() || c.name,
      "Parent Campaign": chain[0].name,
      Type: "",
      Status: "",
    });

    // Parent rows: each level once, reporting into the next level up.
    chain.forEach((node, i) => {
      if (seenParents.has(node.id)) return;
      seenParents.add(node.id);
      const up = chain[i + 1];
      rows.push({
        Name: node.name,
        "Parent Campaign": up ? up.name : "",
        Type: "",
        Status: "",
      });
    });
  }

  return rows;
}

/** Build the SF import CSV and trigger a browser download. */
export function exportSfImportCsv(
  campaigns: CampaignWithEvents[],
  sfParents: SfParent[]
) {
  const rows = buildSfImportRows(campaigns, sfParents);
  const ws = XLSX.utils.json_to_sheet(rows, {
    header: ["Name", "Parent Campaign", "Type", "Status"],
  });
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `wenger-sf-import_${key(new Date())}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
