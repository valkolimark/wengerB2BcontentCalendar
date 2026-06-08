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

/** Sunday-start of the week containing d. */
export const startOfWeek = (d: Date): Date => addDays(d, -d.getDay());

/**
 * 42 days (6 weeks, Sunday-start) covering the month of `cursor` — the cells
 * for a month grid. Days outside the cursor's month are included for padding.
 */
export const monthGridDays = (cursor: Date): Date[] => {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
};

/** The 7 days (Sunday-start) of the week containing `cursor`. */
export const weekDays = (cursor: Date): Date[] => {
  const start = startOfWeek(cursor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
};
