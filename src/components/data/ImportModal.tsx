"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type {
  CampaignWithEvents,
  ImportPayload,
  ImportReport,
  Initiative,
} from "@/lib/types";
import { parseWorkbook, diffPayload, type ImportDiff } from "@/lib/xlsx-import";
import { importWorkbook } from "@/lib/actions";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function ImportModal({
  initiatives,
  campaigns,
  onClose,
}: {
  initiatives: Initiative[];
  campaigns: CampaignWithEvents[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [fileName, setFileName] = useState<string | null>(null);
  const [payload, setPayload] = useState<ImportPayload | null>(null);
  const [diff, setDiff] = useState<ImportDiff | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    setReport(null);
    setFileName(file.name);
    try {
      const { payload: p, errors } = await parseWorkbook(file);
      setPayload(p);
      setParseErrors(errors);
      setDiff(diffPayload(p, { initiatives, campaigns }));
    } catch (ex) {
      setErr(errMsg(ex));
      setPayload(null);
      setDiff(null);
    }
  };

  const apply = () => {
    if (!payload) return;
    setErr(null);
    start(async () => {
      try {
        const r = await importWorkbook(payload);
        setReport(r);
        router.refresh();
      } catch (ex) {
        setErr(errMsg(ex));
      }
    });
  };

  const totalRows = payload
    ? payload.initiatives.length + payload.campaigns.length + payload.events.length
    : 0;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>Import workbook</DialogTitle>
        </DialogHeader>

        {!report && (
          <>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[12px] border border-dashed border-line bg-[var(--color-surface-2)] px-4 py-7 text-center transition-colors hover:border-[#cfcbc0]">
              <UploadCloud size={26} className="text-faint" />
              <span className="text-[13.5px] font-medium">
                {fileName ?? "Choose an .xlsx file"}
              </span>
              <span className="text-[11.5px] text-faint">
                Parsed in your browser — nothing is saved until you confirm.
              </span>
              <input
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={onFile}
              />
            </label>

            {diff && (
              <div className="mt-4">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-faint">
                  Preview ({totalRows} rows)
                </div>
                <div className="grid grid-cols-3 gap-2 text-[13px]">
                  <PreviewCard
                    label="Initiatives"
                    add={diff.initiatives.add}
                    second={`${diff.initiatives.update} update`}
                  />
                  <PreviewCard
                    label="Campaigns"
                    add={diff.campaigns.add}
                    second={`${diff.campaigns.update} update`}
                  />
                  <PreviewCard
                    label="Events"
                    add={diff.events.add}
                    second={`${diff.events.existing} existing`}
                  />
                </div>

                {parseErrors.length > 0 && (
                  <div className="mt-3 rounded-[10px] border border-[#f0ddb0] bg-[#fbefd6] p-3">
                    <div className="mb-1 flex items-center gap-1.5 text-[12.5px] font-medium text-[#8a5a0b]">
                      <AlertTriangle size={13} /> {parseErrors.length} row
                      {parseErrors.length !== 1 ? "s" : ""} skipped
                    </div>
                    <ul className="max-h-[120px] list-disc overflow-y-auto pl-5 text-[11.5px] text-[#8a5a0b]">
                      {parseErrors.slice(0, 30).map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {err && <p className="mt-3 text-[12.5px] text-[#b91c1c]">{err}</p>}

            <DialogFooter className="items-center sm:justify-between">
              <span className="text-[11.5px] text-faint">
                Additive &amp; idempotent — no deletes. Re-importing changes nothing.
              </span>
              <button
                type="button"
                onClick={apply}
                disabled={pending || !payload || totalRows === 0}
                className="rounded-[9px] border border-navy bg-navy px-4 py-2 text-[13.5px] font-medium text-white transition-colors hover:bg-navy-dark disabled:opacity-50"
              >
                {pending ? "Importing…" : "Confirm import"}
              </button>
            </DialogFooter>
          </>
        )}

        {report && (
          <>
            <div className="flex items-center gap-2 rounded-[10px] border border-[#cfe6cf] bg-[#e7f1e6] p-3 text-[13px] text-[#1e4a28]">
              <CheckCircle2 size={16} /> Import applied.
            </div>
            <ul className="mt-3 space-y-1 text-[13px]">
              <li>
                Brands: <strong>{report.brands.added}</strong> added
              </li>
              <li>
                Initiatives: <strong>{report.initiatives.added}</strong> added ·{" "}
                {report.initiatives.updated} updated
              </li>
              <li>
                Campaigns: <strong>{report.campaigns.added}</strong> added ·{" "}
                {report.campaigns.updated} updated
              </li>
              <li>
                Events: <strong>{report.events.added}</strong> added ·{" "}
                {report.events.skipped} already present
              </li>
              <li>Financials: {report.financials.updated} written</li>
            </ul>
            {report.errors.length > 0 && (
              <div className="mt-3 rounded-[10px] border border-[#f0ddb0] bg-[#fbefd6] p-3">
                <div className="mb-1 text-[12.5px] font-medium text-[#8a5a0b]">
                  {report.errors.length} issue
                  {report.errors.length !== 1 ? "s" : ""}
                </div>
                <ul className="max-h-[120px] list-disc overflow-y-auto pl-5 text-[11.5px] text-[#8a5a0b]">
                  {report.errors.slice(0, 30).map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            )}
            <DialogFooter>
              <button
                type="button"
                onClick={onClose}
                className="rounded-[9px] border border-line bg-surface px-4 py-2 text-[13.5px] font-medium transition-colors hover:bg-[var(--color-hover)]"
              >
                Done
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PreviewCard({
  label,
  add,
  second,
}: {
  label: string;
  add: number;
  second: string;
}) {
  return (
    <div className="rounded-[10px] border border-hair bg-surface p-3">
      <div className="text-[11px] uppercase tracking-[0.04em] text-faint">
        {label}
      </div>
      <div className="mt-1 text-[20px] font-semibold text-[#1e4a28]">+{add}</div>
      <div className="text-[11.5px] text-muted2">{second}</div>
    </div>
  );
}
