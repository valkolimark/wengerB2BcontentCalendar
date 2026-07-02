"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Check, ExternalLink, Loader2, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type {
  CampaignWithEvents,
  DeliverableWithMeta,
  JiraSyncReport,
} from "@/lib/types";
import { key } from "@/lib/dates";
import { jiraTasks, jiraCsv } from "@/lib/jira";
import { syncCampaignToJira } from "@/lib/actions";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));
const JIRA_BASE = process.env.NEXT_PUBLIC_JIRA_BASE_URL?.replace(/\/$/, "");

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
  jiraConfigured,
  onClose,
}: {
  campaign: CampaignWithEvents;
  deliverables: DeliverableWithMeta[];
  jiraConfigured: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const campaignName = campaign.name;
  const [pending, start] = useTransition();
  const [result, setResult] = useState<JiraSyncReport | null>(null);
  const [err, setErr] = useState<string | null>(null);
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

  const sendToJira = () => {
    setErr(null);
    start(async () => {
      try {
        const report = await syncCampaignToJira(campaign.id);
        setResult(report);
        router.refresh();
      } catch (e) {
        setErr(errMsg(e));
      }
    });
  };

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

        {/* Live sync result */}
        {result && (
          <div className="mt-3 rounded-[10px] border border-hair bg-[var(--color-surface-2)] p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-[#2e6b3e]">
              <Check size={14} /> Synced — {result.created} created · {result.updated} updated
              {result.skipped > 0 && (
                <span className="text-faint">· {result.skipped} undated skipped</span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {result.issues.map((i) => {
                const chip = (
                  <span className="font-mono text-[11px]">{i.key}</span>
                );
                return JIRA_BASE ? (
                  <a
                    key={i.key}
                    href={`${JIRA_BASE}/browse/${i.key}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-0.5 text-ink-muted transition-colors hover:bg-[var(--color-hover)]"
                    title={i.summary}
                  >
                    {chip} <ExternalLink size={10} />
                  </a>
                ) : (
                  <span
                    key={i.key}
                    className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-0.5 text-ink-muted"
                    title={i.summary}
                  >
                    {chip}
                  </span>
                );
              })}
            </div>
            {result.errors.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-[11.5px] text-[#b91c1c]">
                {result.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        {err && <p className="mt-2 text-[12.5px] text-[#b91c1c]">{err}</p>}
        {!jiraConfigured && (
          <p className="mt-2 text-[11.5px] text-faint">
            Live sync is off — set <span className="font-mono">JIRA_*</span> env vars to
            enable “Send to Jira”. CSV export always works.
          </p>
        )}

        <DialogFooter className="items-center sm:justify-between">
          <span className="text-[11.5px] text-faint">
            Project <span className="font-mono">MARCOM</span> · issue type Task ·
            create or update
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
              className="inline-flex items-center gap-1.5 rounded-[9px] border border-line bg-surface px-3.5 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--color-hover)] disabled:opacity-50"
            >
              <Download size={14} /> CSV
            </button>
            {jiraConfigured && (
              <button
                type="button"
                onClick={sendToJira}
                disabled={pending || rows.length === 0}
                className="inline-flex items-center gap-1.5 rounded-[9px] border border-navy bg-navy px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-navy-dark disabled:opacity-50"
              >
                {pending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {pending ? "Sending…" : result ? "Re-sync" : "Send to Jira"}
              </button>
            )}
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
