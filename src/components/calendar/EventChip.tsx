import { Send, Palette } from "lucide-react";
import type { Brand, CalendarEvent } from "@/lib/types";
import { gradCss } from "@/lib/brands";

/**
 * A brand-tinted event chip. Launch = filled (brand tint bg, brand text,
 * hairline brand border); comp-due = transparent with a dashed brand border.
 * Clicking opens the campaign in the detail drawer.
 */
export function EventChip({
  event,
  brand,
  onSelect,
  index = 0,
}: {
  event: CalendarEvent;
  brand: Brand | undefined;
  onSelect: (campaignId: string) => void;
  index?: number;
}) {
  const isLaunch = event.type === "launch";
  const dot = brand?.dot ?? "#A09E94";
  const tint = brand?.tint ?? "var(--color-surface-2)";
  const text = brand?.text ?? "var(--color-ink-soft)";
  const grad = brand?.grad;

  return (
    <button
      type="button"
      onClick={() => onSelect(event.campaignId)}
      className="v-chip v-pop mt-1 flex w-full items-center gap-1 rounded-[7px] px-1.5 py-[3px] text-left text-[11px] font-medium transition-[filter,transform] hover:brightness-[.96] hover:translate-x-px"
      data-launch={isLaunch}
      style={
        {
          background: isLaunch ? tint : "transparent",
          color: text,
          border: isLaunch ? `0.5px solid ${dot}55` : `1px dashed ${dot}aa`,
          "--b-dot": dot,
          ...(grad ? { "--b-grad": gradCss(grad) } : {}),
          animationDelay: `${index * 45}ms`,
        } as React.CSSProperties
      }
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
    </button>
  );
}
