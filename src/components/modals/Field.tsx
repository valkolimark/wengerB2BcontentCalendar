import type { ReactNode } from "react";

/** Labeled form field wrapper used across the modals. */
export function Field({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="mb-3.5 block">
      <span className="mb-1.5 block text-xs font-medium text-ink-muted">{label}</span>
      {children}
    </label>
  );
}

/** Shared text input styling (matches the prototype's .inp). */
export const inputClass =
  "h-[38px] w-full rounded-[9px] border border-line bg-surface px-[11px] text-[13.5px] outline-none transition-[box-shadow,border-color] focus:border-navy focus:shadow-[0_0_0_3px_rgba(28,59,102,.1)]";
