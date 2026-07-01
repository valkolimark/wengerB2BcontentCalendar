// Deliverable helpers — chain ordering, reach summation, display shaping.
// Cycle 12. Pure functions so the drawer, modal, calendar, and Jira export all
// order tasks and sum reach the same way.
import type {
  DeliverableKind,
  DeliverableTask,
  DeliverableTaskKind,
  DeliverableWithMeta,
  List,
} from "./types";

// The comp → code → send order the hand-off chain always renders in.
export const TASK_ORDER: DeliverableTaskKind[] = ["comp", "code", "send"];
const TASK_RANK: Record<DeliverableTaskKind, number> = {
  comp: 0,
  code: 1,
  send: 2,
};

export const TASK_LABEL: Record<DeliverableTaskKind, string> = {
  comp: "Comp / creative due",
  code: "Coding due",
  send: "Send date",
};

export const KIND_LABEL: Record<DeliverableKind, string> = {
  email: "Email",
  blog: "Blog",
  social: "Social",
};

/** Tasks in comp → code → send order (missing steps simply absent). */
export const orderedTasks = (tasks: DeliverableTask[]): DeliverableTask[] =>
  [...tasks].sort((a, b) => TASK_RANK[a.kind] - TASK_RANK[b.kind]);

/** The task of a given kind, if present. */
export const taskOf = (
  tasks: DeliverableTask[],
  kind: DeliverableTaskKind
): DeliverableTask | undefined => tasks.find((t) => t.kind === kind);

/** Combined audience reach across a deliverable's lists. */
export const reachOf = (lists: List[]): number =>
  lists.reduce((sum, l) => sum + (l.reach || 0), 0);

/** Stable display order for a campaign's deliverables. */
export const sortDeliverables = (
  ds: DeliverableWithMeta[]
): DeliverableWithMeta[] =>
  [...ds].sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));

/** The send date (yyyy-mm-dd) of a deliverable, from its send task or deliver_at. */
export const sendDateOf = (d: DeliverableWithMeta): string | null => {
  const send = taskOf(d.tasks, "send");
  if (send?.due) return send.due;
  if (d.deliver_at) return d.deliver_at.slice(0, 10);
  return null;
};

/** Thousands-formatted integer (e.g. 16,320). */
export const fmtReach = (n: number): string => n.toLocaleString("en-US");

/**
 * A deliver_at timestamp rendered in Pacific time (these are Pardot sends for
 * US/CA campaigns; the brief specifies PT). e.g. "Wed, Jul 15, 10:00 AM PT".
 */
export const fmtDeliver = (iso: string): string => {
  try {
    return (
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Los_Angeles",
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(new Date(iso)) + " PT"
    );
  } catch {
    return iso.replace("T", " ").slice(0, 16);
  }
};
