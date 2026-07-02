// Jira task shaping — turn a campaign's email deliverables into comp/code/send
// tasks. Pure + shared by the CSV export (JiraExportModal) and the live sync
// server action, so both produce byte-identical summaries/descriptions.
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

// The person each step falls back to when a task carries no explicit owner.
// A typed owner on the task always wins — this only replaces blank.
export const STEP_DEFAULT_OWNER: Record<JiraStep, string> = {
  comp: "Chris Klett",
  code: "Adam Bengtson",
  send: "Tami Roberts",
};

// Names the server can resolve to a Jira accountId (names only — never
// accountIds — so this stays safe to import client-side). Must match the keys
// of DEFAULT_ASSIGNEES in jira-server.ts.
export const KNOWN_OWNERS = ["Chris Klett", "Adam Bengtson", "Tami Roberts", "Tami"];
export const knownOwner = (name: string | null | undefined): boolean =>
  !!name && KNOWN_OWNERS.includes(name.trim());

export type CampaignCtx = {
  id: string;
  name: string;
  utm_campaign_override: string | null;
  sf_code: string;
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");

/** `[Campaign] Deliverable — Step` summary line (unchanged across cycles). */
export function stepSummary(
  campaignName: string,
  deliverableName: string,
  kind: JiraStep
): string {
  return `[${campaignName}] ${deliverableName} — ${STEP_SUMMARY[kind]}`;
}

// Common footer appended to every step description.
function footerLines(campaign: CampaignCtx): string[] {
  const lines = ["—", `Campaign: ${campaign.name} (${campaign.sf_code})`];
  if (APP_URL) lines.push(`Tracker: ${APP_URL}/?campaign=${campaign.id}`);
  return lines;
}

/**
 * A role-scoped, multi-line plain-text description — the step-owner's
 * information card in text form. Empty lines are omitted. REST v2 accepts
 * multi-line plain text and the CSV writer quotes newlines, so this is shared
 * byte-for-byte by both paths.
 */
export function stepDescription(
  campaign: CampaignCtx,
  d: DeliverableWithMeta,
  kind: JiraStep
): string {
  const L: string[] = [];
  const add = (label: string, val: string | null | undefined) => {
    if (val != null && String(val).trim() !== "") L.push(`${label}: ${val}`);
  };
  const subject = d.email_subject?.trim() ? `"${d.email_subject.trim()}"` : "";

  if (kind === "comp") {
    add("Subject line", subject);
    add("Segment", d.segment);
    if (d.lists.length)
      L.push(
        `Audience: ${d.lists.map((l) => l.name).join(" + ")} — combined reach ${fmtReach(reachOf(d.lists))}`
      );
    add("Landing page", d.landing_page);
    add("Notes", d.notes);
  } else if (kind === "code") {
    L.push(`UTM (full query string): ${assembleDeliverableUtm(d, campaign)}`);
    add("SF member code", d.sf_code);
    add("SF Campaign ID", d.sf_id);
    add("Landing page", d.landing_page);
    add("Comp due", taskOf(d.tasks, "comp")?.due);
    add("Notes", d.notes);
  } else {
    const sendVal = d.deliver_at
      ? fmtDeliver(d.deliver_at)
      : taskOf(d.tasks, "send")?.due ?? "";
    add("Send", sendVal);
    add("Subject line", subject);
    if (d.sf_name?.trim())
      L.push(`SF campaign: ${d.sf_name.trim()}${d.sf_code ? ` (${d.sf_code})` : ""}`);
    if (d.lists.length) {
      L.push("Lists:");
      for (const l of d.lists) L.push(`- ${l.name} (${fmtReach(l.reach)})`);
      L.push(`Combined reach: ${fmtReach(reachOf(d.lists))}`);
    }
    add("Setup date", d.setup_date);
    add("Notes", d.notes);
  }

  return [...L, ...footerLines(campaign)].join("\n");
}

// Build the comp/code/send task rows for every email deliverable in a campaign.
// Blank owners fall back to the step default (applies to CSV + live sync).
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
        owner: t?.owner?.trim() || STEP_DEFAULT_OWNER[kind],
        due: t?.due ?? "",
        description: stepDescription(campaign, d, kind),
      });
    }
  }
  return rows;
}

/* ----------------------------- preflight readiness ----------------------- */

export type ReadinessIssue = {
  deliverable: string;
  step: JiraStep | null; // null = deliverable-level
  level: "blocker" | "warning";
  message: string;
};

const STEPS: JiraStep[] = ["comp", "code", "send"];

/** How many comp/code/send steps will actually sync (dated) — for the ready line. */
export function syncStepCount(deliverables: DeliverableWithMeta[]): number {
  let n = 0;
  for (const d of deliverables) {
    if (d.kind !== "email") continue;
    for (const step of STEPS) if (taskOf(d.tasks, step)?.due) n++;
  }
  return n;
}

/**
 * Preflight the campaign's email deliverables: surface gaps before they become
 * half-blank tickets. Pure; drives the export modal's readiness panel.
 */
export function jiraReadiness(
  campaign: CampaignCtx,
  deliverables: DeliverableWithMeta[]
): ReadinessIssue[] {
  const out: ReadinessIssue[] = [];
  const canAssembleUtm =
    !!(campaign.utm_campaign_override?.trim() || campaign.sf_code?.trim());

  for (const d of deliverables) {
    if (d.kind !== "email") continue;
    const dueOf = (s: JiraStep) => taskOf(d.tasks, s)?.due;
    const ownerOf = (s: JiraStep) => taskOf(d.tasks, s)?.owner?.trim();

    // Blockers.
    for (const step of STEPS) {
      if (!dueOf(step))
        out.push({
          deliverable: d.name,
          step,
          level: "blocker",
          message: `${step} step has no date — it will be skipped`,
        });
    }
    if (dueOf("send") && d.lists.length === 0)
      out.push({
        deliverable: d.name,
        step: "send",
        level: "blocker",
        message: "send has no audience lists attached",
      });
    if (dueOf("code") && !(d.sf_code?.trim() || canAssembleUtm))
      out.push({
        deliverable: d.name,
        step: "code",
        level: "blocker",
        message: "UTM can't assemble — no SF member code or campaign code/override",
      });

    // Warnings (only for steps that will sync).
    if (!d.email_subject?.trim()) {
      if (dueOf("comp"))
        out.push({ deliverable: d.name, step: "comp", level: "warning", message: "no subject line" });
      if (dueOf("send"))
        out.push({ deliverable: d.name, step: "send", level: "warning", message: "no subject line" });
    }
    if (dueOf("code") && !d.landing_page?.trim())
      out.push({ deliverable: d.name, step: "code", level: "warning", message: "no landing page" });

    for (const step of STEPS) {
      if (!dueOf(step)) continue;
      const owner = ownerOf(step);
      if (!owner)
        out.push({
          deliverable: d.name,
          step,
          level: "warning",
          message: `will assign to ${STEP_DEFAULT_OWNER[step]}`,
        });
      else if (!knownOwner(owner))
        out.push({
          deliverable: d.name,
          step,
          level: "warning",
          message: `owner "${owner}" isn't a known assignee — issue will be unassigned`,
        });
    }
  }
  return out;
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
