// Read-only assistant tools. Every tool resolves against a single role-aware
// `HomeData` snapshot fetched through the existing data layer (getHomeData),
// bound to the caller's session. No service-role key, no raw SQL, no new DB
// path. Financial gating is inherited: when the caller isn't entitled, the
// snapshot carries no real leads/pipeline (RLS denied them) AND these handlers
// omit the fields entirely — so the model never sees a dollar it shouldn't.
import type { Anthropic } from "@anthropic-ai/sdk";
import type { HomeData } from "@/lib/queries";
import type { CampaignWithEvents } from "@/lib/types";
import { assembleUtm, assembleDeliverableUtm } from "@/lib/utm";
import { orderedTasks, reachOf, sendDateOf } from "@/lib/deliverables";
import { sfParentChain } from "@/lib/sf";
import { rollup } from "@/lib/rollups";
import { parseISO } from "@/lib/dates";

export type ToolContext = { data: HomeData; today: Date; todayKey: string };

/* ------------------------------- definitions ------------------------------ */

export const TOOL_DEFS: Anthropic.Tool[] = [
  {
    name: "get_overview",
    description:
      "Cheap grounding: the list of brands and initiative names. Call this first when you need to map a user's words (a brand nickname, an initiative) to real ids before searching.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "search_campaigns",
    description:
      "Find campaigns by a free-text query matched against name, Salesforce code/id/name, and brand. Returns lightweight hits with ids to pass to get_campaign.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search text, e.g. a campaign name, brand, or SF code.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_campaign",
    description:
      "Full facts for one campaign: channel, vendor, segment, owner, Salesforce identity (code/id/name) and reporting parent chain, the event timeline (launch + comp-due), the campaign UTM, AND its deliverables (the individual sends). Each deliverable has its kind, send date/time, comp→code→send chain with owners, email subject, segment, audience lists (+combined reach), landing page, and its own assembled UTM. Includes leads/pipeline only when the caller is entitled to financials.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The campaign id from search_campaigns." },
      },
      required: ["id"],
    },
  },
  {
    name: "get_initiative",
    description:
      "Roll-up for one initiative: brands, progress, next milestone, campaign count, and its child campaigns. Includes leads/pipeline only when the caller is entitled.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The initiative id from get_overview." },
      },
      required: ["id"],
    },
  },
  {
    name: "list_upcoming_events",
    description:
      "Upcoming events in ascending date order from today onward: campaign launches, campaign comp-due, and deliverable SENDS (the actual emails). Powers 'next email / next send / next launch' questions. Deliverable sends carry the deliverable name and utm_content.",
    input_schema: {
      type: "object",
      properties: {
        scope: {
          type: "string",
          enum: ["campaign", "initiative", "brand", "all"],
          description: "What to scope the events to.",
        },
        ref: {
          type: "string",
          description:
            "The id, name, or label of the campaign/initiative/brand to scope to (required unless scope is 'all').",
        },
        type: {
          type: "string",
          enum: ["launch", "comp", "send"],
          description:
            "Optionally filter to launches, campaign comp-due, or deliverable sends only.",
        },
        from: {
          type: "string",
          description: "ISO yyyy-mm-dd lower bound; defaults to today.",
        },
      },
      required: ["scope"],
    },
  },
];

/* -------------------------------- handlers -------------------------------- */

const lc = (s: unknown) => String(s ?? "").toLowerCase();

function brandLabel(ctx: ToolContext, id: string): string {
  return ctx.data.brands.find((b) => b.id === id)?.label ?? id;
}
function initiativeName(ctx: ToolContext, id: string | null): string | null {
  if (!id) return null;
  return ctx.data.initiatives.find((i) => i.id === id)?.name ?? null;
}

function campaignFacts(ctx: ToolContext, c: CampaignWithEvents) {
  const utm = assembleUtm({
    source: c.utm_source,
    medium: c.utm_medium,
    campaign: c.sf_code,
    content: c.utm_content,
  });
  const chain = sfParentChain(c.sf_parent_id, ctx.data.sfParents).map((p) => p.name);
  const timeline = c.events
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => ({ type: e.type, date: e.date, label: e.label }));

  const deliverables = c.deliverables
    .slice()
    .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name))
    .map((d) => ({
      name: d.name,
      kind: d.kind,
      send_date: sendDateOf(d),
      send_time: d.send_time,
      utm_content: d.utm_content,
      utm: assembleDeliverableUtm(d, c), // deliverable SF code, else campaign override/code
      email_subject: d.email_subject,
      segment: d.segment,
      landing_page: d.landing_page,
      audience_lists: d.lists.map((l) => l.name),
      combined_reach: reachOf(d.lists),
      chain: orderedTasks(d.tasks).map((t) => ({
        step: t.kind,
        due: t.due,
        owner: t.owner,
      })),
      notes: d.notes,
    }));

  const facts: Record<string, unknown> = {
    id: c.id,
    name: c.name,
    brand: brandLabel(ctx, c.brand_id),
    initiative: initiativeName(ctx, c.initiative_id),
    channel: c.channel,
    vendor: c.vendor,
    segment: c.segment,
    owner: c.owner,
    sf_code: c.sf_code,
    sf_id: c.sf_id,
    sf_name: c.sf_name,
    utm_campaign_override: c.utm_campaign_override,
    sf_parent_chain: chain, // leaf → root
    timeline,
    utm, // campaign-level, assembled live, never stored
    deliverables,
  };
  // Financials only when entitled — otherwise absent (not zeroed/masked).
  if (ctx.data.canSeeFinancials) {
    facts.leads = c.leads;
    facts.pipeline = c.pipeline;
  }
  return facts;
}

type EventRow = {
  date: string;
  type: string;
  label: string;
  campaign: string;
  brand: string;
  initiative: string | null;
};

function upcomingEvents(
  ctx: ToolContext,
  args: { scope?: string; ref?: string; type?: string; from?: string }
): EventRow[] {
  const scope = args.scope ?? "all";
  const from = args.from || ctx.todayKey;
  const fromD = parseISO(from);
  const ref = lc(args.ref);

  const inScope = (c: CampaignWithEvents): boolean => {
    if (scope === "all") return true;
    if (scope === "campaign")
      return c.id === args.ref || lc(c.name).includes(ref);
    if (scope === "brand")
      return c.brand_id === args.ref || lc(brandLabel(ctx, c.brand_id)).includes(ref);
    if (scope === "initiative") {
      if (!c.initiative_id) return false;
      return (
        c.initiative_id === args.ref ||
        lc(initiativeName(ctx, c.initiative_id)).includes(ref)
      );
    }
    return false;
  };

  const rows: EventRow[] = [];
  for (const c of ctx.data.campaigns) {
    if (!inScope(c)) continue;
    for (const e of c.events) {
      if (args.type && args.type !== e.type) continue;
      if (parseISO(e.date) < fromD) continue;
      rows.push({
        date: e.date,
        type: e.type,
        label: e.label,
        campaign: c.name,
        brand: brandLabel(ctx, c.brand_id),
        initiative: initiativeName(ctx, c.initiative_id),
      });
    }
    // Deliverable sends (the actual emails).
    if (!args.type || args.type === "send") {
      for (const d of c.deliverables) {
        const date = sendDateOf(d);
        if (!date || parseISO(date) < fromD) continue;
        rows.push({
          date,
          type: "send",
          label: `${d.name}${d.utm_content ? ` (${d.utm_content})` : ""}`,
          campaign: c.name,
          brand: brandLabel(ctx, c.brand_id),
          initiative: initiativeName(ctx, c.initiative_id),
        });
      }
    }
  }
  rows.sort((a, b) => a.date.localeCompare(b.date));
  return rows;
}

/** Run a tool by name. Returns a JSON-serializable result (or {error} so the
 *  model can recover gracefully rather than the request failing). */
export function runTool(
  name: string,
  rawInput: unknown,
  ctx: ToolContext
): unknown {
  const input = (rawInput ?? {}) as Record<string, unknown>;
  try {
    switch (name) {
      case "get_overview":
        return {
          brands: ctx.data.brands.map((b) => ({ id: b.id, label: b.label })),
          initiatives: ctx.data.initiatives.map((i) => ({
            id: i.id,
            name: i.name,
            owner: i.owner,
            status: i.status,
          })),
        };

      case "search_campaigns": {
        const q = lc(input.query);
        if (!q) return { results: [] };
        const results = ctx.data.campaigns
          .filter((c) =>
            [
              c.name,
              c.sf_code,
              c.sf_id,
              c.sf_name,
              c.brand_id,
              brandLabel(ctx, c.brand_id),
            ].some((v) => lc(v).includes(q))
          )
          .map((c) => ({
            id: c.id,
            name: c.name,
            brand: brandLabel(ctx, c.brand_id),
            initiative: initiativeName(ctx, c.initiative_id),
            sf_code: c.sf_code,
            deliverables: c.deliverables.length,
          }));
        return { results };
      }

      case "get_campaign": {
        const c = ctx.data.campaigns.find((x) => x.id === input.id);
        if (!c) return { error: "No campaign with that id." };
        return campaignFacts(ctx, c);
      }

      case "get_initiative": {
        const i = ctx.data.initiatives.find((x) => x.id === input.id);
        if (!i) return { error: "No initiative with that id." };
        const r = rollup(i.id, ctx.data.campaigns, ctx.today);
        const children = ctx.data.campaigns
          .filter((c) => c.initiative_id === i.id)
          .map((c) => ({
            id: c.id,
            name: c.name,
            brand: brandLabel(ctx, c.brand_id),
            channel: c.channel,
          }));
        const out: Record<string, unknown> = {
          id: i.id,
          name: i.name,
          owner: i.owner,
          status: i.status,
          brands: r.brands.map((id) => brandLabel(ctx, id)),
          progress: Math.round(r.progress * 100),
          sent: r.sent,
          total_launches: r.total,
          campaign_count: r.count,
          next_milestone: r.next
            ? { type: r.next.type, date: r.next.date, label: r.next.label }
            : null,
          campaigns: children,
        };
        if (ctx.data.canSeeFinancials) {
          out.leads = r.leads;
          out.pipeline = r.pipeline;
        }
        return out;
      }

      case "list_upcoming_events":
        return { events: upcomingEvents(ctx, input) };

      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Tool failed." };
  }
}
