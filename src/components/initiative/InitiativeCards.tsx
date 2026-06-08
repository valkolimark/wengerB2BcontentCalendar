import type { Brand, CampaignWithEvents, Initiative } from "@/lib/types";
import { initiativesByUrgency, rollup } from "@/lib/rollups";
import { InitiativeCard } from "./InitiativeCard";

/**
 * Grid of initiative cards, sorted by urgency (nearest upcoming milestone
 * first). Receives the already-filtered list to render.
 */
export function InitiativeCards({
  initiatives,
  campaigns,
  brandMap,
  today,
  canSeeFinancials,
  emptyLabel,
  onSelect,
}: {
  initiatives: Initiative[];
  campaigns: CampaignWithEvents[];
  brandMap: Record<string, Brand>;
  today: Date;
  canSeeFinancials: boolean;
  emptyLabel?: string;
  onSelect: (initiativeId: string) => void;
}) {
  const sorted = initiativesByUrgency(initiatives, campaigns, today);

  if (sorted.length === 0) {
    return (
      <div className="px-3 py-4 text-[13px] text-faint">
        {emptyLabel ?? "No initiatives yet."}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-[13px]">
      {sorted.map((init) => (
        <InitiativeCard
          key={init.id}
          initiative={init}
          rollup={rollup(init.id, campaigns, today)}
          brandMap={brandMap}
          canSeeFinancials={canSeeFinancials}
          onSelect={() => onSelect(init.id)}
        />
      ))}
    </div>
  );
}
