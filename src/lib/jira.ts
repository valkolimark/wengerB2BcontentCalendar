// Jira export — turn a campaign's email deliverables into comp/code/send tasks.
// Cycle 12. Preview + CSV only (no live Jira API), mirroring the prototype's
// export modal and matching how the app's other exports work.
import type { DeliverableWithMeta } from "./types";
import { assembleDeliverableUtm } from "./utm";
import { taskOf, reachOf, fmtReach } from "./deliverables";

export type JiraTask = {
  deliverable: string;
  kind: "comp" | "code" | "send";
  summary: string;
  owner: string;
  due: string;
  description: string;
};

const STEP_SUMMARY: Record<JiraTask["kind"], string> = {
  comp: "Design comps",
  code: "Build, UTM & landing page",
  send: "Pardot send",
};

// Build the comp/code/send task rows for every email deliverable in a campaign.
export function jiraTasks(
  campaignName: string,
  deliverables: DeliverableWithMeta[]
): JiraTask[] {
  const rows: JiraTask[] = [];
  for (const d of deliverables) {
    if (d.kind !== "email") continue;
    const utm = assembleDeliverableUtm(d);
    const lists = d.lists
      .map((l) => `${l.name} (${fmtReach(l.reach)})`)
      .join(" + ");
    const reach = reachOf(d.lists);
    const desc: Record<JiraTask["kind"], string> = {
      comp: [d.segment && `Segment: ${d.segment}`, lists && `Lists: ${lists}`]
        .filter(Boolean)
        .join(" · "),
      code: [utm, d.sf_id && `Campaign ID ${d.sf_id}`, d.landing_page && `LP ${d.landing_page}`]
        .filter(Boolean)
        .join(" · "),
      send: [
        d.sf_name && `SF: ${d.sf_name}`,
        d.email_subject && `Subject: "${d.email_subject}"`,
        d.deliver_at && `Deliver ${d.deliver_at.replace("T", " ").slice(0, 16)}`,
        reach && `Reach ${fmtReach(reach)}`,
      ]
        .filter(Boolean)
        .join(" · "),
    };
    for (const kind of ["comp", "code", "send"] as const) {
      const t = taskOf(d.tasks, kind);
      rows.push({
        deliverable: d.name,
        kind,
        summary: `[${campaignName}] ${d.name} — ${STEP_SUMMARY[kind]}`,
        owner: t?.owner ?? "",
        due: t?.due ?? "",
        description: desc[kind],
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
