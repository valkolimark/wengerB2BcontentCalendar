// Client-side workbook builder (SheetJS). Produces a multi-sheet .xlsx from the
// loaded data. Financial columns are included only when the caller is entitled
// AND not in scrubbed (JMC) mode — and an unentitled caller has no financial
// data to begin with, so the scrubbed shape is guaranteed regardless.
import * as XLSX from "xlsx";
import { assembleUtm } from "./utm";
import { key } from "./dates";
import type { Brand, CampaignWithEvents, Initiative } from "./types";

export type ExportInput = {
  brands: Brand[];
  initiatives: Initiative[];
  campaigns: CampaignWithEvents[];
  includeFinancials: boolean;
};

export function buildWorkbook({
  brands,
  initiatives,
  campaigns,
  includeFinancials,
}: ExportInput): XLSX.WorkBook {
  const brandLabel = new Map(brands.map((b) => [b.id, b.label]));
  const initName = new Map(initiatives.map((i) => [i.id, i.name]));

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
