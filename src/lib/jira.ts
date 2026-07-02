// Jira task shaping — turn a campaign's email deliverables into comp/code/send
// tasks. Pure + shared by the CSV export (JiraExportModal) and the live sync
// server action, so both produce identical summaries/descriptions.
import type { DeliverableWithMeta } from "./types";
import { assembleDeliverableUtm } from "./utm";
import { taskOf, reachOf, fmtReach, fmtDeliver } from "./deliverables";

export type JiraStep = "comp" | "code" | "send";

export type JiraTask = {
  deliverable: string;
  kind: JiraStep;
  summary: string;
  owner: string;
  due: string;
  description: string;
};

const STEP_SUMMARY: Record<JiraStep, string> = {
  comp: "Design comps",
  code: "Build, UTM & landing page",
  send: "Pardot send",
};

type CampaignCtx = {
  name: string;
  utm_campaign_override: string | null;
  sf_code: string;
};

/** `[Campaign] Deliverable — Step` summary line. */
export function stepSummary(
  campaignName: string,
  deliverableName: string,
  kind: JiraStep
): string {
  return `[${campaignName}] ${deliverableName} — ${STEP_SUMMARY[kind]}`;
}

/** The metadata line for a step's Jira description. */
export function stepDescription(
  campaign: CampaignCtx,
  d: DeliverableWithMeta,
  kind: JiraStep
): string {
  if (kind === "comp") {
    const lists = d.lists.map((l) => `${l.name} (${fmtReach(l.reach)})`).join(" + ");
    return [d.segment && `Segment: ${d.segment}`, lists && `Lists: ${lists}`, d.notes && `Note: ${d.notes}`]
      .filter(Boolean)
      .join(" · ");
  }
  if (kind === "code") {
    return [
      assembleDeliverableUtm(d, campaign),
      d.sf_id && `Campaign ID ${d.sf_id}`,
      d.landing_page && `LP ${d.landing_page}`,
      d.notes && `Note: ${d.notes}`,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  const reach = reachOf(d.lists);
  return [
    d.sf_name && `SF: ${d.sf_name}`,
    d.email_subject && `Subject: "${d.email_subject}"`,
    d.deliver_at && `Deliver ${fmtDeliver(d.deliver_at)}`,
    reach && `Reach ${fmtReach(reach)}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

// Build the comp/code/send task rows for every email deliverable in a campaign.
export function jiraTasks(
  campaign: CampaignCtx,
  deliverables: DeliverableWithMeta[]
): JiraTask[] {
  const rows: JiraTask[] = [];
  for (const d of deliverables) {
    if (d.kind !== "email") continue;
    for (const kind of ["comp", "code", "send"] as const) {
      const t = taskOf(d.tasks, kind);
      rows.push({
        deliverable: d.name,
        kind,
        summary: stepSummary(campaign.name, d.name, kind),
        owner: t?.owner ?? "",
        due: t?.due ?? "",
        description: stepDescription(campaign, d, kind),
      });
    }
  }
  return rows;
}

const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

/** CSV for a Jira import (Summary, Issue Type, Assignee, Due Date, Description). */
export function jiraCsv(rows: JiraTask[]): string {
  const header = ["Summary", "Issue Type", "Assignee", "Due Date", "Description"];
  const body = rows.map((r) =>
    [r.summary, "Task", r.owner, r.due, r.description].map(esc).join(",")
  );
  return [header.join(","), ...body].join("\n") + "\n";
}
