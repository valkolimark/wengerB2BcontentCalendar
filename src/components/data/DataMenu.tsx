"use client";

import { useState } from "react";
import {
  Download,
  Upload,
  ChevronDown,
  FileSpreadsheet,
  GitBranch,
  Table2,
  FileUp,
} from "lucide-react";
import type {
  Brand,
  CampaignWithEvents,
  Initiative,
  SfParent,
} from "@/lib/types";
import { exportWorkbook, exportSfImportCsv } from "@/lib/xlsx-export";
import { buildDeliverableCsv } from "@/lib/deliverable-csv";
import { key } from "@/lib/dates";

/**
 * App-bar data menu: export the workbook (Full vs JMC view), export the
 * Salesforce import CSV, and — for admins — open the import flow. Export is
 * fully client-side; a non-entitled user only ever gets the scrubbed shape
 * because the financial data isn't present.
 */
export function DataMenu({
  brands,
  initiatives,
  campaigns,
  sfParents,
  canSeeFinancials,
  isAdmin,
  onImport,
  onImportCsv,
}: {
  brands: Brand[];
  initiatives: Initiative[];
  campaigns: CampaignWithEvents[];
  sfParents: SfParent[];
  canSeeFinancials: boolean;
  isAdmin: boolean;
  onImport: () => void;
  onImportCsv: () => void;
}) {
  const [open, setOpen] = useState(false);

  const doDeliverableCsv = () => {
    const csv = buildDeliverableCsv(initiatives, campaigns);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wenger-deliverables_${key(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const doExport = (includeFinancials: boolean) => {
    exportWorkbook({
      brands,
      initiatives,
      campaigns,
      sfParents,
      includeFinancials,
    });
    setOpen(false);
  };

  const doSfCsv = () => {
    exportSfImportCsv(campaigns, sfParents);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-[9px] border border-line bg-surface px-2.5 py-[6px] text-[13px] font-medium transition-colors hover:bg-[var(--color-hover)]"
      >
        <FileSpreadsheet size={14} /> Data
        <ChevronDown size={13} className="text-faint" />
      </button>

      {open && (
        <>
          {/* click-away */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default"
          />
          <div className="absolute right-0 z-40 mt-1.5 w-[230px] overflow-hidden rounded-[11px] border border-hair bg-surface py-1 shadow-[0_8px_24px_rgba(0,0,0,.10)]">
            <button
              type="button"
              onClick={() => doExport(canSeeFinancials)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors hover:bg-[var(--color-hover)]"
            >
              <Download size={14} className="text-ink-muted" />
              <span>
                Full export
                <span className="block text-[11px] text-faint">
                  {canSeeFinancials
                    ? "includes leads + pipeline"
                    : "no financials (not entitled)"}
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => doExport(false)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors hover:bg-[var(--color-hover)]"
            >
              <Download size={14} className="text-ink-muted" />
              <span>
                JMC view
                <span className="block text-[11px] text-faint">
                  financials omitted entirely
                </span>
              </span>
            </button>

            <div className="my-1 border-t border-hair" />
            <button
              type="button"
              onClick={doSfCsv}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors hover:bg-[var(--color-hover)]"
            >
              <GitBranch size={14} className="text-ink-muted" />
              <span>
                Salesforce import (CSV)
                <span className="block text-[11px] text-faint">
                  campaigns + deduped parent chain
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={doDeliverableCsv}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors hover:bg-[var(--color-hover)]"
            >
              <Table2 size={14} className="text-ink-muted" />
              <span>
                Deliverables template (CSV)
                <span className="block text-[11px] text-faint">
                  fill in &amp; re-upload to update
                </span>
              </span>
            </button>

            {isAdmin && (
              <>
                <div className="my-1 border-t border-hair" />
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onImportCsv();
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors hover:bg-[var(--color-hover)]"
                >
                  <FileUp size={14} className="text-ink-muted" />
                  <span>
                    Import deliverables (CSV)
                    <span className="block text-[11px] text-faint">
                      initiative + deliverables · preview first
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onImport();
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors hover:bg-[var(--color-hover)]"
                >
                  <Upload size={14} className="text-ink-muted" />
                  <span>
                    Import workbook…
                    <span className="block text-[11px] text-faint">
                      initiatives / campaigns / events
                    </span>
                  </span>
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
