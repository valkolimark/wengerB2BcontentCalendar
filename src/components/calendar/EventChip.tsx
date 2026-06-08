import { Send, Palette } from "lucide-react";
import type { Brand, CalendarEvent } from "@/lib/types";

/**
 * A brand-tinted event chip. Launch = filled (brand tint bg, brand text,
 * hairline brand border); comp-due = transparent with a dashed brand border.
 * Display-only this cycle — the detail drawer arrives in Cycle 3.
 */
export function EventChip({
  event,
  brand,
}: {
  event: CalendarEvent;
  brand: Brand | undefined;
}) {
  const isLaunch = event.type === "launch";
  const dot = brand?.dot ?? "#A09E94";
  const tint = brand?.tint ?? "#EEEDE7";
  const text = brand?.text ?? "#4A4A45";

  return (
    <div
      className="mt-1 flex w-full items-center gap-1 rounded-[7px] px-1.5 py-[3px] text-[11px] font-medium"
      style={{
        background: isLaunch ? tint : "transparent",
        color: text,
        border: isLaunch ? `0.5px solid ${dot}55` : `1px dashed ${dot}aa`,
      }}
      title={`${event.campaignName} — ${isLaunch ? "launch" : "comp due"}`}
    >
      {isLaunch ? (
        <Send size={11} className="shrink-0" />
      ) : (
        <Palette size={11} className="shrink-0" />
      )}
      <span className="overflow-hidden text-ellipsis whitespace-nowrap">
        {event.label}
      </span>
    </div>
  );
}
