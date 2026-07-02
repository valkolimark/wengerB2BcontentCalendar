import type { Brand, CalendarEvent } from "@/lib/types";
import { DOW, key, monthGridDays, sameDay } from "@/lib/dates";
import { EventChip } from "./EventChip";

const MAX_CHIPS = 3;

/**
 * 6-week month grid, Sunday-start. Out-of-month days are dimmed, today is
 * outlined, and each cell shows up to 3 event chips plus a "+N more" tail.
 */
export function MonthView({
  cursor,
  eventsByDay,
  brandMap,
  today,
  onSelect,
}: {
  cursor: Date;
  eventsByDay: Record<string, CalendarEvent[]>;
  brandMap: Record<string, Brand>;
  today: Date | null;
  onSelect: (campaignId: string, deliverableId?: string) => void;
}) {
  const cells = monthGridDays(cursor);

  return (
    <div>
      <div className="mb-2 grid grid-cols-7 gap-[7px]">
        {DOW.map((d) => (
          <div
            key={d}
            className="text-center text-[11.5px] font-medium uppercase tracking-[0.04em] text-faint"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-[7px]">
        {cells.map((d, i) => {
          const out = d.getMonth() !== cursor.getMonth();
          const isToday = today ? sameDay(d, today) : false;
          const evs = eventsByDay[key(d)] ?? [];
          return (
            <div
              key={i}
              className="min-h-[92px] overflow-hidden rounded-[9px] border p-1.5"
              style={{
                borderColor: isToday ? "var(--color-navy)" : "var(--color-cell)",
                background: out ? "var(--color-out)" : "var(--color-surface)",
                opacity: out ? 0.55 : 1,
                boxShadow: isToday ? "inset 0 0 0 1px var(--color-navy)" : undefined,
              }}
            >
              <div
                className="mb-1 flex items-center gap-1.5 text-[12.5px] font-semibold"
                style={{ color: isToday ? "var(--color-navy)" : "var(--color-ink-muted)" }}
              >
                {d.getDate()}
                {isToday && (
                  <span className="rounded-[10px] bg-navy px-1.5 py-px text-[9.5px] font-semibold text-white">
                    today
                  </span>
                )}
              </div>
              {evs.slice(0, MAX_CHIPS).map((ev) => (
                <EventChip
                  key={ev.id}
                  event={ev}
                  brand={brandMap[ev.brandId]}
                  onSelect={onSelect}
                />
              ))}
              {evs.length > MAX_CHIPS && (
                <div className="mt-1 pl-[3px] text-[10.5px] text-faint">
                  +{evs.length - MAX_CHIPS} more
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
