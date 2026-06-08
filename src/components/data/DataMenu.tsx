"use client";

import { useState } from "react";
import { Download, Upload, ChevronDown, FileSpreadsheet } from "lucide-react";
import type { Brand, CampaignWithEvents, Initiative } from "@/lib/types";
import { exportWorkbook } from "@/lib/xlsx-export";

/**
 * App-bar data menu: export the workbook (Full vs JMC view) and — for admins —
 * open the import flow. Export is fully client-side; a non-entitled user only
 * ever gets the scrubbed shape because the financial data isn't present.
 */
export function DataMenu({
  brands,
  initiatives,
  campaigns,
  canSeeFinancials,
  isAdmin,
  onImport,
}: {
  brands: Brand[];
  initiatives: Initiative[];
  campaigns: CampaignWithEvents[];
  canSeeFinancials: boolean;
  isAdmin: boolean;
  onImport: () => void;
}) {
  const [open, setOpen] = useState(false);

  const doExport = (includeFinancials: boolean) => {
    exportWorkbook({ brands, initiatives, campaigns, includeFinancials });
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-[9px] border border-line bg-white px-2.5 py-[6px] text-[13px] font-medium transition-colors hover:bg-[#f2f0ea]"
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
          <div className="absolute right-0 z-40 mt-1.5 w-[230px] overflow-hidden rounded-[11px] border border-hair bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,.10)]">
            <button
              type="button"
              onClick={() => doExport(canSeeFinancials)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors hover:bg-[#f2f0ea]"
            >
              <Download size={14} className="text-muted" />
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
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors hover:bg-[#f2f0ea]"
            >
              <Download size={14} className="text-muted" />
              <span>
                JMC view
                <span className="block text-[11px] text-faint">
                  financials omitted entirely
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
                    onImport();
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors hover:bg-[#f2f0ea]"
                >
                  <Upload size={14} className="text-muted" />
                  <span>
                    Import…
                    <span className="block text-[11px] text-faint">
                      preview before applying
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
