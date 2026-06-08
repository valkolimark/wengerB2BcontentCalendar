import { Search, X, ChevronRight } from "lucide-react";
import type { Brand, CampaignWithEvents, Initiative } from "@/lib/types";

const MAX_RESULTS = 6;

/**
 * Global search over initiatives + campaigns. The input filters the cards
 * upstream; here it renders the search box, a result count, and a strip of
 * matching campaigns (click → open the campaign drawer).
 */
export function GlobalSearch({
  q,
  onQ,
  matched,
  visibleInitiativeCount,
  brandMap,
  initiativeById,
  onPick,
}: {
  q: string;
  onQ: (v: string) => void;
  matched: CampaignWithEvents[];
  visibleInitiativeCount: number;
  brandMap: Record<string, Brand>;
  initiativeById: (id: string | null) => Initiative | undefined;
  onPick: (campaignId: string) => void;
}) {
  const ql = q.trim();

  return (
    <div>
      <div className="mb-2.5 flex h-[42px] items-center gap-2 rounded-[11px] border border-line bg-white px-3 transition-[box-shadow,border-color] focus-within:border-navy focus-within:shadow-[0_0_0_3px_rgba(28,59,102,.1)]">
        <Search size={15} className="shrink-0 text-faint" />
        <input
          className="flex-1 bg-transparent text-sm outline-none"
          value={q}
          onChange={(e) => onQ(e.target.value)}
          placeholder="Search initiatives and campaigns — name, brand, vendor, segment, SF code, UTM…"
        />
        {q && (
          <button
            type="button"
            onClick={() => onQ("")}
            aria-label="Clear search"
            className="flex size-[22px] items-center justify-center rounded-full bg-seg text-muted"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {ql && (
        <div className="mb-3 text-xs text-muted2">
          {visibleInitiativeCount} initiative{visibleInitiativeCount !== 1 ? "s" : ""} ·{" "}
          {matched.length} campaign{matched.length !== 1 ? "s" : ""} match “{ql}”
        </div>
      )}

      {ql && matched.length > 0 && (
        <div className="mb-4 flex flex-col gap-1.5">
          {matched.slice(0, MAX_RESULTS).map((c) => {
            const parent = initiativeById(c.initiative_id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onPick(c.id)}
                className="flex items-center gap-2.5 rounded-[10px] border border-[#f0eee7] bg-[#fbfaf6] px-3 py-2.5 text-left transition-colors hover:border-[#d5d1c7] hover:bg-white"
              >
                <span
                  className="size-2.5 shrink-0 rounded-[3px]"
                  style={{ background: brandMap[c.brand_id]?.dot ?? "#A09E94" }}
                />
                <span className="text-[13px] font-medium">{c.name}</span>
                <span className="ml-auto text-[11.5px] text-faint">
                  {parent?.name ?? "Unassigned"}
                </span>
                <ChevronRight size={12} className="shrink-0 text-faint" />
              </button>
            );
          })}
          {matched.length > MAX_RESULTS && (
            <div className="pl-1 text-[11.5px] text-faint">
              +{matched.length - MAX_RESULTS} more campaigns
            </div>
          )}
        </div>
      )}
    </div>
  );
}
