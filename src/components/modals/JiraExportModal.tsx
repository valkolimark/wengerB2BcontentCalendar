"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Check,
  ExternalLink,
  Loader2,
  Upload,
  Pencil,
  AlertTriangle,
  ShieldAlert,
  RotateCw,
} from "lucide-react";
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
  List,
} from "@/lib/types";
import { key } from "@/lib/dates";
import {
  jiraTasks,
  jiraCsv,
  jiraReadiness,
  syncStepCount,
  type ReadinessIssue,
} from "@/lib/jira";
import { syncCampaignToJira } from "@/lib/actions";
import { DeliverableModal } from "./DeliverableModal";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));
const JIRA_BASE = process.env.NEXT_PUBLIC_JIRA_BASE_URL?.replace(/\/$/, "");

const STEP_TINT: Record<string, string> = {
  comp: "#c47614",
  code: "#3f6fb0",
  send: "#0f7a6e",
};

// What the fix affordance for a readiness row should say (or that it's passive).
function rowAction(r: ReadinessIssue): { label: string } | { passive: string } {
  if (r.message.includes("no date")) return { label: "Set date" };
  if (r.message.includes("no audience lists")) return { label: "Add lists" };
  if (r.message.startsWith("will assign to")) return { passive: "default OK" };
  return { label: "Fix" };
}

export function JiraExportModal({
  campaign,
  deliverables,
  jiraConfigured,
  lists,
  campaignSfParent,
  onClose,
}: {
  campaign: CampaignWithEvents;
  deliverables: DeliverableWithMeta[];
  jiraConfigured: boolean;
  lists: List[];
  campaignSfParent?: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const campaignName = campaign.name;
  const [pending, start] = useTransition();
  const [result, setResult] = useState<JiraSyncReport | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [editDeliv, setEditDeliv] = useState<DeliverableWithMeta | null>(null);

  const rows = useMemo(() => jiraTasks(campaign, deliverables), [campaign, deliverables]);
  const readiness = useMemo(() => jiraReadiness(campaign, deliverables), [campaign, deliverables]);
  const syncCount = useMemo(() => syncStepCount(deliverables), [deliverables]);

  const emails = deliverables.filter((d) => d.kind === "email");
  const owners = Array.from(new Set(rows.map((r) => r.owner).filter(Boolean)));
  const byName = useMemo(
    () => new Map(deliverables.map((d) => [d.name, d] as const)),
    [deliverables]
  );
  const warnDelivs = useMemo(
    () => new Set(readiness.filter((r) => r.level === "warning").map((r) => r.deliverable)),
    [readiness]
  );

  const blockers = readiness.filter((r) => r.level === "blocker");
  const warnings = readiness.filter((r) => r.level === "warning");

  const groups = emails.map((d) => ({
    name: d.name,
    rows: rows.filter((r) => r.deliverable === d.name),
  }));

  const openEdit = (name: string) => {
    const d = byName.get(name);
    if (d) setEditDeliv(d);
  };

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
    const blob = new Blob([jiraCsv(rows)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jira-${campaignName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}_${key(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>Export to Jira</DialogTitle>
          <p className="text-[12.5px] text-muted2">
            Each email becomes three tasks — comp, code, send — with owner, due
            date, and a role-scoped description.
          </p>
        </DialogHeader>

        {/* Readiness */}
        <ReadinessPanel
          blockers={blockers}
          warnings={warnings}
          syncCount={syncCount}
          onFix={openEdit}
          onRecheck={() => router.refresh()}
        />

        <div className="mb-3 mt-3 flex flex-wrap gap-4 rounded-[10px] border border-hair bg-[var(--color-surface-2)] px-3.5 py-3">
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
              <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-ink-muted">
                {warnDelivs.has(g.name) && (
                  <AlertTriangle size={12} className="text-[#c47614]" />
                )}
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
                      <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-ink-muted">
                        {r.owner && (
                          <span className="rounded-full bg-[var(--color-hover)] px-2 py-px">
                            {r.owner}
                          </span>
                        )}
                        {r.due ? (
                          <span className="font-mono">Due {r.due}</span>
                        ) : (
                          <span className="font-mono text-[#b91c1c]">no date · skipped</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openEdit(g.name)}
                      title="Edit deliverable"
                      className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md text-faint transition-colors hover:bg-[var(--color-hover)] hover:text-ink"
                    >
                      <Pencil size={12} />
                    </button>
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
              <Check size={14} /> Uploaded — {result.created} created · {result.updated} updated
              {result.skipped > 0 && (
                <span className="text-faint">· {result.skipped} undated skipped</span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {result.issues.map((i) =>
                JIRA_BASE ? (
                  <a
                    key={i.key}
                    href={`${JIRA_BASE}/browse/${i.key}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-0.5 font-mono text-[11px] text-ink-muted transition-colors hover:bg-[var(--color-hover)]"
                    title={i.summary}
                  >
                    {i.key} <ExternalLink size={10} />
                  </a>
                ) : (
                  <span
                    key={i.key}
                    className="inline-flex items-center rounded-md border border-line bg-surface px-2 py-0.5 font-mono text-[11px] text-ink-muted"
                    title={i.summary}
                  >
                    {i.key}
                  </span>
                )
              )}
            </div>
            {result.warnings.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-[11.5px] text-[#8a5a0b]">
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}
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
            Project <span className="font-mono">MARCOM</span> · Task · create or update
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
                {pending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {pending ? "Uploading…" : result ? "Re-upload" : "Upload to Jira"}
              </button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>

      {editDeliv && (
        <DeliverableModal
          deliverable={editDeliv}
          campaignId={campaign.id}
          campaignName={campaign.name}
          campaignSfCode={campaign.sf_code}
          campaignOverride={campaign.utm_campaign_override}
          campaignSfId={campaign.sf_id}
          campaignSfName={campaign.sf_name}
          campaignSfParent={campaignSfParent}
          lists={lists}
          onClose={() => setEditDeliv(null)}
        />
      )}
    </Dialog>
  );
}

/* ------------------------------ readiness panel --------------------------- */

function ReadinessPanel({
  blockers,
  warnings,
  syncCount,
  onFix,
  onRecheck,
}: {
  blockers: ReadinessIssue[];
  warnings: ReadinessIssue[];
  syncCount: number;
  onFix: (deliverable: string) => void;
  onRecheck: () => void;
}) {
  if (blockers.length === 0 && warnings.length === 0) {
    return (
      <div className="mt-1 flex items-center justify-between rounded-[10px] border border-[#cfe6d2] bg-[#eef7f0] px-3 py-2 text-[12.5px] font-medium text-[#2e6b3e]">
        <span className="inline-flex items-center gap-1.5">
          <Check size={14} /> Ready — {syncCount} issue{syncCount === 1 ? "" : "s"} will sync
        </span>
        <Recheck onRecheck={onRecheck} />
      </div>
    );
  }

  const groupByDeliv = (rs: ReadinessIssue[]) => {
    const m = new Map<string, ReadinessIssue[]>();
    for (const r of rs) (m.get(r.deliverable) ?? m.set(r.deliverable, []).get(r.deliverable)!).push(r);
    return [...m.entries()];
  };

  return (
    <div className="mt-1 flex flex-col gap-2">
      {blockers.length > 0 && (
        <Section
          tone="blocker"
          icon={<ShieldAlert size={13} />}
          title={`${blockers.length} blocker${blockers.length === 1 ? "" : "s"} — these steps skip until fixed`}
          groups={groupByDeliv(blockers)}
          onFix={onFix}
        />
      )}
      {warnings.length > 0 && (
        <Section
          tone="warning"
          icon={<AlertTriangle size={13} />}
          title={`${warnings.length} warning${warnings.length === 1 ? "" : "s"} — will sync but info is missing`}
          groups={groupByDeliv(warnings)}
          onFix={onFix}
        />
      )}
      <div className="flex justify-end">
        <Recheck onRecheck={onRecheck} />
      </div>
    </div>
  );
}

function Section({
  tone,
  icon,
  title,
  groups,
  onFix,
}: {
  tone: "blocker" | "warning";
  icon: React.ReactNode;
  title: string;
  groups: [string, ReadinessIssue[]][];
  onFix: (deliverable: string) => void;
}) {
  const c =
    tone === "blocker"
      ? { border: "#f0c9c9", bg: "#fdf2f2", fg: "#b91c1c" }
      : { border: "#efe3c7", bg: "#fbf7ee", fg: "#8a5a0b" };
  return (
    <div className="rounded-[10px] border px-3 py-2" style={{ borderColor: c.border, background: c.bg }}>
      <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: c.fg }}>
        {icon} {title}
      </div>
      <div className="flex flex-col gap-1.5">
        {groups.map(([name, rs]) => (
          <div key={name}>
            <div className="text-[11px] font-medium text-ink-muted">{name}</div>
            {rs.map((r, i) => {
              const a = rowAction(r);
              return (
                <div key={i} className="flex items-center gap-2 py-[3px] pl-2 text-[12px]">
                  {r.step && (
                    <span
                      className="shrink-0 rounded px-1 py-px text-[9px] font-semibold uppercase text-white"
                      style={{ background: STEP_TINT[r.step] }}
                    >
                      {r.step}
                    </span>
                  )}
                  <span className="flex-1 text-ink">{r.message}</span>
                  {"passive" in a ? (
                    <span className="rounded-full bg-[var(--color-hover)] px-2 py-px text-[10.5px] text-muted2">
                      {a.passive}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onFix(name)}
                      className="shrink-0 rounded-md border border-line bg-surface px-2 py-px text-[11px] font-medium text-ink transition-colors hover:bg-[var(--color-hover)]"
                    >
                      {a.label}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function Recheck({ onRecheck }: { onRecheck: () => void }) {
  return (
    <button
      type="button"
      onClick={onRecheck}
      className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-px text-[11px] text-ink-muted transition-colors hover:bg-[var(--color-hover)]"
    >
      <RotateCw size={11} /> Re-check
    </button>
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
