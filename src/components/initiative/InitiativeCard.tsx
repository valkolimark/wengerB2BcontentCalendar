import { Layers } from "lucide-react";
import type { Brand, Initiative } from "@/lib/types";
import type { Rollup } from "@/lib/rollups";
import { STATUS } from "@/lib/brands";
import { prettyDate } from "@/lib/dates";
import { fmtMoney, initials } from "@/lib/format";

const PLACEHOLDER = { dot: "#D8D5CC" };

/**
 * One initiative card: split accent bar + brand dots (co-brand aware), name,
 * status, brand-colored progress, next milestone, "X of N sent", financials,
 * and owner initials. Clicking opens the initiative drawer.
 */
export function InitiativeCard({
  initiative,
  rollup,
  brandMap,
  canSeeFinancials,
  onSelect,
}: {
  initiative: Initiative;
  rollup: Rollup;
  brandMap: Record<string, Brand>;
  canSeeFinancials: boolean;
  onSelect: () => void;
}) {
  const st = STATUS[initiative.status] ?? STATUS.Planning;
  const bs = rollup.brands.map((id) => brandMap[id]).filter(Boolean);
  const bars = bs.length ? bs : [PLACEHOLDER];

  const meta: string[] = [];
  if (canSeeFinancials) {
    meta.push(`${rollup.leads} leads`);
    meta.push(fmtMoney(rollup.pipeline));
  } else {
    meta.push(`${rollup.count} campaign${rollup.count !== 1 ? "s" : ""}`);
  }
  const m2 =
    (rollup.total ? `${rollup.sent} of ${rollup.total} sent · ` : "") +
    meta.join(" · ");
  const m1 = rollup.next
    ? `${rollup.next.label} · ${prettyDate(rollup.next.date)}`
    : "Complete";

  return (
    <button
      type="button"
      onClick={onSelect}
      className="relative overflow-hidden rounded-[14px] border border-hair bg-surface py-[15px] pl-[19px] pr-4 text-left transition-[transform,box-shadow,border-color] hover:-translate-y-0.5 hover:border-[#d5d1c7] hover:shadow-[0_6px_18px_rgba(0,0,0,.05)]"
    >
      <span className="absolute inset-y-0 left-0 flex w-1 flex-col">
        {bars.map((b, k) => (
          <span key={k} className="flex-1" style={{ background: b.dot }} />
        ))}
      </span>

      <div className="flex items-center gap-2">
        <span className="inline-flex gap-[3px]">
          {bars.map((b, k) => (
            <span
              key={k}
              className="size-2.5 rounded-[3px]"
              style={{ background: b.dot }}
            />
          ))}
        </span>
        <span className="flex-1 text-sm font-semibold tracking-[-0.01em]">
          {initiative.name}
        </span>
        <span
          className="whitespace-nowrap rounded-[7px] px-[9px] py-0.5 text-[11px] font-semibold"
          style={{ background: st.bg, color: st.fg }}
        >
          {initiative.status}
        </span>
      </div>

      {bs.length > 1 && (
        <div className="mt-[7px] flex items-center gap-[5px] text-[11px] text-muted2">
          <Layers size={11} /> co-branded · {bs.map((b) => b.label).join(" + ")}
        </div>
      )}

      <div className="my-[11px] h-1.5 overflow-hidden rounded bg-[var(--color-surface-2)]">
        <span
          className="block h-full rounded"
          style={{
            width: `${Math.round(rollup.progress * 100)}%`,
            background: bs[0]?.dot ?? "#999",
          }}
        />
      </div>

      <div className="flex items-end justify-between gap-2.5">
        <div>
          <div className="text-[12.5px] font-medium text-[var(--color-ink-soft)]">{m1}</div>
          <div className="mt-0.5 text-xs text-faint">{m2}</div>
        </div>
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-cell)] text-[11px] font-semibold text-ink-muted"
          title={initiative.owner}
        >
          {initials(initiative.owner)}
        </span>
      </div>
    </button>
  );
}
