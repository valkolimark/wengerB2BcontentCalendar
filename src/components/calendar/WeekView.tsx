import type { Brand, CalendarEvent } from "@/lib/types";
import { DOW, key, sameDay, weekDays } from "@/lib/dates";
import { EventChip } from "./EventChip";

/**
 * The cursor's week as 7 columns, with taller cells that list every event for
 * each day (no truncation). Today is outlined.
 */
export function WeekView({
  cursor,
  eventsByDay,
  brandMap,
  today,
}: {
  cursor: Date;
  eventsByDay: Record<string, CalendarEvent[]>;
  brandMap: Record<string, Brand>;
  today: Date | null;
}) {
  const days = weekDays(cursor);

  return (
    <div className="grid grid-cols-7 gap-[7px] [grid-auto-rows:minmax(120px,auto)]">
      {days.map((d, i) => {
        const isToday = today ? sameDay(d, today) : false;
        const evs = eventsByDay[key(d)] ?? [];
        return (
          <div
            key={i}
            className="min-h-[120px] overflow-hidden rounded-[9px] border p-1.5"
            style={{
              borderColor: isToday ? "var(--color-navy)" : "var(--color-cell)",
              boxShadow: isToday ? "inset 0 0 0 1px var(--color-navy)" : undefined,
            }}
          >
            <div
              className="mb-1 flex items-center gap-1.5 text-[12.5px] font-semibold"
              style={{ color: isToday ? "var(--color-navy)" : "var(--color-muted)" }}
            >
              {DOW[d.getDay()]} {d.getDate()}
              {isToday && (
                <span className="rounded-[10px] bg-navy px-1.5 py-px text-[9.5px] font-semibold text-white">
                  today
                </span>
              )}
            </div>
            {evs.map((ev) => (
              <EventChip key={ev.id} event={ev} brand={brandMap[ev.brandId]} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
