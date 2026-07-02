import { Send, Palette, Mail, Code2 } from "lucide-react";
import type { Brand, CalendarEvent, CalendarMarkerType } from "@/lib/types";

// Accent colors for the deliverable hand-off markers (comp = amber, code = blue).
const COMP_AMBER = "#c47614";
const CODE_BLUE = "#3f6fb0";

const TITLE: Record<CalendarMarkerType, string> = {
  launch: "launch",
  comp: "comp-review due",
  send: "send",
  deliv_comp: "comp due",
  deliv_code: "code due",
};

/**
 * A calendar marker chip. Five styles:
 *  - send        = solid brand fill, white text (the deliverable send — strongest)
 *  - launch      = brand tint fill, brand text, hairline border
 *  - comp        = transparent, dashed brand border (campaign comp-review due)
 *  - deliv_comp  = transparent, dashed amber border (deliverable comp due)
 *  - deliv_code  = transparent, dashed blue border (deliverable code due)
 * Clicking opens the campaign drawer (focused on the deliverable when known).
 */
export function EventChip({
  event,
  brand,
  onSelect,
}: {
  event: CalendarEvent;
  brand: Brand | undefined;
  onSelect: (campaignId: string, deliverableId?: string) => void;
}) {
  const dot = brand?.dot ?? "#A09E94";
  const tint = brand?.tint ?? "var(--color-surface-2)";
  const text = brand?.text ?? "var(--color-ink-soft)";

  let style: React.CSSProperties;
  let icon;
  switch (event.type) {
    case "send":
      style = { background: dot, color: "#fff", border: `0.5px solid ${dot}` };
      icon = <Mail size={11} className="shrink-0" />;
      break;
    case "launch":
      style = { background: tint, color: text, border: `0.5px solid ${dot}55` };
      icon = <Send size={11} className="shrink-0" />;
      break;
    case "deliv_comp":
      style = { background: "transparent", color: COMP_AMBER, border: `1px dashed ${COMP_AMBER}` };
      icon = <Palette size={11} className="shrink-0" />;
      break;
    case "deliv_code":
      style = { background: "transparent", color: CODE_BLUE, border: `1px dashed ${CODE_BLUE}` };
      icon = <Code2 size={11} className="shrink-0" />;
      break;
    default: // campaign comp-review due
      style = { background: "transparent", color: text, border: `1px dashed ${dot}aa` };
      icon = <Palette size={11} className="shrink-0" />;
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(event.campaignId, event.deliverableId)}
      className="mt-1 flex w-full items-center gap-1 rounded-[7px] px-1.5 py-[3px] text-left text-[11px] font-medium transition-[filter,transform] hover:brightness-[.96] hover:translate-x-px"
      style={style}
      title={`${event.campaignName} — ${TITLE[event.type]}`}
    >
      {icon}
      <span className="overflow-hidden text-ellipsis whitespace-nowrap">
        {event.label}
      </span>
    </button>
  );
}
