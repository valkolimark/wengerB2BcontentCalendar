import { Send, Palette, Plus } from "lucide-react";
import type { Brand } from "@/lib/types";

/**
 * One chip per brand (color dot + label). Clicking a chip toggles that brand's
 * events on/off. A "+ Brand" chip opens the brand modal. Includes the launch
 * (filled) / comp-due (dashed) key.
 */
export function BrandLegend({
  brands,
  hiddenBrands,
  onToggle,
  canWrite,
  onAddBrand,
}: {
  brands: Brand[];
  hiddenBrands: Set<string>;
  onToggle: (brandId: string) => void;
  canWrite: boolean;
  onAddBrand: () => void;
}) {
  return (
    <div className="mb-[14px] flex flex-wrap items-center justify-between gap-2.5">
      <div className="flex flex-wrap gap-[7px]">
        {brands.map((b) => {
          const off = hiddenBrands.has(b.id);
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => onToggle(b.id)}
              aria-pressed={!off}
              data-off={off}
              className="v-legend-chip inline-flex items-center gap-[7px] rounded-[20px] border border-line bg-surface px-[11px] py-[5px] text-[12.5px] transition-colors hover:border-[#cfcbc0]"
              style={{ opacity: off ? 0.38 : 1, ["--b-dot"]: b.dot } as React.CSSProperties}
            >
              <span
                className="v-dot size-2.5 shrink-0 rounded-[3px]"
                style={{ background: b.dot }}
              />
              {b.label}
            </button>
          );
        })}
        {canWrite && (
          <button
            type="button"
            onClick={onAddBrand}
            className="inline-flex items-center gap-[5px] rounded-[20px] border border-dashed border-line bg-surface px-[11px] py-[5px] text-[12.5px] text-ink-muted transition-colors hover:border-[#cfcbc0]"
          >
            <Plus size={13} /> Brand
          </button>
        )}
      </div>
      <div className="flex gap-3.5 text-xs text-muted2">
        <span className="inline-flex items-center gap-1.5">
          <Send size={12} /> launch
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Palette size={12} /> comp due
        </span>
      </div>
    </div>
  );
}
