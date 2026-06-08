// Small display formatters, ported from reference/ContentTracker.jsx.

/** Compact money: $0, $1.2M, $86k, $940. */
export const fmtMoney = (n: number): string =>
  !n
    ? "$0"
    : n >= 1e6
      ? "$" + (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M"
      : n >= 1e3
        ? "$" + Math.round(n / 1e3) + "k"
        : "$" + n;

/** Up-to-two-letter initials from a name, e.g. "Mark Mireles" → "MM". */
export const initials = (name: string): string =>
  name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("") || "—";
