import { useState } from "react";
import { Search, X, Check } from "lucide-react";
import type { Initiative } from "@/lib/types";

/**
 * Searchable single-select initiative picker: a search box, a scrollable
 * selectable list, and a "Selected: …" confirmation line. Replaces a plain
 * dropdown in the campaign form.
 */
export function InitiativePicker({
  initiatives,
  value,
  onChange,
}: {
  initiatives: Initiative[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const ql = q.trim().toLowerCase();
  const matches = initiatives.filter(
    (i) =>
      !ql ||
      [i.name, i.owner, i.status].some((v) => (v || "").toLowerCase().includes(ql))
  );
  const selected = initiatives.find((i) => i.id === value);

  return (
    <div>
      <div className="mb-2 flex h-9 items-center gap-2 rounded-[9px] border border-line bg-white px-3 transition-[box-shadow,border-color] focus-within:border-navy focus-within:shadow-[0_0_0_3px_rgba(28,59,102,.1)]">
        <Search size={14} className="shrink-0 text-faint" />
        <input
          className="flex-1 bg-transparent text-sm outline-none"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search initiatives…"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            aria-label="Clear"
            className="flex size-[22px] items-center justify-center rounded-full bg-seg text-muted"
          >
            <X size={13} />
          </button>
        )}
      </div>
      <div className="flex max-h-[134px] flex-col gap-1.5 overflow-y-auto pr-0.5">
        {matches.map((i) => {
          const on = value === i.id;
          return (
            <button
              key={i.id}
              type="button"
              onClick={() => onChange(i.id)}
              className="flex w-full items-center gap-2.5 rounded-[9px] border px-[11px] py-2 text-left transition-colors"
              style={{
                borderColor: on ? "var(--color-navy)" : "var(--color-cell)",
                background: on ? "#eef3f9" : "#fff",
              }}
            >
              <span className="flex-1 text-[13px] font-medium">{i.name}</span>
              <span className="text-[11.5px] text-faint">{i.owner}</span>
              {on && <Check size={14} className="shrink-0 text-navy" />}
            </button>
          );
        })}
        {matches.length === 0 && (
          <div className="px-2 py-3 text-[13px] text-faint">
            No initiatives match.
          </div>
        )}
      </div>
      <div className="mt-[7px] text-[11.5px] text-muted2">
        Selected: {selected?.name ?? "—"}
      </div>
    </div>
  );
}
