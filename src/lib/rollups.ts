// Pure rollup helpers for initiatives, ported from reference/ContentTracker.jsx.
import type { CampaignWithEvents, EventLite, Initiative } from "./types";
import { parseISO } from "./dates";

export type Rollup = {
  brands: string[]; // unique brand ids across child campaigns (drives co-brand)
  progress: number; // 0..1 — launches sent ÷ total launches
  sent: number; // launch events dated ≤ today
  total: number; // total launch events
  next: EventLite | null; // earliest event (launch|comp) dated ≥ today
  leads: number;
  pipeline: number;
  count: number; // child campaign count
};

/**
 * Roll up an initiative from its child campaigns. `today` is injected (not read
 * from the clock here) so callers stay deterministic and hydration-stable.
 */
export function rollup(
  initiativeId: string,
  campaigns: CampaignWithEvents[],
  today: Date
): Rollup {
  const cs = campaigns.filter((c) => c.initiative_id === initiativeId);
  const brands = [...new Set(cs.map((c) => c.brand_id))];

  const launches = cs.flatMap((c) => c.events.filter((e) => e.type === "launch"));
  const sent = launches.filter((e) => parseISO(e.date) <= today).length;
  const progress = launches.length ? sent / launches.length : 0;

  const all = cs
    .flatMap((c) => c.events)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
  const next = all.find((e) => parseISO(e.date) >= today) ?? null;

  const leads = cs.reduce((s, c) => s + (c.leads || 0), 0);
  const pipeline = cs.reduce((s, c) => s + (c.pipeline || 0), 0);

  return {
    brands,
    progress,
    sent,
    total: launches.length,
    next,
    leads,
    pipeline,
    count: cs.length,
  };
}

/** Initiatives sorted by urgency: nearest upcoming `next` event first. */
export function initiativesByUrgency(
  initiatives: Initiative[],
  campaigns: CampaignWithEvents[],
  today: Date
): Initiative[] {
  const FAR = 8e15;
  const rank = (i: Initiative) => {
    const n = rollup(i.id, campaigns, today).next;
    return n ? parseISO(n.date).getTime() : FAR;
  };
  return [...initiatives].sort((a, b) => rank(a) - rank(b));
}
