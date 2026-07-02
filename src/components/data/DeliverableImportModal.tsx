"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2, Check, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { CampaignWithEvents, CsvImportReport } from "@/lib/types";
import { parseDeliverableCsv, type CsvRow } from "@/lib/deliverable-csv";
import { importDeliverableCsv } from "@/lib/actions";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Upload the fill-in "Deliverables template (CSV)" to update an initiative and
 * its deliverables. Parse + preview client-side; apply through a staff-gated
 * Server Action. Idempotent — re-uploading the same file changes nothing.
 */
export function DeliverableImportModal({
  campaigns,
  onClose,
}: {
  campaigns: CampaignWithEvents[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<CsvRow[] | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<CsvImportReport | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const knownSf = new Set(campaigns.map((c) => c.sf_code).filter(Boolean));

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setResult(null);
    setErr(null);
    try {
      const { rows: parsed, errors } = await parseDeliverableCsv(file);
      setRows(parsed);
      setParseErrors(errors);
      setFileName(file.name);
    } catch (e) {
      setErr(errMsg(e));
      setRows(null);
    }
  };

  const initCount = rows ? new Set(rows.map((r) => r.initiative.toLowerCase())).size : 0;
  const delivRows = rows ? rows.filter((r) => r.utm_content && r.campaignSfCode) : [];
  const unknownCampaigns = Array.from(
    new Set(delivRows.filter((r) => !knownSf.has(r.campaignSfCode)).map((r) => r.campaignSfCode))
  );

  const apply = () => {
    if (!rows) return;
    setErr(null);
    start(async () => {
      try {
        const rep = await importDeliverableCsv(rows);
        setResult(rep);
        router.refresh();
      } catch (e) {
        setErr(errMsg(e));
      }
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Import deliverables (CSV)</DialogTitle>
          <p className="text-[12.5px] text-muted2">
            Upload the filled-in “Deliverables template (CSV)”. It updates each
            initiative’s Salesforce campaigns and its deliverables (matched by
            Campaign SF Code + utm_content).
          </p>
        </DialogHeader>

        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-[12px] border border-dashed border-line bg-[var(--color-surface-2)] px-4 py-6 text-center transition-colors hover:border-navy">
          <FileUp size={22} className="text-faint" />
          <span className="text-[13px] font-medium">
            {fileName || "Choose a CSV file"}
          </span>
          <span className="text-[11.5px] text-faint">
            Get it from Data → Deliverables template (CSV)
          </span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </label>

        {rows && !result && (
          <div className="mt-3 rounded-[10px] border border-hair bg-surface p-3 text-[12.5px]">
            <div className="mb-1.5 font-semibold">Preview</div>
            <div className="flex flex-wrap gap-4">
              <span><b>{initCount}</b> initiative{initCount === 1 ? "" : "s"}</span>
              <span><b>{delivRows.length}</b> deliverable row{delivRows.length === 1 ? "" : "s"}</span>
              {unknownCampaigns.length > 0 && (
                <span className="text-[#b91c1c]">
                  <b>{unknownCampaigns.length}</b> unknown campaign code
                  {unknownCampaigns.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
            {unknownCampaigns.length > 0 && (
              <div className="mt-1.5 flex gap-1.5 text-[11.5px] text-[#8a5a0b]">
                <AlertTriangle size={13} className="mt-px shrink-0" />
                <span>
                  These Campaign SF Codes don’t exist and their rows will be skipped:{" "}
                  <span className="font-mono">{unknownCampaigns.join(", ")}</span>. Create
                  the campaigns first, or fix the codes.
                </span>
              </div>
            )}
            {parseErrors.length > 0 && (
              <ul className="mt-2 max-h-[110px] list-disc overflow-y-auto pl-5 text-[11.5px] text-[#b91c1c]">
                {parseErrors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {result && (
          <div className="mt-3 rounded-[10px] border border-[#cfe6d2] bg-[#eef7f0] p-3 text-[12.5px]">
            <div className="mb-1 flex items-center gap-1.5 font-semibold text-[#2e6b3e]">
              <Check size={14} /> Applied
            </div>
            <div className="flex flex-wrap gap-4">
              <span>
                Initiatives: <b>{result.initiatives.added}</b> added ·{" "}
                <b>{result.initiatives.updated}</b> updated
              </span>
              <span>
                Deliverables: <b>{result.deliverables.added}</b> added ·{" "}
                <b>{result.deliverables.updated}</b> updated
              </span>
            </div>
            {result.errors.length > 0 && (
              <ul className="mt-2 max-h-[120px] list-disc overflow-y-auto pl-5 text-[11.5px] text-[#b91c1c]">
                {result.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {err && <p className="mt-2 text-[12.5px] text-[#b91c1c]">{err}</p>}

        <DialogFooter className="items-center sm:justify-between">
          <span className="text-[11.5px] text-faint">
            Blank cells clear that field · re-uploading is a no-op
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[9px] border border-line bg-surface px-3.5 py-2 text-[13px] transition-colors hover:bg-[var(--color-hover)]"
            >
              {result ? "Done" : "Cancel"}
            </button>
            {!result && (
              <button
                type="button"
                onClick={apply}
                disabled={pending || !rows || delivRows.length === 0}
                className="inline-flex items-center gap-1.5 rounded-[9px] border border-navy bg-navy px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-navy-dark disabled:opacity-50"
              >
                {pending ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
                {pending ? "Applying…" : "Apply"}
              </button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
