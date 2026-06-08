import { CalendarDays, Send, Palette } from "lucide-react";
import type { Brand, CalendarEvent } from "@/lib/types";
import { key } from "@/lib/dates";

/**
 * Agenda list for the cursor day: a brand bar + icon + campaign name with a
 * "brand · launch/comp" sub-line. Friendly empty state when nothing's scheduled.
 */
export function DayView({
  cursor,
  eventsByDay,
  brandMap,
  onSelect,
}: {
  cursor: Date;
  eventsByDay: Record<string, CalendarEvent[]>;
  brandMap: Record<string, Brand>;
  onSelect: (campaignId: string) => void;
}) {
  const evs = (eventsByDay[key(cursor)] ?? [])
    .slice()
    .sort((a, b) => a.type.localeCompare(b.type));

  if (evs.length === 0) {
    return (
      <div className="px-3 py-9 text-center text-faint">
        <CalendarDays size={26} className="mx-auto" />
        <p className="mt-2 text-[13.5px]">Nothing scheduled this day.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {evs.map((ev) => {
        const b = brandMap[ev.brandId];
        const isLaunch = ev.type === "launch";
        return (
          <button
            type="button"
            key={ev.id}
            onClick={() => onSelect(ev.campaignId)}
            className="flex items-center gap-3 border-b px-1.5 py-[13px] text-left transition-colors hover:bg-out"
            style={{ borderColor: "var(--color-cell)" }}
          >
            <span
              className="self-stretch rounded-[3px]"
              style={{ width: 3, background: b?.dot ?? "#A09E94" }}
            />
            <span
              className="flex size-[30px] shrink-0 items-center justify-center rounded-lg"
              style={{ color: b?.text, background: b?.tint }}
            >
              {isLaunch ? <Send size={14} /> : <Palette size={14} />}
            </span>
            <span>
              <span className="block text-sm font-medium">{ev.campaignName}</span>
              <span className="text-xs text-muted2">
                {b?.label ?? ev.brandId} ·{" "}
                {isLaunch ? "Launch" : "Comp review due"}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
