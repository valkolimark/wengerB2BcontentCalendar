// Date key/parse/format helpers, ported from reference/ContentTracker.jsx.
// All dates are handled in local time on an ISO yyyy-mm-dd string boundary.

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Stable yyyy-mm-dd key for a Date (local time). */
export const key = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

/** Parse an ISO yyyy-mm-dd string into a local-time Date. */
export const parseISO = (s: string): Date => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** Return a new Date offset by n days. */
export const addDays = (d: Date, n: number): Date => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

/** Whether two Dates fall on the same calendar day. */
export const sameDay = (a: Date, b: Date): boolean => key(a) === key(b);

/** Short human label for an ISO date, e.g. "Jun 8". */
export const prettyDate = (s: string): string => {
  const d = parseISO(s);
  return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
};
