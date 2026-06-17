import { ChevronLeft, ChevronRight } from "lucide-react";
import { MONTHS, DOW, addDays, startOfWeek } from "@/lib/dates";
import type { CalendarView } from "./CalendarHome";

const VIEWS: CalendarView[] = ["day", "week", "month"];

function periodTitle(view: CalendarView, cursor: Date): string {
  if (view === "month") {
    return `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
  }
  if (view === "week") {
    const s = startOfWeek(cursor);
    const e = addDays(s, 6);
    const endMonth =
      s.getMonth() === e.getMonth() ? "" : ` ${MONTHS[e.getMonth()].slice(0, 3)}`;
    return `Week of ${MONTHS[s.getMonth()].slice(0, 3)} ${s.getDate()} – ${endMonth} ${e.getDate()}`;
  }
  return `${DOW[cursor.getDay()]}, ${MONTHS[cursor.getMonth()].slice(0, 3)} ${cursor.getDate()}`;
}

/**
 * Period title, prev/next navigation, Today, and the Day/Week/Month segmented
 * control.
 */
export function Toolbar({
  view,
  cursor,
  onView,
  onPrev,
  onNext,
  onToday,
}: {
  view: CalendarView;
  cursor: Date;
  onView: (v: CalendarView) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  return (
    <div className="mb-[14px] flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Previous"
          className="flex size-8 items-center justify-center rounded-lg border border-line bg-surface text-[var(--color-ink-soft)] transition-colors hover:border-[#d5d1c7] hover:bg-[var(--color-hover)]"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="min-w-[150px] text-[19px] font-semibold tracking-[-0.02em]">
          {/* keyed so the Vivid theme re-mounts (and re-animates) on change */}
          <span key={periodTitle(view, cursor)} className="v-title inline-block">
            {periodTitle(view, cursor)}
          </span>
        </div>
        <button
          type="button"
          onClick={onNext}
          aria-label="Next"
          className="flex size-8 items-center justify-center rounded-lg border border-line bg-surface text-[var(--color-ink-soft)] transition-colors hover:border-[#d5d1c7] hover:bg-[var(--color-hover)]"
        >
          <ChevronRight size={18} />
        </button>
        <button
          type="button"
          onClick={onToday}
          className="ml-1 rounded-lg border border-line bg-surface px-[13px] py-1.5 text-[13px] transition-colors hover:bg-[var(--color-hover)]"
        >
          Today
        </button>
      </div>

      <div className="inline-flex rounded-[9px] bg-seg p-[3px]">
        {VIEWS.map((v) => {
          const on = view === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onView(v)}
              className="v-seg-btn rounded-[7px] px-[15px] py-1.5 text-[13px] font-medium transition-colors"
              style={{
                background: on ? "var(--color-surface)" : "transparent",
                color: on ? "var(--color-ink)" : "var(--color-ink-muted)",
                boxShadow: on ? "0 1px 2px rgba(0,0,0,.06)" : undefined,
              }}
            >
              {v[0].toUpperCase() + v.slice(1)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
