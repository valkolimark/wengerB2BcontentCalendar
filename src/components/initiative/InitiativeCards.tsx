import type { Brand, CampaignWithEvents, Initiative } from "@/lib/types";
import { initiativesByUrgency, rollup } from "@/lib/rollups";
import { InitiativeCard } from "./InitiativeCard";

/**
 * The initiatives section under the calendar: one card per initiative, sorted
 * by urgency (nearest upcoming milestone first).
 */
export function InitiativeCards({
  initiatives,
  campaigns,
  brandMap,
  today,
  canSeeFinancials,
  onSelect,
}: {
  initiatives: Initiative[];
  campaigns: CampaignWithEvents[];
  brandMap: Record<string, Brand>;
  today: Date;
  canSeeFinancials: boolean;
  onSelect: (initiativeId: string) => void;
}) {
  const sorted = initiativesByUrgency(initiatives, campaigns, today);

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-base font-semibold tracking-[-0.01em]">Initiatives</h2>
        <span className="rounded-[20px] bg-seg px-[9px] py-px text-xs font-semibold text-muted2">
          {initiatives.length}
        </span>
      </div>

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
    </section>
  );
}
