import { useState } from "react";
import { AlertTriangle, ChevronRight } from "lucide-react";
import type { Brand, CampaignWithEvents } from "@/lib/types";

/**
 * Surfaces orphaned campaigns (no initiative, or pointing at a missing one) in
 * a visible, expandable bar. Each row opens the campaign so it can be adopted
 * into an initiative via the searchable picker.
 */
export function OrphanBar({
  orphans,
  brandMap,
  onAdopt,
}: {
  orphans: CampaignWithEvents[];
  brandMap: Record<string, Brand>;
  onAdopt: (campaignId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  if (orphans.length === 0) return null;

  return (
    <div className="mb-3.5 rounded-[11px] border border-[#f0ddb0] bg-[#fbefd6]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[12.5px] font-medium text-[#8a5a0b]"
      >
        <AlertTriangle size={14} />
        {orphans.length} unassigned campaign{orphans.length !== 1 ? "s" : ""}
        <span className="ml-auto text-[11.5px] font-normal">
          {open ? "Hide" : "Review & assign"}
        </span>
      </button>
      {open && (
        <div className="flex flex-col gap-1.5 px-3 pb-3">
          {orphans.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onAdopt(c.id)}
              className="flex items-center gap-2.5 rounded-[9px] border border-[#f0ddb0] bg-surface px-3 py-2 text-left transition-colors hover:border-[#e0c98a]"
            >
              <span
                className="size-2.5 shrink-0 rounded-[3px]"
                style={{ background: brandMap[c.brand_id]?.dot ?? "#A09E94" }}
              />
              <span className="flex-1 text-[13px] font-medium">{c.name}</span>
              <span className="text-[11.5px] text-[#8a5a0b]">Assign</span>
              <ChevronRight size={13} className="shrink-0 text-[#8a5a0b]" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
