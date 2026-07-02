import { CalendarDays, Send, Palette, Mail, Code2 } from "lucide-react";
import type { Brand, CalendarEvent, CalendarMarkerType } from "@/lib/types";
import { key } from "@/lib/dates";

const COMP_AMBER = "#c47614";
const CODE_BLUE = "#3f6fb0";

const MARKER_LABEL: Record<CalendarMarkerType, string> = {
  send: "Send",
  launch: "Launch",
  comp: "Comp review due",
  deliv_comp: "Comp due",
  deliv_code: "Code due",
};

const DELIV = new Set<CalendarMarkerType>(["send", "deliv_comp", "deliv_code"]);

/**
 * Agenda list for the cursor day: a brand bar + icon + name with a
 * "brand · marker" sub-line. Deliverable markers use amber (comp) / blue (code)
 * accents; sends are filled. Friendly empty state when nothing's scheduled.
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
  onSelect: (campaignId: string, deliverableId?: string) => void;
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
        const isDeliv = DELIV.has(ev.type);
        const dot = b?.dot ?? "#A09E94";

        let sq: React.CSSProperties;
        let icon;
        if (ev.type === "send") {
          sq = { color: "#fff", background: dot };
          icon = <Mail size={14} />;
        } else if (ev.type === "deliv_comp") {
          sq = { color: "#fff", background: COMP_AMBER };
          icon = <Palette size={14} />;
        } else if (ev.type === "deliv_code") {
          sq = { color: "#fff", background: CODE_BLUE };
          icon = <Code2 size={14} />;
        } else if (ev.type === "launch") {
          sq = { color: b?.text, background: b?.tint };
          icon = <Send size={14} />;
        } else {
          sq = { color: b?.text, background: b?.tint };
          icon = <Palette size={14} />;
        }

        return (
          <button
            type="button"
            key={ev.id}
            onClick={() => onSelect(ev.campaignId, ev.deliverableId)}
            className="flex items-center gap-3 border-b px-1.5 py-[13px] text-left transition-colors hover:bg-out"
            style={{ borderColor: "var(--color-cell)" }}
          >
            <span
              className="self-stretch rounded-[3px]"
              style={{ width: 3, background: dot }}
            />
            <span
              className="flex size-[30px] shrink-0 items-center justify-center rounded-lg"
              style={sq}
            >
              {icon}
            </span>
            <span>
              <span className="block text-sm font-medium">
                {isDeliv ? ev.label : ev.campaignName}
              </span>
              <span className="text-xs text-muted2">
                {b?.label ?? ev.brandId} · {MARKER_LABEL[ev.type]}
                {isDeliv ? ` · ${ev.campaignName}` : ""}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
