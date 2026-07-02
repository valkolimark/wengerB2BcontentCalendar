"use client";

import { useMemo } from "react";
import { Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { CampaignWithEvents, DeliverableWithMeta } from "@/lib/types";
import { key } from "@/lib/dates";
import { jiraTasks, jiraCsv } from "@/lib/jira";

const STEP_TINT: Record<string, string> = {
  comp: "#c47614",
  code: "#3f6fb0",
  send: "#0f7a6e",
};

/**
 * Preview + CSV export of a campaign's email deliverables as Jira tasks — each
 * email becomes comp / code / send with its owner, due date, and metadata.
 * No live Jira API; the CSV imports into Jira (Summary, Type, Assignee, Due).
 */
export function JiraExportModal({
  campaign,
  deliverables,
  onClose,
}: {
  campaign: CampaignWithEvents;
  deliverables: DeliverableWithMeta[];
  onClose: () => void;
}) {
  const campaignName = campaign.name;
  const rows = useMemo(
    () => jiraTasks(campaign, deliverables),
    [campaign, deliverables]
  );
  const emails = deliverables.filter((d) => d.kind === "email");
  const owners = Array.from(new Set(rows.map((r) => r.owner).filter(Boolean)));

  const groups = emails.map((d) => ({
    name: d.name,
    rows: rows.filter((r) => r.deliverable === d.name),
  }));

  const download = () => {
    const blob = new Blob([jiraCsv(rows)], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jira-${campaignName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}_${key(
      new Date()
    )}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>Export to Jira</DialogTitle>
          <p className="text-[12.5px] text-muted2">
            Each email becomes three tasks — comp, code, send — with owner and due
            date. Metadata rides in the description.
          </p>
        </DialogHeader>

        <div className="mb-3 flex flex-wrap gap-4 rounded-[10px] border border-hair bg-[var(--color-surface-2)] px-3.5 py-3">
          <Metric n={rows.length} label="tasks" />
          <Metric n={emails.length} label="emails × comp·code·send" />
          <Metric n={owners.length} label={owners.join(" · ") || "assignees"} />
        </div>

        {groups.length === 0 && (
          <p className="px-1 py-6 text-center text-[13px] text-faint">
            No email deliverables to export.
          </p>
        )}

        <div className="flex flex-col gap-3.5">
          {groups.map((g) => (
            <div key={g.name}>
              <div className="mb-1.5 text-[12px] font-semibold text-ink-muted">
                {g.name}
              </div>
              <div className="flex flex-col gap-1.5">
                {g.rows.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 rounded-[8px] border border-hair bg-surface px-2.5 py-2"
                  >
                    <span
                      className="mt-0.5 shrink-0 rounded px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-[0.04em] text-white"
                      style={{ background: STEP_TINT[r.kind] }}
                    >
                      {r.kind}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-medium">{r.summary}</div>
                      {r.description && (
                        <div className="mt-0.5 break-words font-mono text-[10.5px] text-muted2">
                          {r.description}
                        </div>
                      )}
                      <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-ink-muted">
                        {r.owner && (
                          <span className="rounded-full bg-[var(--color-hover)] px-2 py-px">
                            {r.owner}
                          </span>
                        )}
                        {r.due && <span className="font-mono">Due {r.due}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="items-center sm:justify-between">
          <span className="text-[11.5px] text-faint">
            Project <span className="font-mono">WMKT</span> · issue type Task
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[9px] border border-line bg-surface px-3.5 py-2 text-[13px] transition-colors hover:bg-[var(--color-hover)]"
            >
              Close
            </button>
            <button
              type="button"
              onClick={download}
              disabled={rows.length === 0}
              className="inline-flex items-center gap-1.5 rounded-[9px] border border-navy bg-navy px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-navy-dark disabled:opacity-50"
            >
              <Download size={14} /> Export CSV
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Metric({ n, label }: { n: number; label: string }) {
  return (
    <div className="text-[12px] text-muted2">
      <b className="block text-[19px] font-extrabold text-ink">{n}</b>
      {label}
    </div>
  );
}
