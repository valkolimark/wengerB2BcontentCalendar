import { Send, Palette, Mail } from "lucide-react";
import type { Brand, CalendarEvent } from "@/lib/types";

const TITLE: Record<CalendarEvent["type"], string> = {
  launch: "launch",
  comp: "comp due",
  send: "send",
};

/**
 * A brand-tinted event chip. Three marker styles:
 *  - send   = solid brand fill, white text (the actual deliverable send — strongest)
 *  - launch = brand tint fill, brand text, hairline border
 *  - comp   = transparent with a dashed brand border
 * Clicking opens the campaign in the detail drawer.
 */
export function EventChip({
  event,
  brand,
  onSelect,
}: {
  event: CalendarEvent;
  brand: Brand | undefined;
  onSelect: (campaignId: string) => void;
}) {
  const dot = brand?.dot ?? "#A09E94";
  const tint = brand?.tint ?? "var(--color-surface-2)";
  const text = brand?.text ?? "var(--color-ink-soft)";

  const style =
    event.type === "send"
      ? { background: dot, color: "#fff", border: `0.5px solid ${dot}` }
      : event.type === "launch"
        ? { background: tint, color: text, border: `0.5px solid ${dot}55` }
        : { background: "transparent", color: text, border: `1px dashed ${dot}aa` };

  return (
    <button
      type="button"
      onClick={() => onSelect(event.campaignId)}
      className="mt-1 flex w-full items-center gap-1 rounded-[7px] px-1.5 py-[3px] text-left text-[11px] font-medium transition-[filter,transform] hover:brightness-[.96] hover:translate-x-px"
      style={style}
      title={`${event.campaignName} — ${TITLE[event.type]}`}
    >
      {event.type === "send" ? (
        <Mail size={11} className="shrink-0" />
      ) : event.type === "launch" ? (
        <Send size={11} className="shrink-0" />
      ) : (
        <Palette size={11} className="shrink-0" />
      )}
      <span className="overflow-hidden text-ellipsis whitespace-nowrap">
        {event.label}
      </span>
    </button>
  );
}
